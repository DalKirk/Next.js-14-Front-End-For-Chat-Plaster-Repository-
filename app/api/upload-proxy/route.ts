// app/api/upload-proxy/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

const TARGET = process.env.UPLOAD_PROXY_TARGET || '';

export async function PUT(req: Request) {
  if (!TARGET) {
    return NextResponse.json({ error: 'UPLOAD_PROXY_TARGET not configured' }, { status: 501 });
  }

  try {
    // Forward headers except host
    const forwarded: Record<string, string> = {};
    req.headers.forEach((v, k) => {
      if (k.toLowerCase() === 'host') return;
      forwarded[k] = v;
    });

    const upstream = await fetch(TARGET, {
      method: 'PUT',
      headers: forwarded,
      body: req.body,
    });

    const buffer = await upstream.arrayBuffer();
    const res = new NextResponse(buffer, { status: upstream.status });
    // propagate a subset of headers
    upstream.headers.forEach((value, key) => {
      // only set safe headers
      if (/^content-/i.test(key) || key.toLowerCase() === 'etag') {
        res.headers.set(key, value);
      }
    });

    return res;
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function OPTIONS() {
  // Basic preflight response for the proxy itself
  const res = NextResponse.json({ ok: true });
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, AccessKey');
  return res;
}
