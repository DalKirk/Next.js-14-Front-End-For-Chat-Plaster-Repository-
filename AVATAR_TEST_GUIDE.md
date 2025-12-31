# Quick Test Guide - Avatar CDN Fix

## Test the Fix

### Step 1: Clear Old Data
Open browser console (F12) and run:
```javascript
localStorage.clear();
```

### Step 2: Open Profile Page
Navigate to: `https://video-chat-frontend-seven.vercel.app/profile`

Expected console logs:
```
✅ User created in backend: [your-user-id]
🧹 Removing base64 avatar from localStorage (if any)
📥 Syncing profile with backend...
✅ Profile synced from backend
```

### Step 3: Upload Avatar
1. Click "Edit Profile"
2. Drag & drop an image onto the AvatarUpload component (or click to browse)
3. Wait for upload to complete

Expected console logs:
```
📤 Uploading avatar to Bunny.net CDN...
✅ Avatar uploaded successfully
CDN URL: https://videochat-avatars.b-cdn.net/avatars/user-123/avatar-abc.jpg
💾 Saving profile to backend...
✅ Profile saved to backend
```

Expected toast notifications:
```
✅ Avatar uploaded to CDN successfully!
✅ Profile saved successfully!
```

### Step 4: Verify localStorage
In console, run:
```javascript
console.log('userAvatar:', localStorage.getItem('userAvatar'));
console.log('userProfile:', JSON.parse(localStorage.getItem('userProfile') || '{}'));
```

Expected output:
```
userAvatar: https://videochat-avatars.b-cdn.net/avatars/user-123/avatar-abc.jpg
userProfile: { id: "...", username: "...", email: "..." } // NO base64 avatar field
```

### Step 5: Test WebSocket Connection
1. Click "Back to Home"
2. Create or join a chat room
3. Check F12 Network tab for WebSocket connection

Expected WebSocket URL:
```
wss://web-production-3ba7e.up.railway.app/ws/room-123/user-456?username=YourName&avatar_url=https://videochat-avatars.b-cdn.net/avatars/user-123/avatar-abc.jpg
```

❌ Should NOT contain:
```
avatar_url=data:image/jpeg;base64,...
```

Expected console logs:
```
✅ WebSocket connection established
✅ Joined room: room-123
```

### Step 6: Send Chat Message
1. Type a message and send
2. Verify your avatar appears next to the message

Expected:
- Avatar displays using CDN URL
- No console errors
- Message appears immediately

## Common Issues

### Issue: User not found (404)
**Cause**: User doesn't exist in backend  
**Fix**: Profile page now auto-creates users via `ensureUserExists()`

### Issue: WebSocket connection failed
**Cause**: Base64 avatar in URL  
**Fix**: Profile page now cleans up base64 avatars on load

### Issue: Avatar not uploading
**Cause**: File too large or wrong type  
**Fix**: AvatarUpload component validates (max 5MB, JPEG/PNG/GIF/WebP only)

## Success Criteria

✅ **All must be true:**
1. No 404 errors in F12 console
2. No WebSocket connection failures
3. localStorage contains CDN URLs (not base64)
4. Avatar displays in chat messages
5. Upload completes in < 5 seconds
6. CDN URL format: `https://videochat-avatars.b-cdn.net/...`

## Rollback Plan

If issues occur:
1. Revert to commit before avatar CDN changes
2. Run: `git revert HEAD~3` (reverts last 3 commits)
3. Push: `git push origin master`

## Support

If errors persist:
1. Check backend logs on Railway
2. Verify Bunny.net credentials in backend environment variables
3. Check [AVATAR_CDN_FIX_COMPLETE.md](AVATAR_CDN_FIX_COMPLETE.md) for full documentation
4. Review backend/README.md for API endpoint details

---

**Last Updated**: 2024  
**Status**: Ready for testing  
**Expected Test Duration**: 5-10 minutes
