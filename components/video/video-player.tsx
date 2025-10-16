import React from 'react';
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
  return (
    <div className={`relative rounded-xl overflow-hidden shadow-2xl border border-white/20 ${className}`}>
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
        style={{
          width: '100%',
          aspectRatio: '16/9',
        }}
      />
    </div>
  );
}