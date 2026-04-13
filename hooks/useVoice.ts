"use client"

/**
 * useVoice.ts
 *
 * Single continuous recognition session — one tap, runs forever.
 * Desktop Chrome only. Mobile handled separately via MobileVoiceMessage.
 *
 * Changes in this version:
 * - Safety timeout (30s) prevents stuck "speaking" state if audio fails
 * - Safety timeout cleared on normal completion or error
 */

import { useState, useRef, useCallback, useEffect } from "react"

export type VoiceStatus =
  | "idle"
  | "wake_listening"
  | "listening"
  | "processing"
  | "speaking"
  | "error"

export interface UseVoiceOptions {
  wakeWord?:     string
  onTranscript?: (text: string) => void
  onWakeWord?:   () => void
  voiceId?:      string
}

export interface UseVoiceReturn {
  status:          VoiceStatus
  transcript:      string
  lastResponse:    string
  isSupported:     boolean
  isSpeaking:      boolean
  isListening:     boolean
  isWakeListening: boolean
  activate:        () => void
  deactivate:      () => void
  speak:           (text: string) => Promise<void>
  stopSpeaking:    () => void
  reset:           () => void
  startWakeListening: () => void
  stopWakeListening:  () => void
}

// --- Markdown stripper ---

function stripMarkdown(text: string): string {
  return text
    .replace(new RegExp("\\*\\*([\\s\\S]*?)\\*\\*", "g"), "$1")
    .replace(new RegExp("__([\\s\\S]*?)__", "g"), "$1")
    .replace(/\*([^*\n]+?)\*/g, "$1")
    .replace(/_([^_\n]+?)_/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(new RegExp("\\x60{3}[\\s\\S]*?\\x60{3}", "g"), "")
    .replace(new RegExp("\\x60([^\\x60]+)\\x60", "g"), "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/^[\s]*[-*+]\s+/gm, "")
    .replace(/^[\s]*\d+\.\s+/gm, "")
    .replace(/^>\s+/gm, "")
    .replace(/^[-*_]{3,}$/gm, "")
    .replace(/\[ref:.*?\]/g, "")
    .replace(/\|/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

// --- Internal mode ---

type InternalMode = "waiting" | "capturing" | "blocked"

// 2.8s silence before flushing captured text to Claude
const FLUSH_DELAY = 2800

// Minimum words to flush
const MIN_WORDS = 2

// Safety timeout -- if audio never ends, resume after this many ms
const AUDIO_SAFETY_TIMEOUT = 30000

export function useVoice(options: UseVoiceOptions = {}): UseVoiceReturn {
  const {
    wakeWord      = "hey star",
    onTranscript,
    onWakeWord,
    voiceId,
  } = options

  const [status,       setStatus]       = useState<VoiceStatus>("idle")
  const [transcript,   setTranscript]   = useState("")
  const [lastResponse, setLastResponse] = useState("")
  const [isSupported,  setIsSupported]  = useState(false)

  // -- Refs --
  const rRef            = useRef<SpeechRecognition | null>(null)
  const audioRef        = useRef<HTMLAudioElement | null>(null)
  const safetyTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const statusRef       = useRef<VoiceStatus>("idle")
  const activeRef       = useRef(false)
  const modeRef         = useRef<InternalMode>("waiting")
  const captureRef      = useRef("")
  const flushTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wakeRef         = useRef(wakeWord.toLowerCase().trim())

  useEffect(() => { wakeRef.current = wakeWord.toLowerCase().trim() }, [wakeWord])

  // -- updateStatus --
  const updateStatus = useCallback((s: VoiceStatus) => {
    statusRef.current = s
    setStatus(s)
  }, [])

  // -- Support check -- desktop only --
  useEffect(() => {
    const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(
      typeof navigator !== "undefined" ? navigator.userAgent : ""
    )
    const hasSpeechAPI =
      typeof window !== "undefined" &&
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)

    setIsSupported(hasSpeechAPI && !isMobile)
  }, [])

  // -- Timer helpers --
  const clearFlush = useCallback(() => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current)
      flushTimerRef.current = null
    }
  }, [])

  const clearSafety = useCallback(() => {
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current)
      safetyTimerRef.current = null
    }
  }, [])

  // -- Flush captured text -> send to Claude --
  const flush = useCallback(() => {
    clearFlush()
    const raw = captureRef.current.trim()
    captureRef.current = ""
    modeRef.current    = "waiting"
    setTranscript("")

    const wordCount = raw.split(/\s+/).filter(Boolean).length
    if (wordCount < MIN_WORDS) {
      updateStatus("wake_listening")
      return
    }

    const text = raw
      .replace(new RegExp("^" + wakeRef.current + "[\\s,.:!]*", "i"), "")
      .trim()

    if (text) {
      updateStatus("processing")
      onTranscript?.(text)
    } else {
      updateStatus("wake_listening")
    }
  }, [clearFlush, updateStatus, onTranscript])

  // -- Reset flush timer --
  const resetFlushTimer = useCallback(() => {
    clearFlush()
    flushTimerRef.current = setTimeout(flush, FLUSH_DELAY)
  }, [clearFlush, flush])

  // -- Build single continuous recognition session --
  const buildSession = useCallback((): SpeechRecognition | null => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return null

    const r = new SR()
    r.continuous      = true
    r.interimResults  = true
    r.lang            = "en-US"
    r.maxAlternatives = 1

    r.onresult = (e: SpeechRecognitionEvent) => {
      if (modeRef.current === "blocked") return

      let finalText   = ""
      let interimText = ""

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) finalText   += t
        else                      interimText += t
      }

      const heard = (finalText || interimText).toLowerCase().trim()

      if (modeRef.current === "waiting") {
        if (heard.includes(wakeRef.current)) {
          modeRef.current    = "capturing"
          captureRef.current = ""
          updateStatus("listening")
          onWakeWord?.()

          const afterWake = (finalText || interimText)
            .replace(new RegExp(".*?" + wakeRef.current + "[\\s,.:!]*", "i"), "")
            .trim()

          if (afterWake) {
            captureRef.current = afterWake
            setTranscript(afterWake)
            resetFlushTimer()
          }
        }
      } else if (modeRef.current === "capturing") {
        if (finalText) {
          captureRef.current = (captureRef.current + " " + finalText).trim()
          setTranscript(captureRef.current)
          resetFlushTimer()
        } else if (interimText) {
          setTranscript((captureRef.current + " " + interimText).trim())
          resetFlushTimer()
        }
      }
    }

    r.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error === "no-speech" || e.error === "aborted") return
      console.error("[useVoice] recognition error:", e.error)
    }

    r.onend = () => {
      if (!activeRef.current) return
      if (modeRef.current === "blocked") return

      setTimeout(() => {
        if (!activeRef.current || modeRef.current === "blocked") return
        if (rRef.current) {
          try { rRef.current.start(); return } catch { /* stale -- rebuild */ }
        }
        const fresh = buildSession()
        if (fresh) {
          rRef.current = fresh
          try { fresh.start() } catch (e) {
            console.error("[useVoice] rebuild failed:", e)
          }
        }
      }, 250)
    }

    return r
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flush, updateStatus, onWakeWord, resetFlushTimer])

  // -- Resume session after speaking/processing --
  const resumeSession = useCallback(() => {
    clearSafety()
    if (!activeRef.current) return
    modeRef.current = "waiting"
    updateStatus("wake_listening")

    if (rRef.current) {
      try { rRef.current.start(); return } catch { /* stale -- rebuild */ }
    }

    const r = buildSession()
    if (!r) return
    rRef.current = r
    try { r.start() } catch (err) {
      console.error("[useVoice] resumeSession failed:", err)
    }
  }, [buildSession, updateStatus, clearSafety])

  // -- TTS via ElevenLabs --
  const speak = useCallback(async (text: string): Promise<void> => {
    if (!text.trim()) return
    const clean = stripMarkdown(text)
    if (!clean) return

    modeRef.current = "blocked"
    clearFlush()

    if (rRef.current) {
      try { rRef.current.stop() } catch { /* ignore */ }
    }

    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ""
      audioRef.current = null
    }

    updateStatus("speaking")
    setLastResponse(text)

    // Safety timeout -- if audio never plays or ends, resume after 30s
    clearSafety()
    safetyTimerRef.current = setTimeout(() => {
      console.warn("[useVoice] audio safety timeout -- forcing resume")
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      resumeSession()
    }, AUDIO_SAFETY_TIMEOUT)

    try {
      const res = await fetch("/api/tts", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ text: clean, voice_id: voiceId }),
      })

      if (!res.ok) throw new Error("TTS " + res.status)

      const blob  = await res.blob()
      const url   = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio

      const done = () => {
        clearSafety()
        URL.revokeObjectURL(url)
        audioRef.current = null
        resumeSession()
      }

      audio.onended = done
      audio.onerror = done
      await audio.play()

    } catch (err) {
      clearSafety()
      console.error("[useVoice] TTS error:", err)
      resumeSession()
    }
  }, [voiceId, updateStatus, resumeSession, clearFlush, clearSafety])

  const stopSpeaking = useCallback(() => {
    clearSafety()
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ""
      audioRef.current = null
    }
    resumeSession()
  }, [resumeSession, clearSafety])

  // -- Activate -- MUST be called from a user tap --
  const activate = useCallback(() => {
    if (!isSupported)      return
    if (activeRef.current) return

    activeRef.current  = true
    modeRef.current    = "waiting"
    captureRef.current = ""
    updateStatus("wake_listening")

    const r = buildSession()
    if (!r) return
    rRef.current = r

    try {
      r.start()
    } catch (err) {
      console.error("[useVoice] activate failed:", err)
      activeRef.current = false
      updateStatus("error")
    }
  }, [isSupported, buildSession, updateStatus])

  // -- Deactivate --
  const deactivate = useCallback(() => {
    activeRef.current  = false
    modeRef.current    = "waiting"
    captureRef.current = ""
    clearFlush()
    clearSafety()

    if (rRef.current) {
      try { rRef.current.stop() } catch { /* ignore */ }
      rRef.current = null
    }
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    updateStatus("idle")
    setTranscript("")
  }, [clearFlush, clearSafety, updateStatus])

  // -- Resume after processing completes --
  const prevStatusRef = useRef<VoiceStatus>("idle")
  useEffect(() => {
    if (
      prevStatusRef.current === "processing" &&
      status === "wake_listening" &&
      activeRef.current
    ) {
      resumeSession()
    }
    prevStatusRef.current = status
  }, [status, resumeSession])

  // -- Reset --
  const reset = useCallback(() => {
    deactivate()
    setLastResponse("")
  }, [deactivate])

  // -- Cleanup on unmount --
  useEffect(() => {
    return () => {
      activeRef.current = false
      clearFlush()
      clearSafety()
      try { rRef.current?.stop() } catch { /* ignore */ }
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    status,
    transcript,
    lastResponse,
    isSupported,
    isSpeaking:         status === "speaking",
    isListening:        status === "listening",
    isWakeListening:    status === "wake_listening",
    activate,
    deactivate,
    speak,
    stopSpeaking,
    reset,
    startWakeListening: activate,
    stopWakeListening:  deactivate,
  }
}
