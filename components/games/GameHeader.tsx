// components/games/GameHeader.tsx
"use client";

import Link from "next/link";
import { EngineIcon } from "@/components/upload/EngineIcon";
import { getEngineLabel } from "@/lib/upload-utils";
import type { Game } from "@/lib/games-service";

interface GameHeaderProps {
  game: Game;
}

export function GameHeader({ game }: GameHeaderProps) {
  const playCountDisplay = formatPlayCount(game.play_count);

  return (
    <div className="mb-6">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="min-w-0">
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-1 break-words">
            {game.title}
          </h1>
          <Link
            href={`/u/${game.creator.username}`}
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-emerald-400 transition-colors group"
          >
            {game.creator.avatar_url ? (
              <img
                src={game.creator.avatar_url}
                alt={game.creator.username}
                className="w-6 h-6 rounded-full bg-zinc-800"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center text-xs font-bold text-white">
                {game.creator.username.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-sm font-medium group-hover:underline">
              {game.creator.username}
            </span>
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 font-medium">
          <EngineIcon engine={game.engine} size={14} className="opacity-90" />
          {getEngineLabel(game.engine)}
        </span>

        <span className="inline-flex items-center gap-1.5 text-zinc-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
          <span className="font-medium">{playCountDisplay}</span>
          <span className="text-zinc-500 hidden sm:inline">plays</span>
        </span>

        <span className="inline-flex items-center gap-1.5 text-zinc-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
          </svg>
          <span className="text-sm">{formatDate(game.created_at)}</span>
        </span>
      </div>
    </div>
  );
}

function formatPlayCount(count: number): string {
  if (count < 1000) return count.toString();
  if (count < 1000000) return `${(count / 1000).toFixed(count < 10000 ? 1 : 0)}K`;
  return `${(count / 1000000).toFixed(1)}M`;
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  } catch {
    return dateStr;
  }
}
