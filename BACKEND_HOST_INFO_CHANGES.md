# Backend Changes: Room Host Info

This document outlines the backend changes required to display the room host's username and avatar on all devices.

---

## Overview

The frontend now sends `host` information when creating a room. The backend needs to:
1. Accept the `host` field in POST `/rooms`
2. Store it in the database
3. Return it in GET `/rooms`

---

## 1. Request Payload (POST /rooms)

The frontend sends the following payload when creating a room:

```json
{
  "name": "My Gaming Room",
  "thumbnail_url": "data:image/jpeg;base64,...",
  "category": "Gaming",
  "description": "A room for FPS gamers",
  "tags": ["fps", "competitive"],
  "privacy": "public",
  "max_members": 50,
  "password": "optional-for-password-protected-rooms",
  "created_by": "user-uuid-123",
  "host": {
    "id": "user-uuid-123",
    "username": "JohnDoe",
    "avatar_url": "https://cdn.example.com/avatars/johndoe.jpg",
    "avatar_urls": {
      "thumbnail": "https://cdn.example.com/avatars/johndoe_thumb.jpg",
      "small": "https://cdn.example.com/avatars/johndoe_small.jpg",
      "medium": "https://cdn.example.com/avatars/johndoe_medium.jpg",
      "large": "https://cdn.example.com/avatars/johndoe_large.jpg"
    }
  }
}
```

---

## 2. Database Schema Changes

### Option A: JSONB Column (PostgreSQL)

```sql
-- Add host column as JSONB to store the entire host object
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS host JSONB;

-- Optional: Add index for querying by host id
CREATE INDEX IF NOT EXISTS idx_rooms_host_id ON rooms ((host->>'id'));
```

### Option B: Separate Columns (PostgreSQL)

```sql
-- Add individual columns for host info
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS host_id VARCHAR(255);
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS host_username VARCHAR(255);
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS host_avatar_url TEXT;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS host_avatar_urls JSONB;

-- Add index
CREATE INDEX IF NOT EXISTS idx_rooms_host_id ON rooms (host_id);
```

### Option C: MongoDB

No migration needed - just start storing the `host` field.

---

## 3. API Endpoint Changes

### POST /rooms - Create Room

```python
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid

class HostInfo(BaseModel):
    id: str
    username: str
    avatar_url: Optional[str] = None
    avatar_urls: Optional[Dict[str, str]] = None

class RoomCreate(BaseModel):
    name: str
    thumbnail_url: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    privacy: Optional[str] = "public"
    max_members: Optional[int] = None
    password: Optional[str] = None
    created_by: Optional[str] = None
    host: Optional[HostInfo] = None  # NEW FIELD

@app.post("/rooms")
async def create_room(room_data: RoomCreate, db: Session = Depends(get_db)):
    """Create a new chat room with host information"""
    
    room_id = str(uuid.uuid4())
    
    new_room = Room(
        id=room_id,
        name=room_data.name,
        created_at=datetime.utcnow(),
        thumbnail_url=room_data.thumbnail_url,
        category=room_data.category,
        description=room_data.description,
        tags=room_data.tags or [],
        privacy=room_data.privacy or "public",
        max_members=room_data.max_members,
        created_by=room_data.created_by or (room_data.host.id if room_data.host else None),
        # Store host info as JSON or in separate columns
        host=room_data.host.dict() if room_data.host else None,
    )
    
    # Handle password hashing if needed
    if room_data.privacy == "password" and room_data.password:
        new_room.password_hash = hash_password(room_data.password)
    
    db.add(new_room)
    db.commit()
    db.refresh(new_room)
    
    print(f"✅ Room created: {room_data.name} by {room_data.host.username if room_data.host else 'unknown'}")
    
    return {
        "id": new_room.id,
        "name": new_room.name,
        "created_at": new_room.created_at.isoformat(),
        "thumbnail_url": new_room.thumbnail_url,
        "category": new_room.category,
        "description": new_room.description,
        "tags": new_room.tags,
        "privacy": new_room.privacy,
        "max_members": new_room.max_members,
        "created_by": new_room.created_by,
        "host": new_room.host,  # Return host info
    }
```

### GET /rooms - List Rooms

```python
@app.get("/rooms")
async def get_rooms(category: Optional[str] = None, db: Session = Depends(get_db)):
    """Get all rooms with host information"""
    
    query = db.query(Room)
    
    if category:
        query = query.filter(Room.category == category)
    
    rooms = query.order_by(Room.created_at.desc()).all()
    
    return [
        {
            "id": room.id,
            "name": room.name,
            "created_at": room.created_at.isoformat(),
            "thumbnail_url": room.thumbnail_url,
            "category": room.category,
            "description": room.description,
            "tags": room.tags or [],
            "privacy": room.privacy,
            "max_members": room.max_members,
            "created_by": room.created_by,
            "host": room.host,  # Include host in response
            "memberCount": len(room.users) if hasattr(room, 'users') else 0,
            "onlineCount": count_online_users(room.id),
        }
        for room in rooms
    ]
```

---

## 4. SQLAlchemy Model (if using)

```python
from sqlalchemy import Column, String, DateTime, Integer, JSON
from sqlalchemy.dialects.postgresql import JSONB

class Room(Base):
    __tablename__ = "rooms"
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    thumbnail_url = Column(String, nullable=True)
    category = Column(String, nullable=True)
    description = Column(String, nullable=True)
    tags = Column(JSON, default=list)
    privacy = Column(String, default="public")
    max_members = Column(Integer, nullable=True)
    password_hash = Column(String, nullable=True)
    created_by = Column(String, nullable=True)
    
    # NEW: Host information stored as JSONB
    host = Column(JSONB, nullable=True)
    # Expected format:
    # {
    #   "id": "user-uuid",
    #   "username": "JohnDoe",
    #   "avatar_url": "https://...",
    #   "avatar_urls": { "thumbnail": "...", "small": "...", ... }
    # }
```

---

## 5. Expected Response Format

When the frontend calls `GET /rooms`, each room should include:

```json
{
  "id": "room-uuid-456",
  "name": "My Gaming Room",
  "created_at": "2026-02-22T10:30:00Z",
  "thumbnail_url": "https://cdn.example.com/thumbnails/room456.jpg",
  "category": "Gaming",
  "description": "A room for FPS gamers",
  "tags": ["fps", "competitive"],
  "privacy": "public",
  "max_members": 50,
  "created_by": "user-uuid-123",
  "host": {
    "id": "user-uuid-123",
    "username": "JohnDoe",
    "avatar_url": "https://cdn.example.com/avatars/johndoe.jpg",
    "avatar_urls": {
      "thumbnail": "https://cdn.example.com/avatars/johndoe_thumb.jpg",
      "small": "https://cdn.example.com/avatars/johndoe_small.jpg",
      "medium": "https://cdn.example.com/avatars/johndoe_medium.jpg",
      "large": "https://cdn.example.com/avatars/johndoe_large.jpg"
    }
  },
  "memberCount": 5,
  "onlineCount": 3
}
```

---

## 6. Frontend Display

Once the backend returns `host` data, the frontend will display:

```
┌─────────────────────────────┐
│ [avatar] JohnDoe      🔴 5  │  ← Host avatar + username + viewer count
├─────────────────────────────┤
│      [Thumbnail]            │
│                             │
│  My Gaming Room             │
│  Gaming                     │
└─────────────────────────────┘
```

---

## 7. Testing

After implementing, test with:

```bash
# Create a room with host info
curl -X POST http://localhost:8000/rooms \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Room",
    "host": {
      "id": "test-user-1",
      "username": "TestUser",
      "avatar_url": "https://example.com/avatar.jpg"
    }
  }'

# Get rooms and verify host is returned
curl http://localhost:8000/rooms | jq '.[0].host'
```

---

## Summary

| Change | Location | Action |
|--------|----------|--------|
| Accept `host` field | POST /rooms | Parse and store `host` object |
| Store `host` data | Database | Add `host` JSONB column |
| Return `host` field | GET /rooms | Include `host` in response |

Once these changes are deployed, room host information will display on all devices.
