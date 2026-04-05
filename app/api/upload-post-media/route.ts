import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 120;

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.starcyeed.com';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    // Stream the body directly to the backend without buffering
    const backendResponse = await fetch(`${BACKEND_URL}/posts/upload-media`, {
      method: 'POST',
      headers: {
        'content-type': contentType,
      },
      body: request.body,
      // @ts-ignore - duplex is needed for streaming request bodies
      duplex: 'half',
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('Backend media upload failed:', backendResponse.status, errorText);
      return NextResponse.json(
        { error: 'Media upload failed' },
        { status: backendResponse.status }
      );
    }

    const data = await backendResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Upload post media error:', error);
    return NextResponse.json(
      { error: 'Failed to upload media' },
      { status: 500 }
    );
  }
}
