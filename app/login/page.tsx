'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/api';
import { sanitizeUserForStorage } from '@/lib/utils';
import Link from 'next/link';

export const metadata = {
  title: 'Login',
  description: 'Sign in to your Starcyeed account.',
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Please enter username and password');
      return;
    }
    setIsLoading(true);
    try {
      const { user, token } = await apiClient.login(username, password);
      localStorage.setItem('chat-user', JSON.stringify(sanitizeUserForStorage(user)));
      localStorage.setItem('auth-token', token);
      toast.success(`Welcome back, ${user.username}!`);
      router.push('/profile');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-slate-950 to-black p-4">
      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6 shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
        <h1 className="text-2xl font-bold text-slate-100 mb-4">Login</h1>
        <p className="text-slate-400 mb-6 text-sm">Access your account to continue.</p>
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Username</label>
            <Input
              name="username"
              autoComplete="username"
              id="login-username"
              autoCapitalize="none"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="yourusername"
              className="bg-black/60 border-slate-700/60 text-slate-200"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Password</label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                id="login-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-black/60 border-slate-700/60 text-slate-200 pr-10"
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
        </form>
        <div className="mt-6 text-center text-sm text-slate-400">
          <span>Don&apos;t have an account? </span>
          <Link href="/signup" className="text-cyan-300 hover:text-cyan-200 font-semibold">Sign up</Link>
        </div>
      </div>
    </div>
  );
}
