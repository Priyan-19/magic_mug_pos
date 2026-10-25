import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { authService } from '../services/cafeServices';
import { useToast } from './ToastContext';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isInitializing: boolean;
  isOwner: boolean;
  login: (
    username: string,
    password: string,
    deferUserSet?: boolean
  ) => Promise<{ success: boolean; error?: string; user?: User }>;
  completeLogin: (user: User) => void;
  logout: () => void;
  updateUser: (updatedUser: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const normalizeUser = (u: User | null): User | null => {
  if (!u) return null;
  const cleanName = (u.full_name || 'Magic Mug').replace(/\bcafe\b/gi, '').trim() || 'Magic Mug';
  return { ...u, full_name: cleanName, role: 'USER' };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('magic_mug_user');
    if (!saved) return null;
    try {
      return normalizeUser(JSON.parse(saved));
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => localStorage.getItem('magic_mug_token'));
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const { error: showError, success: showSuccess } = useToast();

  const logout = useCallback(() => {
    localStorage.removeItem('magic_mug_token');
    localStorage.removeItem('magic_mug_user');
    sessionStorage.clear();
    setToken(null);
    setUser(null);
    showSuccess('Signed Out', 'You have been safely logged out of Magic Mug POS.');
  }, [showSuccess]);

  const updateUser = useCallback((updatedUser: User) => {
    const clean = normalizeUser(updatedUser);
    setUser(clean);
    if (clean) {
      localStorage.setItem('magic_mug_user', JSON.stringify(clean));
    }
  }, []);

  const login = useCallback(
    async (
      username: string,
      password: string,
      deferUserSet = false
    ): Promise<{ success: boolean; error?: string; user?: User }> => {
      setIsLoading(true);
      try {
        const res = await authService.login(username.trim(), password);
        const cleanUser = normalizeUser(res.user);
        localStorage.setItem('magic_mug_token', res.access_token);
        setToken(res.access_token);
        setIsLoading(false);

        if (!deferUserSet && cleanUser) {
          localStorage.setItem('magic_mug_user', JSON.stringify(cleanUser));
          setUser(cleanUser);
          setIsInitializing(false);
        }

        return { success: true, user: cleanUser || undefined };
      } catch (err: any) {
        setIsLoading(false);
        const detailMsg =
          err?.response?.data?.error?.message ||
          err?.response?.data?.detail ||
          err?.message ||
          'Invalid username or password';
        return { success: false, error: detailMsg };
      }
    },
    []
  );

  const completeLogin = useCallback((cleanUser: User) => {
    localStorage.setItem('magic_mug_user', JSON.stringify(cleanUser));
    setUser(cleanUser);
    setIsInitializing(false);
  }, []);

  // Validate existing stored token on initial load
  useEffect(() => {
    const verifyExistingSession = async () => {
      const storedToken = localStorage.getItem('magic_mug_token');
      if (storedToken) {
        try {
          const profile = await authService.getMe();
          const cleanUser = normalizeUser(profile);
          setUser(cleanUser);
          localStorage.setItem('magic_mug_user', JSON.stringify(cleanUser));
        } catch (err) {
          console.warn('Stored token is invalid or expired, resetting session:', err);
          localStorage.removeItem('magic_mug_token');
          localStorage.removeItem('magic_mug_user');
          setToken(null);
          setUser(null);
        }
      }
      setIsInitializing(false);
    };

    verifyExistingSession();

    const handleUnauthorized = () => {
      logout();
      showError('Session Expired', 'Please sign in again to continue.');
    };

    window.addEventListener('auth-unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth-unauthorized', handleUnauthorized);
  }, [logout, showError]);

  // Single Owner Mode
  const isOwner = true;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isInitializing,
        isOwner,
        login,
        completeLogin,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
