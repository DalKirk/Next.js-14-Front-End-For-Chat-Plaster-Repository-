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

  // Attach stream and start muted playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;

    video.srcObject = stream;

    // Log audio track info for debugging
    const audioTracks = stream.getAudioTracks();
    console.log('📺 Viewer stream:', stream.id);
    console.log('📺 Audio tracks:', audioTracks.length, audioTracks.map(t => `enabled=${t.enabled} readyState=${t.readyState}`));
    console.log('📺 Video tracks:', stream.getVideoTracks().length);

    // Ensure all audio tracks on the incoming stream are enabled
    audioTracks.forEach(t => { t.enabled = true; });

    // Always start muted (browser autoplay policy requires it)
    video.muted = true;
    video.volume = 1; // Ensure volume isn't at 0
    setIsMuted(true);

    video.play().then(() => {
      console.log('▶️ Video playback started (muted — tap speaker icon to unmute)');
    }).catch((err) => {
      console.warn('⚠️ Video autoplay failed:', err.message);
    });
  }, [stream]);

  // Sync muted state to the DOM element (belt-and-suspenders for re-renders)
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    const newMuted = !isMuted;
    video.muted = newMuted;
    setIsMuted(newMuted);

    // CRITICAL: On mobile browsers (iOS Safari, Android Chrome), just setting
    // muted=false on an already-playing video does NOT activate the audio
    // session. You MUST call play() again within the user-gesture context
    // for the browser to allow audio output.
    if (!newMuted) {
      video.play().then(() => {
        console.log('🔊 Audio unmuted — playing with sound');
        console.log('🔊 Verify: muted=%s volume=%s paused=%s', video.muted, video.volume, video.paused);
      }).catch((err) => {
        console.warn('⚠️ Unmuted play() failed, falling back to muted:', err.message);
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
        Use bare "muted" attribute (not muted={isMuted}) so the HTML attribute
        is present in the markup. iOS Safari requires the muted ATTRIBUTE
        (not just the property) for autoplay to be permitted. We control the
        actual muted state via the ref + useEffect above.
      */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
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
