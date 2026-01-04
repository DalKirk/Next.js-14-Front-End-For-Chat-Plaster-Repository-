'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { XMarkIcon, EyeIcon, EyeSlashIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { LockClosedIcon, UserIcon, EnvelopeIcon } from '@heroicons/react/24/solid';
import { ConsentStep } from './ConsentStep';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (credentials: { username: string; password: string }) => Promise<void>;
  onSignUp: (credentials: { username: string; email: string; password: string }) => Promise<void>;
  isLoading?: boolean;
}

export function AuthModal({ isOpen, onClose, onLogin, onSignUp, isLoading = false }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [signupStep, setSignupStep] = useState<'credentials' | 'consent'>('credentials');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    // Username validation
    if (!username.trim()) {
      newErrors.username = 'Username is required';
    } else if (username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (username.length > 20) {
      newErrors.username = 'Username must be less than 20 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    // Email validation (only for signup)
    if (mode === 'signup') {
      if (!email.trim()) {
        newErrors.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    // Password validation
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (mode === 'signup' && !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and number';
    }

    // Confirm password validation (only for signup)
    if (mode === 'signup') {
      if (!confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (password !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // For signup, handle multi-step flow
    if (mode === 'signup') {
      if (signupStep === 'credentials') {
        // Validate credentials
        if (!validateForm()) return;
        // Move to consent step
        setSignupStep('consent');
        return;
      } else if (signupStep === 'consent') {
        // Validate consent
        if (!consentAccepted) {
          setErrors({ consent: 'You must accept the Terms and Privacy Policy to continue' });
          return;
        }
        // Submit signup
        try {
          await onSignUp({ username, email, password });
          resetForm();
        } catch (error) {
          console.error('Signup error:', error);
        }
        return;
      }
    }

    // Login flow (unchanged)
    if (!validateForm()) return;

    try {
      await onLogin({ username, password });
      resetForm();
    } catch (error) {
      console.error('Auth error:', error);
    }
  };

  const resetForm = () => {
    setUsername('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setConsentAccepted(false);
    setSignupStep('credentials');
    setErrors({});
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setSignupStep('credentials');
    setConsentAccepted(false);
    setErrors({});
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl shadow-[0_20px_80px_rgba(0,0,0,0.9)] overflow-hidden"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors z-10"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>

          {/* Header */}
          <div className="bg-gradient-to-r from-cyan-400/10 to-blue-500/10 border-b border-slate-700/50 px-6 py-8">
            {/* Back button for consent step */}
            {mode === 'signup' && signupStep === 'consent' && (
              <button
                type="button"
                onClick={() => setSignupStep('credentials')}
                className="absolute top-6 left-4 text-slate-400 hover:text-white transition-colors z-10 flex items-center gap-2"
              >
                <ArrowLeftIcon className="w-5 h-5" />
                <span className="text-sm">Back</span>
              </button>
            )}
            
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.35)]">
                <LockClosedIcon className="w-8 h-8 text-black" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-center text-white mb-2">
              {mode === 'login' 
                ? 'Welcome Back' 
                : signupStep === 'credentials' 
                  ? 'Create Account' 
                  : 'Terms & Privacy'}
            </h2>
            <p className="text-center text-slate-400 text-sm">
              {mode === 'login' 
                ? 'Sign in to access your account' 
                : signupStep === 'credentials'
                  ? 'Join STARCYEED and start sharing'
                  : 'Step 2 of 2'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4" autoComplete="on">
            {/* Show consent step for signup */}
            {mode === 'signup' && signupStep === 'consent' ? (
              <ConsentStep
                isAccepted={consentAccepted}
                onAcceptChange={setConsentAccepted}
                error={errors.consent}
              />
            ) : (
              <>
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Username
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <Input
                  type="text"
                  name="username"
                  id="auth-username"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="your profile name"
                  className="pl-10 bg-black/40 border-slate-700/50 text-white placeholder:text-slate-600 focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(34,211,238,0.25)]"
                  disabled={isLoading}
                />
              </div>
              {errors.username && (
                <p className="mt-1 text-xs text-red-400">{errors.username}</p>
              )}
            </div>

            {/* Email (signup only) */}
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email
                </label>
                <div className="relative">
                  <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <Input
                    type="email"
                    name="email"
                    id="auth-email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="pl-10 bg-black/40 border-slate-700/50 text-white placeholder:text-slate-600 focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(34,211,238,0.25)]"
                    disabled={isLoading}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-xs text-red-400">{errors.email}</p>
                )}
              </div>
            )}

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  id="auth-password"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  autoCorrect="off"
                  spellCheck={false}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'login' ? 'your password' : 'create a password'}
                  className="pl-10 pr-10 bg-black/40 border-slate-700/50 text-white placeholder:text-slate-600 focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(34,211,238,0.25)]"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? (
                    <EyeIcon className="w-5 h-5" />
                  ) : (
                    <EyeSlashIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-400">{errors.password}</p>
              )}

            </div>

            {/* Confirm Password (signup only) */}
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirm-password"
                    id="auth-confirm-password"
                    autoComplete="new-password"
                    autoCorrect="off"
                    spellCheck={false}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="confirm your password"
                    className="pl-10 pr-10 bg-black/40 border-slate-700/50 text-white placeholder:text-slate-600 focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(0,212,255,0.25)]"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showConfirmPassword ? (
                      <EyeIcon className="w-5 h-5" />
                    ) : (
                      <EyeSlashIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-400">{errors.confirmPassword}</p>
                )}
              </div>
            )}
            </>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-bold py-3 shadow-[0_0_30px_rgba(0,212,255,0.45)] hover:shadow-[0_0_40px_rgba(0,212,255,0.7)] transition-all"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  {mode === 'login' 
                    ? 'Signing In...' 
                    : signupStep === 'credentials' 
                      ? 'Continue...' 
                      : 'Creating Account...'}
                </span>
              ) : (
                mode === 'login' 
                  ? 'Sign In' 
                  : signupStep === 'credentials' 
                    ? 'Continue to Terms' 
                    : 'Create Account'
              )}
            </Button>

            {/* Switch Mode - only show on credentials step */}
            {(mode === 'login' || signupStep === 'credentials') && (
              <div className="text-center pt-4 border-t border-slate-700/50">
                <p className="text-sm text-slate-400">
                  {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                  <button
                    type="button"
                    onClick={switchMode}
                    className="text-cyan-300 hover:text-cyan-200 font-medium transition-colors"
                    disabled={isLoading}
                  >
                    {mode === 'login' ? 'Sign Up' : 'Sign In'}
                  </button>
                </p>
              </div>
            )}
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
