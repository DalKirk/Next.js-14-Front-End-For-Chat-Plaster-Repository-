'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

interface ConsentStepProps {
  isAccepted: boolean;
  onAcceptChange: (accepted: boolean) => void;
  error?: string;
}

export function ConsentStep({ isAccepted, onAcceptChange, error }: ConsentStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-purple-500/10 rounded-lg">
          <ShieldCheckIcon className="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Terms & Consent</h3>
          <p className="text-sm text-gray-400">Please review and accept to continue</p>
        </div>
      </div>

      {/* Desktop/Tablet View - Full Disclosure */}
      <div className="hidden sm:block">
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 space-y-4">
          <h4 className="font-medium text-white text-base">
            Consent Statement for Account Creation
          </h4>
          <p className="text-sm text-gray-300 leading-relaxed">
            By checking this box and creating an account, you acknowledge and agree to the following:
          </p>
          
          <ul className="space-y-3 text-sm text-gray-300">
            <li className="flex items-start gap-3">
              <CheckIcon className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <span>
                You have read and accept the{' '}
                <a 
                  href="/terms" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:text-purple-300 underline"
                >
                  Terms of Service
                </a>
                {' '}and{' '}
                <a 
                  href="/privacy" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:text-purple-300 underline"
                >
                  Privacy Policy
                </a>.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <CheckIcon className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <span>
                You understand that <strong className="text-white">STARCYEED</strong> is a platform for free idea and content exchange, and you are solely responsible for the content you post and your interactions.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <CheckIcon className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <span>
                You agree to indemnify and hold <strong className="text-white">STARCYEED</strong> harmless from any claims, liabilities, or damages arising from your use of the platform or related activities.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <CheckIcon className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <span>
                You consent to the collection and use of your personal data as described in our Privacy Policy.
              </span>
            </li>
          </ul>
        </div>

        {/* Desktop Checkbox */}
        <label 
          className={`
            flex items-start gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer mt-4
            ${isAccepted 
              ? 'bg-purple-500/10 border-purple-500/50' 
              : error 
                ? 'bg-red-500/5 border-red-500/50' 
                : 'bg-gray-800/30 border-gray-700/50 hover:border-gray-600/50'
            }
          `}
        >
          <div className="relative flex items-center">
            <input
              type="checkbox"
              checked={isAccepted}
              onChange={(e) => onAcceptChange(e.target.checked)}
              className="peer h-5 w-5 rounded border-2 border-gray-600 bg-gray-800 
                       checked:bg-purple-500 checked:border-purple-500 
                       focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-0
                       transition-all cursor-pointer"
            />
            {isAccepted && (
              <CheckIcon className="absolute w-4 h-4 text-white pointer-events-none left-0.5 top-0.5" />
            )}
          </div>
          <span className={`text-sm font-medium select-none ${isAccepted ? 'text-white' : 'text-gray-300'}`}>
            I agree to the Terms of Service and Privacy Policy
          </span>
        </label>
      </div>

      {/* Mobile View - Compact Version (320px+) */}
      <div className="block sm:hidden space-y-4">
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 space-y-3">
          <p className="text-xs text-gray-300 leading-relaxed">
            By creating an account, you agree to our{' '}
            <a 
              href="/terms" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-purple-400 underline"
            >
              Terms
            </a>
            {' '}and{' '}
            <a 
              href="/privacy" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-purple-400 underline"
            >
              Privacy Policy
            </a>.
          </p>
          <ul className="space-y-2 text-xs text-gray-400">
            <li className="flex items-start gap-2">
              <span className="text-purple-400 flex-shrink-0">•</span>
              <span>You're responsible for your content</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400 flex-shrink-0">•</span>
              <span>Free exchange of ideas & content</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400 flex-shrink-0">•</span>
              <span>We collect data per Privacy Policy</span>
            </li>
          </ul>
        </div>

        {/* Mobile Checkbox - More compact */}
        <label 
          className={`
            flex items-start gap-2.5 p-3 rounded-lg border-2 transition-all cursor-pointer
            ${isAccepted 
              ? 'bg-purple-500/10 border-purple-500/50' 
              : error 
                ? 'bg-red-500/5 border-red-500/50' 
                : 'bg-gray-800/30 border-gray-700/50 active:border-gray-600/50'
            }
          `}
        >
          <div className="relative flex items-center mt-0.5">
            <input
              type="checkbox"
              checked={isAccepted}
              onChange={(e) => onAcceptChange(e.target.checked)}
              className="h-4 w-4 rounded border-2 border-gray-600 bg-gray-800 
                       checked:bg-purple-500 checked:border-purple-500 
                       focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-0
                       transition-all cursor-pointer"
            />
            {isAccepted && (
              <CheckIcon className="absolute w-3 h-3 text-white pointer-events-none left-0.5 top-0.5" />
            )}
          </div>
          <span className={`text-xs font-medium select-none leading-tight ${isAccepted ? 'text-white' : 'text-gray-300'}`}>
            I agree to the Terms & Privacy Policy and accept responsibility for my content.
          </span>
        </label>
      </div>

      {/* Error Message */}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-red-400 flex items-center gap-2 mt-2"
        >
          <span className="text-lg">⚠️</span>
          {error}
        </motion.p>
      )}
    </motion.div>
  );
}
