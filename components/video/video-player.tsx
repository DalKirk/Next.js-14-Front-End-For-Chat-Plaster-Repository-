import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Convert playback ID to HLS URL (Bunny.net format)
    // Backend returns playback_id which is the video GUID for Bunny.net
    const hlsUrl = `https://vz-xxx.b-cdn.net/${playbackId}/playlist.m3u8`; // Will be replaced with actual pull zone

    // Check if HLS is supported natively
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = hlsUrl;
    } else if (Hls.isSupported()) {
      // Use HLS.js for other browsers
      const hls = new Hls({
        enableWorker: false, // Disable worker for better compatibility
        lowLatencyMode: true,
        backBufferLength: 90
      });

      hlsRef.current = hls;
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        if (autoPlay) {
          video.play().catch(() => {
            // Autoplay failed, user interaction required
          });
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS.js error:', data);
        if (data.fatal) {
          setHasError(true);
          setIsLoading(false);
        }
      });
    } else {
      setHasError(true);
      setIsLoading(false);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [playbackId, autoPlay]);

  const handleError = () => {
    console.error('Video element error');
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
            <div className="text-white/90 text-sm">{title || 'Video'}</div>
            <div className="text-red-300/80 text-xs">
              Video unavailable - check Bunny.net configuration
            </div>
            <button
              onClick={() => {
                setHasError(false);
                setIsLoading(true);
                // Reload the component
                window.location.reload();
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
      <video
        ref={videoRef}
        controls
        muted={muted}
        poster={thumbnailTime > 0 ? `https://vz-xxx.b-cdn.net/${playbackId}/thumbnail.jpg?time=${thumbnailTime}` : undefined}
        className="w-full aspect-video bg-black"
        onError={handleError}
        onLoadStart={handleLoadStart}
        onCanPlay={handleCanPlay}
        preload="metadata"
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
}