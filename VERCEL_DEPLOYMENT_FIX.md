# Vercel Deployment Configuration Fix

## Problem
`https://video-chat-frontend-ruby.vercel.app` is connecting to the **old** Railway backend:
- ❌ Old: `https://natural-presence-production.up.railway.app`
- ✅ Correct: `https://web-production-3ba7e.up.railway.app`

## Root Cause
The code in the GitHub repository is **already correct** and uses environment variables:
- `lib/api.ts`: Uses `process.env.NEXT_PUBLIC_API_URL` with fallback to `https://web-production-3ba7e.up.railway.app`
- `lib/socket.ts`: Uses `process.env.NEXT_PUBLIC_WS_URL` with fallback to `wss://web-production-3ba7e.up.railway.app`

However, **Vercel's environment variables** are still set to the old URLs, so the deployed app uses those instead of the fallbacks.

## Solution: Update Vercel Environment Variables

### Step 1: Go to Vercel Dashboard
1. Visit: https://vercel.com
2. Log in to your account
3. Select project: **video-chat-frontend-ruby**

### Step 2: Update Environment Variables
1. Click **Settings** (in the top navigation)
2. Click **Environment Variables** (in the left sidebar)
3. Find these variables and update them:

   **NEXT_PUBLIC_API_URL**
   - Old value: `https://natural-presence-production.up.railway.app`
   - New value: `https://web-production-3ba7e.up.railway.app`
   
   **NEXT_PUBLIC_WS_URL**
   - Old value: `wss://natural-presence-production.up.railway.app`
   - New value: `wss://web-production-3ba7e.up.railway.app`

4. Make sure to update for all environments:
   - ✅ Production
   - ✅ Preview
   - ✅ Development

5. Click **Save** for each variable

### Step 3: Trigger Redeployment
1. Go to **Deployments** tab
2. Find the latest deployment
3. Click the **⋯** (three dots) menu
4. Select **Redeploy**
5. Wait for deployment to complete (~2-3 minutes)

### Step 4: Verify the Fix
1. Visit: https://video-chat-frontend-ruby.vercel.app
2. Open Browser DevTools (F12)
3. Go to **Console** tab
4. Look for log messages showing the backend URL
5. Should see: `https://web-production-3ba7e.up.railway.app`

## Test the Connection
After redeployment, test the full flow:

1. ✅ **Create User** - Should work immediately
2. ✅ **Create/Join Room** - Should connect to correct backend
3. ✅ **Send Messages** - Real-time WebSocket should work
4. ✅ **Check Status** - Server status indicator should show green

## Current Status

### ✅ Code Configuration (CORRECT)
- GitHub repository: Updated to use environment variables
- Local `.env.local`: Points to `https://web-production-3ba7e.up.railway.app`
- Fallback URLs: Hardcoded to correct Railway backend
- WebSocket keep-alive: Implemented (10-second intervals)
- Error handling: Proper room join before WebSocket connection

### ⚠️ Vercel Configuration (NEEDS UPDATE)
- Environment variables: Still pointing to old Railway backend
- Requires manual update in Vercel dashboard
- Must redeploy after updating environment variables

## Additional Notes

### Why This Happened
The old Railway backend URL (`natural-presence-production.up.railway.app`) was set in Vercel's environment variables during initial deployment. When the Railway backend URL changed to `web-production-3ba7e.up.railway.app`, the code was updated but Vercel's environment variables were not.

### Why Environment Variables Matter
Next.js replaces `process.env.NEXT_PUBLIC_*` variables at **build time**, not runtime. This means:
1. Vercel reads environment variables when building the app
2. The variables are embedded into the JavaScript bundle
3. Changing `.env.local` locally doesn't affect the deployed app
4. You must update Vercel's environment variables and redeploy

### Alternative: Remove Environment Variables
If you prefer to rely on the hardcoded fallback URLs in the code, you can:
1. Delete `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` from Vercel
2. Redeploy
3. The code will automatically use the fallback URLs

However, using environment variables is the **recommended approach** for flexibility and proper configuration management.

## Summary

**What needs to be done:**
1. Update Vercel environment variables (MANUAL STEP REQUIRED)
2. Trigger redeployment in Vercel
3. Verify the deployment is using the correct backend

**Why the code is correct:**
- ✅ Uses environment variables with proper fallbacks
- ✅ WebSocket keep-alive mechanism implemented
- ✅ Proper error handling for room joins
- ✅ All API calls use absolute URLs (not relative)
- ✅ Latest changes pushed to GitHub master branch

**What's preventing it from working:**
- ⚠️ Vercel environment variables not updated yet
- ⚠️ Requires manual update in Vercel dashboard
