import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.starcyeed.com';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const userId = formData.get('userId') as string;

    if (!userId) {
      return NextResponse.json({ detail: 'Missing userId' }, { status: 400 });
    }

    const audioFile = formData.get('audio') as File;
    if (!audioFile) {
      return NextResponse.json({ detail: 'Missing audio file' }, { status: 400 });
    }

    const backendFormData = new FormData();
    backendFormData.append('audio', audioFile);

    const response = await fetch(`${BACKEND_URL}/audio/upload/${encodeURIComponent(userId)}`, {
      method: 'POST',
      headers: { 'X-User-Id': userId },
      body: backendFormData,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('Upload profile audio error:', error);
    return NextResponse.json(
      { detail: error.message || 'Audio upload failed' },
      { status: 500 }
    );
  }
}
