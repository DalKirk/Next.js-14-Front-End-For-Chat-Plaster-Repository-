"use client"

/**
 * VoiceTab.tsx
 * Voice interface — desktop Chrome only.
 * Mobile users see a friendly message directing them to Chat or Create.
 *
 * Structure:
 *   VoiceTab (wrapper) → getIsMobile() check (pure function, no hooks)
 *     → mobile  → MobileVoiceMessage (useVoice never imported/runs)
 *     → desktop → DesktopVoiceTab    (useVoice runs here only)
 */

import React, { useEffect, useRef, useCallback, useState } from "react"
import { Mic, Volume2, VolumeX, RotateCcw, Sparkles, Zap, Monitor } from "lucide-react"
import { useVoice } from "@/hooks/useVoice"

interface VoiceEntry {
  id:      string
  role:    "user" | "assistant"
  content: string
}

interface VoiceTabProps {
  onUserSpeech:  (text: string) => void
  responseText:  string
  isProcessing:  boolean
  sharedTurns:   number
  useAgentMode:  boolean
  onToggleMode:  () => void
  onSwitchTab:   (tab: "chat" | "create") => void
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

// ─── Mobile message component ─────────────────────────────────────────────────

function MobileVoiceMessage({
  onSwitchTab,
}: {
  onSwitchTab: (tab: "chat" | "create") => void
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 px-8 text-center">
      {/* Icon */}
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center"
        style={{
          background: "rgba(139,92,246,0.06)",
          border:     "1px solid rgba(139,92,246,0.12)",
        }}
      >
        <Monitor className="w-8 h-8" style={{ color: "rgba(192,132,252,0.4)" }} />
      </div>

      {/* Message */}
      <div>
        <p
          className="text-sm font-semibold mb-2"
          style={{ color: "rgba(255,255,255,0.6)" }}
        >
          Voice works on desktop
        </p>
        <p
          className="text-xs leading-relaxed max-w-[240px]"
          style={{ color: "rgba(255,255,255,0.25)" }}
        >
          Open Starcyeed in Chrome on a desktop or laptop to use voice mode with
          Hey Star wake word and ElevenLabs audio.
        </p>
      </div>

      {/* Feature list */}
      <div
        className="flex flex-col gap-2 text-[11px] text-left"
        style={{ color: "rgba(255,255,255,0.2)" }}
      >
        {[
          "Hey Star wake word detection",
          "ElevenLabs voice responses",
          "Voice-activated image & video generation",
          "Shared context with Chat and Create",
        ].map((f, i) => (
          <div key={i} className="flex items-center gap-2">
            <span style={{ color: "rgba(139,92,246,0.35)" }}>◈</span>
            {f}
          </div>
        ))}
      </div>

      {/* Switch tab buttons */}
      <div className="flex gap-3 mt-1">
        <button
          onClick={() => onSwitchTab("chat")}
          className="px-4 py-2 rounded-xl text-xs font-medium transition-all"
          style={{
            background: "rgba(6,182,212,0.08)",
            border:     "1px solid rgba(6,182,212,0.2)",
            color:      "rgba(6,182,212,0.8)",
          }}
        >
          Open Chat
        </button>
        <button
          onClick={() => onSwitchTab("create")}
          className="px-4 py-2 rounded-xl text-xs font-medium transition-all"
          style={{
            background: "rgba(139,92,246,0.08)",
            border:     "1px solid rgba(139,92,246,0.2)",
            color:      "rgba(192,132,252,0.8)",
          }}
        >
          Open Create
        </button>
      </div>
    </div>
  )
}

// ─── Desktop voice component — useVoice only runs here ───────────────────────

function DesktopVoiceTab({
  onUserSpeech,
  responseText,
  isProcessing,
  sharedTurns,
  useAgentMode,
  onToggleMode,
  onSwitchTab,
  onSpeakingChange,
}: VoiceTabProps) {
  const [entries,   setEntries]   = useState<VoiceEntry[]>([])
  const [autoPlay,  setAutoPlay]  = useState(true)
  const [activated, setActivated] = useState(false)

  const lastSpokenRef = useRef("")
  const feedEndRef    = useRef<HTMLDivElement>(null)

  const voice = useVoice({
    wakeWord:     "hey star",
    voiceId:      "Tzd7T62CaEjAmITJt8xL",
    onTranscript: (text) => {
      setEntries(prev => [...prev, { id: uid(), role: "user", content: text }])
      onUserSpeech(text)
    },
    onWakeWord: () => {
      console.log("[VoiceTab] Wake word detected")
    },
  })

  // ── Bubble speaking state up to parent ────────────────────────────────────────
  useEffect(() => {
    onSpeakingChange?.(voice.isSpeaking)
  }, [voice.isSpeaking, onSpeakingChange])

  // ── Cleanup on unmount ────────────────────────────────────────────────────────
  useEffect(() => {
    return () => { voice.deactivate() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Auto-scroll ───────────────────────────────────────────────────────────────
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [entries])

  // ── Speak new responses ───────────────────────────────────────────────────────
  useEffect(() => {
    console.log("[VoiceTab] responseText changed:", responseText?.slice(0, 50))
    console.log("[VoiceTab] isProcessing:", isProcessing)
    console.log("[VoiceTab] lastSpoken:", lastSpokenRef.current?.slice(0, 50))
    if (!responseText)                          return
    if (responseText === lastSpokenRef.current) return
    if (isProcessing)                           return
    console.log("[VoiceTab] calling voice.speak()")
    lastSpokenRef.current = responseText
    setEntries(prev => [...prev, { id: uid(), role: "assistant", content: responseText }])
    if (autoPlay) voice.speak(responseText)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [responseText, isProcessing])

  // ── Orb tap ───────────────────────────────────────────────────────────────────
  const handleOrbTap = useCallback(() => {
    if (voice.isSpeaking) {
      voice.stopSpeaking()
      return
    }

    if (!activated) {
      setActivated(true)
      voice.activate()
      return
    }

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
    glow: string; color: string; ring: string; pulse: boolean; label: string
  }> = {
    idle:          { glow: "rgba(139,92,246,0.15)", color: "rgba(139,92,246,0.25)", ring: "rgba(139,92,246,0.08)", pulse: false, label: activated ? 'Say "Hey Star" or tap orb' : "Tap orb to activate" },
    wake_listening:{ glow: "rgba(52,211,153,0.25)",  color: "rgba(52,211,153,0.5)",  ring: "rgba(52,211,153,0.18)", pulse: true,  label: 'Listening for "Hey Star"\u2026' },
    listening:     { glow: "rgba(6,182,212,0.4)",    color: "rgba(6,182,212,0.8)",   ring: "rgba(6,182,212,0.22)", pulse: true,  label: "Listening\u2026" },
    processing:    { glow: "rgba(251,191,36,0.3)",   color: "rgba(251,191,36,0.6)",  ring: "rgba(251,191,36,0.15)",pulse: true,  label: "Thinking\u2026" },
    speaking:      { glow: "rgba(192,132,252,0.45)", color: "rgba(192,132,252,0.85)",ring: "rgba(192,132,252,0.22)",pulse: true,  label: "Speaking\u2026" },
    error:         { glow: "rgba(239,68,68,0.2)",    color: "rgba(239,68,68,0.5)",   ring: "rgba(239,68,68,0.15)", pulse: false, label: "Mic error \u2014 check permissions" },
  }

  const orb   = ORB[voice.status] ?? ORB.idle
  const label = isProcessing ? "Thinking\u2026" : orb.label

  // ── Not supported in this browser ────────────────────────────────────────────
  if (!voice.isSupported) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
        <Mic className="w-10 h-10" style={{ color: "rgba(239,68,68,0.4)" }} />
        <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>
          Voice not supported in this browser
        </p>
        <p className="text-xs leading-relaxed max-w-[220px]" style={{ color: "rgba(255,255,255,0.2)" }}>
          Please open Starcyeed in Chrome on desktop for voice support.
        </p>
        <div className="flex gap-3">
          <button onClick={() => onSwitchTab("chat")}
            className="px-4 py-2 rounded-xl text-xs"
            style={{ background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)", color: "rgba(6,182,212,0.8)" }}>
            Open Chat
          </button>
          <button onClick={() => onSwitchTab("create")}
            className="px-4 py-2 rounded-xl text-xs"
            style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", color: "rgba(192,132,252,0.8)" }}>
            Open Create
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 py-2 shrink-0"
        style={{ borderBottom: "1px solid rgba(139,92,246,0.06)" }}>

        {/* Chat / Create toggle */}
        <div className="flex items-center gap-1 rounded-lg p-0.5"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={() => { if (useAgentMode) onToggleMode() }}
            className="px-2.5 py-1 rounded-md text-[10px] transition-all"
            style={{
              background: !useAgentMode ? "rgba(6,182,212,0.12)"  : "transparent",
              color:      !useAgentMode ? "rgba(6,182,212,0.9)"   : "rgba(255,255,255,0.3)",
              border:     !useAgentMode ? "1px solid rgba(6,182,212,0.2)" : "1px solid transparent",
            }}>
            Chat
          </button>
          <button onClick={() => { if (!useAgentMode) onToggleMode() }}
            className="px-2.5 py-1 rounded-md text-[10px] transition-all"
            style={{
              background: useAgentMode ? "rgba(139,92,246,0.12)"  : "transparent",
              color:      useAgentMode ? "rgba(192,132,252,0.9)"  : "rgba(255,255,255,0.3)",
              border:     useAgentMode ? "1px solid rgba(139,92,246,0.2)" : "1px solid transparent",
            }}>
            Create
          </button>
        </div>

        <div className="flex items-center gap-2">
          {sharedTurns > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.12)", color: "rgba(52,211,153,0.6)" }}>
              {sharedTurns} shared
            </span>
          )}

          <button
            onClick={() => { setAutoPlay(v => !v); if (voice.isSpeaking) voice.stopSpeaking() }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] transition-all"
            style={{
              background: autoPlay ? "rgba(192,132,252,0.08)" : "rgba(255,255,255,0.03)",
              border:     autoPlay ? "1px solid rgba(192,132,252,0.2)" : "1px solid rgba(255,255,255,0.06)",
              color:      autoPlay ? "rgba(192,132,252,0.8)" : "rgba(255,255,255,0.3)",
            }}>
            {autoPlay ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
            {autoPlay ? "Audio on" : "Muted"}
          </button>

          {entries.length > 0 && (
            <button onClick={clearHistory}
              className="p-1.5 rounded-lg transition-all hover:bg-white/5"
              style={{ color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* ── Transcript feed ── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-0">

        {entries.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            {!activated ? (
              <>
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs"
                  style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.12)", color: "rgba(192,132,252,0.7)" }}>
                  <Zap className="w-3.5 h-3.5 shrink-0" />
                  Tap the orb to activate voice
                </div>
                <p className="text-[11px] leading-relaxed max-w-[200px]"
                  style={{ color: "rgba(255,255,255,0.18)" }}>
                  Then say{" "}
                  <span style={{ color: "rgba(52,211,153,0.6)" }}>&quot;Hey Star&quot;</span>
                  {" "}followed by your request
                </p>
              </>
            ) : (
              <p className="text-xs text-center leading-relaxed max-w-[200px]"
                style={{ color: "rgba(255,255,255,0.2)" }}>
                Say{" "}
                <span style={{ color: "rgba(52,211,153,0.6)" }}>&quot;Hey Star&quot;</span>
                {" "}then speak your request
              </p>
            )}
          </div>
        )}

        {entries.map(entry => (
          <div key={entry.id} className={`flex ${entry.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className="max-w-[82%] px-3 py-2 rounded-xl text-xs leading-relaxed"
              style={entry.role === "user" ? {
                background: "rgba(6,182,212,0.1)",
                border:     "1px solid rgba(6,182,212,0.15)",
                color:      "rgba(255,255,255,0.75)",
              } : {
                background: "rgba(139,92,246,0.06)",
                border:     "1px solid rgba(139,92,246,0.12)",
                color:      "rgba(255,255,255,0.7)",
              }}>
              {entry.content}
            </div>
          </div>
        ))}

        {voice.isListening && voice.transcript && (
          <div className="flex justify-end">
            <div className="max-w-[82%] px-3 py-2 rounded-xl text-xs italic"
              style={{ background: "rgba(6,182,212,0.04)", border: "1px dashed rgba(6,182,212,0.12)", color: "rgba(255,255,255,0.35)" }}>
              {voice.transcript}…
            </div>
          </div>
        )}

        <div ref={feedEndRef} />
      </div>

      {/* ── Orb + controls ── */}
      <div className="flex flex-col items-center gap-4 pt-4 pb-6 px-4 shrink-0"
        style={{ borderTop: "1px solid rgba(139,92,246,0.06)" }}>

        <p className="text-[10px] tracking-widest text-center uppercase transition-all duration-300"
          style={{ color: "rgba(255,255,255,0.3)", letterSpacing: "0.14em" }}>
          {label}
        </p>

        {/* Orb */}
        <div className="relative flex items-center justify-center cursor-pointer select-none"
          onClick={handleOrbTap}
          style={{ width: 88, height: 88 }}
          title={activated ? "Tap to speak" : "Tap to activate"}>

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
              width:      76,
              height:     76,
              background: `radial-gradient(circle at 35% 35%, ${orb.color}, rgba(0,0,0,0.55))`,
              boxShadow:  `0 0 28px ${orb.glow}, 0 0 56px ${orb.glow.replace(/[\d.]+\)$/, "0.06)")}`,
            }}>
            {voice.isListening ? (
              <Mic className="w-7 h-7" style={{ color: "rgba(255,255,255,0.95)" }} />
            ) : voice.isSpeaking ? (
              <Volume2 className="w-7 h-7" style={{ color: "rgba(255,255,255,0.95)" }} />
            ) : isProcessing ? (
              <Sparkles className="w-6 h-6" style={{ color: "rgba(255,255,255,0.7)", animation: "vSpin 1.5s linear infinite" }} />
            ) : !activated ? (
              <Zap className="w-6 h-6" style={{ color: "rgba(255,255,255,0.5)" }} />
            ) : (
              <Mic className="w-7 h-7" style={{ color: "rgba(255,255,255,0.45)" }} />
            )}
          </div>
        </div>

        {voice.isSpeaking && (
          <button onClick={voice.stopSpeaking}
            className="px-3 py-1.5 rounded-lg text-[10px] transition-all"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", color: "rgba(248,113,113,0.8)" }}>
            Stop audio
          </button>
        )}

        <p className="text-[9px] text-center" style={{ color: "rgba(255,255,255,0.12)", letterSpacing: "0.08em" }}>
          {activated ? "Tap orb to speak manually" : "One tap required"} · Chrome · ElevenLabs
        </p>
      </div>

      <style>{`
        @keyframes vPulse {
          0%,100% { transform: scale(1);    opacity: 1;   }
          50%      { transform: scale(1.15); opacity: 0.3; }
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

// ─── Public wrapper — checks mobile BEFORE mounting DesktopVoiceTab ──────────
// This ensures useVoice hook NEVER runs on mobile devices.
// Mobile check happens here, outside any hook, so React rules are satisfied.

export default function VoiceTab(props: VoiceTabProps) {
  const isMobile = getIsMobile()

  if (isMobile) {
    return <MobileVoiceMessage onSwitchTab={props.onSwitchTab} />
  }

  // Only renders on desktop — useVoice only runs on desktop
  return <DesktopVoiceTab {...props} />
}
