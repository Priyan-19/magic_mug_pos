import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { authService } from '../services/cafeServices';
import { useToast } from './ToastContext';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isInitializing: boolean;
  initError: boolean;
  isOwner: boolean;
  isCashier: boolean;
  login: (username?: string, password?: string) => Promise<boolean>;
  logout: () => void;
  retryInit: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const normalizeUser = (u: User | null): User | null => {
  if (!u) return null;
  const cleanName = (u.full_name || 'Magic Mug').replace(/\bcafe\b/gi, '').trim() || 'Magic Mug';
  return { ...u, full_name: cleanName };
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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [initError, setInitError] = useState<boolean>(false);
  const { error: showError, success: showSuccess } = useToast();

  const logout = useCallback(() => {
    localStorage.removeItem('magic_mug_token');
    localStorage.removeItem('magic_mug_user');
    setToken(null);
    setUser(null);
  }, []);

  const login = useCallback(async (username: string = 'admin', password: string = 'secretpassword'): Promise<boolean> => {
    try {
      setInitError(false);
      const res = await authService.login(username, password);
      const cleanUser = normalizeUser(res.user);
      localStorage.setItem('magic_mug_token', res.access_token);
      localStorage.setItem('magic_mug_user', JSON.stringify(cleanUser));
      setToken(res.access_token);
      setUser(cleanUser);
      setIsLoading(false);
      setIsInitializing(false);
      return true;
    } catch (err: any) {
      console.warn('Auto initialization failed:', err);
      setInitError(true);
      setIsLoading(false);
      return false;
    }
  }, []);

  const retryInit = useCallback(() => {
    setInitError(false);
    setIsLoading(true);
    login('admin', 'secretpassword');
  }, [login]);

  // Validate existing token or auto-initialize session on boot
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('magic_mug_token');
      if (storedToken) {
        try {
          const profile = await authService.getMe();
          const cleanUser = normalizeUser(profile);
          setUser(cleanUser);
          localStorage.setItem('magic_mug_user', JSON.stringify(cleanUser));
          setIsLoading(false);
          setIsInitializing(false);
          return;
        } catch {
          // Token invalid, clear and auto-relogin
          localStorage.removeItem('magic_mug_token');
          localStorage.removeItem('magic_mug_user');
        }
      }

      // Auto login in the background
      await login('admin', 'secretpassword');
    };

    initAuth();

    const handleUnauthorized = () => {
      logout();
      showError('Session Refreshed', 'Reconnecting to Magic Mug POS Station...');
      login('admin', 'secretpassword');
    };

    window.addEventListener('auth-unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth-unauthorized', handleUnauthorized);
  }, [login, logout, showError]);

  // Single Unified Mode: Zero role barriers across all pages
  const isOwner = true;
  const isCashier = true;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isInitializing,
        initError,
        isOwner,
        isCashier,
        login,
        logout,
        retryInit,
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
