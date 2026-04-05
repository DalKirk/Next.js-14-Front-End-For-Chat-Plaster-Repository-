import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.starcyeed.com';

export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
    }

    const backendResponse = await fetch(`${BACKEND_URL}/videos/delete/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: {
        'x-user-id': userId,
      },
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('Backend profile video delete failed:', errorText);
      return NextResponse.json(
        { error: 'Profile video delete failed', detail: errorText },
        { status: backendResponse.status }
      );
    }

    const data = await backendResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Delete profile video error:', error);
    return NextResponse.json(
      { error: 'Failed to delete profile video' },
      { status: 500 }
    );
  }
}
