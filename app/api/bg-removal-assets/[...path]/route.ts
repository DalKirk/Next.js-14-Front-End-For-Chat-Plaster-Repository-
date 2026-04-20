import { NextRequest, NextResponse } from 'next/server';

const UPSTREAM = 'https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/';

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
    const res = await fetch(upstream.toString(), {
      headers: { Accept: request.headers.get('accept') || '*/*' },
    });

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
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('Access-Control-Allow-Origin', '*');

    return new NextResponse(res.body, { status: 200, headers });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to fetch upstream asset' },
      { status: 502 },
    );
  }
}
