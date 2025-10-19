# ?? URGENT: Fix Backend CORS Issue

## Problem
Your CORS middleware exists in this **frontend** repo, but your **backend** at `https://web-production-3ba7e.up.railway.app` doesn't have CORS configured, causing connection errors.

## Quick Solution (5 minutes)

### Option A: Use FastAPI Built-in CORS (Recommended)

1. **Find your backend repository** (the one deployed to Railway)
2. **Edit your main FastAPI file** (usually `main.py` or `app.py`)
3. **Add this code** after `app = FastAPI()`:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://video-chat-frontend-ruby.vercel.app",
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

4. **Deploy to Railway** (commit and push)

### Option B: Use Your Custom Middleware

1. **Copy the middleware file** from this repo:
   - Copy `backend/dynamic_cors_middleware.py` to your backend repo
2. **Register it in your FastAPI app**:

```python
from dynamic_cors_middleware import DynamicCORSMiddleware

WHITELIST = {
    "https://video-chat-frontend-ruby.vercel.app",
    "http://localhost:3000",
}

app.add_middleware(DynamicCORSMiddleware, whitelist=WHITELIST)
```

3. **Deploy to Railway**

## Test the Fix

After deploying, test CORS:

```bash
curl -I -H "Origin: https://video-chat-frontend-ruby.vercel.app" \
  https://web-production-3ba7e.up.railway.app/health
```

Look for `Access-Control-Allow-Origin` in the response headers.

## Environment Variables (Optional)

Set in Railway dashboard:
```
ALLOWED_ORIGINS=https://video-chat-frontend-ruby.vercel.app,http://localhost:3000
```

## ?? Expected Result

After the fix:
- ? No more CORS errors
- ? Frontend can connect to backend
- ? Video uploads work
- ? WebSocket connections succeed

## ?? Why This Happened

Your frontend repo has the CORS solution, but your backend repository (deployed to Railway) doesn't have it installed. The CORS middleware must be in the **backend** codebase, not the frontend.