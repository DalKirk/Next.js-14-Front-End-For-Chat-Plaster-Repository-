'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isMuted, setIsMuted] = useState(true);

  // Mute the element the instant React creates it (before any render paint).
  // This guarantees iOS/Android see a muted element for autoplay policy.
  const attachRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node) {
      node.defaultMuted = true;   // HTML content‑attribute equivalent
      node.muted = true;          // DOM property
    }
  }, []);

  useEffect(() => {
    if (videoRef.current && stream) {
      const video = videoRef.current;
      video.srcObject = stream;
      console.log('📺 Viewer displaying stream:', stream.id);
      console.log('📺 Stream tracks:', stream.getTracks().map(t => `${t.kind}:enabled=${t.enabled}:${t.readyState}`).join(', '));

      // Always start muted for autoplay compliance
      video.muted = true;
      setIsMuted(true);

      video.play().then(() => {
        console.log('▶️ Video playback started (muted — tap to unmute)');
      }).catch((err) => {
        console.warn('⚠️ Video autoplay failed:', err.message);
      });
    }
  }, [stream]);

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    const newMuted = !video.muted;
    video.muted = newMuted;
    setIsMuted(newMuted);

    if (!newMuted) {
      // Re-trigger play() inside the tap gesture so mobile browsers
      // actually activate the audio output pipeline.
      video.play().then(() => {
        console.log('🔊 Audio unmuted — playing with sound');
      }).catch((err) => {
        console.warn('⚠️ Unmuted play() failed:', err.message);
        // Fall back to muted playback so the video doesn't stall
        video.muted = true;
        setIsMuted(true);
        video.play().catch(() => {});
      });
    } else {
      console.log('🔇 Audio muted');
    }
  };

  return (
    <div className={`relative rounded-xl overflow-hidden bg-black ${className}`}>
      {/* 
        IMPORTANT: No "muted" prop on <video>.
        React 19 re-applies muted={true} on every re-render, which immediately
        overrides our ref-based unmute. Controlling muted entirely via the ref
        (attachRef + toggleMute) keeps React out of the loop.
      */}
      <video
        ref={attachRef}
        autoPlay
        playsInline
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
