import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://web-production-3ba7e.up.railway.app';

export async function POST(request: NextRequest) {
  try {
    // Get the target endpoint from headers or default to /ai/generate
    const targetEndpoint = request.headers.get('X-Target-Endpoint') || '/ai/generate';
    
    // Forward the request body
    const body = await request.json();
    
    console.log(`[AI Proxy] Forwarding to: ${BACKEND_URL}${targetEndpoint}`);
    
    // Make request to Railway backend
    const response = await fetch(`${BACKEND_URL}${targetEndpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AI Proxy] Backend error: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { error: `Backend error: ${response.statusText}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[AI Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Proxy error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const targetEndpoint = request.headers.get('X-Target-Endpoint') || '/ai/health';
    
    console.log(`[AI Proxy] Health check to: ${BACKEND_URL}${targetEndpoint}`);
    
    const response = await fetch(`${BACKEND_URL}${targetEndpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Backend error: ${response.statusText}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[AI Proxy] Health check error:', error);
    return NextResponse.json(
      { error: 'Health check failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
