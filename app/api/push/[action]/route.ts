/**
 * app/api/push/[action]/route.ts
 *
 * Thin Next.js API proxy — forwards /api/push/* requests to your FastAPI backend.
 * This keeps your backend URL private and lets Next.js attach the auth cookie/header.
 *
 * Handles:
 *   POST /api/push/subscribe
 *   POST /api/push/unsubscribe
 *   GET  /api/push/status
 *   POST /api/push/send-test    (dev only)
 */

import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  const { action } = await params;
  const allowed = ["subscribe", "unsubscribe", "status", "send-test", "resubscribe"];

  if (!allowed.includes(action)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Forward the Authorization header from the client
  const authHeader = req.headers.get("authorization") ?? "";

  try {
    const backendRes = await fetch(`${BACKEND_URL}/push/${action}`, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: req.method !== "GET" ? await req.text() : undefined,
    });

    const json = await backendRes.json().catch(() => ({}));
    return NextResponse.json(json, { status: backendRes.status });
  } catch {
    return NextResponse.json({ error: "Push service unavailable" }, { status: 503 });
  }
}

export const GET = handler;
export const POST = handler;
