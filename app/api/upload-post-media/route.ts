import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.starcyeed.com';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Forward the multipart form data to the backend
    const backendResponse = await fetch(`${BACKEND_URL}/posts/upload-media`, {
      method: 'POST',
      body: formData,
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
