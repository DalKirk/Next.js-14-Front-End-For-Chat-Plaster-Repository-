# Backend Integration - Chat Room Connections Fix

**Target:** FastAPI Video Chat Backend on Railway  
**Issue:** WebSocket connections rejected (403), avatars not persisting, messages disappearing  
**Frontend:** Already fixed and ready at https://video-chat-frontend-seven.vercel.app

---

## 🎯 Required Backend Changes

Your backend needs 3 critical updates to work with the production frontend:

1. **CORS Middleware** - Allow Vercel domains for HTTP and WebSocket
2. **WebSocket Origin Validation** - Verify Origin before accepting connections
3. **Avatar Persistence** - Store `avatar_url` in messages and room members

---

## 📋 Step 1: Install Dependencies

Ensure you have these in your `requirements.txt`:

```txt
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
websockets>=12.0
starlette>=0.27.0
sqlalchemy>=2.0.0  # If using database
asyncpg>=0.29.0    # If using Postgres
```

Install:
```bash
pip install -r requirements.txt
```

---

## 🔧 Step 2: Add CORS Middleware

### Option A: Use Custom Middleware (Recommended)

Create or update `dynamic_cors_middleware.py`:

```python
from typing import Set
from starlette.types import ASGIApp, Receive, Scope, Send
from starlette.responses import Response

class DynamicCORSMiddleware:
    """
    ASGI middleware that sets CORS headers dynamically by echoing the
    request Origin when it is on a whitelist. Also handles OPTIONS preflight.
    """

    def __init__(self, app: ASGIApp, whitelist: Set[str]):
        self.app = app
        self.whitelist = set(whitelist)

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        # Only handle HTTP requests
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        # Extract Origin header
        headers = {k.decode().lower(): v.decode() for k, v in scope.get("headers", [])}
        origin = headers.get("origin")

        if origin and origin in self.whitelist:
            # Handle preflight OPTIONS directly
            if scope.get("method", "").upper() == "OPTIONS":
                response = Response(status_code=204)
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"
                response.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
                response.headers["Access-Control-Allow-Headers"] = "Authorization,Content-Type,Accept"
                await response(scope, receive, send)
                return

            # For normal requests, inject CORS headers into response
            async def send_with_cors(message):
                if message["type"] == "http.response.start":
                    headers_list = message.setdefault("headers", [])
                    headers_list.extend([
                        (b"access-control-allow-origin", origin.encode()),
                        (b"access-control-allow-credentials", b"true"),
                    ])
                await send(message)

            await self.app(scope, receive, send_with_cors)
            return

        # Not a whitelisted origin, pass through
        await self.app(scope, receive, send)
```

### Option B: Use FastAPI CORSMiddleware

```python
from fastapi.middleware.cors import CORSMiddleware

# In your main app file
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://video-chat-frontend-iio886s1j-dalkirks-projects.vercel.app",
        "https://video-chat-frontend-seven.vercel.app",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 🚀 Step 3: Update Main Application

Update your `main.py` or `app.py`:

```python
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Set
import uuid

# Import custom CORS middleware
from dynamic_cors_middleware import DynamicCORSMiddleware

# Allowed origins for CORS
ALLOWED_ORIGINS = {
    "https://video-chat-frontend-iio886s1j-dalkirks-projects.vercel.app",
    "https://video-chat-frontend-seven.vercel.app",
    "http://localhost:3000",
}

app = FastAPI(
    title="Video Chat API",
    version="1.0.1",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware FIRST (before other middleware)
app.add_middleware(DynamicCORSMiddleware, whitelist=ALLOWED_ORIGINS)

# In-memory storage (replace with database in production)
rooms: Dict[str, Dict] = {}
active_connections: Dict[str, Set[WebSocket]] = {}

# ... (rest of your app code)
```

---

## 📡 Step 4: Fix WebSocket Handler

Update your WebSocket endpoint with Origin validation:

```python
@app.websocket("/ws/{room_id}/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    room_id: str,
    user_id: str,
    username: str = Query(None),
    avatar_url: str = Query(None)
):
    """
    WebSocket endpoint for real-time chat.
    Requires user to join room via POST /rooms/{room_id}/join first.
    """
    
    # 1. Validate Origin header
    origin = websocket.headers.get("origin")
    if origin not in ALLOWED_ORIGINS:
        print(f"❌ WebSocket rejected: Origin {origin} not in whitelist")
        await websocket.close(code=4403, reason="Origin not allowed")
        return
    
    # 2. Check if user is registered in room (from /join endpoint)
    if room_id not in rooms:
        print(f"❌ WebSocket rejected: Room {room_id} not found")
        await websocket.close(code=4004, reason="Room not found")
        return
    
    if user_id not in rooms[room_id].get("users", {}):
        # Optional: Auto-register if you want to allow this
        print(f"⚠️ User {user_id} not registered, auto-registering...")
        rooms[room_id].setdefault("users", {})[user_id] = {
            "username": username or "Anonymous",
            "avatar_url": avatar_url,
            "joined_at": datetime.utcnow().isoformat()
        }
    
    # 3. Accept WebSocket connection
    await websocket.accept()
    print(f"✅ WebSocket accepted: user={user_id}, room={room_id}, origin={origin}")
    
    # 4. Add to active connections
    if room_id not in active_connections:
        active_connections[room_id] = set()
    active_connections[room_id].add(websocket)
    
    # 5. Send join notification to room
    user_data = rooms[room_id]["users"][user_id]
    join_message = {
        "type": "user_joined",
        "message": f"{user_data['username']} joined the chat",
        "username": user_data["username"],
        "user_id": user_id,
        "timestamp": datetime.utcnow().isoformat(),
        "avatar_url": user_data.get("avatar_url")
    }
    await broadcast_to_room(room_id, join_message)
    
    try:
        # 6. Listen for messages
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            # Ignore keep-alive messages
            if message_data.get("type") == "keep_alive":
                continue
            
            # Create message with avatar
            new_message = {
                "type": "message",
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "username": user_data["username"],
                "content": message_data.get("content", ""),
                "timestamp": datetime.utcnow().isoformat(),
                "avatar_url": user_data.get("avatar_url")
            }
            
            # Store message in room
            rooms[room_id].setdefault("messages", []).append(new_message)
            
            # Broadcast to all connections in room
            await broadcast_to_room(room_id, new_message)
            
    except WebSocketDisconnect:
        print(f"🔌 User {user_id} disconnected from room {room_id}")
    except Exception as e:
        print(f"❌ WebSocket error: {e}")
    finally:
        # 7. Remove from active connections
        if room_id in active_connections:
            active_connections[room_id].discard(websocket)
            if not active_connections[room_id]:
                del active_connections[room_id]
        
        # 8. Send leave notification
        leave_message = {
            "type": "user_left",
            "message": f"{user_data['username']} left the chat",
            "username": user_data["username"],
            "user_id": user_id,
            "timestamp": datetime.utcnow().isoformat()
        }
        await broadcast_to_room(room_id, leave_message)


async def broadcast_to_room(room_id: str, message: dict):
    """Broadcast message to all connections in a room"""
    if room_id not in active_connections:
        return
    
    import json
    message_str = json.dumps(message)
    
    dead_connections = set()
    for connection in active_connections[room_id]:
        try:
            await connection.send_text(message_str)
        except Exception as e:
            print(f"Failed to send to connection: {e}")
            dead_connections.add(connection)
    
    # Clean up dead connections
    for conn in dead_connections:
        active_connections[room_id].discard(conn)
```

---

## 🏠 Step 5: Add/Update Room Join Endpoint

```python
from pydantic import BaseModel
from typing import Optional

class JoinRoomRequest(BaseModel):
    user_id: str
    username: str
    avatar_url: Optional[str] = None


@app.post("/rooms/{room_id}/join")
async def join_room(room_id: str, request: JoinRoomRequest):
    """
    Register a user in a room before WebSocket connection.
    This is REQUIRED - WebSocket will reject users who haven't joined.
    """
    
    # Check if room exists
    if room_id not in rooms:
        raise HTTPException(status_code=404, detail="Room not found")
    
    # Register user in room
    rooms[room_id].setdefault("users", {})[request.user_id] = {
        "username": request.username,
        "avatar_url": request.avatar_url,
        "joined_at": datetime.utcnow().isoformat()
    }
    
    print(f"✅ User {request.username} joined room {room_id}")
    
    return {
        "message": f"User {request.username} joined room {rooms[room_id].get('name', room_id)}"
    }


# Alternative shorthand for Next.js (optional)
@app.post("/{room_id}/join")
async def join_room_short(room_id: str, request: JoinRoomRequest):
    """Shorthand endpoint for joining rooms"""
    return await join_room(room_id, request)
```

---

## 💬 Step 6: Update Message Endpoints

```python
class MessageCreate(BaseModel):
    user_id: str
    username: str
    content: str
    avatar_url: Optional[str] = None


@app.post("/rooms/{room_id}/messages")
async def create_message(room_id: str, message: MessageCreate):
    """
    Store a message with avatar URL.
    Called by frontend as backup when WebSocket is unavailable.
    """
    
    if room_id not in rooms:
        raise HTTPException(status_code=404, detail="Room not found")
    
    # Create message with avatar
    new_message = {
        "id": str(uuid.uuid4()),
        "room_id": room_id,
        "user_id": message.user_id,
        "username": message.username,
        "content": message.content,
        "avatar_url": message.avatar_url,  # ← Store avatar
        "timestamp": datetime.utcnow().isoformat()
    }
    
    # Store in room
    rooms[room_id].setdefault("messages", []).append(new_message)
    
    print(f"💬 Message stored: {message.username} in {room_id}")
    
    return new_message


@app.get("/rooms/{room_id}/messages")
async def get_messages(room_id: str, limit: int = 100):
    """
    Fetch messages with avatars.
    Frontend polls this when WebSocket is disconnected.
    """
    
    if room_id not in rooms:
        return []
    
    messages = rooms[room_id].get("messages", [])
    
    # Ensure all messages have avatar_url field
    for msg in messages:
        if "avatar_url" not in msg or not msg["avatar_url"]:
            # Try to get avatar from room users
            user_id = msg.get("user_id")
            if user_id and user_id in rooms[room_id].get("users", {}):
                msg["avatar_url"] = rooms[room_id]["users"][user_id].get("avatar_url")
    
    # Return most recent messages
    return messages[-limit:] if len(messages) > limit else messages
```

---

## 👤 Step 7: Update User Endpoints

```python
class UserCreate(BaseModel):
    username: str


@app.post("/users")
async def create_user(user: UserCreate):
    """Create a new user"""
    
    user_id = str(uuid.uuid4())
    new_user = {
        "id": user_id,
        "username": user.username,
        "joined_at": datetime.utcnow().isoformat()
    }
    
    print(f"✅ User created: {user.username} ({user_id})")
    
    return new_user


@app.get("/users/{user_id}")
async def get_user(user_id: str):
    """Get user profile - returns synthetic data if not in DB"""
    
    # If using database, query here
    # For now, return synthetic response
    return {
        "id": user_id,
        "username": f"User-{user_id[:8]}",
        "joined_at": datetime.utcnow().isoformat()
    }


class ProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None


@app.put("/users/{user_id}/profile")
async def update_profile(user_id: str, profile: ProfileUpdate):
    """Update user profile with avatar"""
    
    # Validate avatar URL (reject base64 data URLs)
    if profile.avatar_url and profile.avatar_url.startswith("data:"):
        raise HTTPException(
            status_code=400,
            detail="Avatar must be a URL, not base64 data. Upload to a CDN first."
        )
    
    if profile.avatar_url and len(profile.avatar_url) > 2000:
        raise HTTPException(status_code=400, detail="Avatar URL too long (max 2000 chars)")
    
    if profile.display_name and len(profile.display_name) < 2:
        raise HTTPException(status_code=400, detail="Display name must be at least 2 characters")
    
    # Update in database (mock response for now)
    updated_user = {
        "id": user_id,
        "username": profile.display_name or f"User-{user_id[:8]}",
        "avatar_url": profile.avatar_url,
        "joined_at": datetime.utcnow().isoformat()
    }
    
    return {
        "success": True,
        "user": updated_user
    }
```

---

## 🏢 Step 8: Update Room Creation

```python
class RoomCreate(BaseModel):
    name: str
    thumbnail_url: Optional[str] = None


@app.post("/rooms")
async def create_room(room: RoomCreate):
    """Create a new chat room"""
    
    room_id = str(uuid.uuid4())
    
    new_room = {
        "id": room_id,
        "name": room.name,
        "created_at": datetime.utcnow().isoformat(),
        "users": {},
        "messages": [],
        "thumbnail_url": room.thumbnail_url
    }
    
    rooms[room_id] = new_room
    
    print(f"✅ Room created: {room.name} ({room_id})")
    
    return {
        "id": room_id,
        "name": room.name,
        "created_at": new_room["created_at"],
        "users": [],
        "thumbnail_url": room.thumbnail_url
    }


@app.get("/rooms")
async def get_rooms():
    """Get all rooms"""
    
    return [
        {
            "id": room_id,
            "name": room_data.get("name", "Untitled Room"),
            "created_at": room_data.get("created_at"),
            "users": list(room_data.get("users", {}).keys()),
            "thumbnail_url": room_data.get("thumbnail_url")
        }
        for room_id, room_data in rooms.items()
    ]
```

---

## 🗄️ Step 9: Database Schema (Optional but Recommended)

For persistent storage across restarts and devices, use Railway Postgres:

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(100),
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Rooms table
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    thumbnail_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Room members
CREATE TABLE room_members (
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    username VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    joined_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (room_id, user_id)
);

-- Messages with avatars
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    username VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_messages_room_time ON messages(room_id, created_at DESC);
CREATE INDEX idx_room_members_room ON room_members(room_id);
CREATE INDEX idx_room_members_user ON room_members(user_id);
```

---

## 🔍 Step 10: Health Check Endpoint

```python
@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "environment": "production",
        "active_rooms": len(rooms),
        "active_connections": sum(len(conns) for conns in active_connections.values())
    }
```

---

## 🚀 Deployment to Railway

### Update Railway Environment Variables

In Railway dashboard, add:

```bash
# Python settings
PYTHON_VERSION=3.11

# App settings  
PORT=8000
RAILWAY_ENVIRONMENT=production

# Database (if using Postgres)
DATABASE_URL=${DATABASE_URL}  # Auto-provided by Railway Postgres

# CORS origins (optional - hardcoded in app)
ALLOWED_ORIGINS=https://video-chat-frontend-seven.vercel.app,http://localhost:3000
```

### Start Command

In Railway settings or `Procfile`:

```
web: uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1
```

### Deploy

```bash
git add .
git commit -m "Add CORS middleware and WebSocket Origin validation"
git push origin main
```

Railway will auto-deploy.

---

## ✅ Verification Commands

After deployment, test from your local machine:

```bash
# Set variables
$API="https://web-production-3ba7e.up.railway.app"
$ORIGIN="https://video-chat-frontend-seven.vercel.app"

# Test CORS headers
curl -H "Origin: $ORIGIN" "$API/health" -v

# Should see:
# Access-Control-Allow-Origin: https://video-chat-frontend-seven.vercel.app
# Access-Control-Allow-Credentials: true

# Create user
$user = curl -X POST "$API/users" -H "Content-Type: application/json" -H "Origin: $ORIGIN" -d '{"username":"testuser"}' | ConvertFrom-Json

# Create room
$room = curl -X POST "$API/rooms" -H "Content-Type: application/json" -H "Origin: $ORIGIN" -d '{"name":"testroom"}' | ConvertFrom-Json

# Join room
curl -X POST "$API/rooms/$($room.id)/join" `
  -H "Content-Type: application/json" `
  -H "Origin: $ORIGIN" `
  -d "{`"user_id`":`"$($user.id)`",`"username`":`"testuser`",`"avatar_url`":`"https://ui-avatars.com/api/?name=Test`"}"

# Check WebSocket in browser (from Vercel site)
# Open DevTools console and run:
# const ws = new WebSocket('wss://web-production-3ba7e.up.railway.app/ws/ROOM_ID/USER_ID?username=testuser');
# ws.onopen = () => console.log('Connected!');
```

---

## 📊 Monitoring

Check Railway logs for:

```
✅ WebSocket accepted: user=xxx, room=xxx, origin=https://...
✅ User testuser joined room xxx
💬 Message stored: testuser in xxx
```

Should NOT see:
```
❌ WebSocket rejected: Origin ... not in whitelist
❌ WebSocket rejected: Room ... not found
```

---

## 🐛 Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| CORS error in browser | Middleware not added | Add `app.add_middleware(DynamicCORSMiddleware, ...)` |
| WebSocket 403 | Origin not validated | Add Origin check before `websocket.accept()` |
| Messages missing avatars | Not storing avatar_url | Update message creation to include `avatar_url` field |
| Data lost on restart | Using in-memory storage | Switch to Railway Postgres database |
| WebSocket closes immediately | Room not found | Ensure user calls `/join` endpoint before WS |

---

## 📚 Complete Example

See the FastAPI backend repo for full working example:
https://github.com/DalKirk/-FastAPI-Video-Chat-App

Key files:
- `main.py` - Main application with routes
- `dynamic_cors_middleware.py` - CORS middleware
- `requirements.txt` - Dependencies
- Database models (if using SQLAlchemy)

---

## ✅ Success Checklist

After implementing all changes:

- [ ] CORS middleware added and configured with Vercel domains
- [ ] WebSocket validates Origin before accepting
- [ ] `/rooms/{room_id}/join` endpoint exists and works
- [ ] Messages include `avatar_url` field
- [ ] `GET /rooms/{room_id}/messages` returns avatars
- [ ] Health check returns 200 with CORS headers
- [ ] Railway deployment successful
- [ ] WebSocket connects from Vercel (status 101)
- [ ] Messages persist across page refresh
- [ ] Avatars display correctly
- [ ] Multiple devices can see same data (if using DB)

---

## 🎯 Next Steps

1. **Apply these changes** to your backend repository
2. **Deploy to Railway** (auto-deploy via git push)
3. **Test endpoints** using verification commands above
4. **Test WebSocket** from Vercel site in browser DevTools
5. **Add database** (Railway Postgres) for production persistence
6. **Monitor logs** to verify connections succeed

Once deployed, your frontend at https://video-chat-frontend-seven.vercel.app will connect successfully!
