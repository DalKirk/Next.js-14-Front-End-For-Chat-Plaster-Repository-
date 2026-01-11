# Backend Fixes Required for Multi-Device Streaming

## Issue
The backend's `broadcast-started` handler is throwing exceptions and returning "Invalid message format", preventing viewers from receiving broadcast notifications.

## File to Edit
`backend/server.py`

## Changes Needed

### Change 1: Fix broadcast-started handler

**Find this code (around line 480-495):**
```python
# Broadcast lifecycle notifications
if ptype == "broadcast-started":
    for uid, ws in list(room_connections.get(room_id, {}).items()):
        if uid == user_id:
            continue
        try:
            await ws.send_json({
                "type": "broadcast-started",
                "user_id": user_id,
                "username": rooms[room_id]["users"][user_id]["username"],
                "timestamp": datetime.utcnow().isoformat(),
            })
        except Exception:
            pass
    continue
```

**Replace with:**
```python
# Broadcast lifecycle notifications
if ptype == "broadcast-started":
    broadcaster_name = payload.get("username") or username or "Anonymous"
    for uid, ws in list(room_connections.get(room_id, {}).items()):
        if uid == user_id:
            continue
        try:
            await ws.send_json({
                "type": "broadcast-started",
                "user_id": user_id,
                "username": broadcaster_name,
                "timestamp": datetime.utcnow().isoformat(),
            })
        except Exception:
            pass
    continue
```

### Change 2: Fix broadcast-stopped handler

**Find this code (around line 497-507):**
```python
if ptype == "broadcast-stopped":
    for ws in list(room_connections.get(room_id, {}).values()):
        try:
            await ws.send_json({
                "type": "broadcast-stopped",
                "user_id": user_id,
                "username": rooms[room_id]["users"][user_id]["username"],
                "timestamp": datetime.utcnow().isoformat(),
            })
        except Exception:
            pass
    continue
```

**Replace with:**
```python
if ptype == "broadcast-stopped":
    broadcaster_name = payload.get("username") or username or "Anonymous"
    for ws in list(room_connections.get(room_id, {}).values()):
        try:
            await ws.send_json({
                "type": "broadcast-stopped",
                "user_id": user_id,
                "username": broadcaster_name,
                "timestamp": datetime.utcnow().isoformat(),
            })
        except Exception:
            pass
    continue
```

### Change 3: Skip messages without content

**Find this code (around line 509-511):**
```python
# Treat as message
content = payload.get("content")
msg_avatar = payload.get("avatar") or avatar_url
```

**Replace with:**
```python
# Treat as message - skip if no content
content = payload.get("content")
if not content:
    continue
msg_avatar = payload.get("avatar") or avatar_url
```

## Why These Changes

1. **Dictionary lookup issue**: `rooms[room_id]["users"][user_id]["username"]` can fail if the user entry doesn't exist or is malformed, causing an exception and "Invalid message format" error.

2. **Solution**: Use the username from the WebSocket payload directly (`payload.get("username")`) with fallbacks to the connection's username or "Anonymous".

3. **Content check**: Messages without content (like `keep_alive`) were falling through to the message handler and causing errors.

## After Making Changes

1. Save `backend/server.py`
2. Restart your backend server at `api.starcyeed.com`
3. Test "Go Live" - User B should now see `📡 Broadcast started by: [username]` in console
4. Video should appear on User B's device

## Verification

After deploying, check User B's console when User A clicks "Go Live". You should see:
- ✅ `📡 Broadcast started by: MonkeyBrains` (or the broadcaster's name)
- ✅ WebRTC signaling logs
- ✅ ICE candidate logs
- ✅ Video stream appears

Instead of:
- ❌ `📨 Received WebSocket message: {type: 'error', message: 'Invalid message format'}`
