import asyncio
import uuid
from datetime import datetime
from typing import Dict, Any, Set, Optional

from fastapi import FastAPI, APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

try:
    # Prefer dynamic CORS when available in repo
    from backend.dynamic_cors_middleware import DynamicCORSMiddleware
    USE_DYNAMIC_CORS = True
except Exception:
    USE_DYNAMIC_CORS = False


class JoinRoomRequest(BaseModel):
    user_id: str
    username: Optional[str] = None
    avatar_url: Optional[str] = None


class MessageCreate(BaseModel):
    user_id: str
    username: Optional[str] = None
    content: str
    type: Optional[str] = "message"


# In-memory store (replace with Redis/DB for production)
rooms: Dict[str, Dict[str, Any]] = {}
room_connections: Dict[str, Set[WebSocket]] = {}
rooms_lock = asyncio.Lock()


router = APIRouter()


@router.get("/")
async def root():
    return {"status": "ok", "time": datetime.utcnow().isoformat()}


@router.post("/rooms/{room_id}/join")
async def join_room(room_id: str, request: JoinRoomRequest):
    """Register a user in a room before WebSocket connection."""
    try:
        async with rooms_lock:
            if room_id not in rooms:
                rooms[room_id] = {"users": {}, "messages": []}
            rooms[room_id]["users"][request.user_id] = {
                "username": request.username or "Anonymous",
                "avatar_url": request.avatar_url,
                "joined_at": datetime.utcnow(),
            }
        return {"status": "success", "room_id": room_id, "user_id": request.user_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/rooms/{room_id}/messages")
async def send_message(room_id: str, message: MessageCreate):
    """Store message with avatar URL and broadcast to WebSocket clients."""
    async with rooms_lock:
        if room_id not in rooms:
            rooms[room_id] = {"users": {}, "messages": []}

        avatar_url = None
        if message.user_id in rooms[room_id]["users"]:
            avatar_url = rooms[room_id]["users"][message.user_id].get("avatar_url")

        username = message.username or (
            rooms[room_id]["users"].get(message.user_id, {}).get("username") or "Anonymous"
        )

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

    # Broadcast to connected clients (non-blocking best-effort)
    for ws in list(room_connections.get(room_id, set())):
        try:
            await ws.send_json({"type": "message", **new_message})
        except Exception:
            # Drop broken connections
            try:
                room_connections[room_id].discard(ws)
            except Exception:
                pass

    return new_message


@router.get("/rooms/{room_id}/messages")
async def get_messages(room_id: str):
    """Return messages with avatars."""
    async with rooms_lock:
        if room_id not in rooms:
            return []
        messages = rooms[room_id]["messages"]
        # Ensure avatars are present when possible
        for msg in messages:
            if not msg.get("avatar"):
                uid = msg.get("user_id")
                if uid and uid in rooms[room_id]["users"]:
                    msg["avatar"] = rooms[room_id]["users"][uid].get("avatar_url")
        return messages


app = FastAPI()

# CORS setup
if USE_DYNAMIC_CORS:
    WHITELIST = {
        "https://video-chat-frontend-ruby.vercel.app",
        "https://next-js-14-front-end-for-chat-plast.vercel.app",
        "http://localhost:3000",
    }
    app.add_middleware(DynamicCORSMiddleware, whitelist=WHITELIST)
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",
            "https://video-chat-frontend-ruby.vercel.app",
            "https://next-js-14-front-end-for-chat-plast.vercel.app",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"]
    )

app.include_router(router)


@app.websocket("/ws/{room_id}/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    room_id: str,
    user_id: str,
    username: Optional[str] = Query(None),
    avatar_url: Optional[str] = Query(None),
):
    # Auto-register user if not present
    async with rooms_lock:
        if room_id not in rooms:
            rooms[room_id] = {"users": {}, "messages": []}
        if user_id not in rooms[room_id]["users"]:
            rooms[room_id]["users"][user_id] = {
                "username": username or "Anonymous",
                "avatar_url": avatar_url,
                "joined_at": datetime.utcnow(),
            }

    await websocket.accept()

    # Track connection
    room_connections.setdefault(room_id, set()).add(websocket)

    # Notify join
    try:
        for ws in list(room_connections.get(room_id, set())):
            try:
                await ws.send_json({
                    "type": "user_joined",
                    "room_id": room_id,
                    "user_id": user_id,
                    "username": username or "Anonymous",
                    "avatar": avatar_url,
                    "timestamp": datetime.utcnow().isoformat(),
                })
            except Exception:
                room_connections[room_id].discard(ws)

        # Receive loop
        while True:
            data = await websocket.receive_text()
            # Expect JSON payloads
            try:
                # Minimal parsing; accept keep_alive, typing events, and messages
                import json
                payload = json.loads(data)
                ptype = payload.get("type")

                if ptype == "keep_alive":
                    # Optionally reply ping
                    await websocket.send_json({"type": "ping", "timestamp": datetime.utcnow().isoformat()})
                    continue
                if ptype in ("typing_start", "typing_stop"):
                    for ws in list(room_connections.get(room_id, set())):
                        try:
                            await ws.send_json({
                                "type": ptype,
                                "room_id": room_id,
                                "user_id": user_id,
                                "username": username or "Anonymous",
                                "timestamp": datetime.utcnow().isoformat(),
                            })
                        except Exception:
                            room_connections[room_id].discard(ws)
                    continue

                # Treat as message
                content = payload.get("content")
                msg_avatar = payload.get("avatar") or avatar_url
                msg_username = payload.get("username") or username or "Anonymous"

                new_message = {
                    "id": str(uuid.uuid4()),
                    "room_id": room_id,
                    "user_id": user_id,
                    "username": msg_username,
                    "content": content,
                    "avatar": msg_avatar,
                    "timestamp": datetime.utcnow().isoformat(),
                    "type": "message",
                }

                # Persist in memory
                async with rooms_lock:
                    rooms[room_id]["messages"].append(new_message)

                # Broadcast
                for ws in list(room_connections.get(room_id, set())):
                    try:
                        await ws.send_json({"type": "message", **new_message})
                    except Exception:
                        room_connections[room_id].discard(ws)

            except Exception:
                # If parsing fails, ignore
                await websocket.send_json({"type": "error", "message": "Invalid message format"})

    except WebSocketDisconnect:
        # Cleanup on disconnect
        try:
            room_connections.get(room_id, set()).discard(websocket)
        except Exception:
            pass
        # Notify leave
        for ws in list(room_connections.get(room_id, set())):
            try:
                await ws.send_json({
                    "type": "user_left",
                    "room_id": room_id,
                    "user_id": user_id,
                    "timestamp": datetime.utcnow().isoformat(),
                })
            except Exception:
                room_connections[room_id].discard(ws)
