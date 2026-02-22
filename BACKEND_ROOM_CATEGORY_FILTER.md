# Backend Changes Required: Room Categories

> **Scope**: Update room endpoints to support categories, descriptions, and tags.
>
> **Endpoints affected**: `POST /rooms` and `GET /rooms`

---

## Overview

The frontend now supports:
1. **Creating rooms** with category, description, and tags
2. **Filtering rooms** by category
3. **Searching rooms** by name, description, and tags

Currently, the frontend has a client-side fallback using localStorage, but for cross-device persistence and better performance, the backend should support these fields.

---

## 1. Database Migration

### SQL (PostgreSQL)

```sql
-- Add new columns to rooms table
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS category VARCHAR(50);
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS privacy VARCHAR(20) DEFAULT 'public';
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS max_members INTEGER DEFAULT 50;

-- Add index for faster category filtering
CREATE INDEX IF NOT EXISTS idx_rooms_category ON rooms(category);
```

### MongoDB

No migration needed - just start storing the new fields.

---

## 2. Update `POST /rooms` Endpoint

**Current request body:**
```json
{
  "name": "My Room",
  "thumbnail_url": "https://..."
}
```

**New request body (additional fields):**
```json
{
  "name": "My Room",
  "thumbnail_url": "https://...",
  "category": "Gaming",
  "description": "A room for FPS gamers to hang out",
  "tags": ["fps", "competitive", "casual"],
  "privacy": "public",
  "max_members": 50
}
```

### Field Specifications

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Room name (3-50 chars) |
| `thumbnail_url` | string | No | URL to room thumbnail image |
| `category` | string | No | One of the predefined categories |
| `description` | string | No | Room description (10-500 chars) |
| `tags` | string[] | No | Array of tags (max 5 tags) |
| `privacy` | string | No | `public`, `private`, or `password` (default: `public`) |
| `max_members` | integer | No | Max room members (2-1000, default: 50) |

### Valid Categories

```
Gaming, Study, Social, Work, Music, Art, Tech, Sports, Other
```

### Implementation (FastAPI)

```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import uuid
from datetime import datetime

router = APIRouter()

VALID_CATEGORIES = ['Gaming', 'Study', 'Social', 'Work', 'Music', 'Art', 'Tech', 'Sports', 'Other']

class CreateRoomRequest(BaseModel):
    name: str
    thumbnail_url: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    privacy: Optional[str] = "public"
    max_members: Optional[int] = 50

@router.post("/rooms")
async def create_room(req: CreateRoomRequest):
    """Create a new room with optional category, description, and tags."""
    
    # Validate name
    if not req.name or len(req.name.strip()) < 3:
        raise HTTPException(400, "Room name must be at least 3 characters")
    if len(req.name) > 50:
        raise HTTPException(400, "Room name must be less than 50 characters")
    
    # Validate category if provided
    if req.category and req.category not in VALID_CATEGORIES:
        raise HTTPException(400, f"Invalid category. Must be one of: {', '.join(VALID_CATEGORIES)}")
    
    # Validate privacy
    valid_privacy = ['public', 'private', 'password']
    if req.privacy and req.privacy not in valid_privacy:
        raise HTTPException(400, f"Invalid privacy. Must be one of: {', '.join(valid_privacy)}")
    
    # Validate max_members
    max_members = req.max_members or 50
    if max_members < 2 or max_members > 1000:
        raise HTTPException(400, "max_members must be between 2 and 1000")
    
    # Validate tags if provided
    tags = req.tags[:5] if req.tags else []  # Max 5 tags
    
    room = {
        "id": str(uuid.uuid4()),
        "name": req.name.strip(),
        "thumbnail_url": req.thumbnail_url,
        "category": req.category,
        "description": req.description,
        "tags": tags,
        "privacy": req.privacy or "public",
        "max_members": max_members,
        "created_at": datetime.utcnow().isoformat() + "Z"
    }
    
    # Insert into database
    await db.rooms.insert_one(room)
    
    return room
```

### SQL Implementation

```python
@router.post("/rooms")
async def create_room(req: CreateRoomRequest):
    room_id = str(uuid.uuid4())
    tags_json = json.dumps(req.tags[:5] if req.tags else [])
    privacy = req.privacy or "public"
    max_members = req.max_members or 50
    
    await conn.execute("""
        INSERT INTO rooms (id, name, thumbnail_url, category, description, tags, privacy, max_members, created_at)
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, NOW())
    """, room_id, req.name.strip(), req.thumbnail_url, req.category, req.description, tags_json, privacy, max_members)
    
    row = await conn.fetchrow("SELECT * FROM rooms WHERE id = $1", room_id)
    return dict(row)
```

---

## 3. Update `GET /rooms` Endpoint

**Add category filter query parameter.**

### Query Parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `category` | string | (none) | Filter rooms by category |

### Example Requests

```
GET /rooms                     → Returns all rooms
GET /rooms?category=Gaming     → Returns only Gaming rooms
GET /rooms?category=Other      → Returns rooms with category="Other" or no category
```

### Implementation (FastAPI)

```python
@router.get("/rooms")
async def get_rooms(category: Optional[str] = None):
    """
    Get all rooms, optionally filtered by category.
    """
    if category:
        if category == "Other":
            # "Other" includes rooms with category="Other" OR null/empty category
            query = {"$or": [
                {"category": "Other"},
                {"category": None},
                {"category": ""}
            ]}
        else:
            query = {"category": category}
        rooms = await db.rooms.find(query).sort("created_at", -1).to_list(length=100)
    else:
        rooms = await db.rooms.find().sort("created_at", -1).to_list(length=100)
    
    return rooms
```

### SQL Implementation

```python
@router.get("/rooms")
async def get_rooms(category: Optional[str] = None):
    if category:
        if category == "Other":
            # "Other" includes rooms with category="Other" OR null/empty
            rows = await conn.fetch("""
                SELECT * FROM rooms 
                WHERE category = 'Other' OR category IS NULL OR category = ''
                ORDER BY created_at DESC
            """)
        else:
            rows = await conn.fetch("""
                SELECT * FROM rooms WHERE category = $1 ORDER BY created_at DESC
            """, category)
    else:
        rows = await conn.fetch("SELECT * FROM rooms ORDER BY created_at DESC")
    
    return [dict(row) for row in rows]
```

---

## 4. Response Format

Both endpoints should return rooms with this structure:

```json
{
  "id": "room-uuid",
  "name": "My Gaming Room",
  "created_at": "2026-02-21T10:00:00Z",
  "category": "Gaming",
  "description": "A room for FPS gamers",
  "thumbnail_url": "https://cdn.example.com/thumb.jpg",
  "tags": ["fps", "competitive"],
  "privacy": "public",
  "max_members": 50,
  "memberCount": 5,
  "onlineCount": 3,
  "createdBy": "user-uuid"
}
```

**Note:** Frontend sends `max_members` but displays it as `maxMembers`. The backend should return `max_members` (snake_case) for consistency with other fields.
```

---

## 5. Frontend API Calls

The frontend already sends these requests:

```typescript
// Create room with all options
apiClient.createRoom("My Room", thumbnailUrl, {
  category: "Gaming",
  description: "A room for gamers",
  tags: ["fps", "casual"],
  privacy: "private",
  maxMembers: 25
});
// → POST /rooms { name, thumbnail_url, category, description, tags, privacy, max_members }

// Get rooms filtered by category
apiClient.getRooms("Gaming");
// → GET /rooms?category=Gaming
```

---

## Testing Checklist

### POST /rooms
- [ ] Create room with all fields (name, thumbnail_url, category, description, tags, privacy, max_members)
- [ ] Create room with only name (other fields optional)
- [ ] Verify category is stored and returned
- [ ] Verify tags array is stored (max 5)
- [ ] Verify invalid category is rejected
- [ ] Verify privacy defaults to "public" if not provided
- [ ] Verify max_members defaults to 50 if not provided

### GET /rooms
- [ ] `GET /rooms` returns all rooms
- [ ] `GET /rooms?category=Gaming` returns only Gaming rooms
- [ ] `GET /rooms?category=Other` returns rooms with "Other" or no category
- [ ] `GET /rooms?category=NonExistent` returns empty array

---

## Summary Checklist

### Database
- [ ] Add `category` column (VARCHAR 50)
- [ ] Add `description` column (TEXT)
- [ ] Add `tags` column (JSONB/JSON array)
- [ ] Add `privacy` column (VARCHAR 20, default 'public')
- [ ] Add `max_members` column (INTEGER, default 50)
- [ ] Add index on `category` column

### POST /rooms
- [ ] Accept `category` in request body
- [ ] Accept `description` in request body
- [ ] Accept `tags` in request body
- [ ] Accept `privacy` in request body (default: "public")
- [ ] Accept `max_members` in request body (default: 50)
- [ ] Store all fields in database
- [ ] Return complete room object with new fields

### GET /rooms
- [ ] Accept `?category=` query parameter
- [ ] Filter by category when provided
- [ ] Handle "Other" category specially (includes null/empty)
- [ ] Return rooms with all fields (category, description, tags, privacy, max_members)

### Deploy
- [ ] Run database migration
- [ ] Deploy updated endpoints
- [ ] Test with frontend

---

## 5. Password-Protected Rooms Implementation

### Overview

Rooms with `privacy: "password"` require users to enter a password before joining.

### Database Migration

```sql
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
```

### Updated CreateRoomRequest

```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class CreateRoomRequest(BaseModel):
    name: str
    thumbnail_url: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    privacy: Optional[str] = "public"
    max_members: Optional[int] = 50
    password: Optional[str] = None  # Required when privacy="password"
```

### Password Hashing in POST /rooms

```python
@router.post("/rooms")
async def create_room(req: CreateRoomRequest):
    # ... existing validation ...
    
    password_hash = None
    if req.privacy == "password":
        if not req.password or len(req.password) < 4:
            raise HTTPException(400, "Password must be at least 4 characters")
        password_hash = pwd_context.hash(req.password)
    
    room = {
        # ... other fields ...
        "password_hash": password_hash,
    }
    
    # IMPORTANT: Remove password_hash before returning
    response = dict(room)
    response.pop("password_hash", None)
    return response
```

### New Endpoint: POST /rooms/{room_id}/verify-password

```python
class VerifyPasswordRequest(BaseModel):
    password: str

@router.post("/rooms/{room_id}/verify-password")
async def verify_room_password(room_id: str, req: VerifyPasswordRequest):
    room = await db.rooms.find_one({"id": room_id})
    if not room:
        raise HTTPException(404, "Room not found")
    
    if room.get("privacy") != "password":
        return {"success": True}  # Non-password rooms don't need verification
    
    if not pwd_context.verify(req.password, room.get("password_hash", "")):
        raise HTTPException(401, "Incorrect password")
    
    return {"success": True}
```

### Password Checklist

- [ ] Add `password_hash` column to rooms table
- [ ] Accept `password` field in POST /rooms
- [ ] Hash password using bcrypt before storing
- [ ] Never return password_hash in API responses
- [ ] Implement POST /rooms/{id}/verify-password endpoint
- [ ] Return 401 for incorrect passwords
- [ ] Return 200 for correct passwords or non-password rooms
