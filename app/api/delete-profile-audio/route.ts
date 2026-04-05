import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.starcyeed.com';

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ detail: 'Missing userId' }, { status: 400 });
    }

    const response = await fetch(`${BACKEND_URL}/audio/delete/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: { 'X-User-Id': userId },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('Delete profile audio error:', error);
    return NextResponse.json(
      { detail: error.message || 'Audio delete failed' },
      { status: 500 }
    );
  }
}
