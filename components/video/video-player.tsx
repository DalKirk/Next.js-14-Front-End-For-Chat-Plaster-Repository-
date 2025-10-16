import React, { useState } from 'react';
import MuxPlayer from '@mux/mux-player-react';

interface VideoPlayerProps {
  playbackId: string;
  title?: string;
  thumbnailTime?: number;
  autoPlay?: boolean;
  muted?: boolean;
  className?: string;
}

export function VideoPlayer({ 
  playbackId, 
  title, 
  thumbnailTime = 0,
  autoPlay = false,
  muted = true,
  className = ''
}: VideoPlayerProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const handleError = (error: any) => {
    console.error('Video player error:', error);
    setHasError(true);
    setIsLoading(false);
  };
  
  const handleLoadStart = () => {
    setIsLoading(true);
    setHasError(false);
  };
  
  const handleCanPlay = () => {
    setIsLoading(false);
  };
  
  if (hasError) {
    // Error state: Show a user-friendly error message
    return (
      <div className={`relative rounded-xl overflow-hidden shadow-2xl border border-red-500/30 bg-red-900/20 ${className}`}>
        <div className="aspect-video flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="text-red-400 text-2xl">⚠️</div>
            <div className="text-white/90 text-sm">{title || 'Video'}</div>
            <div className="text-red-300/80 text-xs">
              Backend connection required for video playback
            </div>
            <button 
              onClick={() => {
                setHasError(false);
                setIsLoading(true);
              }}
              className="text-xs text-blue-300 hover:text-blue-200 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative rounded-xl overflow-hidden shadow-2xl border border-white/20 ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-800/50 flex items-center justify-center z-10">
          <div className="text-white/70 text-sm">Loading video...</div>
        </div>
      )}
      <MuxPlayer
        playbackId={playbackId}
        metadata={{
          video_title: title || 'Video',
        }}
        thumbnailTime={thumbnailTime}
        autoPlay={autoPlay}
        muted={muted}
        accentColor="#00d4ff"
        primaryColor="#ffffff"
        secondaryColor="#a0a6ad"
        onError={handleError}
        onLoadStart={handleLoadStart}
        onCanPlay={handleCanPlay}
        style={{
          width: '100%',
          aspectRatio: '16/9',
        }}
      />
    </div>
  );
}