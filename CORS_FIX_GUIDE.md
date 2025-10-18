# CORS Error Fix Guide

## Problem: CORS Policy Blocking Requests

You're likely seeing an error like:

```
Access to XMLHttpRequest at 'https://your-backend.example/...' from origin 'https://video-chat-frontend-ruby.vercel.app' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## ?? **Root Cause**

Your **FastAPI backend** on Railway doesn't have CORS (Cross-Origin Resource Sharing) configured to allow requests from your Vercel frontend.

## Solution: Configure CORS in FastAPI Backend

### Step 1: Install dependencies (if needed)

If you don't already have FastAPI installed in your backend environment:

```bash
pip install fastapi uvicorn
```

### Step 2: Add CORS to your FastAPI app

Edit your FastAPI app startup file (commonly `main.py` or `app.py`). The snippet below is recommended — it reads allowed origins from an environment variable so you can control origins per environment:

```python
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Configure allowed origins via env var for flexibility
allowed = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,https://video-chat-frontend-ruby.vercel.app"
)
allowed_origins = [o.strip() for o in allowed.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# ... your route definitions follow
@app.get("/")
async def root():
    return {"message": "OK"}
```

### Step 3: Deploy to Railway

1. Commit and push your backend changes. Railway (or your CI) will redeploy automatically.

```bash
git add .
git commit -m "Add CORS middleware for frontend integration"
git push origin main
```

2. In Railway's project settings, set the `ALLOWED_ORIGINS` environment variable if you used the env approach:

```
ALLOWED_ORIGINS=http://localhost:3000,https://video-chat-frontend-ruby.vercel.app
```

3. After the deployment completes (1-2 minutes), test from your frontend.

### Step 4: Test

After Railway deploys:
1. Visit: https://video-chat-frontend-ruby.vercel.app
2. Try the upload flow or call the endpoint from your frontend
3. Expected: preflight OPTIONS and the real request should return `Access-Control-Allow-Origin` matching your frontend origin

---

*(This is already covered by the recommended env var approach above.)*

---

## Testing CORS configuration (quick)

### Health preflight (OPTIONS)
Replace `<BACKEND_URL>` with your Railway URL.

```bash
curl -i -X OPTIONS "<BACKEND_URL>/health" \
    -H "Origin: https://video-chat-frontend-ruby.vercel.app" \
    -H "Access-Control-Request-Method: GET"
```

Look for `Access-Control-Allow-Origin` in the response headers.

### Test video-upload preflight

```bash
curl -i -X OPTIONS "<BACKEND_URL>/rooms/test-room/video-upload" \
    -H "Origin: https://video-chat-frontend-ruby.vercel.app" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: Content-Type"
```

---

## Common CORS pitfalls & tips

- Still seeing CORS errors after deploy? Check Railway deployment logs and ensure new image is running. Use `railway up` or the Railway UI to confirm.
- If you have multiple frontend origins (demo, staging, custom domain), add them to `ALLOWED_ORIGINS` separated by commas.
- If you need to send cookies/credentials, `allow_credentials=True` requires you to list explicit origins (you cannot use `'*'`).

Example env var for Railway:

```
ALLOWED_ORIGINS=http://localhost:3000,https://video-chat-frontend-ruby.vercel.app
```

---

## Quick temporary test (not for production)

To test quickly you can allow all origins, but DO NOT leave this enabled in production:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Remove or narrow this once you confirm uploads work.

---

## What this fixes

After properly configuring CORS:

- Video uploads should not be blocked by the browser preflight
- All API calls from `video-chat-frontend-ruby.vercel.app` should be accepted
- WebSocket (Socket.io) handshake will not be blocked by CORS if your server socket origin checks allow the frontend
- If provider requires custom headers on pre-signed URLs, either allow those headers in provider config or use a same-origin proxy

---

## ?? **Debugging**

## Debugging checklist

1. Open DevTools → Network
2. Trigger the upload/create-upload API
3. Inspect the `OPTIONS` (preflight) response. It must include `Access-Control-Allow-Origin` and `Access-Control-Allow-Methods` and `Access-Control-Allow-Headers`.

Railway logs:

```bash
railway logs --tail
```

Quick curl check for headers (replace `<BACKEND_URL>`):

```bash
curl -I -H "Origin: https://video-chat-frontend-ruby.vercel.app" "<BACKEND_URL>/health"
```

---

## Next steps

1. Add CORS middleware and set `ALLOWED_ORIGINS` on Railway
2. Deploy and verify preflight & responses
3. If provider rejects custom headers on pre-signed URLs, use the same-origin upload proxy (example below)
4. Remove wildcard origins and secure tokens for production

---

## Optional: Add a local same-origin upload proxy in this frontend repo (for quick testing)

If you can't change the backend immediately or your provider disallows custom headers on presigned URLs, add a simple proxy route to this Next.js app that accepts a PUT from the browser and forwards it server-side to the provider. **Note:** proxying large uploads through Vercel or a similar host will consume server bandwidth and may not be suitable for production.

Create `app/api/upload-proxy/route.ts` in this repo with the following content:

```ts
// app/api/upload-proxy/route.ts
export const runtime = 'nodejs';
import { NextResponse } from 'next/server';

const TARGET = process.env.UPLOAD_PROXY_TARGET; // e.g. https://storage-provider.example/upload/xyz

export async function PUT(req: Request) {
    if (!TARGET) {
        return NextResponse.json({ error: 'UPLOAD_PROXY_TARGET not configured' }, { status: 501 });
    }

    try {
        // Forward headers, but remove host to avoid provider signature mismatch
        const forwardedHeaders: Record<string, string> = {};
        req.headers.forEach((value, key) => {
            if (key.toLowerCase() === 'host') return;
            forwardedHeaders[key] = value;
        });

        const upstream = await fetch(TARGET, {
            method: 'PUT',
            headers: forwardedHeaders,
            body: req.body,
            // Keep credentials/server auth out of the browser request; use env-based auth server-side
        });

        const body = await upstream.arrayBuffer();
        return new NextResponse(body, { status: upstream.status, headers: upstream.headers });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
```

Set `UPLOAD_PROXY_TARGET` in your local `.env.local` or Vercel env to the provider's PUT URL or to a server-side endpoint that accepts the file.

Example `.env.local`:

```
UPLOAD_PROXY_TARGET=https://example-presigned-url.com/upload/xyz

# Allowed origins for backend testing
ALLOWED_ORIGINS=http://localhost:3000,https://video-chat-frontend-ruby.vercel.app
```

This proxy will let you test the full browser flow while you fix backend CORS configuration.

---

If you'd like, I can:

- Patch your backend repo with the exact CORS middleware code (if you provide access or the code), or
- Add the `app/api/upload-proxy/route.ts` file to this frontend repo now so you can test immediately.

Which would you like me to do?

---

**Status:** Ready to implement  
**Time Required:** 5 minutes  
**Impact:** Fixes all CORS-related functionality  
**Security:** Configure properly for production