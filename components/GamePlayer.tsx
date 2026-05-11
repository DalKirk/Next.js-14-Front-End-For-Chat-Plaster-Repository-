'use client';

import { useEffect, useRef, useState } from 'react';

interface GamePlayerProps {
  playUrl: string;
  title?: string;
  className?: string;
}

/**
 * Embeds a hosted HTML5 game in a sandboxed iframe.
 * Always clears iframe.src on unmount to free memory and stop the game loop.
 */
export function GamePlayer({ playUrl, title = 'Game', className = '' }: GamePlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Clear the iframe src on unmount so the game stops and memory is freed.
  useEffect(() => {
    return () => {
      if (iframeRef.current) {
        iframeRef.current.src = '';
      }
    };
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handler = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col rounded-lg overflow-hidden border border-zinc-700 bg-black ${className}`}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900 border-b border-zinc-800 shrink-0">
        <span className="text-xs text-zinc-400 font-medium truncate max-w-[70%]">{title}</span>
        <button
          onClick={toggleFullscreen}
          className="text-xs text-zinc-500 hover:text-white transition-colors"
          title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {fullscreen ? '⊠' : '⛶'}
        </button>
      </div>

      {/* Game iframe */}
      <iframe
        ref={iframeRef}
        src={playUrl}
        title={title}
        allow="autoplay; fullscreen; gamepad; pointer-lock"
        allowFullScreen
        sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-popups"
        className="w-full flex-1 min-h-[400px] border-0"
      />
    </div>
  );
}
