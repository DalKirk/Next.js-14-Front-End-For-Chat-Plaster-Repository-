# Production Deployment Guide - Chat Room Connections

**Status:** Your Railway backend endpoints work, but WebSocket connections from Vercel are being rejected due to Origin validation.

---

## ✅ Frontend Fixes Applied

All frontend changes are complete and ready for production:

1. **Strict join-before-WS flow** - No WebSocket connection without successful room join
2. **Guarded user creation** - Auto-creates backend user if missing
3. **Avatar persistence** - Sends avatar_url in join, WS query params, and messages
4. **Message merging** - Prevents disappearing messages during polling
5. **UI Avatars fallback** - First-letter avatars when no custom upload

---

## 🔧 Backend Configuration Required

Your FastAPI backend on Railway needs these updates:

### 1. Apply CORS Middleware

Update your main FastAPI app file (usually `main.py` or `app.py`):

```python
from fastapi import FastAPI
from backend.dynamic_cors_middleware import DynamicCORSMiddleware

# Your Vercel domains
WHITELIST = {
    "https://video-chat-frontend-iio886s1j-dalkirks-projects.vercel.app",
    "https://video-chat-frontend-seven.vercel.app",
    "http://localhost:3000",
}

app = FastAPI()

# Add CORS middleware FIRST (before other middleware)
app.add_middleware(DynamicCORSMiddleware, whitelist=WHITELIST)

# ... rest of your routes
```

### 2. WebSocket Origin Validation

Update your WebSocket endpoint to validate Origin:

```python
from fastapi import WebSocket, Query, WebSocketDisconnect, HTTPException
from starlette.websockets import WebSocketState

@app.websocket("/ws/{room_id}/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    room_id: str,
    user_id: str,
    username: str = Query(None),
    avatar_url: str = Query(None)
):
    # Validate Origin header
    origin = websocket.headers.get("origin")
    allowed_origins = {
        "https://video-chat-frontend-iio886s1j-dalkirks-projects.vercel.app",
        "https://video-chat-frontend-seven.vercel.app",
        "http://localhost:3000",
    }
    
    if origin not in allowed_origins:
        print(f"❌ WebSocket rejected: Origin {origin} not allowed")
        await websocket.close(code=4403, reason="Origin not allowed")
        return
    
    # Check if user exists and is in room (from /join endpoint)
    # Your existing logic here...
    
    await websocket.accept()
    print(f"✅ WebSocket accepted for user {user_id} in room {room_id}")
    
    # ... rest of your WebSocket handler
```

### 3. Ensure Join Endpoint Exists

Verify your backend has `POST /rooms/{room_id}/join`:

```python
from pydantic import BaseModel
from datetime import datetime

class JoinRoomRequest(BaseModel):
    user_id: str
    username: str
    avatar_url: str | None = None

@app.post("/rooms/{room_id}/join")
async def join_room(room_id: str, request: JoinRoomRequest):
    """Register user in room before WebSocket connection"""
    
    # Store in your database or in-memory store
    # Example with database:
    # await db.room_members.insert({
    #     "room_id": room_id,
    #     "user_id": request.user_id,
    #     "username": request.username,
    #     "avatar_url": request.avatar_url,
    #     "joined_at": datetime.utcnow()
    # })
    
    return {
        "message": f"User {request.username} joined room"
    }
```

### 4. Message Persistence with Avatars

Ensure messages store avatars:

```python
from pydantic import BaseModel
from typing import Optional

class MessageCreate(BaseModel):
    user_id: str
    username: str
    content: str
    avatar_url: Optional[str] = None

@app.post("/rooms/{room_id}/messages")
async def create_message(room_id: str, message: MessageCreate):
    """Store message with avatar"""
    
    new_message = {
        "id": str(uuid.uuid4()),
        "room_id": room_id,
        "user_id": message.user_id,
        "username": message.username,
        "content": message.content,
        "avatar_url": message.avatar_url,  # ← Store avatar
        "timestamp": datetime.utcnow().isoformat()
    }
    
    # Save to database
    # await db.messages.insert(new_message)
    
    return new_message

@app.get("/rooms/{room_id}/messages")
async def get_messages(room_id: str, limit: int = 100):
    """Fetch messages with avatars"""
    
    # Fetch from database
    # messages = await db.messages.find({"room_id": room_id}).limit(limit)
    
    return messages
```

---

## 🗄️ Database Setup (Railway Postgres)

For cross-device persistence, add these tables:

```sql
-- Users with avatars
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) NOT NULL UNIQUE,
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Room members (who's in which room)
CREATE TABLE room_members (
    room_id UUID NOT NULL,
    user_id UUID NOT NULL,
    username VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    joined_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (room_id, user_id)
);

-- Messages with avatars
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL,
    user_id UUID NOT NULL,
    username VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_messages_room ON messages(room_id, created_at DESC);
CREATE INDEX idx_room_members_room ON room_members(room_id);
```

---

## 🚀 Deployment Steps

### 1. Update Backend Code

Copy the CORS and WebSocket changes to your backend repository.

### 2. Deploy to Railway

```bash
# In your backend repo
git add .
git commit -m "Add CORS whitelist and WebSocket Origin validation"
git push origin main
```

Railway will auto-deploy.

### 3. Verify Backend Health

```powershell
# Check health endpoint
curl https://web-production-3ba7e.up.railway.app/health

# Test CORS with your Vercel Origin
curl -H "Origin: https://video-chat-frontend-seven.vercel.app" `
  https://web-production-3ba7e.up.railway.app/health
```

Expected response should include:
```
Access-Control-Allow-Origin: https://video-chat-frontend-seven.vercel.app
Access-Control-Allow-Credentials: true
```

### 4. Deploy Frontend to Vercel

Your frontend is already configured correctly. Just push to trigger rebuild:

```bash
git add .
git commit -m "Production chat room connection fixes"
git push origin master
```

Vercel will auto-deploy.

---

## 🧪 Testing Production Connections

### Test 1: HTTP Endpoints

```powershell
$api = "https://web-production-3ba7e.up.railway.app"
$origin = "https://video-chat-frontend-seven.vercel.app"

# Create user
curl -X POST "$api/users" `
  -H "Content-Type: application/json" `
  -H "Origin: $origin" `
  -d '{"username":"testuser"}' -v

# Look for: HTTP/1.1 200 OK
# Look for: Access-Control-Allow-Origin: https://video-chat-frontend-seven.vercel.app
```

### Test 2: Join Room

```powershell
# Replace with actual IDs from previous responses
$userId = "YOUR_USER_ID"
$roomId = "YOUR_ROOM_ID"

curl -X POST "$api/rooms/$roomId/join" `
  -H "Content-Type: application/json" `
  -H "Origin: $origin" `
  -d "{\"user_id\":\"$userId\",\"username\":\"testuser\",\"avatar_url\":\"https://ui-avatars.com/api/?name=Test+User\"}" -v

# Look for: HTTP/1.1 200 OK
```

### Test 3: WebSocket (Browser DevTools)

Open your Vercel site, then in browser console:

```javascript
// Replace with your actual IDs
const roomId = "YOUR_ROOM_ID";
const userId = "YOUR_USER_ID";
const ws = new WebSocket(
  `wss://web-production-3ba7e.up.railway.app/ws/${roomId}/${userId}?username=testuser&avatar_url=https://ui-avatars.com/api/?name=Test`
);

ws.onopen = () => console.log('✅ WebSocket connected!');
ws.onerror = (err) => console.error('❌ WebSocket error:', err);
ws.onclose = (e) => console.log('WebSocket closed:', e.code, e.reason);
```

**Expected:** `✅ WebSocket connected!`
**If failed:** Check Railway logs for rejection reason

---

## 🔍 Debugging Production Issues

### Check Railway Logs

```bash
# If using Railway CLI
railway logs

# Look for:
# ✅ "WebSocket accepted for user..."
# ❌ "WebSocket rejected: Origin ... not allowed"
# ❌ "403 Forbidden"
```

### Check Browser DevTools (on Vercel site)

1. Open **Network** tab
2. Filter by **WS** (WebSocket)
3. Look for connection to `wss://web-production-3ba7e.up.railway.app`
4. Check **Status**: should be `101 Switching Protocols`
5. If **Status** is red or failed, check **Headers** → **Response Headers**

### Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| WebSocket shows "disconnected" | Origin not in CORS whitelist | Add Vercel domain to backend whitelist |
| 403 Forbidden on WS | WebSocket rejecting before accept() | Add Origin validation in WS handler |
| Messages disappear | Backend not storing avatar_url | Update message schema to include avatar_url |
| Can't see messages on other devices | Using in-memory storage | Switch to Railway Postgres database |
| 404 on join endpoint | Backend missing route | Add `POST /rooms/{room_id}/join` |

---

## ✅ Success Checklist

After deploying, verify:

- [ ] `POST /users` returns 200 with CORS headers
- [ ] `POST /rooms/{room_id}/join` returns 200
- [ ] WebSocket connects (status 101 in DevTools)
- [ ] Sending message shows immediately (WS echo)
- [ ] Message persists after page refresh
- [ ] Custom avatar displays correctly
- [ ] Avatar visible on multiple devices
- [ ] Room thumbnails persist

---

## 📝 Quick Reference

**Backend endpoints that MUST work:**
- `POST /users` - Create user
- `POST /rooms` - Create room  
- `POST /rooms/{room_id}/join` - Register in room (prevents 403)
- `GET /rooms/{room_id}/messages?limit=100` - Fetch messages
- `POST /rooms/{room_id}/messages` - Send message
- `WS /ws/{room_id}/{user_id}` - Real-time connection

**Frontend URLs:**
- Production: https://video-chat-frontend-seven.vercel.app
- Deployment: https://video-chat-frontend-iio886s1j-dalkirks-projects.vercel.app
- Backend: https://web-production-3ba7e.up.railway.app

**Environment Variables (already set):**
- `NEXT_PUBLIC_API_URL`: https://web-production-3ba7e.up.railway.app
- `NEXT_PUBLIC_WS_URL`: wss://web-production-3ba7e.up.railway.app

---

## 🎯 Next Steps

1. **Update backend** with CORS middleware and WS Origin validation
2. **Redeploy backend** to Railway
3. **Test HTTP + WS** using commands above
4. **Deploy frontend** (already ready, just push to trigger rebuild)
5. **Clear browser cache** and test on Vercel domain
6. **Add database** for cross-device persistence (optional but recommended)

---

## 💡 Key Points

- **Backend changes are required** - Frontend is already fixed and ready
- **CORS is critical** - Without it, browser blocks all requests
- **Origin validation** - WebSocket needs explicit Origin check before accept()
- **Database recommended** - In-memory storage won't persist across devices or restarts

Need help with backend implementation? Share your FastAPI main file and I can provide exact integration code.
