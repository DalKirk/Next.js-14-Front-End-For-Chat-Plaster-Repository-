'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';

const STORAGE_KEY = 'starcyeed-age-verified';

export function AgeGate({ children }: { children: React.ReactNode }) {
  const [verified, setVerified] = useState<boolean | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setVerified(localStorage.getItem(STORAGE_KEY) === 'true');
  }, []);

  const handleConfirm = () => {
    if (!checked) return;
    localStorage.setItem(STORAGE_KEY, 'true');
    setVerified(true);
  };

  const handleLeave = () => {
    window.location.href = '/';
  };

  // Still loading from localStorage
  if (verified === null) {
    return <div className="min-h-screen bg-black" />;
  }

  if (verified) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative w-full max-w-sm"
        >
          {/* Pulsing border */}
          <div className="age-gate-border" />
          <div
            className="relative rounded-2xl p-6 sm:p-8 text-center"
            style={{ background: 'rgba(8,8,15,0.95)', zIndex: 1 }}
          >
            <div className="flex justify-center mb-5">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center shadow-[0_0_25px_rgba(168,85,247,0.4)]">
                <ShieldCheck className="w-7 h-7 text-white" />
              </div>
            </div>

            <h2 className="text-xl font-bold text-white mb-2">Age Verification</h2>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              This section contains AI tools that may generate explicit or mature content.
              You must be <strong className="text-white">18 years or older</strong> to continue.
            </p>

            <label className="flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all text-left mb-5"
              style={{
                borderColor: checked ? 'rgba(168,85,247,0.5)' : 'rgba(255,255,255,0.08)',
                background: checked ? 'rgba(168,85,247,0.06)' : 'transparent',
              }}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-2 border-slate-600 bg-black accent-purple-500 cursor-pointer"
              />
              <span className={`text-xs leading-relaxed ${checked ? 'text-white' : 'text-slate-400'}`}>
                I confirm that I am 18 years of age or older and consent to viewing content that may
                include AI-generated mature or explicit material.
              </span>
            </label>

            <div className="flex gap-3">
              <button
                onClick={handleLeave}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm text-slate-400 transition-colors hover:text-white"
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}
              >
                Leave
              </button>
              <button
                onClick={handleConfirm}
                disabled={!checked}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  background: checked
                    ? 'linear-gradient(135deg, #a855f7, #cc00cc)'
                    : 'rgba(255,255,255,0.05)',
                  boxShadow: checked ? '0 0 20px rgba(168,85,247,0.3)' : 'none',
                }}
              >
                Enter
              </button>
            </div>

            <p className="text-[10px] text-slate-600 mt-4">
              By continuing, you agree to our{' '}
              <a href="/terms" className="text-purple-400/70 hover:text-purple-300 underline">Terms</a>
              {' '}and{' '}
              <a href="/privacy" className="text-purple-400/70 hover:text-purple-300 underline">Privacy Policy</a>.
            </p>
          </div>

          <style>{`
            @keyframes ageGateSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            @keyframes ageGatePulse { 0%,100% { filter: blur(4px) brightness(1.6); } 50% { filter: blur(6px) brightness(2); } }
            .age-gate-border {
              position: absolute; inset: -2px; border-radius: 18px; z-index: 0; overflow: hidden;
              animation: ageGatePulse 2.5s ease-in-out infinite;
            }
            .age-gate-border::before {
              content: ''; position: absolute; inset: -100%; border-radius: 18px;
              background: conic-gradient(from 0deg, #a855f7, #cc00cc, #ffffff, #cc00cc, #a855f7);
              animation: ageGateSpin 3s linear infinite;
            }
            .age-gate-border::after {
              content: ''; position: absolute; inset: 2px; border-radius: 16px;
              background: rgba(8,8,15,0.97);
            }
          `}</style>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
