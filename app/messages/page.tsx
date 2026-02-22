'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Mail } from 'lucide-react';
import DMSection from '@/components/dm/DMSection';
import { User } from '@/lib/types';

export default function MessagesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Get user from localStorage
    const savedUser = localStorage.getItem('chat-user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setUser(parsed);
    } else {
      // Redirect to home if not logged in
      router.push('/');
    }
  }, [router]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-black flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-black">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-900/80 border-b border-slate-700/50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center justify-center">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Messages</h1>
                {unreadCount > 0 && (
                  <p className="text-xs text-cyan-400">{unreadCount} unread</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
            >
              Profile
            </Link>
            <Link
              href="/chat"
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 text-white text-sm font-medium hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all"
            >
              Rooms
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-slate-900/80 via-slate-800/80 to-slate-900/80 rounded-xl border border-slate-700/50 overflow-hidden"
        >
          <DMSection
            currentUser={{
              id: user.id,
              username: user.username,
              avatar_url: (user as any).avatar,
              avatar_urls: user.avatar_urls,
            }}
            onUnreadCountChange={setUnreadCount}
          />
        </motion.div>
      </main>
    </div>
  );
}
