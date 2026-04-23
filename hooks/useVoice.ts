"use client"

/**
 * useVoice.ts
 *
 * Single continuous recognition session — one tap, runs forever.
 *
 * Fixes in this version:
 * - FLUSH_DELAY increased to 2800ms (was 1800ms) — longer pause before sending
 * - Interim results also reset the flush timer — user pausing mid-sentence no longer cuts off
 * - Minimum word count check before flushing — avoids sending 1-word partial captures
 * - Cleaner accumulation across multiple Chrome result events
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
  directListen:    () => void
  speak:           (text: string) => Promise<void>
  stopSpeaking:    () => void
  reset:           () => void
  // Legacy compat
  startWakeListening: () => void
  stopWakeListening:  () => void
}

// ─── Markdown stripper ────────────────────────────────────────────────────────

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/\*([^*\n]+?)\*/g, "$1")
    .replace(/_([^_\n]+?)_/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/^[\s]*[-*+]\s+/gm, "")
    .replace(/^[\s]*\d+\.\s+/gm, "")
    .replace(/^>\s+/gm, "")
    .replace(/^[-*_]{3,}$/gm, "")
    .replace(/\[ref:.*?\]/g, "")
    .replace(/\|/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\[pause\]/gi, "")
    .replace(/\[\u043f\u0430\u0443\u0437\u0430\]/gi, "")
    .trim()
}

// ─── Internal mode ────────────────────────────────────────────────────────────

type InternalMode = "waiting" | "capturing" | "blocked"

// FIX 1: Increased from 1800ms to 2800ms
// Gives user more time to finish speaking without being cut off mid-sentence
const FLUSH_DELAY = 2800

// FIX 4: Minimum words before flushing to Claude
// Avoids sending partial 1-word captures from false triggers
const MIN_WORDS = 2

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

  // ── Refs ──────────────────────────────────────────────────────────────────────
  const rRef          = useRef<SpeechRecognition | null>(null)
  const audioRef      = useRef<HTMLAudioElement | null>(null)
  const statusRef     = useRef<VoiceStatus>("idle")
  const activeRef     = useRef(false)
  const modeRef       = useRef<InternalMode>("waiting")
  const captureRef    = useRef("")
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wakeRef       = useRef(wakeWord.toLowerCase().trim())

  // Stable refs for callbacks — prevents stale closures in recognition sessions
  const onTranscriptRef = useRef(onTranscript)
  const onWakeWordRef   = useRef(onWakeWord)
  useEffect(() => { onTranscriptRef.current = onTranscript }, [onTranscript])
  useEffect(() => { onWakeWordRef.current = onWakeWord }, [onWakeWord])

  useEffect(() => { wakeRef.current = wakeWord.toLowerCase().trim() }, [wakeWord])

  // ── updateStatus ──────────────────────────────────────────────────────────────
  const updateStatus = useCallback((s: VoiceStatus) => {
    statusRef.current = s
    setStatus(s)
  }, [])

  // ── Support check ─────────────────────────────────────────────────────────────
  useEffect(() => {
    setIsSupported(
      typeof window !== "undefined" &&
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
    )
  }, [])

  // ── Timer helpers ─────────────────────────────────────────────────────────────
  const clearFlush = useCallback(() => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current)
      flushTimerRef.current = null
    }
  }, [])

  // ── Flush captured text → send to Claude ──────────────────────────────────────
  const flush = useCallback(() => {
    clearFlush()

    const raw = captureRef.current.trim()
    captureRef.current = ""
    modeRef.current    = "waiting"
    setTranscript("")

    // FIX 4: Minimum word count — don't send partial captures
    const wordCount = raw.split(/\s+/).filter(Boolean).length
    if (wordCount < MIN_WORDS) {
      updateStatus("wake_listening")
      return
    }

    // Strip wake word prefix if it snuck in
    const text = raw
      .replace(new RegExp(`^${wakeRef.current}[\\s,.:!]*`, "i"), "")
      .trim()

    if (text) {
      updateStatus("processing")
      onTranscriptRef.current?.(text)
    } else {
      updateStatus("wake_listening")
    }
  }, [clearFlush, updateStatus])

  // ── Start/reset silence timer ─────────────────────────────────────────────────
  const resetFlushTimer = useCallback(() => {
    clearFlush()
    flushTimerRef.current = setTimeout(flush, FLUSH_DELAY)
  }, [clearFlush, flush])

  // ── Build the single continuous recognition session ───────────────────────────
  const buildSession = useCallback((): SpeechRecognition | null => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return null

    const r = new SR()
    r.continuous      = true
    r.interimResults  = true
    r.lang            = "en-US"
    r.maxAlternatives = 1

    r.onresult = (e: SpeechRecognitionEvent) => {
      // Ignore mic while speaking or processing
      if (modeRef.current === "blocked") return

      // FIX 3: Process from resultIndex forward — accumulate properly
      let finalText   = ""
      let interimText = ""

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) finalText   += t
        else                      interimText += t
      }

      const heard = (finalText || interimText).toLowerCase().trim()

      if (modeRef.current === "waiting") {
        // ── Waiting for wake word ───────────────────────────────────────────
        if (heard.includes(wakeRef.current)) {
          modeRef.current    = "capturing"
          captureRef.current = ""
          updateStatus("listening")
          onWakeWordRef.current?.()

          // Grab anything said immediately after the wake word
          const afterWake = (finalText || interimText)
            .replace(new RegExp(`.*?${wakeRef.current}[\\s,.:!]*`, "i"), "")
            .trim()

          if (afterWake) {
            captureRef.current = afterWake
            setTranscript(afterWake)
            resetFlushTimer()
          }
        }

      } else if (modeRef.current === "capturing") {
        // ── Accumulating user prompt ────────────────────────────────────────
        if (finalText) {
          // Commit final text and reset timer
          captureRef.current = (captureRef.current + " " + finalText).trim()
          setTranscript(captureRef.current)
          resetFlushTimer()   // FIX 2: always reset on final

        } else if (interimText) {
          // Show preview — FIX 2: also reset timer on interim
          // This prevents cutting off when user pauses mid-sentence
          setTranscript((captureRef.current + " " + interimText).trim())
          resetFlushTimer()   // FIX 2: reset on interim too
        }
      }
    }

    r.onerror = (e: SpeechRecognitionErrorEvent) => {
      // no-speech, aborted, and network are normal transient errors — ignore them
      if (e.error === "no-speech" || e.error === "aborted" || e.error === "network") return
      console.error("[useVoice] recognition error:", e.error)
    }

    r.onend = () => {
      // Chrome stops continuous sessions after ~60s of silence.
      // Restart from onend — Chrome allows this.
      if (!activeRef.current) return
      if (modeRef.current === "blocked") return

      setTimeout(() => {
        if (!activeRef.current || modeRef.current === "blocked") return

        // Try restarting existing session first
        if (rRef.current) {
          try {
            rRef.current.start()
            return
          } catch {
            // Session object is stale — rebuild below
          }
        }

        // Rebuild and start fresh session
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
  }, [flush, updateStatus, resetFlushTimer])

  // ── Resume recognition after speaking/processing ──────────────────────────────
  const resumeSession = useCallback(() => {
    if (!activeRef.current) return
    modeRef.current = "waiting"
    updateStatus("wake_listening")

    // Try restarting existing session
    if (rRef.current) {
      try {
        rRef.current.start()
        return
      } catch {
        // Stale — rebuild
      }
    }

    // Rebuild fresh session
    const r = buildSession()
    if (!r) return
    rRef.current = r
    try {
      r.start()
    } catch (err) {
      console.error("[useVoice] resumeSession failed:", err)
    }
  }, [buildSession, updateStatus])

  // ── TTS via ElevenLabs ────────────────────────────────────────────────────────
  const speak = useCallback(async (text: string): Promise<void> => {
    if (!text.trim()) return
    const clean = stripMarkdown(text)
    if (!clean) return

    // Block mic while speaking — stops feedback loop
    modeRef.current = "blocked"
    clearFlush()

    // Pause recognition during playback
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

    try {
      const res = await fetch("/api/tts", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ text: clean, voice_id: voiceId }),
      })

      if (!res.ok) throw new Error(`TTS ${res.status}`)

      const blob  = await res.blob()
      const url   = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio

      const done = () => {
        URL.revokeObjectURL(url)
        // Guard: if stopSpeaking already cleaned up, skip double-resume
        if (!audioRef.current) return
        audioRef.current = null
        // Resume wake word listening after speaking
        resumeSession()
      }

      audio.onended = done
      audio.onerror = done
      await audio.play()

    } catch (err) {
      console.error("[useVoice] TTS error:", err)
      resumeSession()
    }
  }, [voiceId, updateStatus, resumeSession, clearFlush])

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ""
      audioRef.current = null
    }
    resumeSession()
  }, [resumeSession])

  // ── Activate — MUST be called from a user tap ─────────────────────────────────
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

  // ── Direct listen — skip wake word, go straight to capture ────────────────────
  const directListen = useCallback(() => {
    if (!isSupported) return

    // If not active yet, activate first
    if (!activeRef.current) {
      activeRef.current = true
      const r = buildSession()
      if (!r) return
      rRef.current = r
      try { r.start() } catch (err) {
        console.error("[useVoice] directListen activate failed:", err)
        activeRef.current = false
        updateStatus("error")
        return
      }
    }

    // Switch to capture mode immediately
    modeRef.current    = "capturing"
    captureRef.current = ""
    updateStatus("listening")
    resetFlushTimer()
  }, [isSupported, buildSession, updateStatus, resetFlushTimer])

  // ── Deactivate ────────────────────────────────────────────────────────────────
  const deactivate = useCallback(() => {
    activeRef.current  = false
    modeRef.current    = "waiting"
    captureRef.current = ""
    clearFlush()

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
  }, [clearFlush, updateStatus])

  // ── Resume after processing completes ─────────────────────────────────────────
  // When status transitions from processing → wake_listening, restart mic
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

  // ── Reset ─────────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    deactivate()
    setLastResponse("")
  }, [deactivate])

  // ── Cleanup on unmount ────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      activeRef.current = false
      clearFlush()
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
    directListen,
    speak,
    stopSpeaking,
    reset,
    // Legacy compat
    startWakeListening: activate,
    stopWakeListening:  deactivate,
  }
}
