# Chat Room Connection Issues - Fix Guide

## Current Issues

Based on Railway logs and error messages, there are 3 main problems:

### 1. WebSocket Connection Rejected (403 Forbidden)
**Error in Railway logs:**
```
INFO: POST /rooms/{room_id}/join HTTP/1.1" 404 Not Found
INFO: WebSocket /ws/{room_id}/{user_id} 403
INFO: connection rejected (403 Forbidden)
```

**Root Cause:** Backend is rejecting WebSocket connections because users aren't properly registered in rooms.

### 2. Generic Avatar Instead of Custom Avatar
**Error in Railway logs:**
```
avatar_url=https%3A%2F%2Fi.pravatar.cc%2F150%3Fu%3D{user_id}
```

**Root Cause:** Frontend avatar fix was applied but backend needs to be updated to accept and store custom avatars.

### 3. Avatar Vanishing After Few Seconds
**Problem:** Custom avatars display briefly then disappear.

**Root Cause:** Messages are being re-fetched without avatar data, or avatar URLs are being lost.

---

## Backend Fixes Required

### Fix 1: Add Missing `/rooms/{room_id}/join` Endpoint

**Add this endpoint to your FastAPI backend:**

```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

class JoinRoomRequest(BaseModel):
    user_id: str
    username: str
    avatar_url: str | None = None

@router.post("/rooms/{room_id}/join")
async def join_room(room_id: str, request: JoinRoomRequest):
    """
    Register a user in a room before WebSocket connection.
    This prevents 403 errors when connecting via WebSocket.
    """
    try:
        # Store user in room (use Redis, database, or in-memory dict)
        # Example using in-memory dict (replace with proper storage):
        if room_id not in rooms:
            rooms[room_id] = {"users": {}, "messages": []}
        
        rooms[room_id]["users"][request.user_id] = {
            "username": request.username,
            "avatar_url": request.avatar_url,
            "joined_at": datetime.utcnow()
        }
        
        return {
            "status": "success",
            "room_id": room_id,
            "user_id": request.user_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### Fix 2: Update WebSocket Handler to Accept Registered Users

**Modify your WebSocket connection handler:**

```python
@app.websocket("/ws/{room_id}/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    room_id: str,
    user_id: str,
    username: str = Query(None),
    avatar_url: str = Query(None)
):
    # Check if user is registered in room (from /join endpoint)
    if room_id not in rooms or user_id not in rooms[room_id]["users"]:
        # AUTO-REGISTER: Allow connection and register user
        if room_id not in rooms:
            rooms[room_id] = {"users": {}, "messages": []}
        
        rooms[room_id]["users"][user_id] = {
            "username": username or "Anonymous",
            "avatar_url": avatar_url,
            "joined_at": datetime.utcnow()
        }
        print(f"✅ Auto-registered user {user_id} in room {room_id}")
    
    # Accept WebSocket connection
    await websocket.accept()
    
    # ... rest of your WebSocket handler
```

### Fix 3: Store Avatar URLs with Messages

**Update your message storage to include avatars:**

```python
@router.post("/rooms/{room_id}/messages")
async def send_message(room_id: str, message: MessageCreate):
    """Store message with avatar URL"""
    
    # Get user's avatar from room users
    avatar_url = None
    if room_id in rooms and message.user_id in rooms[room_id]["users"]:
        avatar_url = rooms[room_id]["users"][message.user_id].get("avatar_url")
    
    new_message = {
        "id": str(uuid.uuid4()),
        "room_id": room_id,
        "user_id": message.user_id,
        "username": message.username,
        "content": message.content,
        "avatar": avatar_url,  # ← Include avatar
        "timestamp": datetime.utcnow().isoformat(),
        "type": message.type
    }
    
    # Store message
    rooms[room_id]["messages"].append(new_message)
    
    return new_message

@router.get("/rooms/{room_id}/messages")
async def get_messages(room_id: str):
    """Return messages with avatars"""
    if room_id not in rooms:
        return []
    
    # Ensure all messages have avatar data
    messages = rooms[room_id]["messages"]
    for msg in messages:
        if "avatar" not in msg or not msg["avatar"]:
            # Fetch avatar from room users
            user_id = msg.get("user_id")
            if user_id and user_id in rooms[room_id]["users"]:
                msg["avatar"] = rooms[room_id]["users"][user_id].get("avatar_url")
    
    return messages
```

---

## Frontend Changes Already Applied

✅ Avatar is now passed directly to WebSocket (not lost in async state update)  
✅ Avatar logging added to debug visibility issues  
✅ Fallback to generic avatar only when custom avatar doesn't exist  

---

## Testing After Backend Update

1. **Clear browser localStorage:**
   ```javascript
   localStorage.clear();
   location.reload();
   ```

2. **Create new user with custom avatar:**
   - Go to profile page
   - Upload custom avatar
   - Save profile

3. **Join chat room:**
   - Create or join room
   - Send message
   - Verify custom avatar appears

4. **Check Railway logs:**
   - Should see: `✅ Auto-registered user`
   - Should NOT see: `403 Forbidden`
   - Should see custom avatar URL in WebSocket connection

---

## Database Schema (Optional - For Production)

For persistent storage across devices, add to your database:

```sql
-- Users table with avatars
CREATE TABLE users (
    id UUID PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Room members with avatar cache
CREATE TABLE room_members (
    room_id UUID,
    user_id UUID,
    avatar_url TEXT,  -- Cache avatar for performance
    joined_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (room_id, user_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Messages with avatar URL
CREATE TABLE messages (
    id UUID PRIMARY KEY,
    room_id UUID NOT NULL,
    user_id UUID NOT NULL,
    username VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    avatar_url TEXT,  -- Store with each message for consistency
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Quick Fixes (Temporary)

If you can't update the backend immediately:

### Option 1: Disable WebSocket (Use REST API Only)
Already implemented in frontend - app will automatically fall back to polling mode.

### Option 2: Mock the Join Endpoint
Add a simple endpoint that always returns success:

```python
@router.post("/rooms/{room_id}/join")
async def join_room(room_id: str, request: dict):
    return {"status": "success"}
```

This won't store users but will prevent the 404 error that blocks WebSocket connection.

---

## Priority Order

1. **HIGH:** Add `/rooms/{room_id}/join` endpoint (fixes 403 error)
2. **HIGH:** Update WebSocket to accept registered users (enables real-time chat)
3. **MEDIUM:** Store avatar URLs with messages (fixes vanishing avatars)
4. **LOW:** Add database schema for cross-device sync

Once you implement #1 and #2, chat rooms will work in real-time with WebSockets!
