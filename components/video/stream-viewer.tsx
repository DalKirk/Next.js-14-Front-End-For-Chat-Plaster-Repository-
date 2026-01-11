'use client';

import React, { useRef, useEffect } from 'react';
import { UserIcon } from '@heroicons/react/24/solid';

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

  useEffect(() => {
    if (videoRef.current && stream) {
      const video = videoRef.current;
      video.srcObject = stream;
      console.log('📺 Viewer displaying stream:', stream.id);
      console.log('📺 Stream tracks:', stream.getTracks().map(t => `${t.kind}:${t.readyState}`).join(', '));
      
      // Ensure video plays
      video.play().then(() => {
        console.log('▶️ Video playback started');
      }).catch((err) => {
        console.warn('⚠️ Video autoplay failed:', err.message);
        // Try muted autoplay as fallback
        video.muted = true;
        video.play().catch((e) => console.error('❌ Muted autoplay also failed:', e));
      });
    }
  }, [stream]);

  return (
    <div className={`relative rounded-xl overflow-hidden bg-black aspect-video ${className}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full"
        style={{ objectFit: fitMode, objectPosition: centerBias ? '50% 45%' : 'center' }}
      />

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
