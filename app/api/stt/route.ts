// app/api/stt/route.ts
// Proxies audio → ElevenLabs Speech to Text → returns transcript.
// Keeps the API key server-side.

import { NextRequest } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ELEVEN_API_KEY = process.env.ELEVENLABS_API_KEY || "sk_b43a5a3c4801e95a0ef9b2bc47aff6cb0b95d183226e9133"

export async function POST(req: NextRequest) {
  if (!ELEVEN_API_KEY) {
    return new Response("ElevenLabs not configured", { status: 503 })
  }

  try {
    // Get the audio blob from the request
    const formData = await req.formData()
    const audio    = formData.get("audio") as File | null

    if (!audio) {
      return new Response("No audio provided", { status: 400 })
    }

    // Send to ElevenLabs STT
    const elevenForm = new FormData()
    elevenForm.append("file", audio, "audio.webm")
    elevenForm.append("model_id", "scribe_v2")  // ElevenLabs STT model

    const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method:  "POST",
      headers: {
        "xi-api-key": ELEVEN_API_KEY,
      },
      body: elevenForm,
    })

    if (!res.ok) {
      const error = await res.text().catch(() => "Unknown error")
      console.error("[STT] ElevenLabs error:", res.status, error)
      return new Response(`STT failed: ${error}`, { status: res.status })
    }

    const data = await res.json()

    // ElevenLabs returns { text: "transcript here" }
    return new Response(JSON.stringify({ transcript: data.text || "" }), {
      headers: {
        "Content-Type":  "application/json",
        "Cache-Control": "no-cache",
      },
    })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[STT] Error:", err)
    return new Response(`STT error: ${message}`, { status: 500 })
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
