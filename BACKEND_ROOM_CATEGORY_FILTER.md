# Backend Changes Required: Room Category Filtering

> **Scope**: Add category query parameter to `GET /rooms` endpoint.
>
> **Nothing else changes.** All existing endpoints remain untouched.

---

## Overview

The frontend now supports filtering rooms by category. It sends a `category` query parameter to the backend. Currently, the frontend has a client-side fallback filter, but for better performance and cross-device consistency, the backend should support this parameter.

---

## Endpoint Change

### `GET /rooms`

**Current behavior:** Returns all rooms.

**New behavior:** Optionally filter by category.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `category` | string | (none) | Filter rooms by category. If not provided, return all rooms. |

**Categories used by frontend:**
- `Gaming`
- `Study`
- `Social`
- `Work`
- `Music`
- `Art`
- `Tech`
- `Sports`
- `Other`

**Example requests:**
```
GET /rooms                     → Returns all rooms
GET /rooms?category=Gaming     → Returns only rooms with category="Gaming"
GET /rooms?category=Tech       → Returns only rooms with category="Tech"
```

**Response format:** (unchanged)
```json
[
  {
    "id": "room-uuid",
    "name": "My Gaming Room",
    "created_at": "2026-02-21T10:00:00Z",
    "category": "Gaming",
    "description": "...",
    "thumbnail_url": "...",
    "privacy": "public",
    "maxMembers": 50,
    "memberCount": 5,
    "onlineCount": 3,
    "tags": ["fps", "competitive"],
    "createdBy": "user-uuid"
  }
]
```

---

## Implementation Example (FastAPI)

```python
from fastapi import APIRouter, Query
from typing import Optional, List

router = APIRouter()

@router.get("/rooms")
async def get_rooms(category: Optional[str] = Query(None)):
    """
    Get all rooms, optionally filtered by category.
    
    Args:
        category: Optional category to filter by (e.g., "Gaming", "Tech", "Social")
    
    Returns:
        List of room objects
    """
    if category:
        # Filter by category
        query = {"category": category}
        rooms = await db.rooms.find(query).to_list(length=100)
    else:
        # Return all rooms
        rooms = await db.rooms.find().to_list(length=100)
    
    return rooms
```

**SQL example:**
```sql
-- Without category filter
SELECT * FROM rooms ORDER BY created_at DESC;

-- With category filter
SELECT * FROM rooms WHERE category = $1 ORDER BY created_at DESC;
```

---

## Database Considerations

Ensure the `rooms` table has a `category` column:

```sql
-- Add category column if not exists
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS category VARCHAR(50);

-- Add index for faster filtering (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_rooms_category ON rooms(category);
```

---

## Frontend API Call

The frontend already sends this parameter:

```typescript
// lib/api.ts
getRooms: async (category?: string): Promise<Room[]> => {
  const params: Record<string, string> = {};
  if (category) params.category = category;
  const r = await api.get('/rooms', { params });
  return r.data;
}
```

**Request sent:**
```
GET https://your-backend.com/rooms?category=Gaming
```

---

## Testing

1. Create rooms with different categories
2. Verify `GET /rooms` returns all rooms
3. Verify `GET /rooms?category=Gaming` returns only Gaming rooms
4. Verify `GET /rooms?category=NonExistent` returns empty array `[]`

---

## Summary Checklist

- [ ] Add `category` query parameter to `GET /rooms` endpoint
- [ ] Filter rooms by category when parameter is provided
- [ ] Return all rooms when parameter is not provided
- [ ] (Optional) Add index on `category` column for performance
- [ ] Deploy changes to production
