'use client'

import { createContext, useContext, useCallback, useRef } from 'react'

type PauseFn = () => void

interface MediaPlaybackContextValue {
  /** Call when a media element starts producing audio. Returns an unregister fn. */
  registerPlaying: (id: string, pauseFn: PauseFn) => void
  /** Call when a media element stops (paused/ended/unmounted). */
  unregister: (id: string) => void
}

const MediaPlaybackContext = createContext<MediaPlaybackContextValue>({
  registerPlaying: () => {},
  unregister: () => {},
})

export function MediaPlaybackProvider({ children }: { children: React.ReactNode }) {
  // Track the currently active audio source
  const activeRef = useRef<{ id: string; pause: PauseFn } | null>(null)

  const registerPlaying = useCallback((id: string, pauseFn: PauseFn) => {
    // Pause whatever was playing before
    if (activeRef.current && activeRef.current.id !== id) {
      activeRef.current.pause()
    }
    activeRef.current = { id, pause: pauseFn }
  }, [])

  const unregister = useCallback((id: string) => {
    if (activeRef.current?.id === id) {
      activeRef.current = null
    }
  }, [])

  return (
    <MediaPlaybackContext.Provider value={{ registerPlaying, unregister }}>
      {children}
    </MediaPlaybackContext.Provider>
  )
}

export function useMediaPlayback() {
  return useContext(MediaPlaybackContext)
}
