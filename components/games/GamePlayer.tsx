// components/games/GamePlayer.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { recordPlay } from "@/lib/games-service";

interface GamePlayerProps {
  gameId: string;
  playUrl: string;
  title: string;
}

export function GamePlayer({ gameId, playUrl, title }: GamePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handlePlay = async () => {
    setIsLoading(true);
    setIsPlaying(true);
    setHasError(false);
    recordPlay(gameId);
  };

  const handleStop = () => {
    if (iframeRef.current) {
      iframeRef.current.src = "about:blank";
    }
    setIsPlaying(false);
    setIsLoading(false);
  };

  const handleFullscreen = () => {
    const elem = containerRef.current;
    if (!elem) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (elem.requestFullscreen) {
      elem.requestFullscreen();
    }
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPlaying && e.key === "f") {
        handleFullscreen();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying]);

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-800 group"
    >
      {!isPlaying ? (
        <PlayOverlay onPlay={handlePlay} title={title} />
      ) : (
        <>
          <iframe
            ref={iframeRef}
            src={playUrl}
            title={title}
            className="absolute inset-0 w-full h-full"
            allow="gamepad; fullscreen; autoplay; pointer-lock; web-share"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-presentation"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
          />

          {isLoading && <LoadingOverlay />}
          {hasError && <ErrorOverlay onRetry={handlePlay} />}

          {!isLoading && !hasError && (
            <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
              <ControlButton
                onClick={handleFullscreen}
                label="Fullscreen"
                icon={
                  <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                  </svg>
                }
              />
              <ControlButton
                onClick={handleStop}
                label="Stop"
                icon={
                  <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z" />
                  </svg>
                }
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PlayOverlay({ onPlay, title }: { onPlay: () => void; title: string }) {
  return (
    <button
      onClick={onPlay}
      className="absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-zinc-900 to-black hover:from-zinc-800 hover:to-zinc-950 transition-all group/play"
      aria-label={`Play ${title}`}
    >
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 via-transparent to-cyan-500/0 group-hover/play:from-emerald-500/10 group-hover/play:to-cyan-500/10 transition-all duration-500" />

      <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center mb-4 shadow-2xl shadow-emerald-500/20 group-hover/play:scale-110 group-hover/play:shadow-emerald-500/40 transition-all duration-300">
        <div className="absolute inset-0 rounded-full bg-emerald-500/30 animate-ping" />
        <svg className="w-12 h-12 text-white ml-1 relative" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>

      <h3 className="text-white text-2xl font-bold mb-1">Click to play</h3>
      <p className="text-zinc-500 text-sm">Press F for fullscreen once loaded</p>
    </button>
  );
}

function LoadingOverlay() {
  return (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
      <div className="relative w-16 h-16 mb-6">
        <div className="absolute inset-0 rounded-full border-4 border-zinc-800" />
        <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
      </div>
      <p className="text-white font-semibold text-lg mb-1">Loading game...</p>
      <p className="text-zinc-500 text-sm">This may take a moment for larger games</p>
    </div>
  );
}

function ErrorOverlay({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center text-center px-6 z-10">
      <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
      </div>
      <h3 className="text-white text-xl font-bold mb-2">Failed to load game</h3>
      <p className="text-zinc-400 text-sm mb-6 max-w-sm">
        The game files couldn't be loaded. This might be a temporary issue.
      </p>
      <button
        onClick={onRetry}
        className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-sm transition-colors"
      >
        Try again
      </button>
    </div>
  );
}

function ControlButton({
  onClick,
  label,
  icon,
}: {
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="w-10 h-10 rounded-lg bg-black/60 backdrop-blur-md hover:bg-black/80 text-white/80 hover:text-white border border-white/10 hover:border-white/20 transition-all flex items-center justify-center"
    >
      <span className="w-5 h-5">{icon}</span>
    </button>
  );
}
