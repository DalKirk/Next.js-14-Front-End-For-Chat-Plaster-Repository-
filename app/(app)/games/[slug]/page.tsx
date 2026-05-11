// app/(app)/games/[slug]/page.tsx

import { notFound } from "next/navigation";
import Link from "next/link";
import { Metadata } from "next";
import { getGameBySlug } from "@/lib/games-service";
import { GamePlayer } from "@/components/games/GamePlayer";
import { GameHeader } from "@/components/games/GameHeader";
import { ShareButton } from "@/components/games/ShareButton";

interface GamePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: GamePageProps): Promise<Metadata> {
  const { slug } = await params;
  const game = await getGameBySlug(slug);

  if (!game) {
    return { title: "Game not found" };
  }

  const description = game.description
    ? game.description.slice(0, 160)
    : `Play ${game.title} by ${game.creator.username} on Starcyeed.`;

  return {
    title: `${game.title} by ${game.creator.username}`,
    description,
    openGraph: {
      title: game.title,
      description,
      type: "website",
      images: game.thumbnail_url ? [{ url: game.thumbnail_url }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: game.title,
      description,
      images: game.thumbnail_url ? [game.thumbnail_url] : [],
    },
  };
}

export default async function GamePage({ params }: GamePageProps) {
  const { slug } = await params;
  const game = await getGameBySlug(slug);

  if (!game) {
    notFound();
  }

  const shareUrl = `https://starcyeed.com/games/${game.slug}`;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Atmospheric background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-emerald-500/5 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] rounded-full bg-cyan-500/5 blur-[120px]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 py-6 sm:py-10">
        {/* Back navigation */}
        <Link
          href="/games"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 text-sm transition-colors group"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 15.75 3 12m0 0 3.75-3.75M3 12h18" />
          </svg>
          Browse games
        </Link>

        {/* Game header */}
        <GameHeader game={game} />

        {/* The game player */}
        <GamePlayer
          gameId={game.id}
          playUrl={game.play_url}
          title={game.title}
        />

        {/* Action bar */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-zinc-500 text-xs">
            Press{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono text-[10px]">F</kbd>{" "}
            for fullscreen while playing
          </p>
          <div className="flex items-center gap-2">
            <ShareButton url={shareUrl} title={game.title} description={game.description} />
          </div>
        </div>

        {/* Description */}
        {game.description && (
          <div className="mt-10 max-w-3xl">
            <h2 className="text-lg font-bold text-white mb-3">About this game</h2>
            <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {game.description}
            </p>
          </div>
        )}

        {/* Info grid */}
        <div className="mt-10 pt-8 border-t border-zinc-800">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <InfoItem label="Engine" value={game.engine.charAt(0).toUpperCase() + game.engine.slice(1)} />
            <InfoItem label="Plays" value={game.play_count.toLocaleString()} />
            <InfoItem label="Size" value={formatBytes(game.file_size_bytes)} />
            <InfoItem label="Released" value={new Date(game.created_at).toLocaleDateString()} />
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-zinc-600 text-xs">
          <p>
            Made with <span className="text-emerald-400">{game.engine}</span> · Hosted on Starcyeed
          </p>
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
  if (!bytes || bytes === 0) return "—";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}
