'use client'

import { useState, useEffect, useRef } from 'react'

const FRAMES = [
  [8, 18, 24, 18, 8], [12, 22, 16, 26, 10], [20, 10, 28, 12, 22],
  [6, 24, 14, 20, 8], [16, 8, 22, 10, 18], [10, 26, 8, 24, 14],
]

export function AudioVisualizer({
  audioUrl,
  trackName,
  accentColor = '#8b5cf6',
}: {
  audioUrl: string
  trackName?: string
  accentColor?: string
}) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [heights, setHeights] = useState([6, 10, 6, 10, 6])
  const ivRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const frameRef = useRef(0)

  const start = () => {
    audioRef.current?.play().catch(() => {})
    setPlaying(true)
    ivRef.current = setInterval(() => {
      const h = FRAMES[frameRef.current++ % FRAMES.length]
      setHeights(h.map(v => Math.max(4, v + (Math.random() - 0.5) * 4)))
    }, 120)
  }

  const stop = () => {
    audioRef.current?.pause()
    setPlaying(false)
    if (ivRef.current) clearInterval(ivRef.current)
    setHeights([6, 10, 6, 10, 6])
  }

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    const onEnded = () => stop()
    el.addEventListener('ended', onEnded)
    return () => {
      el.removeEventListener('ended', onEnded)
      if (ivRef.current) clearInterval(ivRef.current)
    }
  }, [audioUrl])

  const label = trackName || audioUrl.split('/').pop()?.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') || 'Audio'

  return (
    <div>
      <audio ref={audioRef} src={audioUrl} preload="metadata" style={{ display: 'none' }} />
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 100, padding: '10px 18px 10px 10px',
        maxWidth: 360,
      }}>
        <button onClick={playing ? stop : start} style={{
          width: 36, height: 36, borderRadius: '50%', border: 'none',
          background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
          color: '#fff', fontSize: 12, cursor: 'pointer',
          boxShadow: `0 0 14px ${accentColor}80`,
          paddingLeft: playing ? 0 : 2,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {playing ? '⏸' : '▶'}
        </button>

        <span style={{
          flex: 1, fontFamily: "'Space Mono', monospace", fontSize: 10,
          color: 'rgba(255,255,255,0.45)', letterSpacing: '0.06em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {label}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 28 }}>
          {heights.map((h, i) => (
            <div key={i} style={{
              width: 3, height: h, borderRadius: 2,
              background: accentColor,
              opacity: [0.4, 0.6, 0.85, 0.6, 0.4][i],
              transition: 'height 0.08s ease',
              boxShadow: playing ? `0 0 4px ${accentColor}99` : 'none',
            }} />
          ))}
        </div>
      </div>
    </div>
  )
}
