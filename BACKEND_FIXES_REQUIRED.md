# Backend Fixes Required for Multi-Device Streaming

## Overview
These changes fix WebRTC video streaming between users. Apply these to your Railway backend's `server.py` file.

## File to Edit
`server.py` (your main FastAPI backend file)

---

## Change 1: Fix WebRTC Signal Relay (CRITICAL)

The WebRTC signal relay must include `room_id` and `target_user_id` in the relayed message, and use the payload username instead of dictionary lookup.

**Find this code (in the WebSocket message handler):**
```python
# WebRTC signaling: relay targeted signals
if ptype == "webrtc-signal":
    target_user_id = payload.get("target_user_id")
    target_ws = room_connections.get(room_id, {}).get(target_user_id)
    if target_ws is not None:
        try:
            await target_ws.send_json({
                "type": "webrtc-signal",
                "from_user_id": user_id,
                "from_username": rooms[room_id]["users"][user_id]["username"],
                "signal": payload.get("signal"),
            })
        except Exception:
            pass
    continue
```

**Replace with:**
```python
# WebRTC signaling: relay targeted signals
if ptype == "webrtc-signal":
    target_user_id = payload.get("target_user_id")
    target_ws = room_connections.get(room_id, {}).get(target_user_id)
    if target_ws is not None:
        try:
            sender_username = payload.get("from_username") or username or "Anonymous"
            await target_ws.send_json({
                "type": "webrtc-signal",
                "room_id": room_id,
                "target_user_id": target_user_id,
                "from_user_id": user_id,
                "from_username": sender_username,
                "signal": payload.get("signal"),
            })
        except Exception:
            pass
    continue
```

---

## Change 2: Fix broadcast-started handler

**Find this code:**
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

---

## Change 3: Fix broadcast-stopped handler

**Find this code:**
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

---

## Change 4: Skip messages without content

**Find this code:**
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

---

## Why These Changes Are Needed

| Issue | Problem | Solution |
|-------|---------|----------|
| WebRTC signals missing fields | Frontend can't filter signals properly | Include `room_id` and `target_user_id` in relay |
| Dictionary lookup fails | `rooms[room_id]["users"][user_id]["username"]` throws KeyError | Use `payload.get("username")` with fallbacks |
| Empty messages cause errors | `keep_alive` messages fall through to message handler | Skip messages without content |

---

## After Making Changes

1. **Save** `server.py`
2. **Commit and push** to trigger Railway auto-deploy:
   ```bash
   git add server.py
   git commit -m "Fix WebRTC signaling for multi-device streaming"
   git push
   ```
3. **Wait** for Railway to redeploy (check dashboard)
4. **Test** "Go Live" - User B should now see video from User A

---

## Verification

After deploying, check User B's browser console when User A clicks "Go Live":

✅ **Expected (working):**
```
📡 Broadcast started by: Dude40
📡 Creating viewer peer connection to broadcaster
📡 Received WebRTC signal from: Dude40 type: answer
🧊 Processing 3 queued ICE candidates
📺 Received remote stream from: 0443bed3-...
```

❌ **Not working (before fix):**
```
📨 Received WebSocket message: {type: 'error', message: 'Invalid message format'}
⚠️ Ignoring WebRTC signal from self
❌ Error handling signal: InvalidStateError
```
