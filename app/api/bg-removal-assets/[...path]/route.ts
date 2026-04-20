import { NextRequest, NextResponse } from 'next/server';

const UPSTREAM = 'https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/';
const FETCH_TIMEOUT = 30_000; // 30s timeout for mobile networks

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const assetPath = path.join('/');

  // Only allow known safe file patterns (hashes, json, wasm, mjs)
  if (!/^[\w./-]+$/.test(assetPath)) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const upstream = new URL(assetPath, UPSTREAM);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const res = await fetch(upstream.toString(), {
      signal: controller.signal,
      headers: {
        Accept: request.headers.get('accept') || '*/*',
        'Accept-Encoding': request.headers.get('accept-encoding') || 'gzip, deflate, br',
      },
    });

    clearTimeout(timer);

    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream ${res.status}` },
        { status: res.status },
      );
    }

    const headers = new Headers();
    const ct = res.headers.get('content-type');
    if (ct) headers.set('Content-Type', ct);
    const cl = res.headers.get('content-length');
    if (cl) headers.set('Content-Length', cl);
    const ce = res.headers.get('content-encoding');
    if (ce) headers.set('Content-Encoding', ce);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('Access-Control-Allow-Origin', '*');

    return new NextResponse(res.body, { status: 200, headers });
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    return NextResponse.json(
      { error: isTimeout ? 'Upstream request timed out' : 'Failed to fetch upstream asset' },
      { status: isTimeout ? 504 : 502 },
    );
  }
}
