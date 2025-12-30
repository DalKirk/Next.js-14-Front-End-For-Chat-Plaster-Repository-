# Railway Production Chat Fix Deployment

This guide applies the backend changes from `CHAT_ISSUES_FIX.md` to your Railway FastAPI backend so WebSocket connections work in production, avatars persist, and REST endpoints align with the frontend.

## Summary of Required Backend Changes
- Add `POST /rooms/{room_id}/join` to register users before WS
- Update `WS /ws/{room_id}/{user_id}` to auto-register missing users and accept `username` and `avatar_url` query params
- Store `avatar` with messages in `POST/GET /rooms/{room_id}/messages`
- Ensure CORS allows your Vercel frontend and cookies/credentials if used

## FastAPI Example (Drop-In)
If your backend is FastAPI, copy these into your app (adapt imports/namespaces). A minimal version exists in [backend/server.py](backend/server.py) in this repo for local testing.

```python
# routes/chat_rooms.py (example)
import uuid
from datetime import datetime
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Query
from pydantic import BaseModel

router = APIRouter()

rooms: Dict[str, Dict[str, Any]] = {}
room_connections: Dict[str, set] = {}

class JoinRoomRequest(BaseModel):
    user_id: str
    username: Optional[str] = None
    avatar_url: Optional[str] = None

class MessageCreate(BaseModel):
    user_id: str
    username: Optional[str] = None
    content: str
    type: Optional[str] = "message"

@router.post("/rooms/{room_id}/join")
async def join_room(room_id: str, request: JoinRoomRequest):
    if room_id not in rooms:
        rooms[room_id] = {"users": {}, "messages": []}
    rooms[room_id]["users"][request.user_id] = {
        "username": (request.username or "Anonymous"),
        "avatar_url": request.avatar_url,
        "joined_at": datetime.utcnow(),
    }
    return {"status": "success", "room_id": room_id, "user_id": request.user_id}

@router.post("/rooms/{room_id}/messages")
async def send_message(room_id: str, message: MessageCreate):
    if room_id not in rooms:
        rooms[room_id] = {"users": {}, "messages": []}
    avatar_url = None
    if message.user_id in rooms[room_id]["users"]:
        avatar_url = rooms[room_id]["users"][message.user_id].get("avatar_url")
    username = message.username or rooms[room_id]["users"].get(message.user_id, {}).get("username") or "Anonymous"
    new_message = {
        "id": str(uuid.uuid4()),
        "room_id": room_id,
        "user_id": message.user_id,
        "username": username,
        "content": message.content,
        "avatar": avatar_url,
        "timestamp": datetime.utcnow().isoformat(),
        "type": message.type or "message",
    }
    rooms[room_id]["messages"].append(new_message)
    # Broadcast (optional)
    for ws in list(room_connections.get(room_id, set())):
        try:
            await ws.send_json({"type": "message", **new_message})
        except Exception:
            room_connections[room_id].discard(ws)
    return new_message

@router.get("/rooms/{room_id}/messages")
async def get_messages(room_id: str):
    if room_id not in rooms:
        return []
    messages = rooms[room_id]["messages"]
    for msg in messages:
        if not msg.get("avatar"):
            uid = msg.get("user_id")
            if uid and uid in rooms[room_id]["users"]:
                msg["avatar"] = rooms[room_id]["users"][uid].get("avatar_url")
    return messages
```

Add WS handler to your main app (or module with `app` instance):

```python
# main.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from datetime import datetime
from typing import Optional
from routes.chat_rooms import router, rooms, room_connections

app = FastAPI()
app.include_router(router)

@app.websocket("/ws/{room_id}/{user_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, user_id: str, username: Optional[str] = Query(None), avatar_url: Optional[str] = Query(None)):
    # Auto-register
    if room_id not in rooms:
        rooms[room_id] = {"users": {}, "messages": []}
    if user_id not in rooms[room_id]["users"]:
        rooms[room_id]["users"][user_id] = {
            "username": username or "Anonymous",
            "avatar_url": avatar_url,
            "joined_at": datetime.utcnow(),
        }
    await websocket.accept()
    room_connections.setdefault(room_id, set()).add(websocket)
    try:
        while True:
            payload = await websocket.receive_json()
            if payload.get("type") in ("typing_start", "typing_stop"):
                # Broadcast typing
                for ws in list(room_connections.get(room_id, set())):
                    try:
                        await ws.send_json({"type": payload["type"], "room_id": room_id, "user_id": user_id, "username": username or "Anonymous", "timestamp": datetime.utcnow().isoformat()})
                    except Exception:
                        room_connections[room_id].discard(ws)
                continue
            content = payload.get("content")
            msg_avatar = payload.get("avatar") or avatar_url
            msg_username = payload.get("username") or username or "Anonymous"
            new_message = {"type": "message", "id": str(uuid.uuid4()), "room_id": room_id, "user_id": user_id, "username": msg_username, "content": content, "avatar": msg_avatar, "timestamp": datetime.utcnow().isoformat()}
            rooms[room_id]["messages"].append(new_message)
            for ws in list(room_connections.get(room_id, set())):
                try:
                    await ws.send_json(new_message)
                except Exception:
                    room_connections[room_id].discard(ws)
    except WebSocketDisconnect:
        room_connections.get(room_id, set()).discard(websocket)
```

## CORS (Production)
Ensure your app has CORS to allow your Vercel domains and localhost for testing. You can use the dynamic middleware already present in this repo or standard `CORSMiddleware`.

```python
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://video-chat-frontend-ruby.vercel.app",
        "https://next-js-14-front-end-for-chat-plast.vercel.app",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Deploy to Railway
1. Add/modify files in your backend repo as above
2. Ensure your start command runs uvicorn, e.g. `python -m uvicorn main:app --host 0.0.0.0 --port 8000`
3. Redeploy the service in Railway (trigger deploy from Git or manual)
4. Verify logs show `✅ Auto-registered user {user_id}` on first WS connect

## Verify in Production
- WebSocket URL used by frontend: `wss://web-production-3ba7e.up.railway.app/ws/{room_id}/{user_id}?username=...&avatar_url=...`
- REST join: `POST https://web-production-3ba7e.up.railway.app/rooms/{room_id}/join`
- Messages: `POST/GET https://web-production-3ba7e.up.railway.app/rooms/{room_id}/messages`

### Quick checks
```bash
# Health
curl -s https://web-production-3ba7e.up.railway.app/ | jq

# Join
curl -sX POST https://web-production-3ba7e.up.railway.app/rooms/test-room/join -H "Content-Type: application/json" -d '{"user_id":"u1","username":"Alice","avatar_url":"https://example.com/a.png"}' | jq

# Messages
curl -sX POST https://web-production-3ba7e.up.railway.app/rooms/test-room/messages -H "Content-Type: application/json" -d '{"user_id":"u1","username":"Alice","content":"Hello"}' | jq
curl -s https://web-production-3ba7e.up.railway.app/rooms/test-room/messages | jq

# WebSocket
# Using wscat
wscat -c "wss://web-production-3ba7e.up.railway.app/ws/test-room/u1?username=Alice&avatar_url=https%3A%2F%2Fexample.com%2Fa.png"
```

## Frontend (Production)
- No changes required; it already sends `avatar_url` via join and WS URL.
- Ensure environment variables in Vercel default to Railway:
  - `NEXT_PUBLIC_API_URL=https://web-production-3ba7e.up.railway.app`
  - `NEXT_PUBLIC_WS_URL=wss://web-production-3ba7e.up.railway.app`

## Troubleshooting
- `403` on WS: Confirm `/rooms/{room_id}/join` exists OR WS auto-registers users; check CORS and headers
- Avatars disappear: Confirm `avatar` is stored in messages and filled in `GET /messages`
- CORS preflight fails: Ensure `OPTIONS` handled and `allow_credentials=True` if cookies are used
