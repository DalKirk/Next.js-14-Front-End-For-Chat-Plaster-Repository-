"use client"

import React, { useState, useEffect, useRef } from "react"
import {
  Mic, MicOff, Volume2, Loader2, Radio,
  Wand2, MessageSquare, Monitor,
} from "lucide-react"
import { useVoice } from "@/hooks/useVoice"

/* ── helpers ────────────────────────────────────────────────────────────── */

function getIsMobile(): boolean {
  if (typeof navigator === "undefined") return false
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent)
}

/* ── types ──────────────────────────────────────────────────────────────── */

interface VoiceTabProps {
  onUserSpeech:    (text: string) => void
  responseText:    string
  isProcessing:    boolean
  sharedTurns:     number
  useAgentMode:    boolean
  onToggleMode:    () => void
  onSwitchTab:     (tab: "chat" | "create") => void
  onSpeakingChange?: (speaking: boolean) => void
}

interface Turn { role: "user" | "assistant"; text: string }

/* ── mobile fallback ──────────────────────────────────────────────────── */

function MobileVoiceMessage({ onSwitchTab }: { onSwitchTab: (tab: "chat" | "create") => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 px-6 text-center">
      <Monitor className="w-10 h-10 text-white/30" />
      <p className="text-[15px] font-semibold text-white/80">
        Voice works on desktop
      </p>
      <ul className="text-[12px] text-white/40 space-y-1 list-none">
        <li>Chrome &middot; continuous speech recognition</li>
        <li>Wake-word &ldquo;Hey Star&rdquo; &middot; ElevenLabs TTS</li>
      </ul>
      <div className="flex gap-3 mt-2">
        <button
          onClick={() => onSwitchTab("chat")}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium"
          style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}
        >
          <MessageSquare className="w-3.5 h-3.5" /> Open Chat
        </button>
        <button
          onClick={() => onSwitchTab("create")}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium"
          style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}
        >
          <Wand2 className="w-3.5 h-3.5" /> Open Create
        </button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════ */

export default function VoiceTab({
  onUserSpeech,
  responseText,
  isProcessing,
  sharedTurns,
  useAgentMode,
  onToggleMode,
  onSwitchTab,
  onSpeakingChange,
}: VoiceTabProps) {

  /* ── mobile gate ─────────────────────────────────────────────────── */
  const [mobile] = useState(getIsMobile)
  if (mobile) return <MobileVoiceMessage onSwitchTab={onSwitchTab} />

  /* ── local state ─────────────────────────────────────────────────── */
  const [activated, setActivated]     = useState(false)
  const [localTurns, setLocalTurns]   = useState<Turn[]>([])
  const feedRef                       = useRef<HTMLDivElement>(null)
  const prevResponseRef               = useRef("")

  const voice = useVoice({
    wakeWord:     "hey star",
    voiceId:      "Tzd7T62CaEjAmITJt8xL",
    onTranscript: (t) => {
      setLocalTurns(p => [...p, { role: "user", text: t }])
      onUserSpeech(t)
    },
    onWakeWord: () => {},
  })

  // Bubble speaking state up to parent
  useEffect(() => {
    onSpeakingChange?.(voice.isSpeaking)
  }, [voice.isSpeaking, onSpeakingChange])

  /* ── Cleanup on unmount only ──────────────────────────────────────── */
  useEffect(() => {
    return () => {
      if (activated) voice.deactivate()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Speak new assistant response ─────────────────────────────────── */
  useEffect(() => {
    if (
      responseText &&
      responseText !== prevResponseRef.current
    ) {
      prevResponseRef.current = responseText
      setLocalTurns(p => [...p, { role: "assistant", text: responseText }])
      if (activated) voice.speak(responseText)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [responseText])

  /* ── Auto-scroll ──────────────────────────────────────────────────── */
  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" })
  }, [localTurns])

  /* ── Unsupported browser fallback ─────────────────────────────────── */
  if (!voice.isSupported) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
        <MicOff className="w-8 h-8 text-white/20" />
        <p className="text-sm text-white/50">
          Voice requires <strong className="text-white/70">Chrome desktop</strong> with
          the Web Speech API.
        </p>
        <div className="flex gap-3 mt-1">
          <button
            onClick={() => onSwitchTab("chat")}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium"
            style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}
          >
            <MessageSquare className="w-3.5 h-3.5" /> Open Chat
          </button>
          <button
            onClick={() => onSwitchTab("create")}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium"
            style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}
          >
            <Wand2 className="w-3.5 h-3.5" /> Open Create
          </button>
        </div>
      </div>
    )
  }

  /* ── Orb colours ──────────────────────────────────────────────────── */
  const orbColor =
    voice.isSpeaking  ? "rgba(168,85,247,0.35)"  :
    isProcessing      ? "rgba(234,179,8,0.3)"     :
    voice.isListening ? "rgba(239,68,68,0.5)"     :
    activated         ? "rgba(34,197,94,0.25)"     :
                        "rgba(255,255,255,0.06)"

  const orbBorder =
    voice.isSpeaking  ? "rgba(168,85,247,0.5)"   :
    isProcessing      ? "rgba(234,179,8,0.4)"    :
    voice.isListening ? "rgba(239,68,68,0.6)"    :
    activated         ? "rgba(34,197,94,0.4)"     :
                        "rgba(255,255,255,0.08)"

  const statusLabel =
    voice.isSpeaking  ? "Star is speaking…"       :
    isProcessing      ? "Thinking…"               :
    voice.isListening ? "Listening…"              :
    activated         ? `Say "${voice.status === "wake_listening" ? "Hey Star" : "..."}"` :
                        "Tap to start"

  /* ── Toggle handler ───────────────────────────────────────────────── */
  const handleToggle = () => {
    if (activated) {
      voice.deactivate()
      setActivated(false)
    } else {
      voice.activate()
      setActivated(true)
    }
  }

  /* ── Status icon ──────────────────────────────────────────────────── */
  const StatusIcon = voice.isSpeaking
    ? Volume2
    : isProcessing
      ? Loader2
      : voice.isListening
        ? Radio
        : activated
          ? Mic
          : MicOff

  /* ═══════════════════════════════  JSX  ═══════════════════════════════ */
  return (
    <div className="flex flex-col h-full">

      {/* -- Mode toggle + turn count -- */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <button
          onClick={onToggleMode}
          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors"
          style={{
            background: useAgentMode ? "rgba(168,85,247,0.15)" : "rgba(59,130,246,0.15)",
            color:      useAgentMode ? "rgba(168,85,247,0.8)"  : "rgba(96,165,250,0.8)",
          }}
        >
          {useAgentMode ? <><Wand2 className="w-3 h-3" /> Create</> : <><MessageSquare className="w-3 h-3" /> Chat</>}
        </button>

        {sharedTurns > 0 && (
          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>
            {sharedTurns} turn{sharedTurns !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* -- Scrollable feed -- */}
      <div
        ref={feedRef}
        className="flex-1 overflow-y-auto px-3 py-2 space-y-2 agent-scrollbar"
      >
        {localTurns.map((t, i) => (
          <div
            key={i}
            className={`text-xs leading-relaxed px-2.5 py-1.5 rounded-lg max-w-[85%] whitespace-pre-wrap ${
              t.role === "user" ? "ml-auto" : ""
            }`}
            style={{
              background: t.role === "user"
                ? "rgba(59,130,246,0.12)"
                : "rgba(255,255,255,0.04)",
              color: t.role === "user"
                ? "rgba(147,197,253,0.9)"
                : "rgba(255,255,255,0.7)",
            }}
          >
            {t.text}
          </div>
        ))}

        {/* live transcript */}
        {voice.transcript && (
          <div
            className="text-xs leading-relaxed px-2.5 py-1.5 rounded-lg max-w-[85%] ml-auto italic"
            style={{ background: "rgba(59,130,246,0.08)", color: "rgba(147,197,253,0.6)" }}
          >
            {voice.transcript}
          </div>
        )}
      </div>

      {/* -- Orb + status -- */}
      <div className="flex flex-col items-center gap-2 py-4">

        <button
          onClick={handleToggle}
          className="relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300"
          style={{
            background: orbColor,
            border: `1.5px solid ${orbBorder}`,
            boxShadow: activated
              ? `0 0 20px ${orbColor}, 0 0 40px ${orbColor}`
              : "none",
          }}
        >
          {/* ripple when listening */}
          {voice.isListening && (
            <span
              className="absolute inset-0 rounded-full animate-ping"
              style={{ background: "rgba(239,68,68,0.15)" }}
            />
          )}
          <StatusIcon
            className={`w-7 h-7 ${isProcessing ? "animate-spin" : ""}`}
            style={{ color: "rgba(255,255,255,0.8)" }}
          />
        </button>

        <span
          className="text-[11px] font-medium"
          style={{ color: "rgba(255,255,255,0.45)" }}
        >
          {statusLabel}
        </span>
      </div>

      {/* -- tiny footer -- */}
      <p
        className="text-[9px] text-center pb-2"
        style={{ color: "rgba(255,255,255,0.12)", letterSpacing: "0.08em" }}
      >
        {activated ? "Tap orb to speak manually" : "One tap required"} &middot; Chrome &middot; ElevenLabs
      </p>
    </div>
  )
}
