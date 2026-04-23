// app/api/piston/route.ts
// Proxies code execution requests to the Piston API (https://emkc.org).
// Free, no auth required, supports Python, Node.js, and 50+ languages.

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PISTON_URL = 'https://emkc.org/api/v2/piston/execute';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const res = await fetch(PISTON_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    const data = await res.text();
    return new NextResponse(data, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Piston proxy error: ${msg}` }, { status: 502 });
  }
}
