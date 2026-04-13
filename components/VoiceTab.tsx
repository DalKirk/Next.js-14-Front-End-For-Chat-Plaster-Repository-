"use client"

/**
 * VoiceTab.tsx
 * Voice interface — one tap activates, then "Hey Star" works hands-free.
 *
 * Browser security requires a user gesture before mic access.
 * First tap on the orb grants permission and starts wake word detection.
 * After that, "Hey Star" triggers automatically every time.
 */

import React, { useEffect, useRef, useCallback, useState } from "react"
import { Mic, Volume2, VolumeX, RotateCcw, Sparkles, Zap, Download, Maximize2 } from "lucide-react"
import { useVoice } from "@/hooks/useVoice"

interface VoiceEntry {
  id:      string
  role:    "user" | "assistant"
  content: string
  images?: string[]   // captured at creation time to prevent retroactive duplication
}

interface AgentEvent {
  id?:     string
  type:    string
  tool?:   string
  text?:   string
  result?: Record<string, unknown>
  error?:  string
  cost?:   number
}

interface VoiceTabProps {
  onUserSpeech:  (text: string) => void
  responseText:  string
  isProcessing:  boolean
  sharedTurns:   number
  useAgentMode:  boolean
  onToggleMode:  () => void
  agentEvents?:  AgentEvent[]
  onSpeakingChange?: (speaking: boolean) => void
}

const uid = () => Math.random().toString(36).slice(2, 8)

/** Extract image URLs from tool_done agent events */
function extractAgentImageUrls(events: AgentEvent[]): string[] {
  const urls: string[] = []
  for (const ev of events) {
    if (ev.type !== "tool_done" || !ev.result) continue
    const r = ev.result
    if (r.urls && Array.isArray(r.urls)) urls.push(...(r.urls as string[]))
    if (r.url && typeof r.url === "string" && !urls.includes(r.url)) urls.push(r.url)
  }
  return urls
}

/** Extract markdown image URLs from text like ![alt](url) */
function extractMarkdownImages(text: string): string[] {
  const urls: string[] = []
  const regex = /!\[[^\]]*\]\(([^)]+)\)/g
  let m: RegExpExecArray | null
  while ((m = regex.exec(text)) !== null) {
    urls.push(m[1])
  }
  return urls
}

/** Strip markdown image tags from text */
function stripMarkdownImages(text: string): string {
  return text.replace(/!\[[^\]]*\]\([^)]+\)/g, "").trim()
}

export default function VoiceTab({
  onUserSpeech,
  responseText,
  isProcessing,
  sharedTurns,
  useAgentMode,
  onToggleMode,
  agentEvents = [],
  onSpeakingChange,
}: VoiceTabProps) {
  const [entries,   setEntries]   = useState<VoiceEntry[]>([])
  const [autoPlay,  setAutoPlay]  = useState(true)
  const [activated, setActivated] = useState(false) // true after first tap
  const [hoveredImg, setHoveredImg] = useState<string | null>(null)

  const lastSpokenRef   = useRef("")
  const feedEndRef      = useRef<HTMLDivElement>(null)
  const agentEventsRef  = useRef<AgentEvent[]>([])

  // Keep a ref to the latest agentEvents so the entry-creation effect can read it
  // without needing agentEvents in its dependency array
  agentEventsRef.current = agentEvents

  const voice = useVoice({
    wakeWord:     "hey star",
    onTranscript: (text) => {
      setEntries(prev => [...prev, { id: uid(), role: "user", content: text }])
      onUserSpeech(text)
    },
    onWakeWord: () => {
      console.log("[VoiceTab] Wake word detected")
    },
  })

  // Bubble speaking state up to parent
  useEffect(() => {
    onSpeakingChange?.(voice.isSpeaking)
  }, [voice.isSpeaking, onSpeakingChange])

  // ── Cleanup on unmount only ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      voice.deactivate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Auto-scroll ───────────────────────────────────────────────────────────────
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [entries])

  // ── Speak new responses ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!responseText)                          return
    if (responseText === lastSpokenRef.current) return
    if (isProcessing)                           return

    lastSpokenRef.current = responseText

    // Snapshot image URLs NOW so this entry keeps only its own images
    const mdImgs    = extractMarkdownImages(responseText)
    const agentImgs = extractAgentImageUrls(agentEventsRef.current)
    const images    = Array.from(new Set([...agentImgs, ...mdImgs]))

    setEntries(prev => [...prev, { id: uid(), role: "assistant", content: responseText, images }])
    if (autoPlay) voice.speak(responseText)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [responseText, isProcessing])

  // ── Orb tap handler ───────────────────────────────────────────────────────────
  const handleOrbTap = useCallback(() => {
    if (voice.isSpeaking) {
      voice.stopSpeaking()
      return
    }

    if (!activated) {
      // FIRST TAP — user gesture required by Chrome
      // activate() starts the single continuous session
      setActivated(true)
      voice.activate()
      return
    }

    // Already activated — if somehow stopped, reactivate
    if (!voice.isWakeListening && !voice.isListening) {
      voice.activate()
    }
  }, [activated, voice])

  const clearHistory = useCallback(() => {
    setEntries([])
    lastSpokenRef.current = ""
  }, [])

  // ── Orb visual config ─────────────────────────────────────────────────────────
  const ORB: Record<string, {
    glow:  string
    color: string
    ring:  string
    pulse: boolean
    label: string
  }> = {
    idle: {
      glow:  "rgba(139,92,246,0.15)",
      color: "rgba(139,92,246,0.25)",
      ring:  "rgba(139,92,246,0.08)",
      pulse: false,
      label: activated ? 'Say "Hey Star" or tap orb' : "Tap orb to activate voice",
    },
    wake_listening: {
      glow:  "rgba(52,211,153,0.25)",
      color: "rgba(52,211,153,0.5)",
      ring:  "rgba(52,211,153,0.18)",
      pulse: true,
      label: 'Listening for "Hey Star"…',
    },
    listening: {
      glow:  "rgba(6,182,212,0.4)",
      color: "rgba(6,182,212,0.8)",
      ring:  "rgba(6,182,212,0.22)",
      pulse: true,
      label: "Listening…",
    },
    processing: {
      glow:  "rgba(251,191,36,0.3)",
      color: "rgba(251,191,36,0.6)",
      ring:  "rgba(251,191,36,0.15)",
      pulse: true,
      label: "Thinking…",
    },
    speaking: {
      glow:  "rgba(192,132,252,0.45)",
      color: "rgba(192,132,252,0.85)",
      ring:  "rgba(192,132,252,0.22)",
      pulse: true,
      label: "Speaking…",
    },
    error: {
      glow:  "rgba(239,68,68,0.2)",
      color: "rgba(239,68,68,0.5)",
      ring:  "rgba(239,68,68,0.15)",
      pulse: false,
      label: "Mic error — check permissions",
    },
  }

  const orb   = ORB[voice.status] ?? ORB.idle
  const label = isProcessing ? "Thinking…" : orb.label

  // ── Not supported ─────────────────────────────────────────────────────────────
  if (!voice.isSupported) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
        <Mic className="w-10 h-10" style={{ color: "rgba(239,68,68,0.4)" }} />
        <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>
          Voice not supported in this browser
        </p>
        <p
          className="text-xs leading-relaxed max-w-[220px]"
          style={{ color: "rgba(255,255,255,0.2)" }}
        >
          Voice recognition works best in Chrome on desktop.
          Try opening this page in Chrome.
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">

      {/* ── Top bar ── */}
      <div
        className="flex items-center justify-between px-4 py-2 shrink-0"
        style={{ borderBottom: "1px solid rgba(139,92,246,0.06)" }}
      >
        {/* Chat / Create toggle */}
        <div
          className="flex items-center gap-1 rounded-lg p-0.5"
          style={{
            background: "rgba(255,255,255,0.03)",
            border:     "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <button
            onClick={() => { if (useAgentMode) onToggleMode() }}
            className="px-2.5 py-1 rounded-md text-[10px] transition-all"
            style={{
              background: !useAgentMode ? "rgba(6,182,212,0.12)" : "transparent",
              color:      !useAgentMode ? "rgba(6,182,212,0.9)"  : "rgba(255,255,255,0.3)",
              border:     !useAgentMode ? "1px solid rgba(6,182,212,0.2)" : "1px solid transparent",
            }}
          >
            Chat
          </button>
          <button
            onClick={() => { if (!useAgentMode) onToggleMode() }}
            className="px-2.5 py-1 rounded-md text-[10px] transition-all"
            style={{
              background: useAgentMode ? "rgba(139,92,246,0.12)" : "transparent",
              color:      useAgentMode ? "rgba(192,132,252,0.9)" : "rgba(255,255,255,0.3)",
              border:     useAgentMode ? "1px solid rgba(139,92,246,0.2)" : "1px solid transparent",
            }}
          >
            Create
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Shared context badge */}
          {sharedTurns > 0 && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{
                background: "rgba(52,211,153,0.06)",
                border:     "1px solid rgba(52,211,153,0.12)",
                color:      "rgba(52,211,153,0.6)",
              }}
            >
              {sharedTurns} shared
            </span>
          )}

          {/* Audio on/off */}
          <button
            onClick={() => {
              setAutoPlay(v => !v)
              if (voice.isSpeaking) voice.stopSpeaking()
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] transition-all"
            style={{
              background: autoPlay ? "rgba(192,132,252,0.08)" : "rgba(255,255,255,0.03)",
              border:     autoPlay ? "1px solid rgba(192,132,252,0.2)" : "1px solid rgba(255,255,255,0.06)",
              color:      autoPlay ? "rgba(192,132,252,0.8)" : "rgba(255,255,255,0.3)",
            }}
          >
            {autoPlay ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
            {autoPlay ? "Audio on" : "Muted"}
          </button>

          {/* Clear */}
          {entries.length > 0 && (
            <button
              onClick={clearHistory}
              className="p-1.5 rounded-lg transition-all hover:bg-white/5"
              style={{
                color:  "rgba(255,255,255,0.3)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* ── Transcript feed ── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-0 agent-scrollbar">

        {/* Empty state */}
        {entries.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            {!activated ? (
              <>
                <div
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs"
                  style={{
                    background: "rgba(139,92,246,0.06)",
                    border:     "1px solid rgba(139,92,246,0.12)",
                    color:      "rgba(192,132,252,0.7)",
                  }}
                >
                  <Zap className="w-3.5 h-3.5 shrink-0" />
                  Tap the orb below to activate voice
                </div>
                <p
                  className="text-[11px] leading-relaxed max-w-[200px]"
                  style={{ color: "rgba(255,255,255,0.18)" }}
                >
                  Then say{" "}
                  <span style={{ color: "rgba(52,211,153,0.6)" }}>"Hey Star"</span>
                  {" "}followed by your request
                </p>
              </>
            ) : (
              <p
                className="text-xs text-center leading-relaxed max-w-[200px]"
                style={{ color: "rgba(255,255,255,0.2)" }}
              >
                Say{" "}
                <span style={{ color: "rgba(52,211,153,0.6)" }}>"Hey Star"</span>
                {" "}then speak your request
              </p>
            )}
          </div>
        )}

        {/* Conversation entries */}
        {entries.map(entry => {
          const cleanText = entry.role === "assistant" ? stripMarkdownImages(entry.content) : entry.content
          // Use the images snapshot captured at creation time (no retroactive duplication)
          const allImages = entry.images || []

          return (
            <div
              key={entry.id}
              className={`flex ${entry.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className="max-w-[82%] sm:max-w-[55%] rounded-xl overflow-hidden"
                style={entry.role === "user" ? {
                  background: "rgba(6,182,212,0.1)",
                } : {
                  background: "transparent",
                }}
              >
                {/* Images */}
                {allImages.length > 0 && (
                  <div className={`grid gap-1.5 p-2 ${allImages.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                    {allImages.map((url, i) => {
                      const imgKey = `${entry.id}-${i}`
                      const isHov = hoveredImg === imgKey
                      return (
                        <div
                          key={i}
                          className="relative rounded-lg overflow-hidden"
                          style={{ }}
                          onMouseEnter={() => setHoveredImg(imgKey)}
                          onMouseLeave={() => setHoveredImg(null)}
                        >
                          <img
                            src={url}
                            alt={`Generated ${i + 1}`}
                            className="w-full rounded-lg"
                            style={{ maxHeight: 280, objectFit: "contain", background: "rgba(0,0,0,0.3)" }}
                            loading="lazy"
                            onError={e => { (e.target as HTMLImageElement).style.display = "none" }}
                          />
                          {/* Hover overlay */}
                          {isHov && (
                            <div
                              style={{
                                position: "absolute", inset: 0,
                                background: "rgba(3,3,8,0.55)", backdropFilter: "blur(2px)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                gap: 8, zIndex: 3,
                              }}
                            >
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Expand"
                                style={{
                                  padding: 8, borderRadius: 8,
                                  background: "rgba(255,255,255,0.1)",
                                  border: "1px solid rgba(255,255,255,0.12)",
                                  color: "rgba(255,255,255,0.85)",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  cursor: "pointer", transition: "all 0.2s",
                                }}
                              >
                                <Maximize2 size={16} />
                              </a>
                              <a
                                href={url}
                                download={`star-generated-${i + 1}.png`}
                                title="Download"
                                onClick={(e) => {
                                  e.preventDefault()
                                  fetch(url)
                                    .then(r => r.blob())
                                    .then(blob => {
                                      const a = document.createElement("a")
                                      a.href = URL.createObjectURL(blob)
                                      a.download = `star-generated-${i + 1}.png`
                                      a.click()
                                      URL.revokeObjectURL(a.href)
                                    })
                                    .catch(() => window.open(url, "_blank"))
                                }}
                                style={{
                                  padding: 8, borderRadius: 8,
                                  background: "rgba(255,255,255,0.1)",
                                  border: "1px solid rgba(255,255,255,0.12)",
                                  color: "rgba(255,255,255,0.85)",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  cursor: "pointer", transition: "all 0.2s",
                                }}
                              >
                                <Download size={16} />
                              </a>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
                {/* Text */}
                {cleanText && (
                  <div
                    className="px-3 py-2 text-xs leading-relaxed"
                    style={{ color: entry.role === "user" ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.7)" }}
                  >
                    {cleanText}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* Interim transcript while listening */}
        {voice.isListening && voice.transcript && (
          <div className="flex justify-end">
            <div
              className="max-w-[82%] px-3 py-2 rounded-xl text-xs italic"
              style={{
                background: "rgba(6,182,212,0.04)",
                border:     "1px dashed rgba(6,182,212,0.12)",
                color:      "rgba(255,255,255,0.35)",
              }}
            >
              {voice.transcript}…
            </div>
          </div>
        )}

        <div ref={feedEndRef} />
      </div>

      {/* ── Orb + controls ── */}
      <div
        className="flex flex-col items-center gap-4 pt-4 pb-6 px-4 shrink-0"
      >
        {/* Status label */}
        <p
          className="text-[10px] tracking-widest text-center uppercase transition-all duration-300"
          style={{ color: "rgba(255,255,255,0.3)", letterSpacing: "0.14em" }}
        >
          {label}
        </p>

        {/* Animated orb */}
        <div
          className="relative flex items-center justify-center cursor-pointer select-none"
          onClick={handleOrbTap}
          style={{ width: 88, height: 88 }}
          title={activated ? "Tap to speak" : "Tap to activate"}
        >
          {/* Outer pulse rings */}
          {orb.pulse && (
            <>
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  border:    `1.5px solid ${orb.ring}`,
                  animation: "vPulse 1.6s ease-in-out infinite",
                }}
              />
              <div
                className="absolute rounded-full"
                style={{
                  inset:     -10,
                  border:    `1px solid ${orb.ring}`,
                  animation: "vPulse 1.6s ease-in-out 0.45s infinite",
                  opacity:   0.45,
                }}
              />
            </>
          )}



          {/* Core orb */}
          <div
            className="relative rounded-full flex items-center justify-center transition-all duration-300"
            style={{
              width:      76,
              height:     76,
              background: `radial-gradient(circle at 35% 35%, ${orb.color}, rgba(0,0,0,0.55))`,
              boxShadow:  [
                `0 0 28px ${orb.glow}`,
                `0 0 56px ${orb.glow.replace(/[\d.]+\)$/, "0.06)")}`,
                "0 0 1.5px rgba(255,255,255,0.08) inset",
              ].join(", "),
            }}
          >
            {voice.isListening ? (
              <Mic
                className="w-7 h-7"
                style={{ color: "rgba(255,255,255,0.95)" }}
              />
            ) : voice.isSpeaking ? (
              <Volume2
                className="w-7 h-7"
                style={{ color: "rgba(255,255,255,0.95)" }}
              />
            ) : isProcessing ? (
              <Sparkles
                className="w-6 h-6"
                style={{
                  color:     "rgba(255,255,255,0.7)",
                  animation: "vSpin 1.5s linear infinite",
                }}
              />
            ) : !activated ? (
              <Zap
                className="w-6 h-6"
                style={{ color: "rgba(255,255,255,0.5)" }}
              />
            ) : (
              <Mic
                className="w-7 h-7"
                style={{ color: "rgba(255,255,255,0.45)" }}
              />
            )}
          </div>
        </div>

        {/* Stop audio */}
        {voice.isSpeaking && (
          <button
            onClick={voice.stopSpeaking}
            className="px-3 py-1.5 rounded-lg text-[10px] transition-all"
            style={{
              background: "rgba(239,68,68,0.08)",
              border:     "1px solid rgba(239,68,68,0.15)",
              color:      "rgba(248,113,113,0.8)",
            }}
          >
            Stop audio
          </button>
        )}


      </div>

      <style>{`
        @keyframes vPulse {
          0%,100% { transform: scale(1);    opacity: 1;    }
          50%      { transform: scale(1.15); opacity: 0.3;  }
        }
        @keyframes vBreath {
          0%,100% { opacity: 0.4; transform: scale(1);    }
          50%      { opacity: 0.8; transform: scale(1.04); }
        }
        @keyframes vSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
