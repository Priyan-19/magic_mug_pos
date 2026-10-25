import React, { useState, useRef, useEffect } from 'react';
import { Lock, User as UserIcon, Eye, EyeOff, AlertCircle, Loader2, Coffee } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import magicMugLogo from '../assets/logo.png';
import groweraLogo from '../assets/growera_logo.png';
import { catalogService, shiftService, analyticsService } from '../services/cafeServices';
import { getProductImage } from '../utils/productImages';
import { User } from '../types';

export const LoginPage: React.FC = () => {
  const { login, completeLogin, isLoading } = useAuth();
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Flow states: 'login' (clean form) -> 'transition' (3-5s animation preloading products) -> home
  const [step, setStep] = useState<'login' | 'transition'>('login');
  const [progress, setProgress] = useState<number>(12);
  const [statusMessage, setStatusMessage] = useState<string>('Verifying credentials...');
  const authenticatedUserRef = useRef<User | null>(null);

  const startPreloadSequence = async (authenticatedUser: User) => {
    authenticatedUserRef.current = authenticatedUser;

    const totalDurationMs = 3800; // 3.8s (within requested 3-5s range)
    const startTime = Date.now();

    // 1. Progress updater
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const ratio = Math.min(elapsed / totalDurationMs, 1);
      const currentPercent = Math.min(98, Math.round(15 + ratio * 83));
      setProgress(currentPercent);

      if (ratio < 0.25) {
        setStatusMessage('Authenticating terminal session...');
      } else if (ratio < 0.6) {
        setStatusMessage('Brewing menu: loading products & categories...');
      } else if (ratio < 0.85) {
        setStatusMessage('Pre-caching product images & shift cashflow...');
      } else {
        setStatusMessage('Ready! Launching Magic Mug POS...');
      }
    }, 70);

    // 2. Minimum duration timer (guarantees 3.8s animation)
    const minTimerPromise = new Promise((resolve) => setTimeout(resolve, totalDurationMs));

    // 3. Proactive background preloading of products, categories, shifts, best sellers & images
    const preloadPromise = (async () => {
      try {
        const [categories, products] = await Promise.all([
          catalogService.getCategories(false),
          catalogService.getProducts({ active_only: true }, true),
          shiftService.getCurrentShift().catch(() => null),
          analyticsService.getBestSellers({ limit: 1 }).catch(() => []),
        ]);

        // Preload image assets directly into browser cache so POS displays instantly without blank flickers
        if (products && Array.isArray(products)) {
          products.forEach((p) => {
            const imgUrl = getProductImage(p.name, p.image_url);
            if (imgUrl) {
              const img = new Image();
              img.src = imgUrl;
            }
          });
        }
      } catch (err) {
        console.warn('Preload completed with non-fatal notice:', err);
      }
    })();

    // Wait for both the 3.8s animation duration and product preloading to complete
    await Promise.all([minTimerPromise, preloadPromise]);

    clearInterval(progressInterval);
    setProgress(100);
    setStatusMessage('Launching POS Terminal...');

    // Small delay for 100% completion bar then transition to landing page
    setTimeout(() => {
      completeLogin(authenticatedUser);
    }, 250);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage('Please enter both username and password');
      return;
    }

    setErrorMessage(null);
    // Authenticate with deferUserSet=true so user is not immediately set in context
    const result = await login(username.trim(), password, true);
    if (!result.success || !result.user) {
      setErrorMessage(result.error || 'Invalid credentials. Please try again.');
      return;
    }

    // Credentials valid -> enter the animation & preloading transition
    setStep('transition');
    startPreloadSequence(result.user);
  };

  // =========================================================================
  // Screen 2: 3-5s Loading Animation Screen (Preloading products in background)
  // =========================================================================
  if (step === 'transition') {
    return (
      <div className="fixed inset-0 w-screen h-screen flex flex-col items-center justify-center bg-[#F4F5F7] overflow-hidden select-none animate-fade-in">
        {/* Clean soft ambient radial gradient (No arcs or rings) */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-[#F4F5F7] to-[#E9ECEF] pointer-events-none opacity-80" />

        {/* Centered Circular Logo with pulsing ambient glow */}
        <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-white p-3 shadow-2xl border-4 border-maroon-700/80 flex items-center justify-center overflow-hidden z-10 relative ring-8 ring-maroon-700/5 animate-pulse">
          <img
            src={magicMugLogo}
            alt="Magic Mug"
            className="w-full h-full object-contain rounded-full pointer-events-none"
          />
        </div>

        {/* Interactive Progress & Status Indicator */}
        <div className="mt-8 flex flex-col items-center gap-3 z-10 max-w-xs w-full px-4 animate-fade-in">
          <div className="text-sm font-bold text-slate-800 tracking-wide flex items-center gap-2">
            <Coffee className="w-4 h-4 text-maroon-700 animate-bounce" />
            <span className="truncate">{statusMessage}</span>
          </div>

          {/* Smooth Progress Bar */}
          <div className="w-full h-2 bg-slate-200/90 rounded-full overflow-hidden shadow-inner p-0.5 border border-slate-300/40">
            <div
              className="h-full bg-gradient-to-r from-maroon-700 via-amber-600 to-maroon-700 rounded-full transition-all duration-150 ease-out shadow-xs"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between w-full text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
            <span>Magic Mug POS</span>
            <span>{progress}%</span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // Screen 1: Clean Login Page (NO MagicRings in background!)
  // =========================================================================
  return (
    <div className="fixed inset-0 w-screen h-screen flex items-center justify-center bg-[#F4F5F7] overflow-hidden select-none p-4">
      {/* Subtle modern soft radial gradient (Clean, distraction-free) */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-[#F4F5F7] to-[#E9ECEF] pointer-events-none opacity-80" />

      {/* Centered Glassmorphic Login Card */}
      <div className="w-full max-w-[420px] bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_20px_60px_-15px_rgba(116,26,35,0.15)] border border-white/80 p-7 sm:p-9 relative z-10 animate-fade-in">
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center mb-7">
          <div className="w-20 h-20 rounded-full bg-white p-2 shadow-lg border-2 border-maroon-700/20 mb-3.5 relative ring-4 ring-maroon-700/5">
            <img
              src={magicMugLogo}
              alt="Magic Mug Logo"
              className="w-full h-full object-contain rounded-full pointer-events-none"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Magic Mug
          </h1>
        </div>

        {/* Error Alert Banner */}
        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-800 text-xs font-semibold flex items-center gap-2.5 animate-shake shadow-xs">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username Input */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5 pl-1">
              Username
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="input-login-username"
                type="text"
                autoFocus
                autoComplete="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Enter username"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-maroon-700 rounded-2xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-maroon-700/15 transition-all shadow-xs"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5 pl-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="input-login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Enter password"
                className="w-full pl-11 pr-11 py-3 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-maroon-700 rounded-2xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-maroon-700/15 transition-all shadow-xs"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Sign In Button */}
          <button
            id="btn-login-submit"
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3.5 px-4 bg-maroon-700 hover:bg-maroon-800 active:scale-[0.99] text-white font-bold text-sm rounded-2xl shadow-glow-maroon transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying Credentials...</span>
              </>
            ) : (
              <>
                <Coffee className="w-4 h-4" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        {/* Footer Info: Powered by Growera */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-2.5">
          <span className="text-xs font-medium tracking-wide text-slate-400">
            Powered by
          </span>
          <img
            src={groweraLogo}
            alt="Growera"
            className="h-7 sm:h-8 w-auto object-contain opacity-95 pointer-events-none transition-all"
          />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
