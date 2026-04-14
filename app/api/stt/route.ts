// app/api/stt/route.ts
// Proxies audio → ElevenLabs Speech to Text → returns transcript.
// Keeps the API key server-side.
// Maps MIME types to correct file extensions so ElevenLabs accepts the upload.

import { NextRequest } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Map MIME type → file extension ElevenLabs expects */
function getFileExtension(mime: string): string {
  const m = mime.toLowerCase()
  if (m.includes("webm"))  return "webm"
  if (m.includes("ogg"))   return "ogg"
  if (m.includes("mp4") || m.includes("m4a"))  return "mp4"
  if (m.includes("mpeg") || m.includes("mp3")) return "mp3"
  if (m.includes("wav"))   return "wav"
  if (m.includes("flac"))  return "flac"
  return "webm"                     // safe default
}

export async function POST(req: NextRequest) {
  const ELEVEN_API_KEY =
    process.env.ELEVENLABS_API_KEY ||
    process.env.ELEVEN_API_KEY ||
    process.env.ELEVEN_LABS_API_KEY ||
    "sk_b43a5a3c4801e95a0ef9b2bc47aff6cb0b95d183226e9133"

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

    // Build a File with the correct extension for this MIME type
    const ext      = getFileExtension(audio.type)
    const fileName = "audio." + ext
    const blob     = new Blob([await audio.arrayBuffer()], { type: audio.type })
    const file     = new File([blob], fileName, { type: audio.type })

    console.log("[STT] Received audio:", audio.type, "→", fileName, "size:", audio.size)

    // Send to ElevenLabs STT
    const elevenForm = new FormData()
    elevenForm.append("file", file, fileName)
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
