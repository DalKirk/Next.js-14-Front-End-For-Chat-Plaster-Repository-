'use client'

import { useEffect, useRef, useState, useId, useCallback } from 'react'
import { useMediaPlayback } from '@/contexts/MediaPlaybackContext'
import { Volume2, VolumeX } from 'lucide-react'

interface FeedVideoProps {
  src: string
  className?: string
}

export function FeedVideo({ src, className }: FeedVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const uniqueId = useId()
  const { registerPlaying, unregister } = useMediaPlayback()
  const [muted, setMuted] = useState(true)
  const [isVisible, setIsVisible] = useState(false)
  // Track whether auto-pause (from scrolling) vs user-initiated pause
  const autoPausedRef = useRef(false)
  const userPausedRef = useRef(false)

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

        if (visible) {
          // Scrolled back into view — auto-play unless user explicitly paused
          if (!userPausedRef.current) {
            autoPausedRef.current = false
            video.muted = true
            setMuted(true)
            video.play().catch(() => {})
          }
        } else {
          // Scrolled out of view — auto-pause
          if (!video.paused) {
            autoPausedRef.current = true
            video.pause()
          }
          unregister(uniqueId)
        }
      },
      { threshold: 0.25 }
    )

    observer.observe(el)
    return () => {
      observer.disconnect()
      unregister(uniqueId)
    }
  }, [uniqueId, unregister])

  // Handle unmute/mute toggle
  const toggleMute = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    // If video is paused, start playing unmuted
    if (video.paused) {
      userPausedRef.current = false
      video.muted = false
      setMuted(false)
      video.play().catch(() => {})
      registerPlaying(uniqueId, () => {
        video.muted = true
        setMuted(true)
      })
      return
    }

    if (muted) {
      video.muted = false
      setMuted(false)
      registerPlaying(uniqueId, () => {
        video.muted = true
        setMuted(true)
      })
    } else {
      video.muted = true
      setMuted(true)
      unregister(uniqueId)
    }
  }, [muted, uniqueId, registerPlaying, unregister])

  // When user manually pauses via native controls
  const handlePause = useCallback(() => {
    // Only treat as user-pause if NOT triggered by our auto-pause
    if (!autoPausedRef.current) {
      userPausedRef.current = true
    }
    unregister(uniqueId)
  }, [uniqueId, unregister])

  const handlePlay = useCallback(() => {
    userPausedRef.current = false
    autoPausedRef.current = false
    const video = videoRef.current
    if (video && !video.muted) {
      registerPlaying(uniqueId, () => {
        video.muted = true
        setMuted(true)
      })
    }
  }, [uniqueId, registerPlaying])

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
      />

      {/* Mute/unmute overlay button — always visible on mobile, hover on desktop */}
      <button
        onClick={toggleMute}
        className="absolute bottom-3 right-3 p-2 rounded-full bg-black/60 backdrop-blur-sm text-white opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 hover:bg-black/80 z-10"
        style={{ WebkitTapHighlightColor: 'transparent' }}
        aria-label={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>
    </div>
  )
}
