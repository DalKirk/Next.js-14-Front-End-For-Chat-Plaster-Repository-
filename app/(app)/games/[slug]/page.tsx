'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getGamesByUser, type Game } from '@/lib/games-service';
import { GamePlayer } from '@/components/games/GamePlayer';
import { GameHeader } from '@/components/games/GameHeader';
import { ShareButton } from '@/components/games/ShareButton';
import { Gamepad2 } from 'lucide-react';

export default function GamePage() {
  const params = useParams();
  const slug = typeof params.slug === 'string' ? params.slug : Array.isArray(params.slug) ? params.slug[0] : '';

  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) { setNotFound(true); setLoading(false); return; }

    try {
      const raw = localStorage.getItem('chat-user');
      const token = localStorage.getItem('auth-token') ?? '';
      if (!raw) { setNotFound(true); setLoading(false); return; }

      const user = JSON.parse(raw);
      const userId: string = user.id ?? user.user_id ?? '';
      if (!userId) { setNotFound(true); setLoading(false); return; }

      getGamesByUser(userId, token).then(games => {
        const found = games.find(g => g.slug === slug);
        if (found) {
          setGame(found);
        } else {
          setNotFound(true);
        }
      }).catch(() => setNotFound(true)).finally(() => setLoading(false));
    } catch {
      setNotFound(true);
      setLoading(false);
    }
  }, [slug]);

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/games/${slug}`
    : `https://starcyeed.com/games/${slug}`;

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-zinc-400 text-sm animate-pulse">Loading game…</div>
      </div>
    );
  }

  if (notFound || !game) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center gap-6 px-4">
        <Gamepad2 className="w-12 h-12 text-zinc-700" />
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Game not found</h1>
          <p className="text-zinc-400 text-sm mb-6">This game may have been removed or the link is incorrect.</p>
          <div className="flex gap-3 justify-center">
            <Link href="/games" className="px-5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm transition-colors">
              Browse games
            </Link>
            <Link href="/" className="px-5 py-2 rounded-lg border border-zinc-700 hover:border-zinc-500 text-sm transition-colors">
              Go home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-emerald-500/5 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] rounded-full bg-cyan-500/5 blur-[120px]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 py-6 sm:py-10">
        <Link
          href="/games"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 text-sm transition-colors group"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 15.75 3 12m0 0 3.75-3.75M3 12h18" />
          </svg>
          Browse games
        </Link>

        <GameHeader game={game} />

        <GamePlayer gameId={game.id} playUrl={game.play_url} title={game.title} />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-zinc-500 text-xs">
            Press{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono text-[10px]">F</kbd>{' '}
            for fullscreen while playing
          </p>
          <ShareButton url={shareUrl} title={game.title} description={game.description} />
        </div>

        {game.description && (
          <div className="mt-10 max-w-3xl">
            <h2 className="text-lg font-bold text-white mb-3">About this game</h2>
            <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">{game.description}</p>
          </div>
        )}

        <div className="mt-10 pt-8 border-t border-zinc-800">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <InfoItem label="Engine" value={game.engine.charAt(0).toUpperCase() + game.engine.slice(1)} />
            <InfoItem label="Plays" value={(game.play_count ?? 0).toLocaleString()} />
            <InfoItem label="Size" value={formatBytes(game.file_size_bytes)} />
            <InfoItem label="Released" value={new Date(game.created_at).toLocaleDateString()} />
          </div>
        </div>

        <footer className="mt-12 text-center text-zinc-600 text-xs">
          <p>Made with <span className="text-emerald-400">{game.engine}</span> · Hosted on Starcyeed</p>
        </footer>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-zinc-500 font-medium mb-1">{label}</p>
      <p className="text-white font-medium">{value}</p>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '—';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}
