import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const ALLOWED_HOSTS = [
  'web-production-3ba7e.up.railway.app',
  'api.starcyeed.com',
];

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.starcyeed.com';

/**
 * POST /api/save-to-gallery
 * Fetches a generated video/image from the allowed origin and uploads it
 * to the user's gallery on the backend (BunnyCDN).
 *
 * Body JSON: { url, userId, username, caption?, mediaType? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, userId, username, caption, mediaType } = body as {
      url?: string;
      userId?: string;
      username?: string;
      caption?: string;
      mediaType?: 'image' | 'video';
    };

    if (!url || !userId || !username) {
      return NextResponse.json(
        { error: 'Missing required fields: url, userId, username' },
        { status: 400 },
      );
    }

    // Validate URL host
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
      return NextResponse.json({ error: 'Forbidden host' }, { status: 403 });
    }

    // Fetch the media from the generation server
    const upstream = await fetch(url);
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Failed to fetch media: ${upstream.status}` },
        { status: 502 },
      );
    }

    const blob = await upstream.arrayBuffer();
    const contentType = upstream.headers.get('content-type') || (mediaType === 'video' ? 'video/mp4' : 'image/png');
    const ext = mediaType === 'video' ? 'mp4' : 'png';
    const filename = `starcyeed-ai-${mediaType || 'media'}-${Date.now()}.${ext}`;

    // Build multipart form data to send to backend
    const formData = new FormData();
    formData.append('user_id', userId);
    formData.append('username', username);
    if (caption) formData.append('caption', caption);
    if (mediaType) formData.append('media_type', mediaType);

    const file = new File([blob], filename, { type: contentType });
    formData.append('files', file, filename);

    // Upload to backend gallery endpoint
    const paths = [`/users/${userId}/media`, `/users/${userId}/media/`];
    let lastErr: string | null = null;

    for (const p of paths) {
      try {
        const backendRes = await fetch(`${BACKEND_URL}${p}`, {
          method: 'POST',
          headers: { 'X-User-Id': userId },
          body: formData,
        });

        if (backendRes.ok) {
          const data = await backendRes.json();
          return NextResponse.json(data);
        }

        lastErr = await backendRes.text();
      } catch (e) {
        lastErr = e instanceof Error ? e.message : String(e);
      }
    }

    return NextResponse.json(
      { error: `Backend upload failed: ${lastErr}` },
      { status: 502 },
    );
  } catch (error) {
    console.error('save-to-gallery error:', error);
    return NextResponse.json(
      { error: 'Failed to save media to gallery' },
      { status: 500 },
    );
  }
}
