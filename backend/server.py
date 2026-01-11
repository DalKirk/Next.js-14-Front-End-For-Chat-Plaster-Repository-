import os
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

# Minimal in-memory user directory for profile/password updates
users: Dict[str, Dict[str, Any]] = {}
users_lock = asyncio.Lock()

# Pluggable user storage (in-memory or Postgres)
try:
    from backend.storage import create_user_store  # type: ignore
except Exception:
    create_user_store = None
user_store = None


router = APIRouter()


@router.get("/")
async def root():
    return {"status": "ok", "time": datetime.utcnow().isoformat()}


@router.get("/users/{user_id}")
async def get_user(user_id: str):
    """Return user profile data from storage for verification."""
    try:
        if user_store is not None:
            profile = await user_store.get_user(user_id)
        else:
            async with users_lock:
                profile = users.get(user_id, {})
        return {"user_id": user_id, "profile": profile}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/users/{user_id}/profile")
async def update_profile(user_id: str, payload: Dict[str, Any]):
    """Minimal durable profile update with real-time broadcast.
    Accepts display_name, username, bio, email, avatar_url.
    """
    try:
        # Normalize payload
        if payload.get("display_name") and not payload.get("username"):
            payload["username"] = payload["display_name"]

        # Persist via storage (DB when configured)
        profile: Dict[str, Any]
        if user_store is not None:
            profile = await user_store.upsert_profile(user_id, payload)
        else:
            async with users_lock:
                profile = users.get(user_id, {})
                for key in ("display_name", "username", "bio", "email", "avatar_url"):
                    if key in payload and payload[key] is not None:
                        profile[key] = payload[key]
                users[user_id] = profile

        # Broadcast to room subscribers for instant sync
        broadcast_payload = {
            "type": "profile_updated",
            "user_id": user_id,
            "username": profile.get("display_name") or profile.get("username") or "Anonymous",
            "email": profile.get("email"),
            "bio": profile.get("bio"),
            "avatar_url": profile.get("avatar_url"),
            "timestamp": datetime.utcnow().isoformat(),
        }
        for room_id, room in rooms.items():
            if user_id in room.get("users", {}):
                for ws in list(room_connections.get(room_id, set())):
                    try:
                        await ws.send_json(broadcast_payload)
                    except Exception:
                        room_connections[room_id].discard(ws)

        return {"success": True, "user": profile}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/users/{user_id}/password")
async def update_password(user_id: str, payload: Dict[str, Any]):
    """Update password with non-blocking hashing. Stores hash only."""
    try:
        new_password = payload.get("new_password")
        if not new_password or len(new_password) < 8:
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

        # Hash password off the event loop
        hashed: str = await asyncio.to_thread(_hash_password, new_password)

        if user_store is not None:
            await user_store.set_password_hash(user_id, hashed)
        else:
            async with users_lock:
                profile = users.get(user_id, {})
                profile["password_hash"] = hashed
                users[user_id] = profile

        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _hash_password(password: str) -> str:
    """Synchronous helper used with asyncio.to_thread for hashing."""
    try:
        # Avoid hard dependency error if passlib isn't installed; simple placeholder
        from passlib.context import CryptContext
        ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
        return ctx.hash(password)
    except Exception:
        # Fallback: DO NOT USE IN PRODUCTION
        import hashlib
        return hashlib.sha256(password.encode("utf-8")).hexdigest()


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


class LiveStreamCreate(BaseModel):
    title: str


@router.post("/rooms/{room_id}/live-stream")
async def create_live_stream(room_id: str, payload: LiveStreamCreate):
    """Create a live stream session. Returns stream key and playback info."""
    import uuid
    
    # Generate unique stream identifiers
    stream_id = str(uuid.uuid4())
    stream_key = f"stream_{stream_id[:8]}"
    playback_id = f"playback_{stream_id[:8]}"
    
    # Return stream configuration
    return {
        "id": stream_id,
        "title": payload.title,
        "stream_key": stream_key,
        "playback_id": playback_id,
        "rtmp_url": "rtmp://rtmp.bunnycdn.com/live",
        "status": "ready"
    }


class VideoUploadCreate(BaseModel):
    title: str
    description: Optional[str] = None


@router.post("/rooms/{room_id}/video-upload")
async def create_video_upload(room_id: str, payload: VideoUploadCreate):
    """Create a video upload session. Returns upload URL and playback info."""
    import uuid
    
    # Generate unique video identifiers
    video_id = str(uuid.uuid4())
    playback_id = f"playback_{video_id[:8]}"
    
    # Return upload configuration (frontend will handle actual upload)
    return {
        "id": video_id,
        "upload_url": f"/api/upload/{video_id}",  # Placeholder - implement actual upload handling
        "asset_id": video_id,
        "playback_id": playback_id,
        "title": payload.title,
        "description": payload.description
    }


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

                # Handle profile/avatar updates for real-time cross-device sync
                if ptype in ("profile_updated", "avatar_updated"):
                    # Update in-memory user directory
                    new_username = payload.get("username") or username
                    new_avatar = payload.get("avatar") or payload.get("avatar_url") or avatar_url
                    async with rooms_lock:
                        try:
                            rooms[room_id]["users"].setdefault(user_id, {})
                            if new_username:
                                rooms[room_id]["users"][user_id]["username"] = new_username
                                username = new_username
                            if new_avatar:
                                rooms[room_id]["users"][user_id]["avatar_url"] = new_avatar
                                avatar_url = new_avatar
                        except Exception:
                            pass

                    # Broadcast update to all clients in this room
                    broadcast_payload = {
                        "type": ptype,
                        "room_id": room_id,
                        "user_id": user_id,
                        "username": new_username or (username or "Anonymous"),
                        # Provide both keys for frontend compatibility
                        "avatar_url": new_avatar,
                        "avatar": new_avatar,
                        "prevUsername": payload.get("prevUsername"),
                        "email": payload.get("email"),
                        "bio": payload.get("bio"),
                        "timestamp": datetime.utcnow().isoformat(),
                    }
                    for ws in list(room_connections.get(room_id, set())):
                        try:
                            await ws.send_json(broadcast_payload)
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


# Initialize storage on startup (Postgres when DATABASE_URL is set)
@app.on_event("startup")
async def _init_storage():
    global user_store
    try:
        if create_user_store is not None:
            user_store = await create_user_store()
        else:
            user_store = None
    except Exception:
        # Fallback to in-memory on any init error
        user_store = None
