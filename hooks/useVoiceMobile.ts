"use client"

/**
 * useVoiceMobile.ts
 * Tap-to-talk voice hook for mobile devices.
 *
 * Uses MediaRecorder API (works on iOS and Android) instead of
 * Web Speech API (which is broken on mobile).
 *
 * Flow:
 *   User holds orb → MediaRecorder records audio
 *   User releases  → audio sent to /api/stt (ElevenLabs STT)
 *   Transcript     → onTranscript callback
 *   Response text  → speak() via ElevenLabs TTS
 */

import { useState, useRef, useCallback, useEffect } from "react"

export type MobileVoiceStatus =
  | "idle"
  | "recording"
  | "processing"
  | "speaking"
  | "error"

export interface UseVoiceMobileOptions {
  onTranscript?: (text: string) => void
  voiceId?:      string
}

export interface UseVoiceMobileReturn {
  status:      MobileVoiceStatus
  transcript:  string
  isRecording: boolean
  isSpeaking:  boolean
  startRecording: () => void
  stopRecording:  () => void
  speak:          (text: string) => Promise<void>
  stopSpeaking:   () => void
  reset:          () => void
}

// ─── Markdown stripper ────────────────────────────────────────────────────────

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([\s\S]*?)\*\*/g, "$1")
    .replace(/__([\s\S]*?)__/g, "$1")
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

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useVoiceMobile(options: UseVoiceMobileOptions = {}): UseVoiceMobileReturn {
  const { onTranscript, voiceId } = options

  const [status,     setStatus]     = useState<MobileVoiceStatus>("idle")
  const [transcript, setTranscript] = useState("")

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef   = useRef<Blob[]>([])
  const audioRef         = useRef<HTMLAudioElement | null>(null)
  const streamRef        = useRef<MediaStream | null>(null)
  const safetyTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Clear safety timer ────────────────────────────────────────────────────────
  const clearSafety = useCallback(() => {
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current)
      safetyTimerRef.current = null
    }
  }, [])

  // ── TTS via ElevenLabs ────────────────────────────────────────────────────────
  const speak = useCallback(async (text: string): Promise<void> => {
    if (!text.trim()) return
    const clean = stripMarkdown(text)
    if (!clean) return

    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ""
      audioRef.current = null
    }

    setStatus("speaking")

    // Safety timeout — if audio never ends, reset after 15s
    clearSafety()
    safetyTimerRef.current = setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      setStatus("idle")
    }, 15000)

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
        clearSafety()
        URL.revokeObjectURL(url)
        audioRef.current = null
        setStatus("idle")
      }

      // Poll for completion — mobile onended is unreliable
      const poll = setInterval(() => {
        if (!audioRef.current) { clearInterval(poll); return }
        if (audioRef.current.ended || audioRef.current.paused) {
          clearInterval(poll)
          done()
        }
      }, 500)

      audio.onended = () => { clearInterval(poll); done() }
      audio.onerror = () => { clearInterval(poll); done() }

      await audio.play()

    } catch (err) {
      clearSafety()
      console.error("[useVoiceMobile] TTS error:", err)
      setStatus("error")
      setTimeout(() => setStatus("idle"), 2000)
    }
  }, [voiceId, clearSafety])

  const stopSpeaking = useCallback(() => {
    clearSafety()
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ""
      audioRef.current = null
    }
    setStatus("idle")
  }, [clearSafety])

  // ── Send audio to ElevenLabs STT ──────────────────────────────────────────────
  const transcribeAudio = useCallback(async (audioBlob: Blob) => {
    setStatus("processing")

    try {
      const formData = new FormData()
      formData.append("audio", audioBlob, "audio.webm")

      const res = await fetch("/api/stt", {
        method: "POST",
        body:   formData,
      })

      if (!res.ok) throw new Error(`STT ${res.status}`)

      const data = await res.json()
      const text = data.transcript?.trim()

      if (text) {
        setTranscript(text)
        setStatus("idle")
        onTranscript?.(text)
      } else {
        setStatus("idle")
      }

    } catch (err) {
      console.error("[useVoiceMobile] STT error:", err)
      setStatus("error")
      setTimeout(() => setStatus("idle"), 2000)
    }
  }, [onTranscript])

  // ── Start recording ───────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (status === "recording") return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Pick best supported format
      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
        "",
      ].find(m => !m || MediaRecorder.isTypeSupported(m)) ?? ""

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {})
      mediaRecorderRef.current = recorder
      audioChunksRef.current   = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        // Stop all tracks to release mic
        stream.getTracks().forEach(t => t.stop())
        streamRef.current = null

        const audioBlob = new Blob(audioChunksRef.current, {
          type: mimeType || "audio/webm",
        })

        if (audioBlob.size > 0) {
          await transcribeAudio(audioBlob)
        } else {
          setStatus("idle")
        }
      }

      recorder.start()
      setStatus("recording")
      setTranscript("")

    } catch (err) {
      console.error("[useVoiceMobile] mic error:", err)
      setStatus("error")
      setTimeout(() => setStatus("idle"), 2000)
    }
  }, [status, transcribeAudio])

  // ── Stop recording ────────────────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop()
    }
    // Status will update in onstop handler
  }, [])

  // ── Reset ─────────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    stopRecording()
    stopSpeaking()
    setTranscript("")
    setStatus("idle")
  }, [stopRecording, stopSpeaking])

  // ── Cleanup on unmount ────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearSafety()
      if (mediaRecorderRef.current?.state === "recording") {
        try { mediaRecorderRef.current.stop() } catch { /* ignore */ }
      }
      streamRef.current?.getTracks().forEach(t => t.stop())
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [clearSafety])

  return {
    status,
    transcript,
    isRecording: status === "recording",
    isSpeaking:  status === "speaking",
    startRecording,
    stopRecording,
    speak,
    stopSpeaking,
    reset,
  }
}
