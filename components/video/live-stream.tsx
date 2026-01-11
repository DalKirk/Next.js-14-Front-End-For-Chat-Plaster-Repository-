'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { VideoCameraIcon, StopIcon } from '@heroicons/react/24/solid';
import { webrtcManager } from '@/lib/webrtc-manager';

interface LiveStreamProps {
  roomId: string;
  userId: string;
  username: string;
  onStreamStart?: (stream: MediaStream) => void;
  onStreamStop?: () => void;
  className?: string;
  fitMode?: 'cover' | 'contain';
  centerBias?: boolean; // if true, bias object-position slightly up for face centering
}

interface CameraDevice {
  deviceId: string;
  label: string;
}

export function LiveStream({ 
  roomId, 
  userId, 
  username,
  onStreamStart, 
  onStreamStop,
  className = '',
  fitMode,
  centerBias = false,
}: LiveStreamProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isStoppingRef = useRef(false);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [isLoadingCameras, setIsLoadingCameras] = useState(false);
  const [error, setError] = useState<string>('');
  const [isPortrait, setIsPortrait] = useState(false);

  // Detect orientation changes
  useEffect(() => {
    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // Load available cameras
  const loadCameras = useCallback(async () => {
    setIsLoadingCameras(true);
    setError('');
    
    try {
      // Request permission first
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      tempStream.getTracks().forEach(track => track.stop());
      
      // Get all video devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices
        .filter(device => device.kind === 'videoinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${device.deviceId.slice(0, 5)}`
        }));
      
      setCameras(videoDevices);
      
      // Auto-select first camera if none selected
      if (videoDevices.length > 0 && !selectedCamera) {
        setSelectedCamera(videoDevices[0].deviceId);
      }
    } catch (err) {
      console.error('Failed to load cameras:', err);
      setError('Failed to access cameras. Please allow camera permissions.');
    } finally {
      setIsLoadingCameras(false);
    }
  }, [selectedCamera]);

  // Initialize cameras on mount
  useEffect(() => {
    loadCameras();
  }, [loadCameras]);

  // Start streaming
  const startStream = useCallback(async () => {
    if (!selectedCamera) {
      setError('Please select a camera first');
      return;
    }

    setError('');
    
    try {
      // Determine optimal video constraints based on orientation and screen size
      const isMobile = window.innerWidth < 1024;
      const aspectRatio = isMobile && isPortrait ? 9/16 : 16/9;
      // Lower resolution for stability (especially mobile portrait)
      const width = isMobile && isPortrait ? 720 : 1280;
      const height = isMobile && isPortrait ? 1280 : 720;
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: selectedCamera,
          width: { ideal: width },
          height: { ideal: height },
          aspectRatio: { ideal: aspectRatio },
          frameRate: { ideal: 24, max: 30 },
          facingMode: isMobile ? 'user' : undefined
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      streamRef.current = stream;
      
      // Display local preview
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Set stream in WebRTC manager for broadcasting
      webrtcManager.setLocalStream(stream);

      setIsStreaming(true);
      onStreamStart?.(stream);
      
      console.log('✅ Stream started:', {
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length
      });
    } catch (err) {
      console.error('Failed to start stream:', err);
      setError('Failed to start camera stream');
    }
  }, [selectedCamera, onStreamStart]);

  // Stop streaming
  const stopStream = useCallback(() => {
    if (isStoppingRef.current) {
      console.log('⚠️ Already stopping, skipping duplicate call');
      return;
    }
    
    isStoppingRef.current = true;
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('🛑 Stopped track:', track.kind);
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsStreaming(false);
    onStreamStop?.();
    
    // Reset flag after a short delay
    setTimeout(() => {
      isStoppingRef.current = false;
    }, 500);
  }, [onStreamStop]);

  // Auto-start stream when camera is selected
  useEffect(() => {
    if (selectedCamera && !isStreaming && cameras.length > 0) {
      // Small delay to ensure everything is ready
      const timer = setTimeout(() => {
        startStream();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [selectedCamera, isStreaming, cameras.length, startStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Call stopStream directly on unmount without dependency
      if (streamRef.current && !isStoppingRef.current) {
        stopStream();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`flex flex-col relative ${className}`}>
      {/* Camera Selection - Hidden when streaming */}
      {!isStreaming && (
        <div className="absolute top-4 left-4 right-4 z-50 space-y-2 bg-black/80 backdrop-blur-sm rounded-lg p-4 lg:relative lg:top-0 lg:left-0 lg:right-0 lg:bg-transparent lg:backdrop-blur-none lg:p-0 lg:mb-4">
          <label className="block text-sm font-medium text-white/90">
            Select Camera
          </label>
          <select
            value={selectedCamera}
            onChange={(e) => setSelectedCamera(e.target.value)}
            disabled={isLoadingCameras || isStreaming}
            className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          >
            <option value="">Select a camera...</option>
            {cameras.map((camera) => (
              <option key={camera.deviceId} value={camera.deviceId}>
                {camera.label}
              </option>
            ))}
          </select>
          
          <Button
            onClick={loadCameras}
            disabled={isLoadingCameras}
            variant="glass"
            size="sm"
            className="w-full"
          >
            {isLoadingCameras ? 'Loading...' : 'Refresh Cameras'}
          </Button>
        </div>
      )}

      {/* Video Preview - Fullscreen on mobile, contained on desktop */}
      <div className="absolute inset-0 bg-black lg:relative lg:inset-auto lg:rounded-xl lg:overflow-hidden lg:aspect-video">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="video-fullscreen"
          style={{
            objectFit: fitMode ? fitMode : undefined,
            objectPosition: centerBias ? '50% 45%' : undefined,
          }}
        />
        
        {!isStreaming && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
            <div className="text-center space-y-2">
              <VideoCameraIcon className="w-16 h-16 text-white/30 mx-auto" />
              <p className="text-white/60 text-sm">
                {selectedCamera ? 'Starting camera...' : 'Loading camera...'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="absolute top-20 left-4 right-4 z-50 bg-red-500/90 backdrop-blur-sm border border-red-500 rounded-lg p-3">
          <p className="text-white text-sm font-semibold">{error}</p>
        </div>
      )}
    </div>
  );
}
