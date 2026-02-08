import { NextRequest, NextResponse } from 'next/server';

// Allow up to 50MB uploads (4 files × 10MB max each, with overhead)
export const runtime = 'nodejs';
export const maxDuration = 60;

// Increase body size limit for file uploads
export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.starcyeed.com';

export async function POST(request: NextRequest) {
  try {
    // Get the raw body as ArrayBuffer and forward it with original headers
    const contentType = request.headers.get('content-type') || '';
    const body = await request.arrayBuffer();

    const backendResponse = await fetch(`${BACKEND_URL}/posts/upload-media`, {
      method: 'POST',
      headers: {
        'content-type': contentType,
      },
      body: body,
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('Backend media upload failed:', errorText);
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
