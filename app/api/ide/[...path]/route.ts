const BACKEND  = process.env.RAILWAY_API_URL ?? 'https://api.starcyeed.com';
const TOKEN    = process.env.STAR_API_TOKEN  ?? '';

const headers = () => ({
  'Content-Type':  'application/json',
  'Authorization': `Bearer ${TOKEN}`,
});

export async function GET(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/');
  const qs   = new URL(request.url).searchParams.toString();
  const url  = `${BACKEND}/api/ide/${path}${qs ? `?${qs}` : ''}`;

  const res  = await fetch(url, { method: 'GET', headers: headers() });
  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.status });
}

export async function POST(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/');
  const body = await request.json().catch(() => ({}));
  const url  = `${BACKEND}/api/ide/${path}`;

  const res  = await fetch(url, {
    method:  'POST',
    headers: headers(),
    body:    JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.status });
}

export async function DELETE(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/');
  const body = await request.json().catch(() => ({}));
  const url  = `${BACKEND}/api/ide/${path}`;

  const res  = await fetch(url, {
    method:  'DELETE',
    headers: headers(),
    body:    JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.status });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
