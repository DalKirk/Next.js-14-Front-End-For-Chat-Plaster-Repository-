// app/api/ide/[...path]/route.ts
// Catch-all proxy: forwards /api/ide/* requests to the backend IDE sandbox API.

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://api.starcyeed.com';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: CORS_HEADERS });
}

async function handler(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const subpath = path.join('/');
  const backendUrl = `${BACKEND_URL}/api/ide/${subpath}`;

  // Forward auth header if present
  const authHeader = request.headers.get('authorization');
  const forwardHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authHeader) forwardHeaders['Authorization'] = authHeader;

  // Read body for mutating methods
  let body: string | undefined;
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    body = await request.text();
  }

  try {
    const backendRes = await fetch(backendUrl, {
      method: request.method,
      headers: forwardHeaders,
      body,
    });

    const responseText = await backendRes.text();

    return new NextResponse(responseText, {
      status: backendRes.status,
      headers: {
        'Content-Type': backendRes.headers.get('content-type') || 'application/json',
        ...CORS_HEADERS,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { detail: `IDE proxy error: ${message}` },
      { status: 502, headers: CORS_HEADERS },
    );
  }
}

export { handler as GET, handler as POST, handler as PUT, handler as DELETE };
