import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://web-production-3ba7e.up.railway.app';

export async function GET() {
  try {
    // Check if backend is reachable
    const response = await fetch(`${BACKEND_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({
        ai_enabled: true,
        backend_status: 'online',
        ...data,
      });
    } else {
      return NextResponse.json({
        ai_enabled: false,
        backend_status: 'degraded',
        error: 'Backend health check failed',
      });
    }
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json({
      ai_enabled: false,
      backend_status: 'offline',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
