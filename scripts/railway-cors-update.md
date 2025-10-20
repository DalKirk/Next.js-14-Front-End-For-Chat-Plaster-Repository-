# Railway Backend CORS Update Script

## IMPORTANT: Run this on your Railway backend, not frontend!

### Step 1: Update CORS Whitelist
In your Railway backend code, find the CORS configuration and update it to:

```python
# In your main.py or wherever CORS is configured
WHITELIST = {
    "https://video-chat-frontend-ruby.vercel.app",
    "https://next-js-14-front-end-for-chat-plast.vercel.app", 
    "https://next-js-14-front-end-for-chat-plast-kappa.vercel.app",  # ADD THIS LINE
    "http://localhost:3000",
}

# Apply the middleware
app.add_middleware(DynamicCORSMiddleware, whitelist=WHITELIST)
```

### Step 2: Deploy Railway Backend
After making the change:
1. Commit the change to your Railway backend repository
2. Railway will automatically redeploy
3. Wait 2-3 minutes for deployment to complete

### Step 3: Verify Fix
1. Visit: https://next-js-14-front-end-for-chat-plast-kappa.vercel.app
2. Open DevTools (F12) → Console
3. Try creating a user - should work without CORS errors
4. No more "Access-Control-Allow-Origin" errors

### Alternative: Environment Variable Method
If your Railway backend supports environment variables for CORS:
1. Set: `ALLOWED_ORIGINS=https://next-js-14-front-end-for-chat-plast-kappa.vercel.app`
2. Update backend code to read from environment variables