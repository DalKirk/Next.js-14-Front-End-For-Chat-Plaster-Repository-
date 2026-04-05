import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 300;

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.starcyeed.com';

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
    }

    const contentType = request.headers.get('content-type') || '';

    // Stream the body directly to the backend without buffering
    const backendResponse = await fetch(`${BACKEND_URL}/videos/upload/${encodeURIComponent(userId)}`, {
      method: 'POST',
      headers: {
        'content-type': contentType,
        'x-user-id': userId,
      },
      body: request.body,
      // @ts-ignore - duplex is needed for streaming request bodies
      duplex: 'half',
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('Backend profile video upload failed:', backendResponse.status, errorText);
      return NextResponse.json(
        { error: 'Profile video upload failed', detail: errorText },
        { status: backendResponse.status }
      );
    }

    const data = await backendResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Upload profile video error:', error);
    return NextResponse.json(
      { error: 'Failed to upload profile video' },
      { status: 500 }
    );
  }
}
