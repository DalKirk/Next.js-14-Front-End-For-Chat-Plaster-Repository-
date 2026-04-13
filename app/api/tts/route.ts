// app/api/tts/route.ts
// Proxies text → ElevenLabs TTS → returns MP3 audio stream.
// Keeps the API key server-side.

import { NextRequest } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Diagnostic — returns which ELEVEN* env var names exist (no values)
export async function GET() {
  const keys = Object.keys(process.env).filter(k => /eleven/i.test(k))
  return new Response(JSON.stringify({ matched_keys: keys, has_key: !!findApiKey() }), {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
  })
}

// Check multiple common env var names
function findApiKey(): string | undefined {
  return process.env.ELEVENLABS_API_KEY
    || process.env.ELEVEN_API_KEY
    || process.env.ELEVEN_LABS_API_KEY
    || process.env.ELEVENLABS_KEY
    || process.env.ELEVEN_LABS_KEY
}

export async function POST(req: NextRequest) {
  const ELEVEN_API_KEY = findApiKey()
  const DEFAULT_VOICE  = process.env.ELEVENLABS_VOICE_ID || process.env.ELEVEN_VOICE_ID || "Tzd7T62CaEjAmITJt8xL"

  try {
    const { text, voice_id } = await req.json()

    if (!text?.trim()) {
      return new Response("Text is required", { status: 400 })
    }

    if (!ELEVEN_API_KEY) {
      const checked = "ELEVENLABS_API_KEY, ELEVEN_API_KEY, ELEVEN_LABS_API_KEY, ELEVENLABS_KEY, ELEVEN_LABS_KEY"
      return new Response("ElevenLabs not configured — set one of: " + checked, { status: 503 })
    }

    const voiceId = voice_id || DEFAULT_VOICE

    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
      {
        method:  "POST",
        headers: {
          "xi-api-key":   ELEVEN_API_KEY,
          "Content-Type": "application/json",
          "Accept":       "audio/mpeg",
        },
        body: JSON.stringify({
          text:     text.trim(),
          model_id: "eleven_turbo_v2",  // fastest latency for conversational use
          voice_settings: {
            stability:        0.5,
            similarity_boost: 0.75,
            style:            0.0,
            use_speaker_boost: true,
          },
        }),
      }
    )

    if (!res.ok) {
      const error = await res.text().catch(() => "Unknown error")
      console.error("[TTS] ElevenLabs error:", res.status, error)
      return new Response(`TTS failed: ${error}`, { status: res.status })
    }

    // Stream audio straight back to the browser
    return new Response(res.body, {
      headers: {
        "Content-Type":  "audio/mpeg",
        "Cache-Control": "no-cache",
        "X-Voice-ID":    voiceId,
      },
    })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[TTS] Error:", err)
    return new Response(`TTS error: ${message}`, { status: 500 })
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin":  "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}
