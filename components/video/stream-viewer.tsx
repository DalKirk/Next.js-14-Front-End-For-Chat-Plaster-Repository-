'use client';

import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { UserIcon, SpeakerWaveIcon, SpeakerXMarkIcon } from '@heroicons/react/24/solid';

export interface StreamViewerHandle {
  toggleMute: () => void;
  isMuted: () => boolean;
}

interface StreamViewerProps {
  stream: MediaStream | null;
  username?: string;
  isLoading?: boolean;
  className?: string;
  fitMode?: 'cover' | 'contain';
  centerBias?: boolean;
  /** Called whenever muted state changes — lets the parent render its own button */
  onMuteChange?: (muted: boolean) => void;
  /** When true the built-in mute button is hidden (parent renders its own) */
  hideBuiltInMuteButton?: boolean;
}

export const StreamViewer = forwardRef<StreamViewerHandle, StreamViewerProps>(function StreamViewer({ 
  stream, 
  username = 'Broadcaster',
  isLoading = false,
  className = '',
  fitMode = 'contain',
  centerBias = false,
  onMuteChange,
  hideBuiltInMuteButton = false,
}, ref) {
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const [isMuted, setIsMuted] = useState(true);

  // Ref callback: sets muted=true the instant the <video> element is
  // created — BEFORE React triggers autoPlay — so mobile browsers allow
  // the autoplay.  We never pass `muted` as a JSX prop because React
  // has a known bug (facebook/react #10389) where it mishandles the
  // muted attribute vs the DOM property, silently re-muting on re-render.
  const videoRefCb = useCallback((el: HTMLVideoElement | null) => {
    videoElRef.current = el;
    if (el) {
      el.muted = true;
    }
  }, []);

  // After EVERY render, force the DOM property to match our intent.
  // Parent re-renders (new chat messages, WS events, etc.) can cause
  // React to reconcile the <video> element.  Without a `muted` prop
  // React won't touch it, but this effect is our safety net.
  useEffect(() => {
    if (videoElRef.current) {
      videoElRef.current.muted = isMuted;
    }
  });

  // Expose toggleMute / isMuted to the parent via ref so the room
  // page can place a mute button anywhere (e.g. the mobile controls
  // bar which sits at a higher z-index than the video layer).
  useImperativeHandle(ref, () => ({
    toggleMute,
    isMuted: () => isMuted,
  }), [isMuted]);

  // Attach the remote stream when it arrives
  useEffect(() => {
    if (videoElRef.current && stream) {
      const video = videoElRef.current;
      video.srcObject = stream;
      console.log('📺 Viewer displaying stream:', stream.id);
      console.log('📺 Stream tracks:', stream.getTracks().map(t => `${t.kind}:enabled=${t.enabled}:${t.readyState}`).join(', '));

      // Always start muted for autoplay compliance
      video.muted = true;
      setIsMuted(true);
      onMuteChange?.(true);

      video.play().then(() => {
        console.log('▶️ Video playback started (muted - tap to unmute)');
      }).catch((err) => {
        console.warn('⚠️ Video autoplay failed:', err.message);
      });
    }
  }, [stream]);

  const toggleMute = useCallback(() => {
    const video = videoElRef.current;
    if (!video) return;

    const newMuted = !video.muted;

    // 1. Set the DOM property FIRST for immediate effect
    video.muted = newMuted;

    if (!newMuted) {
      // Resume AudioContext — required by Android Chrome on first unmute
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        ctx.resume().then(() => ctx.close()).catch(() => {});
      } catch (_) {}

      // Re-trigger play() inside this user gesture so the browser's
      // audio pipeline activates after unmuting
      video.play().catch(() => {});
    }

    // 2. Update React state — triggers re-render, but the
    //    post-render useEffect above will re-apply the correct value
    setIsMuted(newMuted);
    onMuteChange?.(newMuted);

    console.log(newMuted ? '🔇 Audio muted' : '🔊 Audio unmuted');
  }, [onMuteChange]);

  return (
    <div className={`relative rounded-xl overflow-hidden bg-black ${className}`}>
      {/* NO muted prop — React must never touch video.muted.
          The ref callback and post-render effect handle it. */}
      <video
        ref={videoRefCb}
        autoPlay
        playsInline
        className={`w-full h-full ${fitMode === 'cover' ? 'object-cover' : 'object-contain'}`}
        style={{ objectPosition: centerBias ? '50% 45%' : 'center' }}
      />

      {/* Unmute Button - shown when stream is playing.
          Hidden on mobile where the parent renders its own button
          in the controls bar (which sits at a higher z-index). */}
      {stream && !hideBuiltInMuteButton && (
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
});
