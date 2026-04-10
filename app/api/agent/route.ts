// app/api/agent/route.ts
// Proxies requests from the frontend to the Python agent endpoint.
// Pipes the SSE stream straight through with no buffering.

import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.starcyeed.com";

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin":  "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.prompt?.trim()) {
      return new Response(
        `data: ${JSON.stringify({ type: "error", error: "Prompt is required" })}\n\ndata: ${JSON.stringify({ type: "done" })}\n\n`,
        {
          status:  400,
          headers: { "Content-Type": "text/event-stream" },
        }
      );
    }

    // Forward auth token if present (for credit deduction when REQUIRE_CREDITS=true)
    const authHeader = request.headers.get("authorization");
    const forwardHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (authHeader) forwardHeaders["Authorization"] = authHeader;

    const backendRes = await fetch(`${BACKEND_URL}/ai/agent/run`, {
      method:  "POST",
      headers: forwardHeaders,
      body:    JSON.stringify({
        prompt:               body.prompt.trim(),
        conversation_history: body.conversation_history ?? [],
        enable_search:        body.enable_search ?? true,
        max_steps:            body.max_steps     ?? 8,
        conversation_id:      body.conversation_id,
      }),
    });

    if (!backendRes.ok || !backendRes.body) {
      const errText = await backendRes.text().catch(() => "Backend unavailable");
      return new Response(
        `data: ${JSON.stringify({ type: "error", error: errText })}\n\ndata: ${JSON.stringify({ type: "done" })}\n\n`,
        {
          status:  502,
          headers: { "Content-Type": "text/event-stream" },
        }
      );
    }

    // Pipe stream straight through — no buffering
    return new Response(backendRes.body, {
      headers: {
        "Content-Type":      "text/event-stream",
        "Cache-Control":     "no-cache, no-transform",
        "Connection":        "keep-alive",
        "X-Accel-Buffering": "no",
        "Transfer-Encoding": "chunked",
      },
    });

  } catch (error: any) {
    console.error("[agent proxy] Error:", error);
    return new Response(
      `data: ${JSON.stringify({ type: "error", error: error.message ?? "Proxy error" })}\n\ndata: ${JSON.stringify({ type: "done" })}\n\n`,
      {
        status:  500,
        headers: { "Content-Type": "text/event-stream" },
      }
    );
  }
}
