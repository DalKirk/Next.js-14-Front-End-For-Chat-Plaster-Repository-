# Backend Verification Guide

Your backend at **`https://web-production-3ba7e.up.railway.app`** is already configured correctly!

## ✅ Already Implemented Features

### 1. CORS Configuration
- ✅ Regex pattern allows **ALL** Vercel domains: `r"https://.*\.vercel\.app"`
- ✅ Includes your frontend: `https://video-chat-frontend-seven.vercel.app`
- ✅ Supports credentials for cookies/auth
- ✅ Allows all HTTP methods and headers

**Location:** config.py#L136-L156

### 2. WebSocket with Avatars
- ✅ Endpoint: `wss://web-production-3ba7e.up.railway.app/ws/{room_id}/{user_id}`
- ✅ Query params: `?username={name}&avatar_url={url}`
- ✅ Auto-persists avatars to user profiles
- ✅ Broadcasts avatars in all messages
- ✅ Keepalive pings every 30 seconds

**Location:** main.py#L592-L733

### 3. User Management APIs
```http
POST /users                      - Create user
GET /users                       - List all users  
GET /users/{user_id}             - Get profile with avatar
PUT /users/{user_id}/profile     - Update display name & avatar
```

**Validation:** Rejects base64 avatars, requires URLs only

**Location:** main.py#L326-L381

### 4. Room Management APIs
```http
POST /rooms                      - Create room with thumbnail
GET /rooms                       - List rooms with thumbnails
GET /rooms/{room_id}             - Get room details
GET /rooms/{room_id}/messages    - Get messages with avatars
POST /rooms/{room_id}/join       - Join room (standard)
POST /{room_id}/join             - Join room (Next.js shorthand)
```

**Location:** main.py#L383-L535

### 5. Database Persistence
- ✅ PostgreSQL with Railway
- ✅ Messages include `avatar_url` column
- ✅ Users have `avatar_url` and `display_name`
- ✅ Rooms have `thumbnail_url`
- ✅ COALESCE query for avatar fallback

**Location:** database/postgres.py

---

## 🧪 Manual Testing

### Test 1: Health Check
```bash
curl https://web-production-3ba7e.up.railway.app/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-30T...",
  "environment": "production",
  "services": {
    "api": "running",
    "websocket": "running"
  }
}
```

### Test 2: CORS Headers
```powershell
$headers = @{"Origin"="https://video-chat-frontend-seven.vercel.app"}
Invoke-WebRequest -Uri "https://web-production-3ba7e.up.railway.app/health" `
  -Headers $headers -UseBasicParsing | Select-Object -ExpandProperty Headers
```

**Expected Headers:**
```
Access-Control-Allow-Origin: https://video-chat-frontend-seven.vercel.app
Access-Control-Allow-Credentials: true
```

### Test 3: Create User
```powershell
$body = @{username="testuser"} | ConvertTo-Json
$user = Invoke-RestMethod -Uri "https://web-production-3ba7e.up.railway.app/users" `
  -Method POST -Body $body -ContentType "application/json"
$user
```

### Test 4: Update Profile with Avatar
```powershell
$userId = $user.id
$profile = @{
  display_name="Test User"
  avatar_url="https://ui-avatars.com/api/?name=Test+User"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://web-production-3ba7e.up.railway.app/users/$userId/profile" `
  -Method PUT -Body $profile -ContentType "application/json"
```

### Test 5: Create Room
```powershell
$roomData = @{
  name="Test Room"
  thumbnail_url="https://picsum.photos/200"
} | ConvertTo-Json

$room = Invoke-RestMethod -Uri "https://web-production-3ba7e.up.railway.app/rooms" `
  -Method POST -Body $roomData -ContentType "application/json"
$room
```

### Test 6: Join Room
```powershell
$joinData = @{
  user_id=$userId
  username="Test User"
  avatar_url="https://ui-avatars.com/api/?name=Test+User"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://web-production-3ba7e.up.railway.app/rooms/$($room.id)/join" `
  -Method POST -Body $joinData -ContentType "application/json"
```

### Test 7: Get Messages
```powershell
Invoke-RestMethod -Uri "https://web-production-3ba7e.up.railway.app/rooms/$($room.id)/messages"
```

**Expected:** Array of messages with `avatar_url` field

---

## 🌐 Frontend Integration

Your frontend should use these environment variables:

```env
NEXT_PUBLIC_API_URL=https://web-production-3ba7e.up.railway.app
```

### WebSocket Connection
```javascript
const ws = new WebSocket(
  `wss://web-production-3ba7e.up.railway.app/ws/${roomId}/${userId}?username=${encodeURIComponent(username)}&avatar_url=${encodeURIComponent(avatarUrl)}`
);

ws.onopen = () => console.log('✅ Connected to chat');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Message:', data);
  // data.avatar_url is included in all messages
};

ws.send(JSON.stringify({
  content: 'Hello everyone!'
}));
```

### REST API Calls
```javascript
// Create user
const user = await fetch('https://web-production-3ba7e.up.railway.app/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'johndoe' })
}).then(r => r.json());

// Update avatar
await fetch(`https://web-production-3ba7e.up.railway.app/users/${user.id}/profile`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    display_name: 'John Doe',
    avatar_url: 'https://ui-avatars.com/api/?name=John+Doe'
  })
});

// Join room
await fetch(`https://web-production-3ba7e.up.railway.app/rooms/${roomId}/join`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_id: user.id,
    username: user.username,
    avatar_url: 'https://ui-avatars.com/api/?name=John+Doe'
  })
});
```

---

## 🔍 Debugging WebSocket Issues

If WebSocket connections fail, check:

### 1. Check Railway Logs
```bash
# In Railway dashboard, go to your deployment > Logs
# Look for:
✅ WebSocket accepted: user=xxx, room=xxx
```

### 2. Browser DevTools
```javascript
// In browser console on https://video-chat-frontend-seven.vercel.app
const ws = new WebSocket('wss://web-production-3ba7e.up.railway.app/ws/test-room/test-user?username=Test');

ws.onopen = () => console.log('✅ CONNECTED');
ws.onerror = (e) => console.error('❌ ERROR:', e);
ws.onclose = (e) => console.log('🔌 CLOSED:', e.code, e.reason);
```

**Status Codes:**
- `101` - ✅ Connection upgraded (success)
- `403` - ❌ CORS or origin rejected
- `404` - ❌ Endpoint not found
- `1006` - ❌ Abnormal closure

### 3. Common Fixes

| Issue | Cause | Solution |
|-------|-------|----------|
| CORS error | Origin not allowed | Already fixed with regex pattern |
| WebSocket 4004 | Room not found | Call `/rooms/{room_id}/join` first |
| Missing avatars | Not in query params | Add `?avatar_url=...` to WS URL |
| Connection drops | No keepalive | Already implemented (30s ping) |

---

## 📊 Current Configuration Summary

### CORS Settings (config.py)
```python
cors_origins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173",
  # + your configured origins
]
cors_origin_regex = r"https://.*\.vercel\.app"  # ALL Vercel domains
```

### WebSocket Settings
- Auto-creates users if not found (when from localhost or production)
- Auto-persists avatar_url from query params
- Broadcasts avatars in all messages
- 30-second keepalive pings

### Database Schema
```sql
-- Users
id, username, display_name, avatar_url, joined_at

-- Rooms  
id, name, thumbnail_url, created_at, users (JSON array)

-- Messages
id, room_id, user_id, username, content, avatar_url, timestamp
```

---

## ✅ Checklist

Your backend already has:

- [x] CORS configured for Vercel domains (regex pattern)
- [x] WebSocket accepts avatar_url query parameter
- [x] WebSocket persists avatars to user profiles
- [x] Messages include avatar_url field
- [x] User profile endpoints (GET, PUT)
- [x] Room endpoints with thumbnails
- [x] Join room endpoints (standard + shorthand)
- [x] PostgreSQL persistence
- [x] Health check endpoint
- [x] Comprehensive API documentation

---

## 🎯 Next Steps

1. **Verify frontend environment variable:**
   ```env
   NEXT_PUBLIC_API_URL=https://web-production-3ba7e.up.railway.app
   ```

2. **Test WebSocket from frontend:**
   - Open https://video-chat-frontend-seven.vercel.app
   - Open browser DevTools (F12)
   - Check Network tab > WS filter
   - Status should be `101 Switching Protocols`

3. **Check Railway logs:**
   - Should see `✅ WebSocket accepted` messages
   - Should NOT see `❌ WebSocket rejected` errors

4. **Test chat functionality:**
   - Create room
   - Join room
   - Send messages
   - Verify avatars display
   - Refresh page - messages should persist

---

## 📚 Documentation Files

- `API_ENDPOINTS.md` - Complete API reference (60+ endpoints)
- `FRONTEND_LOCALSTORAGE_FIX.md` - Guide to migrate from localStorage to backend
- `FRONTEND_FIXES.md` - Frontend integration examples
- `README.md` - Full project documentation

---

## 🆘 Still Having Issues?

If connections still fail after verifying the above:

1. **Check Railway deployment status:**
   ```bash
   curl https://web-production-3ba7e.up.railway.app/health
   ```

2. **Verify CORS in browser:**
   - Open DevTools > Network tab
   - Make any request to backend
   - Check Response Headers for `Access-Control-Allow-Origin`

3. **Test WebSocket directly:**
   ```javascript
   // In browser console on Vercel site
   const ws = new WebSocket('wss://web-production-3ba7e.up.railway.app/ws/test/test?username=Test');
   ws.onopen = () => console.log('Connected!');
   ```

4. **Check Railway logs** for specific error messages

---

**Your backend is production-ready!** 🚀

The frontend at https://video-chat-frontend-seven.vercel.app should connect successfully.
