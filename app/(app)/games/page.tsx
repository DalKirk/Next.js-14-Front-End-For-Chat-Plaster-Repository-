'use client';

import { useEffect, useState } from 'react';
import { Gamepad2, Upload, Search, Trash2, Home } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { getGamesByUser, deleteGame, type Game } from '@/lib/games-service';
import { getEngineLabel } from '@/lib/upload-utils';
import { StorageUtils } from '@/lib/storage-utils';

const ENGINE_COLORS: Record<string, string> = {
  unity: '#CCCCCC', godot: '#478CBF', html5: '#E34F26',
  webassembly: '#654FF0', phaser: '#2CCA8F', gamemaker: '#FAAF17',
  construct: '#00FFDA', unknown: '#6B7280',
};

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [userId, setUserId] = useState('');
  const [userToken, setUserToken] = useState('');

  useEffect(() => {
    const raw = StorageUtils.safeGetItem('chat-user');
    const token = localStorage.getItem('auth-token') ?? '';
    setIsLoggedIn(!!raw);
    setUserToken(token);

    if (raw) {
      try {
        const user = JSON.parse(raw);
        const uid: string = user.id ?? user.user_id ?? '';
        setUserId(uid);
        const userId = uid;
        if (userId) {
          getGamesByUser(userId, token).then(data => {
            console.log('[Browse Games] fetched', data.length, 'games');
            setGames(data);
          }).catch(console.error).finally(() => setLoading(false));
          return;
        }
      } catch { /* fall through */ }
    }
    setLoading(false);
  }, []);

  const filtered = search.trim()
    ? games.filter(g =>
        g.title.toLowerCase().includes(search.toLowerCase()) ||
        g.creator.username.toLowerCase().includes(search.toLowerCase()) ||
        g.engine.toLowerCase().includes(search.toLowerCase())
      )
    : games;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-emerald-500/4 blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-cyan-500/4 blur-[100px]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link href="/" className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors" title="Home">
                <Home className="w-4 h-4" />
              </Link>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Browse Games</h1>
            </div>
            <p className="text-zinc-400 text-sm">Discover and play games made by the community</p>
          </div>
          {isLoggedIn && (
            <Link
              href="/games/upload"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 px-5 py-2.5 text-sm font-semibold transition-all shadow-lg shadow-emerald-500/20 shrink-0"
            >
              <Upload className="w-4 h-4" /> Upload a game
            </Link>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search games, creators, or engines..."
            className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
          />
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-zinc-900/50 border border-zinc-800 h-[200px] animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 space-y-4">
            <Gamepad2 className="w-12 h-12 mx-auto text-zinc-700" />
            <p className="text-zinc-400 font-medium">
              {search ? 'No games matched your search.' : isLoggedIn ? 'You haven\'t uploaded any games yet.' : 'Sign in to see your uploaded games.'}
            </p>
            {!search && isLoggedIn && (
              <Link href="/games/upload" className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 text-sm transition-colors">
                <Upload className="w-4 h-4" /> Upload your first game
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(game => (
              <div key={game.id} className="group relative rounded-2xl border border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/70 transition-all overflow-hidden">
                {/* Delete button — top-right corner, only visible on hover */}
                {isLoggedIn && (
                  <button
                    onClick={async (e) => {
                      e.preventDefault();
                      if (!confirm(`Delete "${game.title}"? This cannot be undone.`)) return;
                      setDeletingId(game.id);
                      const ok = await deleteGame(game.id, userId, userToken);
                      setDeletingId(null);
                      if (ok) {
                        setGames(prev => prev.filter(g => g.id !== game.id));
                        toast.success(`"${game.title}" deleted`);
                      } else {
                        toast.error('Failed to delete game. Please try again.');
                      }
                    }}
                    disabled={deletingId === game.id}
                    className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-black/60 text-zinc-400 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400 transition-all disabled:opacity-50"
                    title="Delete game"
                  >
                    {deletingId === game.id
                      ? <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                      : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                )}
                <Link href={`/games/${game.slug}`} className="block">
                {/* Thumbnail or placeholder */}
                <div className="relative aspect-video bg-gradient-to-br from-zinc-900 to-black overflow-hidden">
                  {game.thumbnail_url ? (
                    <img
                      src={game.thumbnail_url}
                      alt={game.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div
                        className="absolute inset-0 opacity-[0.03]"
                        style={{
                          backgroundImage: `linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)`,
                          backgroundSize: '24px 24px',
                        }}
                      />
                      <Gamepad2 className="w-10 h-10 text-zinc-700" />
                    </div>
                  )}

                  {/* Play overlay on hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-all duration-300">
                    <div className="w-14 h-14 rounded-full bg-white/0 group-hover:bg-white/10 border border-white/0 group-hover:border-white/20 flex items-center justify-center scale-75 group-hover:scale-100 transition-all duration-300">
                      <svg className="w-6 h-6 text-white/0 group-hover:text-white ml-1 transition-colors duration-300" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>

                  {/* Engine badge */}
                  <div className="absolute bottom-2 left-2">
                    <span
                      className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
                      style={{
                        background: 'rgba(0,0,0,0.7)',
                        color: ENGINE_COLORS[game.engine] ?? '#9ca3af',
                        border: `1px solid ${ENGINE_COLORS[game.engine] ?? '#374151'}30`,
                      }}
                    >
                      {getEngineLabel(game.engine)}
                    </span>
                  </div>
                </div>

                {/* Card body */}
                <div className="p-4">
                  <h3 className="font-semibold text-white text-sm truncate mb-1 group-hover:text-emerald-300 transition-colors">
                    {game.title}
                  </h3>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {game.creator?.avatar_url ? (
                        <img src={game.creator.avatar_url} alt={game.creator.username} className="w-4 h-4 rounded-full" />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-zinc-700 flex items-center justify-center text-[8px] font-bold">
                          {(game.creator?.username ?? '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-xs text-zinc-400">{game.creator?.username ?? 'creator'}</span>
                    </div>
                    <span className="text-xs text-zinc-500">{(game.play_count ?? 0).toLocaleString()} plays</span>
                  </div>
                  {game.description && (
                    <p className="text-xs text-zinc-500 mt-2 line-clamp-2 leading-relaxed">{game.description}</p>
                  )}
                </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
