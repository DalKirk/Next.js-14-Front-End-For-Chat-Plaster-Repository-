'use client'

import { useEffect, useRef, useState, useId } from 'react'
import { useMediaPlayback } from '@/contexts/MediaPlaybackContext'
import { Volume2, VolumeX } from 'lucide-react'

interface FeedVideoProps {
  src: string
  className?: string
  /** Intersection threshold to trigger auto-play (0-1). Default 0.5 */
  threshold?: number
}

export function FeedVideo({ src, className, threshold = 0.5 }: FeedVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const uniqueId = useId()
  const { registerPlaying, unregister } = useMediaPlayback()
  const [muted, setMuted] = useState(true)
  const [isVisible, setIsVisible] = useState(false)
  const [userPaused, setUserPaused] = useState(false)

  // IntersectionObserver: auto-play muted when in view, pause when out
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting
        setIsVisible(visible)
        const video = videoRef.current
        if (!video) return

        if (visible && !userPaused) {
          video.muted = true
          setMuted(true)
          video.play().catch(() => {})
        } else {
          video.pause()
          unregister(uniqueId)
        }
      },
      { threshold }
    )

    observer.observe(el)
    return () => {
      observer.disconnect()
      unregister(uniqueId)
    }
  }, [threshold, uniqueId, unregister, userPaused])

  // Handle unmute/mute toggle
  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return

    if (muted) {
      // Unmuting — register as the active audio source
      video.muted = false
      setMuted(false)
      registerPlaying(uniqueId, () => {
        // Called when another media takes over
        video.muted = true
        setMuted(true)
      })
    } else {
      video.muted = true
      setMuted(true)
      unregister(uniqueId)
    }
  }

  // When user manually pauses/plays via native controls
  const handlePause = () => {
    // Only mark as user-paused if the video is visible (not an auto-pause from scroll)
    if (isVisible) {
      setUserPaused(true)
    }
    unregister(uniqueId)
  }

  const handlePlay = () => {
    setUserPaused(false)
    const video = videoRef.current
    if (video && !video.muted) {
      registerPlaying(uniqueId, () => {
        video.muted = true
        setMuted(true)
      })
    }
  }

  const handleEnded = () => {
    unregister(uniqueId)
  }

  return (
    <div ref={containerRef} className="relative group">
      <video
        ref={videoRef}
        src={src}
        muted
        playsInline
        webkit-playsinline="true"
        preload="metadata"
        loop
        className={className}
        onPause={handlePause}
        onPlay={handlePlay}
        onEnded={handleEnded}
      />

      {/* Mute/unmute overlay button */}
      <button
        onClick={toggleMute}
        className="absolute bottom-3 right-3 p-2 rounded-full bg-black/60 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-black/80 z-10"
        style={{ WebkitTapHighlightColor: 'transparent' }}
        aria-label={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>

      {/* Persistent small muted indicator (always visible when muted & playing) */}
      {muted && isVisible && !userPaused && (
        <button
          onClick={toggleMute}
          className="absolute bottom-3 right-3 p-2 rounded-full bg-black/60 backdrop-blur-sm text-white group-hover:opacity-0 transition-opacity duration-200 z-[9]"
          aria-label="Tap to unmute"
        >
          <VolumeX className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
