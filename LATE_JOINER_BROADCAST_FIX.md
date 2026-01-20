# Late Joiner Broadcast Fix

## Overview
These changes allow users who join a room **after** a broadcast has started to see the active video stream. Currently, only users present when "Go Live" is clicked can view the stream.

## File to Edit
`server.py` (your main FastAPI backend file on Railway)

---

## Change 1: Add Active Broadcasters Tracking

**Find this code (near the top, after imports):**
```python
# In-memory store (replace with Redis/DB for production)
rooms: Dict[str, Dict[str, Any]] = {}
# room_id -> { user_id -> WebSocket }
room_connections: Dict[str, Dict[str, WebSocket]] = {}
rooms_lock = asyncio.Lock()
```

**Replace with:**
```python
# In-memory store (replace with Redis/DB for production)
rooms: Dict[str, Dict[str, Any]] = {}
# room_id -> { user_id -> WebSocket }
room_connections: Dict[str, Dict[str, WebSocket]] = {}
# room_id -> { user_id -> {username, started_at} } - track active broadcasters
active_broadcasters: Dict[str, Dict[str, Dict[str, Any]]] = {}
rooms_lock = asyncio.Lock()
```

---

## Change 2: Send Active Broadcasts to New Users

**Find this code (in websocket_endpoint, after sending room_state):**
```python
        # Send current room users to the newly joined client (seed present users)
        try:
            await websocket.send_json({
                "type": "room_state",
                "room_id": room_id,
                "users": [
                    {
                        "user_id": uid,
                        "username": info.get("username"),
                        "avatar_url": info.get("avatar_url"),
                    }
                    for uid, info in rooms[room_id]["users"].items()
                ],
                "timestamp": datetime.utcnow().isoformat(),
            })
        except Exception:
            pass

        # Receive loop
```

**Replace with:**
```python
        # Send current room users to the newly joined client (seed present users)
        try:
            await websocket.send_json({
                "type": "room_state",
                "room_id": room_id,
                "users": [
                    {
                        "user_id": uid,
                        "username": info.get("username"),
                        "avatar_url": info.get("avatar_url"),
                    }
                    for uid, info in rooms[room_id]["users"].items()
                ],
                "timestamp": datetime.utcnow().isoformat(),
            })
        except Exception:
            pass

        # Send active broadcasters to newly joined user so they can connect
        room_broadcasters = active_broadcasters.get(room_id, {})
        if room_broadcasters:
            try:
                await websocket.send_json({
                    "type": "active-broadcasts",
                    "room_id": room_id,
                    "broadcasters": [
                        {
                            "user_id": bc_id,
                            "username": bc_info.get("username", "Anonymous"),
                            "started_at": bc_info.get("started_at"),
                        }
                        for bc_id, bc_info in room_broadcasters.items()
                    ],
                    "timestamp": datetime.utcnow().isoformat(),
                })
            except Exception:
                pass

        # Receive loop
```

---

## Change 3: Track Broadcaster on Start

**Find this code:**
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

**Replace with:**
```python
                # Broadcast lifecycle notifications
                if ptype == "broadcast-started":
                    broadcaster_name = payload.get("username") or username or "Anonymous"
                    # Track this broadcaster as active
                    active_broadcasters.setdefault(room_id, {})[user_id] = {
                        "username": broadcaster_name,
                        "started_at": datetime.utcnow().isoformat(),
                    }
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

## Change 4: Remove Broadcaster on Stop

**Find this code:**
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

**Replace with:**
```python
                if ptype == "broadcast-stopped":
                    broadcaster_name = payload.get("username") or username or "Anonymous"
                    # Remove broadcaster from active tracking
                    try:
                        if room_id in active_broadcasters and user_id in active_broadcasters[room_id]:
                            del active_broadcasters[room_id][user_id]
                    except Exception:
                        pass
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

## Change 5: Clean Up Broadcaster on Disconnect

**Find this code (in the WebSocketDisconnect exception handler):**
```python
    except WebSocketDisconnect:
        # Cleanup on disconnect
        try:
            conns = room_connections.get(room_id, {})
            if user_id in conns:
                del conns[user_id]
        except Exception:
            pass
        # Notify leave
        for ws in list(room_connections.get(room_id, {}).values()):
```

**Replace with:**
```python
    except WebSocketDisconnect:
        # Cleanup on disconnect
        try:
            conns = room_connections.get(room_id, {})
            if user_id in conns:
                del conns[user_id]
        except Exception:
            pass
        # Clean up broadcaster if this user was broadcasting
        was_broadcasting = False
        try:
            if room_id in active_broadcasters and user_id in active_broadcasters[room_id]:
                del active_broadcasters[room_id][user_id]
                was_broadcasting = True
        except Exception:
            pass
        # Notify broadcast stopped if they were broadcasting
        if was_broadcasting:
            for ws in list(room_connections.get(room_id, {}).values()):
                try:
                    await ws.send_json({
                        "type": "broadcast-stopped",
                        "user_id": user_id,
                        "username": username or "Anonymous",
                        "timestamp": datetime.utcnow().isoformat(),
                    })
                except Exception:
                    pass
        # Notify leave
        for ws in list(room_connections.get(room_id, {}).values()):
```

---

## Why These Changes Are Needed

| Issue | Problem | Solution |
|-------|---------|----------|
| No broadcast tracking | Backend doesn't know who's broadcasting | Add `active_broadcasters` dictionary |
| Late joiners miss broadcasts | New users don't know someone is live | Send `active-broadcasts` on join |
| Broadcaster leaves unexpectedly | Stream stays "active" forever | Clean up on disconnect |

---

## After Making Changes

1. **Save** `server.py`
2. **Commit and push** to trigger Railway auto-deploy:
   ```bash
   git add server.py
   git commit -m "Add late joiner broadcast support"
   git push
   ```
3. **Wait** for Railway to redeploy (check dashboard)
4. **Test** - Have User A go live, then User B joins the room later

---

## Verification

After deploying, check User B's browser console when they join a room where User A is already broadcasting:

✅ **Expected (working):**
```
📨 Received WebSocket message: {type: 'active-broadcasts', broadcasters: [...]}
📡 Received active broadcasts: [{user_id: '...', username: 'Dude40'}]
📡 Late join: connecting to active broadcaster: Dude40
📡 Late join: sending offer to broadcaster: offer
📺 Received remote stream from: 0443bed3-...
```

❌ **Before fix (not working):**
```
📨 Received WebSocket message: {type: 'room_state', ...}
(No broadcast info - user sees nothing)
```

---

## Flow Diagram

```
User A (Broadcaster)                    Backend                         User B (Late Joiner)
       |                                   |                                    |
       |-- broadcast-started ------------->|                                    |
       |                                   |-- store in active_broadcasters     |
       |                                   |                                    |
       |                                   |<-------------- joins room ---------|
       |                                   |                                    |
       |                                   |-- room_state ---------------------->|
       |                                   |-- active-broadcasts --------------->|
       |                                   |                                    |
       |<-- webrtc offer ------------------|<---- webrtc offer -----------------|
       |-- webrtc answer ----------------->|---- webrtc answer ---------------->|
       |<-- ICE candidates ----------------|<--- ICE candidates ----------------|
       |                                   |                                    |
       |============ VIDEO STREAM =========|============ VIDEO STREAM ==========>|
```
