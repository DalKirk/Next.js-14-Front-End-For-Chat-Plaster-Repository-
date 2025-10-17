# ?? CORS Error Fix Guide

## ? **Problem: CORS Policy Blocking Requests**

You're seeing this error:
```
Access to XMLHttpRequest at 'https://natural-presence-production.up.railway.app/...' from origin 'https://video-chat-frontend-ruby.vercel.app' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## ?? **Root Cause**

Your **FastAPI backend** on Railway doesn't have CORS (Cross-Origin Resource Sharing) configured to allow requests from your Vercel frontend.

## ? **Solution: Configure CORS in FastAPI Backend**

### **Step 1: Install CORS Middleware**

If not already installed:
```bash
pip install fastapi uvicorn
```

### **Step 2: Add CORS to Your FastAPI App**

**Find your `main.py` or app initialization file** and add:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",           # Local development
        "https://video-chat-frontend-ruby.vercel.app",  # Production frontend
        "*"  # Allow all origins (for testing only)
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Your existing routes...
@app.get("/")
async def root():
    return {"message": "Hello World"}
```

### **Step 3: Deploy to Railway**

```bash
# Commit your changes
git add .
git commit -m "Add CORS middleware for frontend integration"

# Push to Railway (triggers auto-deploy)
git push origin main
```

### **Step 4: Test**

After Railway deploys (1-2 minutes):
1. Visit: https://video-chat-frontend-ruby.vercel.app
2. Try uploading a video
3. **Expected**: No more CORS errors!

---

## ?? **Alternative: Environment Variable Approach**

If you prefer environment-based configuration:

```python
import os
from fastapi.middleware.cors import CORSMiddleware

# Get allowed origins from environment
allowed_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,https://video-chat-frontend-ruby.vercel.app"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Then set in Railway environment variables:
```
ALLOWED_ORIGINS=http://localhost:3000,https://video-chat-frontend-ruby.vercel.app
```

---

## ?? **Testing CORS Configuration**

### **Test 1: Health Check**
```bash
curl -H "Origin: https://video-chat-frontend-ruby.vercel.app" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     https://natural-presence-production.up.railway.app/health
```

**Expected Response Headers:**
```
Access-Control-Allow-Origin: https://video-chat-frontend-ruby.vercel.app
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: *
```

### **Test 2: Video Upload Endpoint**
```bash
curl -H "Origin: https://video-chat-frontend-ruby.vercel.app" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     https://natural-presence-production.up.railway.app/rooms/test-room/video-upload
```

---

## ?? **Common CORS Issues & Fixes**

### **Issue: Still Getting CORS Errors**
**Fix:** Make sure Railway has redeployed with your changes:
```bash
# Check Railway deployment status
railway logs
```

### **Issue: Multiple Origins**
**Fix:** Add all your domains:
```python
allow_origins=[
    "http://localhost:3000",
    "https://video-chat-frontend-ruby.vercel.app",
    "https://your-custom-domain.com"
]
```

### **Issue: Credentials Not Working**
**Fix:** Ensure `allow_credentials=True` and specific origins (not "*"):
```python
allow_origins=["https://video-chat-frontend-ruby.vercel.app"],  # Specific origin
allow_credentials=True,
```

---

## ?? **Quick Fix for Testing**

If you want to test immediately without backend changes, you can temporarily allow all origins:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ?? Only for testing!
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**?? Warning:** Remove `allow_origins=["*"]` in production for security!

---

## ?? **What This Fixes**

After adding CORS middleware:

? **Video Upload** - No more CORS errors  
? **Live Streaming** - Backend can create streams  
? **All API Calls** - Frontend can communicate with backend  
? **WebSocket** - Real-time messaging works  
? **File Uploads** - Direct to Mux works  

---

## ?? **Debugging**

### **Check Browser Network Tab**
1. Open DevTools ? Network
2. Try uploading a video
3. Look for OPTIONS request (preflight)
4. Check response headers for CORS headers

### **Check Railway Logs**
```bash
railway logs --tail
```

### **Test CORS Headers**
```bash
curl -I -H "Origin: https://video-chat-frontend-ruby.vercel.app" \
        https://natural-presence-production.up.railway.app/health
```

---

## ?? **Next Steps**

1. **Add CORS middleware** to your FastAPI backend
2. **Deploy to Railway**
3. **Test video upload** on your frontend
4. **Remove wildcard origins** for security
5. **Enjoy full functionality!** ??

---

**Status:** Ready to implement  
**Time Required:** 5 minutes  
**Impact:** Fixes all CORS-related functionality  
**Security:** Configure properly for production