# Vercel Import and Deployment Guide

## Step-by-Step: Import GitHub Repository to Vercel

### Step 1: Go to Vercel Dashboard
1. Visit: https://vercel.com
2. Log in to your account
3. Click **"Add New..."** button (top right)
4. Select **"Project"**

### Step 2: Import GitHub Repository
1. Click **"Import Git Repository"**
2. If you don't see the repository:
   - Click **"Adjust GitHub App Permissions"**
   - Select which repositories Vercel can access
   - Choose: `DalKirk/Next.js-14-Front-End-For-Chat-Plaster-Repository-`
   - Click **"Save"**
3. Return to Vercel dashboard
4. Find and click **"Import"** next to your repository

### Step 3: Configure Project Settings

#### Framework Preset:
- **Framework**: Next.js (should auto-detect)
- **Root Directory**: `./` (leave as default)
- **Build Command**: `npm run build` (auto-filled)
- **Output Directory**: `.next` (auto-filled)
- **Install Command**: `npm install` (auto-filled)

#### Project Name:
- Suggested: `video-chat-frontend` or `nextjs-video-chat`
- This will be your deployment URL: `https://your-project-name.vercel.app`

### Step 4: Add Environment Variables

Click **"Environment Variables"** section and add these:

#### Variable 1: NEXT_PUBLIC_API_URL
- **Key**: `NEXT_PUBLIC_API_URL`
- **Value**: `https://web-production-3ba7e.up.railway.app`
- **Environment**: Select all (Production, Preview, Development)

#### Variable 2: NEXT_PUBLIC_WS_URL
- **Key**: `NEXT_PUBLIC_WS_URL`
- **Value**: `wss://web-production-3ba7e.up.railway.app`
- **Environment**: Select all (Production, Preview, Development)

#### Variable 3: UPLOAD_PROXY_TARGET (Optional)
- **Key**: `UPLOAD_PROXY_TARGET`
- **Value**: `https://httpbin.org/put`
- **Environment**: Select all

### Step 5: Deploy
1. Review all settings
2. Click **"Deploy"** button
3. Wait for deployment to complete (2-3 minutes)
4. You'll see a success screen with your deployment URL

### Step 6: Configure Custom Domain (Optional)
After deployment, you can add a custom domain:
1. Go to project **Settings** → **Domains**
2. Add your domain (e.g., `video-chat-frontend-ruby.vercel.app`)
3. Follow Vercel's DNS configuration instructions

---

## Your Environment Variables Summary

Copy these values for quick reference:

```bash
# Backend API URL (Railway)
NEXT_PUBLIC_API_URL=https://web-production-3ba7e.up.railway.app

# Backend WebSocket URL (Railway)
NEXT_PUBLIC_WS_URL=wss://web-production-3ba7e.up.railway.app

# Upload Proxy Target (Optional - for testing)
UPLOAD_PROXY_TARGET=https://httpbin.org/put
```

---

## After Deployment: Testing Checklist

### 1. Basic Connectivity Test
- Visit your Vercel deployment URL
- Check if the homepage loads
- Open Browser DevTools (F12) → Console tab
- Look for logs showing backend URL

### 2. User Creation Test
- Enter a username
- Click "Create User"
- Should succeed immediately (or use mock fallback if backend is sleeping)

### 3. Room Join Test
- Create or join a room
- Check server status indicator (should be green or yellow)
- If yellow/orange, wait 30-60 seconds for Railway to wake up

### 4. WebSocket Test
- Send a message in the chat
- Message should appear instantly
- Check console for WebSocket connection logs:
  - ✅ "Connected to WebSocket successfully"
  - ✅ "Sending message via WebSocket"

### 5. Backend Verification
Test the Railway backend directly:
```powershell
# Test backend health
Invoke-WebRequest -Uri "https://web-production-3ba7e.up.railway.app/" -Method GET

# Expected response: {"message":"FastAPI Video Chat API is running!","version":"2.0.0",...}
```

---

## Troubleshooting

### Issue: Build Fails
**Error**: `npm install` fails or build errors

**Solution**:
1. Verify `package.json` exists in the repository root
2. Check Node.js version compatibility (should be 18+)
3. Review build logs for specific errors

### Issue: Environment Variables Not Working
**Error**: App connects to wrong backend or shows errors

**Solution**:
1. Verify environment variables are set correctly
2. Make sure all environments are selected (Production, Preview, Development)
3. Redeploy after updating environment variables

### Issue: 404 on Deployment URL
**Error**: "Deployment not found" or 404 error

**Solution**:
1. Check if deployment succeeded (look for green checkmark)
2. Wait a few more minutes for DNS propagation
3. Try accessing the deployment-specific URL (shown in deployment details)

### Issue: WebSocket Connection Fails
**Error**: "WebSocket connection required for real-time messaging"

**Solution**:
1. Verify Railway backend is running: `https://web-production-3ba7e.up.railway.app/`
2. Check if user successfully joined room before WebSocket connection
3. Review browser console for WebSocket error details
4. Ensure `NEXT_PUBLIC_WS_URL` is set correctly in Vercel

### Issue: CORS Errors
**Error**: "Access to fetch... blocked by CORS policy"

**Solution**:
1. Verify Railway backend has CORS middleware configured
2. Backend must allow origin: `https://your-deployment.vercel.app`
3. Check Railway backend logs for CORS-related errors

---

## Important Notes

### Environment Variables in Next.js
- Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser
- They are embedded at **build time**, not runtime
- Changing variables requires redeployment
- Never put sensitive secrets in `NEXT_PUBLIC_*` variables

### Railway Backend Sleep Mode
- Free tier Railway backends sleep after inactivity
- First request takes 30-60 seconds to wake up
- Frontend has automatic retry logic built-in
- Mock fallbacks ensure basic functionality works offline

### WebSocket Keep-Alive
- Frontend sends keep-alive messages every 10 seconds
- Prevents connection timeouts
- Automatically reconnects if connection drops
- Maximum 5 reconnection attempts with exponential backoff

---

## Quick Reference: URLs

### GitHub Repository
- **URL**: https://github.com/DalKirk/Next.js-14-Front-End-For-Chat-Plaster-Repository-
- **Branch**: master

### Railway Backend
- **API URL**: https://web-production-3ba7e.up.railway.app
- **WebSocket URL**: wss://web-production-3ba7e.up.railway.app
- **Health Check**: https://web-production-3ba7e.up.railway.app/
- **API Docs**: https://web-production-3ba7e.up.railway.app/docs

### Vercel Deployment (After Import)
- **URL**: Will be `https://your-project-name.vercel.app`
- **Dashboard**: https://vercel.com/dalkirks-projects

---

## Next Steps After Successful Deployment

1. ✅ **Test the Full Flow**
   - Create user → Join room → Send messages

2. ✅ **Update README.md** (if needed)
   - Update the live demo URL to your new Vercel deployment
   - Push changes to GitHub

3. ✅ **Monitor Performance**
   - Check Vercel Analytics (if enabled)
   - Monitor Railway backend logs
   - Watch for any error patterns

4. ✅ **Share with Users**
   - Your app is now live and accessible worldwide!
   - Share the deployment URL for testing

---

## Support Resources

- **Vercel Documentation**: https://vercel.com/docs
- **Next.js Documentation**: https://nextjs.org/docs
- **Railway Documentation**: https://docs.railway.app
- **Project Issues**: https://github.com/DalKirk/Next.js-14-Front-End-For-Chat-Plaster-Repository-/issues

---

**Good luck with your deployment! 🚀**
