import React, { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import MagicRings from '../components/MagicRings';
import magicMugLogo from '../assets/logo.png';

interface LoginPageProps {
  onComplete?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onComplete }) => {
  const { user, login, initError, retryInit } = useAuth();
  const [minTimeElapsed, setMinTimeElapsed] = React.useState<boolean>(false);

  // Auto-initiate login and count 1.2s intro duration
  useEffect(() => {
    login('admin', 'secretpassword');

    const totalDurationMs = 4800;
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, totalDurationMs);

    return () => {
      clearTimeout(timer);
    };
  }, [login]);

  // As soon as the intro time has elapsed and user session is ready, automatically advance!
  useEffect(() => {
    if (minTimeElapsed && user && onComplete) {
      onComplete();
    }
  }, [minTimeElapsed, user, onComplete]);

  return (
    <div
      onClick={() => {
        if (onComplete) onComplete();
      }}
      className="fixed inset-0 w-screen h-screen flex items-center justify-center bg-[#F4F5F7] overflow-hidden select-none"
    >
      {/* Fullscreen MagicRings Canvas (No square box limits or side borders) */}
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        <MagicRings
          color="#741A23"
          colorTwo="#1E4D2B"
          ringCount={6}
          speed={1}
          attenuation={10}
          lineThickness={2.2}
          baseRadius={0.28}
          radiusStep={0.08}
          scaleRate={0.1}
          opacity={0.9}
          blur={0}
          noiseAmount={0.06}
          rotation={0}
          ringGap={1.5}
          fadeIn={0.7}
          fadeOut={0.5}
          followMouse={false}
          mouseInfluence={0}
          hoverScale={1.0}
          parallax={0}
          clickBurst={false}
        />
      </div>

      {/* Circular Logo exactly centered (Zero hover scaling) */}
      <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-white p-3.5 shadow-2xl border-4 border-maroon-700/80 flex items-center justify-center overflow-hidden z-10 relative ring-8 ring-maroon-700/5">
        <img
          src={magicMugLogo}
          alt="Magic Mug"
          className="w-full h-full object-contain rounded-full pointer-events-none"
        />
      </div>

      {/* Server Connection Error Fallback (only shown if backend is unreachable) */}
      {initError && (
        <div className="absolute bottom-10 z-20 w-full max-w-xs animate-fade-in text-center px-4">
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-left flex items-start gap-3 shadow-lg">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-amber-900">Connecting to Cafe Server...</div>
              <div className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                Waiting for backend server or database to complete startup.
              </div>
            </div>
          </div>

          <button
            onClick={retryInit}
            className="mt-3 w-full py-2.5 px-4 bg-maroon-700 hover:bg-maroon-800 text-white font-bold text-xs rounded-xl shadow-glow-maroon transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Retry Connection</span>
          </button>
        </div>
      )}
    </div>
  );
};
