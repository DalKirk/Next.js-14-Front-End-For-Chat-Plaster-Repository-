import os
import asyncio
import uuid
import logging
from datetime import datetime
from typing import Dict, Any, Set, Optional

from fastapi import FastAPI, APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Query, UploadFile, File, Form

logger = logging.getLogger("main")
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json as _json

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


class SignupRequest(BaseModel):
    username: str
    email: Optional[str] = None
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


class CreateUserRequest(BaseModel):
    username: str


# In-memory store (replace with Redis/DB for production)
rooms: Dict[str, Dict[str, Any]] = {}
# room_id -> { user_id -> WebSocket }
room_connections: Dict[str, Dict[str, WebSocket]] = {}
# room_id -> { user_id -> {username, started_at} } - track active broadcasters
active_broadcasters: Dict[str, Dict[str, Dict[str, Any]]] = {}
rooms_lock = asyncio.Lock()

# DM user connections: user_id -> WebSocket (for delivering DMs to the right user)
dm_connections: Dict[str, WebSocket] = {}
dm_connections_lock = asyncio.Lock()

# Minimal in-memory user directory for profile/password updates
users: Dict[str, Dict[str, Any]] = {}
users_lock = asyncio.Lock()

# Pluggable user storage (in-memory or Postgres)
try:
    from backend.storage import create_user_store  # type: ignore
except Exception:
    create_user_store = None
user_store = None


# Simple token store (in-memory; replace with JWT/Redis in production)
tokens: Dict[str, str] = {}  # token -> user_id

router = APIRouter()


@router.get("/")
async def root():
    return {"status": "ok", "time": datetime.utcnow().isoformat()}


# ─── Auth Endpoints ───────────────────────────────────────────────────

@router.post("/auth/signup")
async def auth_signup(payload: SignupRequest):
    """Create a new user account and return user + token."""
    username = payload.username.strip()
    if not username:
        raise HTTPException(status_code=400, detail="Username is required")
    if len(username) < 2:
        raise HTTPException(status_code=400, detail="Username must be at least 2 characters")
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    # Check if username already taken
    async with users_lock:
        for uid, u in users.items():
            if u.get("username", "").lower() == username.lower():
                raise HTTPException(status_code=409, detail="Username already registered")

    user_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    # Hash password
    hashed = await asyncio.to_thread(_hash_password, payload.password)

    user_data = {
        "id": user_id,
        "username": username,
        "display_name": username,
        "email": payload.email or "",
        "bio": "",
        "avatar_url": "",
        "avatar_urls": {},
        "password_hash": hashed,
        "created_at": now,
    }

    async with users_lock:
        users[user_id] = user_data

    token = str(uuid.uuid4())
    tokens[token] = user_id

    # Return user without password_hash
    safe_user = {k: v for k, v in user_data.items() if k != "password_hash"}
    return {"user": safe_user, "token": token}


@router.post("/auth/login")
async def auth_login(payload: LoginRequest):
    """Authenticate an existing user and return user + token."""
    username = payload.username.strip()
    if not username:
        raise HTTPException(status_code=400, detail="Username is required")

    matched_user: Optional[Dict[str, Any]] = None
    async with users_lock:
        for uid, u in users.items():
            if u.get("username", "").lower() == username.lower():
                matched_user = u
                break

    if not matched_user:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    # Verify password
    stored_hash = matched_user.get("password_hash", "")
    ok = await asyncio.to_thread(_verify_password, payload.password, stored_hash)
    if not ok:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = str(uuid.uuid4())
    tokens[token] = matched_user["id"]

    safe_user = {k: v for k, v in matched_user.items() if k != "password_hash"}
    return {"user": safe_user, "token": token}


@router.post("/auth/logout")
async def auth_logout():
    """Logout (no-op for token-based auth; client discards token)."""
    return {"success": True}


@router.get("/auth/me")
async def auth_me(authorization: Optional[str] = None):
    """Return the currently authenticated user from Bearer token."""
    from fastapi import Request as _Req
    # We'll get the header from a dependency; for simplicity parse it here
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.replace("Bearer ", "").strip()
    user_id = tokens.get(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    async with users_lock:
        user_data = users.get(user_id)
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    safe_user = {k: v for k, v in user_data.items() if k != "password_hash"}
    return safe_user


# ─── User CRUD ────────────────────────────────────────────────────────

@router.post("/users")
async def create_user(payload: CreateUserRequest):
    """Create a user without password (legacy guest mode)."""
    username = payload.username.strip()
    if not username:
        raise HTTPException(status_code=400, detail="Username is required")

    # Check if already exists
    async with users_lock:
        for uid, u in users.items():
            if u.get("username", "").lower() == username.lower():
                # Return existing user
                return {k: v for k, v in u.items() if k != "password_hash"}

    user_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    user_data = {
        "id": user_id,
        "username": username,
        "display_name": username,
        "email": "",
        "bio": "",
        "avatar_url": "",
        "avatar_urls": {},
        "created_at": now,
    }
    async with users_lock:
        users[user_id] = user_data

    return user_data


@router.get("/rooms")
async def list_rooms():
    """Return all active rooms."""
    result = []
    async with rooms_lock:
        for room_id, room_data in rooms.items():
            result.append({
                "id": room_id,
                "name": room_data.get("name", room_id),
                "created_at": room_data.get("created_at", datetime.utcnow().isoformat()),
                "member_count": len(room_data.get("users", {})),
                "thumbnail_url": room_data.get("thumbnail_url"),
            })
    return result


@router.post("/rooms")
async def create_room(payload: Dict[str, Any]):
    """Create a new room."""
    name = (payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Room name is required")

    room_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    room_data = {
        "name": name,
        "users": {},
        "messages": [],
        "created_at": now,
        "thumbnail_url": payload.get("thumbnail_url"),
    }
    async with rooms_lock:
        rooms[room_id] = room_data

    return {"id": room_id, "name": name, "created_at": now, "thumbnail_url": room_data.get("thumbnail_url")}


@router.get("/users/{user_id}")
async def get_user(user_id: str):
    """Return user profile data from storage for verification."""
    try:
        if user_store is not None:
            profile = await user_store.get_user(user_id)
        else:
            async with users_lock:
                profile = users.get(user_id, {})
        if not profile:
            raise HTTPException(status_code=404, detail="User not found")
        # Return in shape frontend expects (flat user object)
        safe = {k: v for k, v in profile.items() if k != "password_hash"}
        safe["id"] = safe.get("id", user_id)
        return safe
    except HTTPException:
        raise
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
                for key in ("display_name", "username", "bio", "email", "avatar_url", "avatar_urls"):
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
                for ws in list(room_connections.get(room_id, {}).values()):
                    try:
                        await ws.send_json(broadcast_payload)
                    except Exception:
                        # remove broken connections
                        try:
                            for uid, w in list(room_connections.get(room_id, {}).items()):
                                if w is ws:
                                    del room_connections[room_id][uid]
                                    break
                        except Exception:
                            pass

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


# ─── Theme Endpoints ──────────────────────────────────────────────────

# In-memory fallback (used only when user_store is None)
user_themes: Dict[str, Dict[str, Any]] = {}


@router.get("/users/{user_id}/theme")
async def get_theme(user_id: str):
    """Return the saved theme config for a user from DB (or memory fallback)."""
    theme_config = None
    if user_store is not None:
        try:
            theme_config = await user_store.get_theme(user_id)
        except Exception as e:
            print(f"⚠️ DB get_theme failed, falling back to memory: {e}")
            theme_config = user_themes.get(user_id, {}).get("theme_config")
    else:
        stored = user_themes.get(user_id)
        theme_config = stored.get("theme_config") if stored else None

    if theme_config is None:
        return {"theme_config": None}
    return {"theme_config": theme_config}


@router.put("/users/{user_id}/theme")
async def update_theme(user_id: str, payload: Dict[str, Any]):
    """Save a theme config for a user to DB (or memory fallback)."""
    theme_config = payload.get("theme_config", payload)
    if user_store is not None:
        try:
            await user_store.set_theme(user_id, theme_config)
        except Exception as e:
            print(f"⚠️ DB set_theme failed, falling back to memory: {e}")
            user_themes[user_id] = {"theme_config": theme_config}
    else:
        user_themes[user_id] = {"theme_config": theme_config}
    return {"success": True, "theme_config": theme_config}


# ─── Gallery / Media Endpoints ────────────────────────────────────────

# In-memory fallback (used only when user_store is None)
user_galleries: Dict[str, list] = {}


async def _load_gallery(user_id: str) -> list:
    """Load gallery from DB or memory."""
    if user_store is not None:
        try:
            return await user_store.get_gallery(user_id)
        except Exception as e:
            print(f"⚠️ DB get_gallery failed: {e}")
    return user_galleries.get(user_id, [])


async def _save_gallery(user_id: str, items: list) -> None:
    """Persist gallery to DB or memory."""
    if user_store is not None:
        try:
            await user_store.set_gallery(user_id, items)
            return
        except Exception as e:
            print(f"⚠️ DB set_gallery failed, falling back to memory: {e}")
    user_galleries[user_id] = items


@router.get("/users/{user_id}/media")
async def list_gallery(user_id: str):
    """List all gallery items for a user."""
    items = await _load_gallery(user_id)
    return {"user_id": user_id, "items": items}


# Also support /gallery alias
@router.get("/users/{user_id}/gallery")
async def list_gallery_alias(user_id: str):
    return await list_gallery(user_id)


@router.post("/users/{user_id}/media")
async def add_gallery_item(
    user_id: str,
    files: list[UploadFile] = File(default=[]),
    caption: str = Form(default=""),
    username: str = Form(default=""),
    url: str = Form(default=""),
):
    """Add gallery item(s) for a user.
    Accepts multipart/form-data with `files` (images) and/or a `url`.
    Returns {user_id, items: [...]} to satisfy frontend validation.
    """
    new_items = []
    now = datetime.utcnow().isoformat()

    # Handle uploaded files (store to disk/CDN — placeholder stores nothing yet)
    for f in files:
        item_id = str(uuid.uuid4())
        # TODO: Replace with actual CDN upload (Bunny.net, S3, etc.)
        # For now just record the filename — the real URL would come from CDN
        item = {
            "id": item_id,
            "user_id": user_id,
            "url": url or f"https://placeholder.cdn/{user_id}/{item_id}/{f.filename}",
            "caption": caption,
            "created_at": now,
        }
        new_items.append(item)

    # Handle bare URL (JSON-style creation)
    if not files and url:
        item_id = str(uuid.uuid4())
        item = {
            "id": item_id,
            "user_id": user_id,
            "url": url,
            "caption": caption,
            "created_at": now,
        }
        new_items.append(item)

    all_items = await _load_gallery(user_id)
    all_items.extend(new_items)
    await _save_gallery(user_id, all_items)
    return {"user_id": user_id, "items": all_items}


# Also support /gallery alias
@router.post("/users/{user_id}/gallery")
async def add_gallery_item_alias(
    user_id: str,
    files: list[UploadFile] = File(default=[]),
    caption: str = Form(default=""),
    username: str = Form(default=""),
    url: str = Form(default=""),
):
    return await add_gallery_item(user_id, files, caption, username, url)


@router.delete("/users/{user_id}/media/{item_id}")
async def delete_gallery_item(user_id: str, item_id: str):
    """Delete a gallery item."""
    items = await _load_gallery(user_id)
    items = [i for i in items if i.get("id") != item_id]
    await _save_gallery(user_id, items)
    return {"success": True, "ok": True}


@router.delete("/users/{user_id}/gallery/{item_id}")
async def delete_gallery_item_alias(user_id: str, item_id: str):
    return await delete_gallery_item(user_id, item_id)


@router.put("/users/{user_id}/media/{item_id}")
async def update_gallery_item(user_id: str, item_id: str, payload: Dict[str, Any]):
    """Update a gallery item (caption, etc.)."""
    items = await _load_gallery(user_id)
    for item in items:
        if item.get("id") == item_id:
            # Accept both 'caption' and 'title' for backwards compat
            if "caption" in payload:
                item["caption"] = payload["caption"]
            if "title" in payload:
                item["caption"] = payload["title"]
            item.update({k: v for k, v in payload.items() if k not in ("id", "user_id", "caption", "title")})
            await _save_gallery(user_id, items)
            return item
    raise HTTPException(status_code=404, detail="Gallery item not found")


@router.put("/users/{user_id}/gallery/{item_id}")
async def update_gallery_item_alias(user_id: str, item_id: str, payload: Dict[str, Any]):
    return await update_gallery_item(user_id, item_id, payload)


@router.put("/users/{user_id}/media/order")
async def update_gallery_order(user_id: str, payload: Dict[str, Any]):
    """Reorder gallery items by ID list."""
    ids = payload.get("ids", [])
    if not isinstance(ids, list):
        raise HTTPException(status_code=400, detail="ids must be an array")
    items = await _load_gallery(user_id)
    id_map = {item["id"]: item for item in items}
    ordered = [id_map[i] for i in ids if i in id_map]
    # Append any items not in the list at the end
    remaining = [item for item in items if item["id"] not in set(ids)]
    ordered.extend(remaining)
    await _save_gallery(user_id, ordered)
    return {"user_id": user_id, "items": ordered}


@router.put("/users/{user_id}/gallery/order")
async def update_gallery_order_alias(user_id: str, payload: Dict[str, Any]):
    return await update_gallery_order(user_id, payload)


def _hash_password(password: str) -> str:
    """Synchronous helper used with asyncio.to_thread for hashing."""
    try:
        from passlib.context import CryptContext
        ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
        return ctx.hash(password)
    except Exception:
        # Fallback: DO NOT USE IN PRODUCTION
        import hashlib
        return hashlib.sha256(password.encode("utf-8")).hexdigest()


def _verify_password(plain: str, hashed: str) -> bool:
    """Synchronous helper used with asyncio.to_thread for verification."""
    try:
        from passlib.context import CryptContext
        ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
        return ctx.verify(plain, hashed)
    except Exception:
        import hashlib
        return hashlib.sha256(plain.encode("utf-8")).hexdigest() == hashed


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
    for ws in list(room_connections.get(room_id, {}).values()):
        try:
            await ws.send_json({"type": "message", **new_message})
        except Exception:
            # Drop broken connections
            try:
                for uid, w in list(room_connections.get(room_id, {}).items()):
                    if w is ws:
                        del room_connections[room_id][uid]
                        break
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
        "https://www.starcyeed.com",
        "https://starcyeed.com",
    }
    app.add_middleware(DynamicCORSMiddleware, whitelist=WHITELIST)
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",
            "https://video-chat-frontend-ruby.vercel.app",
            "https://next-js-14-front-end-for-chat-plast.vercel.app",
            "https://www.starcyeed.com",
            "https://starcyeed.com",
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

    # Track DM connection for direct message delivery
    if room_id == "dm":
        async with dm_connections_lock:
            dm_connections[user_id] = websocket
            logger.info(f"📱 DM connection registered for user {user_id}")

    # Track connection mapped to user
    room_connections.setdefault(room_id, {})[user_id] = websocket

    # Notify join
    try:
        for uid, ws in list(room_connections.get(room_id, {}).items()):
            if uid == user_id:
                continue
            try:
                await ws.send_json({
                    "type": "user_joined",
                    "room_id": room_id,
                    "user_id": user_id,
                    "username": username or "Anonymous",
                    "avatar_url": avatar_url,
                    "timestamp": datetime.utcnow().isoformat(),
                })
            except Exception:
                try:
                    del room_connections[room_id][uid]
                except Exception:
                    pass

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
        while True:
            data = await websocket.receive_text()
            # Expect JSON payloads
            try:
                # Minimal parsing; accept keep_alive, typing events, messages, and WebRTC signaling
                import json
                payload = json.loads(data)
                ptype = payload.get("type")

                if ptype == "keep_alive":
                    # Optionally reply ping
                    await websocket.send_json({"type": "ping", "timestamp": datetime.utcnow().isoformat()})
                    continue
                if ptype in ("typing_start", "typing_stop"):
                    for uid, ws in list(room_connections.get(room_id, {}).items()):
                        if uid == user_id:
                            continue
                        try:
                            await ws.send_json({
                                "type": ptype,
                                "room_id": room_id,
                                "user_id": user_id,
                                "username": username or "Anonymous",
                                "timestamp": datetime.utcnow().isoformat(),
                            })
                        except Exception:
                            try:
                                del room_connections[room_id][uid]
                            except Exception:
                                pass
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
                    for ws in list(room_connections.get(room_id, {}).values()):
                        try:
                            await ws.send_json(broadcast_payload)
                        except Exception:
                            # remove broken
                            try:
                                for uid, w in list(room_connections.get(room_id, {}).items()):
                                    if w is ws:
                                        del room_connections[room_id][uid]
                                        break
                            except Exception:
                                pass
                    continue

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

                # ─── DM Message Types ───────────────────────────────────
                
                # Handle direct messages - relay to target user
                if ptype == "dm_message":
                    receiver_id = payload.get("receiver_id")
                    sender_id = payload.get("sender_id") or user_id
                    dm_content = payload.get("content", "")
                    
                    logger.info(f"📥 DM received - sender_id: {sender_id}, receiver_id: {receiver_id}")
                    logger.info(f"📥 DM payload: sender_username={payload.get('sender_username')}, sender_avatar={payload.get('sender_avatar')[:50] if payload.get('sender_avatar') else None}")
                    
                    if not receiver_id or not dm_content:
                        logger.warning(f"⚠️ DM missing receiver_id or content")
                        continue
                    
                    # Use payload values first, fallback to connection values
                    msg_sender_username = payload.get("sender_username") or username or "Anonymous"
                    msg_sender_avatar = payload.get("sender_avatar") or avatar_url or ""
                    
                    logger.info(f"📥 DM final: sender_username={msg_sender_username}, has_avatar={bool(msg_sender_avatar)}")
                    
                    # Build the message to send
                    dm_payload = {
                        "type": "dm_message",
                        "message": {
                            "id": str(uuid.uuid4()),
                            "sender_id": sender_id,
                            "sender_username": msg_sender_username,
                            "sender_avatar": msg_sender_avatar,
                            "receiver_id": receiver_id,
                            "content": dm_content,
                            "timestamp": payload.get("timestamp") or datetime.utcnow().isoformat(),
                        }
                    }
                    
                    # Find receiver's WebSocket - check DM connections first
                    receiver_ws = None
                    async with dm_connections_lock:
                        receiver_ws = dm_connections.get(receiver_id)
                    
                    # Also check all room connections if not in DM connections
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
                    dm_sender_id = payload.get("sender_id")
                    
                    # If sender_id provided, notify that user their messages were read
                    if dm_sender_id:
                        sender_ws = None
                        async with dm_connections_lock:
                            sender_ws = dm_connections.get(dm_sender_id)
                        if not sender_ws:
                            for rid, conns in room_connections.items():
                                if dm_sender_id in conns:
                                    sender_ws = conns[dm_sender_id]
                                    break
                        
                        if sender_ws:
                            try:
                                await sender_ws.send_json({
                                    "type": "dm_read",
                                    "reader_id": reader_id,
                                    "sender_id": dm_sender_id,
                                    "timestamp": datetime.utcnow().isoformat(),
                                })
                                logger.info(f"✓ Read receipt sent to {dm_sender_id}")
                            except Exception:
                                pass
                    continue
                
                # Handle typing indicators
                if ptype == "dm_typing":
                    typing_sender_id = payload.get("sender_id") or user_id
                    typing_receiver_id = payload.get("receiver_id")
                    is_typing = payload.get("is_typing", False)
                    
                    if typing_receiver_id:
                        receiver_ws = None
                        async with dm_connections_lock:
                            receiver_ws = dm_connections.get(typing_receiver_id)
                        if not receiver_ws:
                            for rid, conns in room_connections.items():
                                if typing_receiver_id in conns:
                                    receiver_ws = conns[typing_receiver_id]
                                    break
                        
                        if receiver_ws:
                            try:
                                await receiver_ws.send_json({
                                    "type": "dm_typing",
                                    "sender_id": typing_sender_id,
                                    "is_typing": is_typing,
                                    "timestamp": datetime.utcnow().isoformat(),
                                })
                            except Exception:
                                pass
                    continue

                # Treat as message - skip if no content
                content = payload.get("content")
                if not content:
                    continue
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
                for ws in list(room_connections.get(room_id, {}).values()):
                    try:
                        await ws.send_json({"type": "message", **new_message})
                    except Exception:
                        try:
                            for uid, w in list(room_connections.get(room_id, {}).items()):
                                if w is ws:
                                    del room_connections[room_id][uid]
                                    break
                        except Exception:
                            pass

            except Exception:
                # If parsing fails, ignore
                await websocket.send_json({"type": "error", "message": "Invalid message format"})

    except WebSocketDisconnect:
        # Cleanup DM connection
        if room_id == "dm":
            async with dm_connections_lock:
                if user_id in dm_connections:
                    del dm_connections[user_id]
                    logger.info(f"📴 DM connection removed for user {user_id}")
        
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
            try:
                await ws.send_json({
                    "type": "user_left",
                    "room_id": room_id,
                    "user_id": user_id,
                    "timestamp": datetime.utcnow().isoformat(),
                })
            except Exception:
                try:
                    for uid, w in list(room_connections.get(room_id, {}).items()):
                        if w is ws:
                            del room_connections[room_id][uid]
                            break
                except Exception:
                    pass


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
