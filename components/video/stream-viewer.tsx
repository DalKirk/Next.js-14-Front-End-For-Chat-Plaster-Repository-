'use client';

import React, { useRef, useEffect, useState } from 'react';
import { UserIcon, SpeakerWaveIcon, SpeakerXMarkIcon } from '@heroicons/react/24/solid';

interface StreamViewerProps {
  stream: MediaStream | null;
  username?: string;
  isLoading?: boolean;
  className?: string;
  fitMode?: 'cover' | 'contain';
  centerBias?: boolean;
}

export function StreamViewer({ 
  stream, 
  username = 'Broadcaster',
  isLoading = false,
  className = '',
  fitMode = 'contain',
  centerBias = false,
}: StreamViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    if (videoRef.current && stream) {
      const video = videoRef.current;
      video.srcObject = stream;
      console.log('📺 Viewer displaying stream:', stream.id);
      console.log('📺 Stream tracks:', stream.getTracks().map(t => `${t.kind}:enabled=${t.enabled}:${t.readyState}`).join(', '));

      // Start muted for autoplay compliance
      video.muted = true;
      setIsMuted(true);

      // Ensure video plays
      video.play().then(() => {
        console.log('▶️ Video playback started (muted - tap to unmute)');
      }).catch((err) => {
        console.warn('⚠️ Video autoplay failed:', err.message);
      });
    }
  }, [stream]);

  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !isMuted;

      // Update React state so the controlled muted={isMuted} prop
      // renders the correct value. With React 19, a bare <video muted>
      // re-applies muted=true on every re-render, undoing DOM toggles.
      setIsMuted(newMuted);

      // Also set the DOM property immediately for instant feedback
      videoRef.current.muted = newMuted;

      if (!newMuted) {
        // Resume AudioContext (required by Android Chrome for first unmute)
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          ctx.resume().then(() => ctx.close()).catch(() => {});
        } catch (_) {}

        // Re-trigger play() within this user gesture so the browser's
        // audio pipeline activates after unmuting
        videoRef.current.play().catch(() => {});
      }

      console.log(newMuted ? '🔇 Audio muted' : '🔊 Audio unmuted');
    }
  };

  return (
    <div className={`relative rounded-xl overflow-hidden bg-black ${className}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isMuted}
        className={`w-full h-full ${fitMode === 'cover' ? 'object-cover' : 'object-contain'}`}
        style={{ objectPosition: centerBias ? '50% 45%' : 'center' }}
      />

      {/* Unmute Button - shown when stream is playing */}
      {stream && (
        <button
          onClick={toggleMute}
          className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm p-2 rounded-full border border-white/20 hover:bg-black/80 transition-colors z-10"
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? (
            <SpeakerXMarkIcon className="w-6 h-6 text-white" />
          ) : (
            <SpeakerWaveIcon className="w-6 h-6 text-white" />
          )}
        </button>
      )}

      {/* Loading State */}
      {isLoading && !stream && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto" />
            <p className="text-white/60 text-sm">Connecting to stream...</p>
          </div>
        </div>
      )}

      {/* No Stream State */}
      {!isLoading && !stream && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
          <div className="text-center space-y-2">
            <UserIcon className="w-16 h-16 text-white/30 mx-auto" />
            <p className="text-white/60 text-sm">Waiting for {username} to start streaming...</p>
          </div>
        </div>
      )}

      {/* Broadcaster Label */}
      {stream && (
        <div className="absolute top-4 left-4 flex items-center space-x-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-white text-sm font-medium">{username}</span>
        </div>
      )}

      {/* Viewer Count (placeholder for future) */}
      {stream && (
        <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
          <span className="text-white text-xs">🟢 LIVE</span>
        </div>
      )}
    </div>
  );
}
