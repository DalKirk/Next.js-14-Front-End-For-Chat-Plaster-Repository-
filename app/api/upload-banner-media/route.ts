import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 120;

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.starcyeed.com';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const userId = formData.get('userId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Forward to backend as multipart
    const backendForm = new FormData();
    backendForm.append('files', file);
    backendForm.append('userId', userId);

    const backendResponse = await fetch(`${BACKEND_URL}/posts/upload-media`, {
      method: 'POST',
      body: backendForm,
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('Backend banner media upload failed:', backendResponse.status, errorText);
      return NextResponse.json(
        { error: 'Banner media upload failed', detail: errorText },
        { status: backendResponse.status }
      );
    }

    const data = await backendResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Upload banner media error:', error);
    return NextResponse.json(
      { error: 'Failed to upload banner media' },
      { status: 500 }
    );
  }
}
