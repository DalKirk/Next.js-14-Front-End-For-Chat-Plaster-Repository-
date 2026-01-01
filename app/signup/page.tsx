'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/api';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    setIsLoading(true);
    try {
      const { user, token } = await apiClient.signup(username, email, password);
      localStorage.setItem('chat-user', JSON.stringify(user));
      localStorage.setItem('auth-token', token);
      try { localStorage.setItem('showProfileOnboard', 'true'); } catch {}
      toast.success(`Account created! Welcome, ${user.username}!`);
      router.push('/profile?edit=true');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Signup failed';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-slate-950 to-black p-4">
      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6 shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
        <h1 className="text-2xl font-bold text-slate-100 mb-4">Sign Up</h1>
        <p className="text-slate-400 mb-6 text-sm">Create your account to get started.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Username</label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="yourusername"
              className="bg-black/60 border-slate-700/60 text-slate-200"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="bg-black/60 border-slate-700/60 text-slate-200"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-black/60 border-slate-700/60 text-slate-200"
            />
          </div>
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-black font-bold"
          >
            {isLoading ? 'Creating account...' : 'Sign Up'}
          </Button>
        </form>
        <div className="mt-6 text-center text-sm text-slate-400">
          <span>Already have an account? </span>
          <Link href="/login" className="text-green-400 hover:text-green-300 font-semibold">Login</Link>
        </div>
      </div>
    </div>
  );
}
