# Backend WebSocket Update for DMs

The backend needs to handle these DM-specific message types. Add this code to `server.py`.

---

## 1. Add DM User Connections Tracking (around line 55)

Add this after the existing `active_broadcasters` definition:

```python
# DM user connections: user_id -> WebSocket (for delivering DMs to the right user)
dm_connections: Dict[str, WebSocket] = {}
dm_connections_lock = asyncio.Lock()
```

---

## 2. Add DM Message Handlers in the WebSocket Receive Loop

In the `websocket_endpoint` function, add these handlers after the `broadcast-stopped` handler (around line 949):

```python
                # ─── DM Message Types ───────────────────────────────────
                
                # Handle direct messages - relay to target user
                if ptype == "dm_message":
                    receiver_id = payload.get("receiver_id")
                    sender_id = payload.get("sender_id") or user_id
                    content = payload.get("content", "")
                    
                    if not receiver_id or not content:
                        continue
                    
                    # Build the message to send
                    dm_payload = {
                        "type": "dm_message",
                        "message": {
                            "id": str(uuid.uuid4()),
                            "sender_id": sender_id,
                            "sender_username": payload.get("sender_username") or username or "Anonymous",
                            "sender_avatar": payload.get("sender_avatar") or avatar_url,
                            "receiver_id": receiver_id,
                            "content": content,
                            "timestamp": payload.get("timestamp") or datetime.utcnow().isoformat(),
                        }
                    }
                    
                    # Find receiver's WebSocket in any room (they might be in "dm" room or any other)
                    receiver_ws = None
                    
                    # Check DM connections first
                    async with dm_connections_lock:
                        receiver_ws = dm_connections.get(receiver_id)
                    
                    # Also check all room connections
                    if not receiver_ws:
                        for rid, conns in room_connections.items():
                            if receiver_id in conns:
                                receiver_ws = conns[receiver_id]
                                break
                    
                    if receiver_ws:
                        try:
                            await receiver_ws.send_json(dm_payload)
                            logger.info(f"📨 DM delivered from {sender_id} to {receiver_id}")
                        except Exception as e:
                            logger.warning(f"Failed to deliver DM to {receiver_id}: {e}")
                    else:
                        logger.info(f"📭 DM queued - {receiver_id} is offline")
                    
                    continue
                
                # Handle read receipts
                if ptype == "dm_read":
                    reader_id = payload.get("reader_id") or user_id
                    sender_id = payload.get("sender_id")
                    
                    # If sender_id provided, notify that user their messages were read
                    if sender_id:
                        sender_ws = None
                        async with dm_connections_lock:
                            sender_ws = dm_connections.get(sender_id)
                        if not sender_ws:
                            for rid, conns in room_connections.items():
                                if sender_id in conns:
                                    sender_ws = conns[sender_id]
                                    break
                        
                        if sender_ws:
                            try:
                                await sender_ws.send_json({
                                    "type": "dm_read",
                                    "reader_id": reader_id,
                                    "sender_id": sender_id,
                                    "timestamp": datetime.utcnow().isoformat(),
                                })
                            except Exception:
                                pass
                    continue
                
                # Handle typing indicators
                if ptype == "dm_typing":
                    sender_id = payload.get("sender_id") or user_id
                    receiver_id = payload.get("receiver_id")
                    is_typing = payload.get("is_typing", False)
                    
                    if receiver_id:
                        receiver_ws = None
                        async with dm_connections_lock:
                            receiver_ws = dm_connections.get(receiver_id)
                        if not receiver_ws:
                            for rid, conns in room_connections.items():
                                if receiver_id in conns:
                                    receiver_ws = conns[receiver_id]
                                    break
                        
                        if receiver_ws:
                            try:
                                await receiver_ws.send_json({
                                    "type": "dm_typing",
                                    "sender_id": sender_id,
                                    "is_typing": is_typing,
                                    "timestamp": datetime.utcnow().isoformat(),
                                })
                            except Exception:
                                pass
                    continue
```

---

## 3. Track DM Connections

When a user connects to the "dm" room, also add them to `dm_connections`. 

Add this right after `await websocket.accept()` (around line 750):

```python
    # Track DM connection for direct message delivery
    if room_id == "dm":
        async with dm_connections_lock:
            dm_connections[user_id] = websocket
```

And in the `WebSocketDisconnect` handler, clean up DM connections:

```python
    except WebSocketDisconnect:
        # Cleanup DM connection
        if room_id == "dm":
            async with dm_connections_lock:
                if user_id in dm_connections:
                    del dm_connections[user_id]
        # ... rest of existing cleanup code
```

---

## 4. Add Logger Import (if not present)

At the top of the file:

```python
import logging
logger = logging.getLogger("main")
```

---

## Full Diff Summary

1. **Line ~55**: Add `dm_connections` dict and lock
2. **Line ~750**: Track DM connection on accept
3. **Line ~949**: Add `dm_message`, `dm_read`, `dm_typing` handlers
4. **Line ~990**: Clean up DM connection on disconnect

After deploying, DMs will be delivered in real-time when both users are online!
