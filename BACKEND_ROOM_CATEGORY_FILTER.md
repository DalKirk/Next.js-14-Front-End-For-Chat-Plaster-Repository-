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
  "tags": ["fps", "competitive", "casual"]
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
    
    # Validate tags if provided
    tags = req.tags[:5] if req.tags else []  # Max 5 tags
    
    room = {
        "id": str(uuid.uuid4()),
        "name": req.name.strip(),
        "thumbnail_url": req.thumbnail_url,
        "category": req.category,
        "description": req.description,
        "tags": tags,
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
    
    await conn.execute("""
        INSERT INTO rooms (id, name, thumbnail_url, category, description, tags, created_at)
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW())
    """, room_id, req.name.strip(), req.thumbnail_url, req.category, req.description, tags_json)
    
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
  "maxMembers": 50,
  "memberCount": 5,
  "onlineCount": 3,
  "createdBy": "user-uuid"
}
```

---

## 5. Frontend API Calls

The frontend already sends these requests:

```typescript
// Create room with category
apiClient.createRoom("My Room", thumbnailUrl, {
  category: "Gaming",
  description: "A room for gamers",
  tags: ["fps", "casual"]
});
// → POST /rooms { name, thumbnail_url, category, description, tags }

// Get rooms filtered by category
apiClient.getRooms("Gaming");
// → GET /rooms?category=Gaming
```

---

## Testing Checklist

### POST /rooms
- [ ] Create room with all fields (name, thumbnail_url, category, description, tags)
- [ ] Create room with only name (other fields optional)
- [ ] Verify category is stored and returned
- [ ] Verify tags array is stored (max 5)
- [ ] Verify invalid category is rejected

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
- [ ] Add index on `category` column

### POST /rooms
- [ ] Accept `category` in request body
- [ ] Accept `description` in request body
- [ ] Accept `tags` in request body
- [ ] Store all fields in database
- [ ] Return complete room object with new fields

### GET /rooms
- [ ] Accept `?category=` query parameter
- [ ] Filter by category when provided
- [ ] Handle "Other" category specially (includes null/empty)
- [ ] Return rooms with category, description, tags fields

### Deploy
- [ ] Run database migration
- [ ] Deploy updated endpoints
- [ ] Test with frontend
