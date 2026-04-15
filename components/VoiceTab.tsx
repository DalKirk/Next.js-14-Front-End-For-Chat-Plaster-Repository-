"use client"

/**
 * VoiceTab.tsx
 *
 * Desktop Chrome: Hey Star wake word + Web Speech API + ElevenLabs TTS
 * Mobile (iOS/Android): Tap-to-talk + MediaRecorder + ElevenLabs STT + TTS
 *
 * Wrapper component checks device and renders the right experience.
 * useVoice hook NEVER runs on mobile — avoids Web Speech API mobile bugs.
 */

import React, { useEffect, useRef, useCallback, useState } from "react"
import { Mic, MicOff, Volume2, VolumeX, RotateCcw, Sparkles, Zap } from "lucide-react"
import { useVoice } from "@/hooks/useVoice"
import { useVoiceMobile } from "@/hooks/useVoiceMobile"
import { AgentEventRow } from "@/components/UnifiedAIPanel"

// ─── Types ────────────────────────────────────────────────────────────────────

interface VoiceEntry {
  id:      string
  role:    "user" | "assistant"
  content: string
}

interface AgentEventObj {
  id:          string
  type:        string
  text?:       string
  tool?:       string
  result?:     Record<string, unknown>
  error?:      string
  assets?:     { type: string; url: string; tool: string }[]
}

interface VoiceTabProps {
  onUserSpeech:  (text: string) => void
  responseText:  string
  isProcessing:  boolean
  sharedTurns:   number
  useAgentMode:  boolean
  onToggleMode:  () => void
  onSwitchTab:   (tab: "chat" | "create") => void
  agentEvents?:  AgentEventObj[]
  agentRunning?: boolean
  onSpeakingChange?: (speaking: boolean) => void
}

const uid = () => Math.random().toString(36).slice(2, 8)

// ─── Mobile detection ─────────────────────────────────────────────────────────

function getIsMobile(): boolean {
  if (typeof navigator === "undefined") return false
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(
    navigator.userAgent
  )
}

// ─── Shared top bar ───────────────────────────────────────────────────────────

function TopBar({
  useAgentMode,
  onToggleMode,
  sharedTurns,
  autoPlay,
  onToggleAudio,
  isSpeaking,
  hasEntries,
  onClear,
}: {
  useAgentMode:    boolean
  onToggleMode:    () => void
  sharedTurns:     number
  autoPlay:        boolean
  onToggleAudio:   () => void
  isSpeaking:      boolean
  hasEntries:      boolean
  onClear:         () => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2 shrink-0"
      style={{ borderBottom: "1px solid rgba(139,92,246,0.06)" }}>

      <div className="flex items-center gap-1 rounded-lg p-0.5"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={() => { if (useAgentMode) onToggleMode() }}
          className="px-2 sm:px-2.5 py-1 rounded-md text-[10px] transition-all"
          style={{
            background: !useAgentMode ? "rgba(6,182,212,0.12)"  : "transparent",
            color:      !useAgentMode ? "rgba(6,182,212,0.9)"   : "rgba(255,255,255,0.3)",
            border:     !useAgentMode ? "1px solid rgba(6,182,212,0.2)" : "1px solid transparent",
          }}>
          Chat
        </button>
        <button onClick={() => { if (!useAgentMode) onToggleMode() }}
          className="px-2 sm:px-2.5 py-1 rounded-md text-[10px] transition-all"
          style={{
            background: useAgentMode ? "rgba(139,92,246,0.12)"  : "transparent",
            color:      useAgentMode ? "rgba(192,132,252,0.9)"  : "rgba(255,255,255,0.3)",
            border:     useAgentMode ? "1px solid rgba(139,92,246,0.2)" : "1px solid transparent",
          }}>
          Create
        </button>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        {sharedTurns > 0 && (
          <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap"
            style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.12)", color: "rgba(52,211,153,0.6)" }}>
            {sharedTurns} shared
          </span>
        )}
        <button onClick={onToggleAudio}
          className="flex items-center justify-center gap-1 px-1.5 sm:px-2 py-1 rounded-lg text-[10px] transition-all"
          style={{
            background: autoPlay ? "rgba(192,132,252,0.08)" : "rgba(255,255,255,0.03)",
            border:     autoPlay ? "1px solid rgba(192,132,252,0.2)" : "1px solid rgba(255,255,255,0.06)",
            color:      autoPlay ? "rgba(192,132,252,0.8)" : "rgba(255,255,255,0.3)",
          }}>
          {autoPlay ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
          <span className="hidden sm:inline">{autoPlay ? "Audio on" : "Muted"}</span>
        </button>
        {hasEntries && (
          <button onClick={onClear}
            className="p-1.5 rounded-lg transition-all hover:bg-white/5"
            style={{ color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <RotateCcw className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Shared transcript feed ───────────────────────────────────────────────────

function TranscriptFeed({
  entries,
  interimText,
  emptyMessage,
  feedEndRef,
  agentEvents,
  agentRunning,
}: {
  entries:       VoiceEntry[]
  interimText?:  string
  emptyMessage:  React.ReactNode
  feedEndRef:    React.RefObject<HTMLDivElement>
  agentEvents?:  any[]
  agentRunning?: boolean
}) {
  return (
    <div className="flex-1 px-3 sm:px-4 py-3 space-y-2 min-h-0 agent-scrollbar" style={{ overflowY: "scroll" }}>
      {entries.length === 0 && !interimText && (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
          {emptyMessage}
        </div>
      )}
      {entries.map(entry => (
        <div key={entry.id} className={`flex ${entry.role === "user" ? "justify-end" : "justify-start"}`}>
          <div className="max-w-[82%] px-3 py-2 text-xs leading-relaxed"
            style={entry.role === "user" ? {
              color:      "rgba(6,182,212,0.9)",
            } : {
              color:      "rgba(255,255,255,0.7)",
            }}>
            {entry.content}
          </div>
        </div>
      ))}
      {interimText && (
        <div className="flex justify-end">
          <div className="max-w-[82%] px-3 py-2 text-xs italic"
            style={{ color: "rgba(255,255,255,0.35)" }}>
            {interimText}…
          </div>
        </div>
      )}
      {/* Agent tool results — images, videos, NASA data, embeds */}
      {(agentEvents ?? [])
        .filter((e: any) => e.type === "tool_done")
        .map((event: any) => (
          <AgentEventRow key={event.id} event={event} />
        ))
      }
      {/* Agent creating indicator */}
      {agentRunning && (
        <div className="flex justify-start">
          <div className="px-3 py-2 rounded-xl text-xs"
            style={{
              background: "rgba(139,92,246,0.06)",
              border:     "1px solid rgba(139,92,246,0.12)",
              color:      "rgba(255,255,255,0.4)"
            }}>
            Creating...
          </div>
        </div>
      )}
      <div ref={feedEndRef} />
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MOBILE TAP-TO-TALK
// ══════════════════════════════════════════════════════════════════════════════

function MobileVoiceTab({
  onUserSpeech,
  responseText,
  isProcessing,
  sharedTurns,
  useAgentMode,
  onToggleMode,
  onSpeakingChange,
  agentEvents,
  agentRunning,
}: VoiceTabProps) {
  const [entries,  setEntries]  = useState<VoiceEntry[]>([])
  const [autoPlay, setAutoPlay] = useState(true)
  const lastSpokenRef = useRef("")
  const feedEndRef    = useRef<HTMLDivElement>(null)

  const voice = useVoiceMobile({
    onTranscript: (text) => {
      setEntries(prev => [...prev, { id: uid(), role: "user", content: text }])
      onUserSpeech(text)
    },
  })

  // Propagate speaking state up
  useEffect(() => { onSpeakingChange?.(voice.isSpeaking) }, [voice.isSpeaking, onSpeakingChange])

  // Auto-scroll
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [entries])

  // Speak new responses
  useEffect(() => {
    if (!responseText)                          return
    if (responseText === lastSpokenRef.current) return
    if (isProcessing)                           return
    lastSpokenRef.current = responseText
    setEntries(prev => [...prev, { id: uid(), role: "assistant", content: responseText }])
    if (autoPlay) voice.speak(responseText)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [responseText, isProcessing])

  const clearHistory = useCallback(() => {
    setEntries([])
    lastSpokenRef.current = ""
  }, [])

  // Orb config
  const orbConfig = {
    idle:       { glow: "rgba(139,92,246,0.15)", color: "rgba(139,92,246,0.3)",  pulse: false, label: "Hold orb to speak" },
    recording:  { glow: "rgba(6,182,212,0.4)",   color: "rgba(6,182,212,0.8)",   pulse: true,  label: "Listening… release to send" },
    processing: { glow: "rgba(251,191,36,0.3)",  color: "rgba(251,191,36,0.6)",  pulse: true,  label: "Thinking…" },
    speaking:   { glow: "rgba(192,132,252,0.45)",color: "rgba(192,132,252,0.85)",pulse: true,  label: "Speaking…" },
    error:      { glow: "rgba(239,68,68,0.2)",   color: "rgba(239,68,68,0.5)",   pulse: false, label: "Error — try again" },
  }

  const orb   = orbConfig[voice.status] ?? orbConfig.idle
  const label = isProcessing ? "Thinking…" : orb.label

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <TopBar
        useAgentMode={useAgentMode}
        onToggleMode={onToggleMode}
        sharedTurns={sharedTurns}
        autoPlay={autoPlay}
        onToggleAudio={() => { setAutoPlay(v => !v); if (voice.isSpeaking) voice.stopSpeaking() }}
        isSpeaking={voice.isSpeaking}
        hasEntries={entries.length > 0}
        onClear={clearHistory}
      />

      <TranscriptFeed
        entries={entries}
        feedEndRef={feedEndRef}
        agentEvents={agentEvents}
        agentRunning={agentRunning}
        emptyMessage={
          <p className="text-xs leading-relaxed max-w-[200px]"
            style={{ color: "rgba(255,255,255,0.2)" }}>
            Hold the orb and speak your request — release when done
          </p>
        }
      />

      {/* Orb */}
      <div className="flex flex-col items-center gap-3 sm:gap-4 pt-3 sm:pt-4 pb-4 sm:pb-6 px-3 sm:px-4 shrink-0"
        style={{ borderTop: "1px solid rgba(139,92,246,0.06)" }}>

        <p className="text-[10px] tracking-widest text-center uppercase"
          style={{ color: "rgba(255,255,255,0.3)", letterSpacing: "0.14em" }}>
          {label}
        </p>

        {/* Hold to talk orb */}
        <div
          className="relative flex items-center justify-center select-none"
          style={{ width: 80, height: 80, cursor: "pointer" }}
          onPointerDown={(e) => {
            e.preventDefault()
            if (!voice.isSpeaking && !voice.isRecording) voice.startRecording()
          }}
          onPointerUp={(e) => {
            e.preventDefault()
            if (voice.isRecording) voice.stopRecording()
          }}
          onPointerLeave={(e) => {
            e.preventDefault()
            if (voice.isRecording) voice.stopRecording()
          }}
        >
          {orb.pulse && (
            <>
              <div className="absolute inset-0 rounded-full"
                style={{ border: `1.5px solid ${orb.glow}`, animation: "vPulse 1.6s ease-in-out infinite" }} />
              <div className="absolute rounded-full"
                style={{ inset: -10, border: `1px solid ${orb.glow}`, animation: "vPulse 1.6s ease-in-out 0.45s infinite", opacity: 0.45 }} />
            </>
          )}

          <div className="relative rounded-full flex items-center justify-center transition-all duration-200"
            style={{
              width:      76,
              height:     76,
              background: `radial-gradient(circle at 35% 35%, ${orb.color}, rgba(0,0,0,0.55))`,
              boxShadow:  `0 0 28px ${orb.glow}, 0 0 56px ${orb.glow.replace(/[\d.]+\)$/, "0.06)")}`,
              transform:  voice.isRecording ? "scale(1.08)" : "scale(1)",
            }}>
            {voice.isRecording ? (
              <MicOff className="w-7 h-7" style={{ color: "rgba(255,255,255,0.95)" }} />
            ) : voice.isSpeaking ? (
              <Volume2 className="w-7 h-7" style={{ color: "rgba(255,255,255,0.95)" }} />
            ) : isProcessing ? (
              <Sparkles className="w-6 h-6" style={{ color: "rgba(255,255,255,0.7)", animation: "vSpin 1.5s linear infinite" }} />
            ) : (
              <Mic className="w-7 h-7" style={{ color: "rgba(255,255,255,0.6)" }} />
            )}
          </div>
        </div>

        {voice.isSpeaking && (
          <button onClick={voice.stopSpeaking}
            className="px-3 py-1.5 rounded-lg text-[10px]"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", color: "rgba(248,113,113,0.8)" }}>
            Stop audio
          </button>
        )}

        <p className="text-[9px] text-center" style={{ color: "rgba(255,255,255,0.12)" }}>
          Hold to speak · Release to send · Powered by ElevenLabs
        </p>
      </div>

      <style>{`
        @keyframes vPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.15); opacity: 0.3; } }
        @keyframes vSpin  { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// DESKTOP — HEY STAR WAKE WORD
// ══════════════════════════════════════════════════════════════════════════════

function DesktopVoiceTab({
  onUserSpeech,
  responseText,
  isProcessing,
  sharedTurns,
  useAgentMode,
  onToggleMode,
  onSwitchTab,
  onSpeakingChange,
  agentEvents,
  agentRunning,
}: VoiceTabProps) {
  const [entries,   setEntries]   = useState<VoiceEntry[]>([])
  const [autoPlay,  setAutoPlay]  = useState(true)
  const [activated, setActivated] = useState(false)
  const lastSpokenRef = useRef("")
  const feedEndRef    = useRef<HTMLDivElement>(null)

  const voice = useVoice({
    wakeWord:     "hey star",
    onTranscript: (text) => {
      setEntries(prev => [...prev, { id: uid(), role: "user", content: text }])
      onUserSpeech(text)
    },
    onWakeWord: () => console.log("[VoiceTab] Wake word detected"),
  })

  useEffect(() => { return () => { voice.deactivate() } }, []) // eslint-disable-line

  // Propagate speaking state up
  useEffect(() => { onSpeakingChange?.(voice.isSpeaking) }, [voice.isSpeaking, onSpeakingChange])

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [entries])

  useEffect(() => {
    if (!responseText)                          return
    if (responseText === lastSpokenRef.current) return
    if (isProcessing)                           return
    lastSpokenRef.current = responseText
    setEntries(prev => [...prev, { id: uid(), role: "assistant", content: responseText }])
    if (autoPlay && activated) voice.speak(responseText)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [responseText, isProcessing])

  const handleOrbTap = useCallback(() => {
    if (voice.isSpeaking) { voice.stopSpeaking(); return }
    if (!activated) { setActivated(true); voice.activate(); return }
    if (!voice.isWakeListening && !voice.isListening) voice.activate()
  }, [activated, voice])

  const clearHistory = useCallback(() => {
    setEntries([])
    lastSpokenRef.current = ""
  }, [])

  const ORB: Record<string, { glow: string; color: string; ring: string; pulse: boolean; label: string }> = {
    idle:          { glow: "rgba(139,92,246,0.15)", color: "rgba(139,92,246,0.25)", ring: "rgba(139,92,246,0.08)", pulse: false, label: activated ? 'Say "Hey Star" or tap orb' : "Tap orb to activate" },
    wake_listening:{ glow: "rgba(52,211,153,0.25)",  color: "rgba(52,211,153,0.5)",  ring: "rgba(52,211,153,0.18)", pulse: true,  label: 'Listening for "Hey Star"…' },
    listening:     { glow: "rgba(6,182,212,0.4)",    color: "rgba(6,182,212,0.8)",   ring: "rgba(6,182,212,0.22)", pulse: true,  label: "Listening…" },
    processing:    { glow: "rgba(251,191,36,0.3)",   color: "rgba(251,191,36,0.6)",  ring: "rgba(251,191,36,0.15)",pulse: true,  label: "Thinking…" },
    speaking:      { glow: "rgba(192,132,252,0.45)", color: "rgba(192,132,252,0.85)",ring: "rgba(192,132,252,0.22)",pulse: true,  label: "Speaking…" },
    error:         { glow: "rgba(239,68,68,0.2)",    color: "rgba(239,68,68,0.5)",   ring: "rgba(239,68,68,0.15)", pulse: false, label: "Mic error — check permissions" },
  }

  const orb   = ORB[voice.status] ?? ORB.idle
  const label = isProcessing ? "Thinking…" : orb.label

  if (!voice.isSupported) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 sm:px-8 text-center">
        <Mic className="w-10 h-10" style={{ color: "rgba(239,68,68,0.4)" }} />
        <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>Voice requires Chrome on desktop</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => onSwitchTab("chat")} className="px-4 py-2 rounded-xl text-xs"
            style={{ background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)", color: "rgba(6,182,212,0.8)" }}>
            Open Chat
          </button>
          <button onClick={() => onSwitchTab("create")} className="px-4 py-2 rounded-xl text-xs"
            style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", color: "rgba(192,132,252,0.8)" }}>
            Open Create
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <TopBar
        useAgentMode={useAgentMode}
        onToggleMode={onToggleMode}
        sharedTurns={sharedTurns}
        autoPlay={autoPlay}
        onToggleAudio={() => { setAutoPlay(v => !v); if (voice.isSpeaking) voice.stopSpeaking() }}
        isSpeaking={voice.isSpeaking}
        hasEntries={entries.length > 0}
        onClear={clearHistory}
      />

      <TranscriptFeed
        entries={entries}
        interimText={voice.isListening && voice.transcript ? voice.transcript : undefined}
        feedEndRef={feedEndRef}
        agentEvents={agentEvents}
        agentRunning={agentRunning}
        emptyMessage={
          !activated ? (
            <>
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs"
                style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.12)", color: "rgba(192,132,252,0.7)" }}>
                <Zap className="w-3.5 h-3.5 shrink-0" /> Tap the orb to activate voice
              </div>
              <p className="text-[11px] leading-relaxed max-w-[200px]" style={{ color: "rgba(255,255,255,0.18)" }}>
                Then say <span style={{ color: "rgba(52,211,153,0.6)" }}>"Hey Star"</span> followed by your request
              </p>
            </>
          ) : (
            <p className="text-xs leading-relaxed max-w-[200px]" style={{ color: "rgba(255,255,255,0.2)" }}>
              Say <span style={{ color: "rgba(52,211,153,0.6)" }}>"Hey Star"</span> then speak your request
            </p>
          )
        }
      />

      <div className="flex flex-col items-center gap-3 sm:gap-4 pt-3 sm:pt-4 pb-4 sm:pb-6 px-3 sm:px-4 shrink-0"
        style={{ borderTop: "1px solid rgba(139,92,246,0.06)" }}>

        <p className="text-[10px] tracking-widest text-center uppercase transition-all duration-300"
          style={{ color: "rgba(255,255,255,0.3)", letterSpacing: "0.14em" }}>
          {label}
        </p>

        <div className="relative flex items-center justify-center cursor-pointer select-none"
          onClick={handleOrbTap} style={{ width: 80, height: 80 }}>

          {orb.pulse && (
            <>
              <div className="absolute inset-0 rounded-full"
                style={{ border: `1.5px solid ${orb.ring}`, animation: "vPulse 1.6s ease-in-out infinite" }} />
              <div className="absolute rounded-full"
                style={{ inset: -10, border: `1px solid ${orb.ring}`, animation: "vPulse 1.6s ease-in-out 0.45s infinite", opacity: 0.45 }} />
            </>
          )}
          {!activated && !orb.pulse && (
            <div className="absolute inset-0 rounded-full"
              style={{ border: "1.5px solid rgba(139,92,246,0.2)", animation: "vBreath 2.5s ease-in-out infinite" }} />
          )}

          <div className="relative rounded-full flex items-center justify-center transition-all duration-300"
            style={{
              width: 76, height: 76,
              background: `radial-gradient(circle at 35% 35%, ${orb.color}, rgba(0,0,0,0.55))`,
              boxShadow: `0 0 28px ${orb.glow}, 0 0 56px ${orb.glow.replace(/[\d.]+\)$/, "0.06)")}`,
            }}>
            {voice.isListening ? <Mic className="w-7 h-7" style={{ color: "rgba(255,255,255,0.95)" }} />
              : voice.isSpeaking ? <Volume2 className="w-7 h-7" style={{ color: "rgba(255,255,255,0.95)" }} />
              : isProcessing ? <Sparkles className="w-6 h-6" style={{ color: "rgba(255,255,255,0.7)", animation: "vSpin 1.5s linear infinite" }} />
              : !activated ? <Zap className="w-6 h-6" style={{ color: "rgba(255,255,255,0.5)" }} />
              : <Mic className="w-7 h-7" style={{ color: "rgba(255,255,255,0.45)" }} />}
          </div>
        </div>

        {voice.isSpeaking && (
          <button onClick={voice.stopSpeaking} className="px-3 py-1.5 rounded-lg text-[10px]"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", color: "rgba(248,113,113,0.8)" }}>
            Stop audio
          </button>
        )}

        <p className="text-[9px] text-center" style={{ color: "rgba(255,255,255,0.12)", letterSpacing: "0.08em" }}>
          {activated ? "Tap orb to speak manually" : "One tap required"} · Chrome · ElevenLabs
        </p>
      </div>

      <style>{`
        @keyframes vPulse  { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.15); opacity: 0.3; } }
        @keyframes vBreath { 0%,100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 0.8; transform: scale(1.04); } }
        @keyframes vSpin   { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PUBLIC WRAPPER — routes to mobile or desktop
// ══════════════════════════════════════════════════════════════════════════════

export default function VoiceTab(props: VoiceTabProps) {
  // useState ensures this is evaluated once on mount and never changes
  // Prevents switching between desktop/mobile UI after first voice request
  const [isMobile] = useState(() => getIsMobile())

  return isMobile
    ? <MobileVoiceTab  {...props} />
    : <DesktopVoiceTab {...props} />
}
