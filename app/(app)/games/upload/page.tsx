'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GameUpload } from '@/components/GameUpload';
import type { UploadResult } from '@/types/upload';
import { StorageUtils } from '@/lib/storage-utils';

export default function GameUploadPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);

  useEffect(() => {
    try {
      const raw = StorageUtils.safeGetItem('chat-user');
      if (raw) {
        const parsed = JSON.parse(raw);
        const id = parsed?.id ?? parsed?.user_id ?? parsed?._id ?? null;
        setUserId(id);
      }
    } catch { /* not logged in */ }
  }, []);

  if (!userId) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-zinc-400 text-lg">You must be logged in to upload games.</p>
          <Link href="/login" className="inline-block px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold transition-all">
            Log in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-zinc-950 overflow-hidden">
      {/* Atmospheric background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-emerald-500/10 blur-[100px]" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-cyan-500/10 blur-[100px]" />
        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-12 sm:py-20">
        {/* Header */}
        <div className="text-center mb-10">
          <Link href="/games" className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-300 text-sm mb-6 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Browse Games
          </Link>

          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-3">
            Publish your game
          </h1>
          <p className="text-zinc-400 text-base max-w-md mx-auto">
            Upload a <code className="text-emerald-400 bg-zinc-900 px-1.5 py-0.5 rounded text-sm">.zip</code> file containing your HTML5 game and share it instantly with the community.
          </p>
        </div>

        {/* Upload component */}
        <GameUpload
          userId={userId}
          onSuccess={(r) => { setResult(r); }}
          className="mb-8"
        />

        {/* Footer info — only show before completion */}
        {!result && (
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            {[
              { icon: '⚡', label: 'Instant CDN', desc: 'Globally distributed' },
              { icon: '🎮', label: 'Any engine', desc: 'Unity, Godot, HTML5…' },
              { icon: '🔗', label: 'Shareable link', desc: 'One click to play' },
            ].map((f) => (
              <div key={f.label} className="rounded-xl bg-zinc-900/50 border border-zinc-800/50 px-4 py-5">
                <div className="text-2xl mb-2">{f.icon}</div>
                <p className="text-white font-semibold text-sm">{f.label}</p>
                <p className="text-zinc-500 text-xs mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
