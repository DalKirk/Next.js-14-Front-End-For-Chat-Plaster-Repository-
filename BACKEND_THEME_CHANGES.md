# Backend Changes Required: Profile Theme Persistence

> **Scope**: Add 2 new REST endpoints + 1 new database column so users can save/load their profile theme customization.
>
> **Nothing else changes.** All existing endpoints (profile, avatar, gallery, auth, rooms, etc.) remain untouched.

---

## 1. Database Migration

Add a single JSONB column to the `users` table:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_config JSONB;
```

No other columns, tables, or indexes are required.

---

## 2. New Endpoints

### `GET /users/{user_id}/theme`

Returns the user's saved theme configuration.

**Request:**
```
GET /users/{user_id}/theme
```

**Response (theme exists):**
```json
{
  "theme_config": {
    "preset": "ocean",
    "glassStyle": "frosted",
    "colors": ["#667eea", "#0077BE", "#00B4D8", "#48CAE4"],
    "blurStrength": 12,
    "fonts": {
      "heading": "playfair",
      "body": "inter",
      "headingColor": "#0A2540",
      "bodyColor": "#5A3A3A"
    },
    "effects": {
      "depthLayers": false,
      "tilt3D": false,
      "ripple": true,
      "particles": "hearts",
      "particleCount": 15,
      "particleSpeed": "medium"
    }
  }
}
```

**Response (no theme saved yet):**
```json
{
  "theme_config": null
}
```

**Error handling:**
- If the user doesn't exist, returning `{"theme_config": null}` is fine (the frontend handles it gracefully).
- A 404 response is also acceptable — the frontend catches it and defaults to `null`.

---

### `PUT /users/{user_id}/theme`

Saves (creates or updates) the user's theme configuration.

**Request:**
```
PUT /users/{user_id}/theme
Content-Type: application/json

{
  "theme_config": {
    "preset": "sunset",
    "glassStyle": "ombre",
    "colors": ["#FF6B6B", "#FFB84D", "#FF6B9D", "#C06C84"],
    "blurStrength": 12,
    "fonts": {
      "heading": "inter",
      "body": "inter",
      "headingColor": "#2D1B1B",
      "bodyColor": "#5A3A3A"
    },
    "effects": {
      "depthLayers": false,
      "tilt3D": false,
      "ripple": true,
      "particles": "hearts",
      "particleCount": 15,
      "particleSpeed": "medium"
    }
  }
}
```

**Response:**
```json
{
  "success": true
}
```

**Implementation notes:**
- Upsert: if the user already has a `theme_config`, overwrite it; if not, insert it.
- Store the entire `theme_config` object as-is in the JSONB column. No need to validate individual fields — the frontend handles schema/defaults.

---

## 3. ThemeConfig Schema Reference

The frontend sends/expects this exact shape. All fields are always present when saving.

```typescript
interface ThemeConfig {
  preset: string;         // 'sunset' | 'ocean' | 'lavender' | 'mint' | 'rose' | 'cherry' | 'midnight' | 'custom'
  glassStyle: string;     // 'ombre' | 'frosted' | 'crystal' | 'liquid' | 'holographic' | 'metallic'
  colors: string[];       // 4 hex color strings, e.g. ['#FF6B6B', '#FFB84D', '#FF6B9D', '#C06C84']
  blurStrength: number;   // integer 4–32
  fonts: {
    heading: string;      // font key: 'inter' | 'playfair' | 'poppins' | 'montserrat' | 'lora' | 'dancing' | 'roboto' | 'bebas'
    body: string;         // same font keys
    headingColor: string; // hex, e.g. '#2D1B1B'
    bodyColor: string;    // hex, e.g. '#5A3A3A'
  };
  effects: {
    depthLayers: boolean;
    tilt3D: boolean;
    ripple: boolean;
    particles: string;      // 'hearts' | 'dots' | 'triangles' | 'diamonds' | 'circles' | 'squares' | 'stars' | 'petals' | 'none'
    particleCount: number;  // integer 5–40
    particleSpeed: string;  // 'slow' | 'medium' | 'fast'
  };
}
```

---

## 4. Example Python (FastAPI) Implementation

Drop-in example for a FastAPI backend using SQLAlchemy or raw SQL:

```python
from fastapi import APIRouter
from typing import Dict, Any

router = APIRouter()

@router.get("/users/{user_id}/theme")
async def get_theme(user_id: str):
    """Return saved theme config for a user."""
    # Example with raw SQL (asyncpg):
    # row = await conn.fetchval("SELECT theme_config FROM users WHERE id = $1", user_id)
    # theme_config = json.loads(row) if isinstance(row, str) else row
    #
    # Example with SQLAlchemy:
    # user = await db.get(User, user_id)
    # theme_config = user.theme_config if user else None

    theme_config = None  # ← replace with your DB query
    return {"theme_config": theme_config}


@router.put("/users/{user_id}/theme")
async def update_theme(user_id: str, payload: Dict[str, Any]):
    """Save theme config for a user (upsert)."""
    theme_config = payload.get("theme_config", payload)

    # Example with raw SQL (asyncpg):
    # tc_json = json.dumps(theme_config)
    # await conn.execute("""
    #     UPDATE users SET theme_config = $1::jsonb, updated_at = NOW()
    #     WHERE id = $2
    # """, tc_json, user_id)
    #
    # Example with SQLAlchemy:
    # user = await db.get(User, user_id)
    # user.theme_config = theme_config
    # await db.commit()

    return {"success": True}
```

---

## 5. Frontend API Calls (Already Done)

The frontend in `lib/api.ts` already has these two methods wired up:

```typescript
// Load theme on profile page load
const theme = await apiClient.getTheme(userId);
// → GET /users/{userId}/theme

// Save theme when user clicks Save
await apiClient.updateTheme(userId, themeConfig);
// → PUT /users/{userId}/theme  with body { theme_config: {...} }
```

**No frontend changes are needed.** Once the backend endpoints are live, theme persistence will work automatically.

---

## Summary Checklist

- [ ] Add `theme_config JSONB` column to `users` table
- [ ] Add `GET /users/{user_id}/theme` endpoint → returns `{"theme_config": <json|null>}`
- [ ] Add `PUT /users/{user_id}/theme` endpoint → accepts `{"theme_config": {...}}`, returns `{"success": true}`
- [ ] Deploy
