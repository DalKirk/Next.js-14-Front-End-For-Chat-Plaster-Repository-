# Multi-Size Avatar System Implementation Guide

**Implementation Date:** December 30, 2025  
**Architecture:** Facebook/Instagram-style multi-size avatar optimization  
**Goal:** 100x bandwidth reduction (200KB → 2KB for chat thumbnails)

---

## 📊 System Overview

### Size Specifications
| Size | Dimensions | Quality | Use Case | Avg File Size |
|------|-----------|---------|----------|---------------|
| **thumbnail** | 40x40px | 70% | Chat messages, comments | ~2KB |
| **small** | 80x80px | 75% | User lists, mentions | ~8KB |
| **medium** | 200x200px | 85% | Profile cards, modals | ~15KB |
| **large** | 400x400px | 90% | Profile headers, galleries | ~50KB |

### Processing Flow
```
User selects image (max 10MB)
    ↓
[CLIENT] ImageProcessor validates (min 40x40px)
    ↓
[CLIENT] Process into 4 sizes (Canvas API)
    ↓
[CLIENT] Compress to JPEG with quality settings
    ↓
[CLIENT] Upload 4 files via FormData
    ↓
[BACKEND] Receive 4 blobs
    ↓
[BACKEND] Upload each to Bunny.net CDN
    ↓
[BACKEND] Store URLs in database (JSONB)
    ↓
[BACKEND] Return AvatarUrls object
    ↓
[CLIENT] Store avatar_urls, display with ResponsiveAvatar
```

---

## ✅ Frontend Changes (COMPLETED)

### 1. Created `lib/image-processor.ts` (200 lines)

**Purpose:** Client-side image processing before upload

```typescript
export interface ProcessedAvatar {
  blob: Blob;
  size: 'thumbnail' | 'small' | 'medium' | 'large';
  width: number;
  height: number;
  sizeInBytes: number;
}

export interface ProcessedAvatarSet {
  thumbnail: ProcessedAvatar;
  small: ProcessedAvatar;
  medium: ProcessedAvatar;
  large: ProcessedAvatar;
  totalSizeInBytes: number;
}

export class ImageProcessor {
  async processAvatar(file: File): Promise<ProcessedAvatarSet>
  // Validates, crops to square, resizes to 4 sizes, compresses
}
```

**Key Features:**
- Validates min 40x40px, max 10MB
- Crops to square (center crop)
- Canvas-based resize with smooth scaling
- Quality optimization per size
- Returns 4 ready-to-upload blobs

---

### 2. Created `components/ResponsiveAvatar.tsx` (60 lines)

**Purpose:** Smart avatar display component that auto-selects optimal size

```typescript
interface ResponsiveAvatarProps {
  avatarUrls?: AvatarUrls;
  username: string;
  size?: 'thumbnail' | 'small' | 'medium' | 'large';
  className?: string;
}

export function ResponsiveAvatar({ 
  avatarUrls, 
  username, 
  size = 'medium',
  className 
}: ResponsiveAvatarProps)
```

**Features:**
- Lazy loading with `loading="lazy"`
- Error handling with fallback to ui-avatars.com
- Size mapping: thumbnail=40px, small=80px, medium=200px, large=400px
- Graceful degradation if size missing

**Usage Examples:**
```tsx
// Chat message (thumbnail - 2KB)
<ResponsiveAvatar avatarUrls={user.avatar_urls} username={user.username} size="thumbnail" />

// User list (small - 8KB)
<ResponsiveAvatar avatarUrls={user.avatar_urls} username={user.username} size="small" />

// Profile card (medium - 15KB)
<ResponsiveAvatar avatarUrls={user.avatar_urls} username={user.username} size="medium" />

// Profile header (large - 50KB)
<ResponsiveAvatar avatarUrls={user.avatar_urls} username={user.username} size="large" />
```

---

### 3. Updated `types/backend.ts`

**Added:**
```typescript
export interface AvatarUrls {
  thumbnail?: string;
  small?: string;
  medium?: string;
  large?: string;
}

export interface BackendUser {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;      // Legacy: points to medium
  avatar_urls?: AvatarUrls; // NEW: multi-size support
  joined_at: string;
}

export interface BackendMessage {
  id: string;
  room_id: string;
  user_id: string;
  username: string;
  content: string;
  timestamp: string;
  avatar_url?: string;      // Legacy
  avatar_urls?: AvatarUrls; // NEW
}

export interface AvatarUploadResponse {
  avatar_urls: AvatarUrls;
  avatar_url: string;        // Medium size for backward compatibility
  total_size_mb: number;
}
```

---

### 4. Updated `types/frontend.ts`

**Added:**
```typescript
import type { AvatarUrls } from './backend';

export interface UserProfile {
  id: string;
  username: string;
  avatar?: string;          // Legacy
  avatar_urls?: AvatarUrls; // NEW
  // ... other fields
}
```

---

### 5. Updated `lib/api.ts`

**Modified `uploadAvatar` method:**
```typescript
uploadAvatar: async (userId: string, file: File): Promise<AvatarUploadResponse> => {
  // 1. Dynamic import ImageProcessor
  const { ImageProcessor } = await import('./image-processor');
  const processor = new ImageProcessor();
  
  // 2. Validate image
  const img = await processor['loadImage'](file);
  if (img.width < 40 || img.height < 40) {
    throw new Error('Image too small');
  }
  
  // 3. Process into 4 sizes
  const processed = await processor.processAvatar(file);
  console.log('Sizes:', {
    thumbnail: `${(processed.thumbnail.sizeInBytes / 1024).toFixed(1)}KB`,
    small: `${(processed.small.sizeInBytes / 1024).toFixed(1)}KB`,
    medium: `${(processed.medium.sizeInBytes / 1024).toFixed(1)}KB`,
    large: `${(processed.large.sizeInBytes / 1024).toFixed(1)}KB`
  });
  
  // 4. Create FormData with 4 files
  const formData = new FormData();
  formData.append('thumbnail', processed.thumbnail.blob, 'thumbnail.jpg');
  formData.append('small', processed.small.blob, 'small.jpg');
  formData.append('medium', processed.medium.blob, 'medium.jpg');
  formData.append('large', processed.large.blob, 'large.jpg');
  
  // 5. Upload to backend
  const response = await api.post(`/users/${userId}/avatar`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  
  return response.data;
}
```

**Modified `updateProfile` method:**
```typescript
updateProfile: async (
  userId: string, 
  displayName?: string, 
  avatarUrl?: string, 
  avatarUrls?: AvatarUrls  // NEW parameter
): Promise<{ success: boolean; user: User }> => {
  const payload: Record<string, any> = {};
  if (displayName) payload.display_name = displayName;
  if (avatarUrl) payload.avatar_url = avatarUrl;
  if (avatarUrls) payload.avatar_urls = avatarUrls;  // NEW
  
  const r = await api.put(`/users/${userId}/profile`, payload);
  return r.data;
}
```

---

### 6. Updated `components/AvatarUpload.tsx`

**Changed Props:**
```typescript
interface AvatarUploadProps {
  userId: string;
  currentAvatar?: AvatarUrls;  // Was: string | undefined
  username: string;
  onAvatarChange: (avatarUrls: AvatarUrls | null) => void;  // Was: (url: string | null) => void
}
```

**Key Changes:**
- Uses `ResponsiveAvatar` for preview (large size)
- Shows "Will be optimized into 4 sizes automatically" message
- Shows "Processing image..." during client-side optimization
- Removed 185 lines of old single-file upload logic

---

### 7. Updated `app/profile/page.tsx`

**Modified `handleAvatarChange`:**
```typescript
const handleAvatarChange = async (avatarUrls: AvatarUrls | null) => {
  if (!profile) return;
  
  if (avatarUrls) {
    // Update local state with multi-size URLs
    setEditedProfile({ 
      ...editedProfile, 
      avatar_urls: avatarUrls, 
      avatar: avatarUrls.medium  // Backward compatibility
    });
    setAvatarPreview(avatarUrls.large || avatarUrls.medium || avatarUrls.small);
    
    // Save medium size to localStorage for WebSocket
    if (avatarUrls.medium) {
      localStorage.setItem('userAvatar', avatarUrls.medium);
    }
    
    // Update backend with all sizes
    await apiClient.updateProfile(
      profile.id, 
      editedProfile.username, 
      avatarUrls.medium, 
      avatarUrls
    );
    toast.success('Avatar uploaded to CDN (4 optimized sizes)!');
  } else {
    // Avatar deleted
    setEditedProfile({ ...editedProfile, avatar: '', avatar_urls: undefined });
    setAvatarPreview(null);
    localStorage.removeItem('userAvatar');
  }
};
```

**Updated Avatar Display:**
```tsx
{/* When not editing */}
<ResponsiveAvatar
  avatarUrls={profile.avatar_urls}
  username={profile.username}
  size="large"
  className="w-full h-full object-cover"
/>

{/* When editing */}
<AvatarUpload
  userId={profile.id}
  currentAvatar={editedProfile.avatar_urls || profile.avatar_urls}
  username={editedProfile.username}
  onAvatarChange={handleAvatarChange}
/>
```

---

## 🔧 Required Backend Changes

### 1. Database Migration

**Add `avatar_urls` column to users table:**

```sql
-- Migration: Add multi-size avatar support
ALTER TABLE users ADD COLUMN avatar_urls JSONB;

-- Index for faster queries
CREATE INDEX idx_users_avatar_urls ON users USING GIN (avatar_urls);

-- Example data structure:
-- avatar_urls = {
--   "thumbnail": "https://videochat-avatars.b-cdn.net/user123_thumbnail.jpg",
--   "small": "https://videochat-avatars.b-cdn.net/user123_small.jpg",
--   "medium": "https://videochat-avatars.b-cdn.net/user123_medium.jpg",
--   "large": "https://videochat-avatars.b-cdn.net/user123_large.jpg"
-- }

-- Backward compatibility: Keep avatar_url pointing to medium size
-- UPDATE users SET avatar_url = avatar_urls->>'medium' WHERE avatar_urls IS NOT NULL;
```

**Add `avatar_urls` column to messages table:**

```sql
ALTER TABLE messages ADD COLUMN avatar_urls JSONB;
CREATE INDEX idx_messages_avatar_urls ON messages USING GIN (avatar_urls);
```

---

### 2. Update Avatar Upload Endpoint

**File:** `backend/main.py`

**Current endpoint:**
```python
@app.post("/users/{user_id}/avatar")
async def upload_avatar(user_id: str, file: UploadFile = File(...)):
    # Single file upload
```

**NEW endpoint (replace):**
```python
from typing import Dict, Optional
import httpx

@app.post("/users/{user_id}/avatar")
async def upload_avatar(
    user_id: str,
    thumbnail: UploadFile = File(...),
    small: UploadFile = File(...),
    medium: UploadFile = File(...),
    large: UploadFile = File(...)
):
    """
    Upload multi-size avatar to Bunny.net CDN
    Accepts 4 files: thumbnail (40x40), small (80x80), medium (200x200), large (400x400)
    Returns URLs for all sizes
    """
    
    # Bunny.net configuration
    BUNNY_STORAGE_ZONE = "videochat-avatars"
    BUNNY_STORAGE_API_KEY = os.getenv("BUNNY_STORAGE_API_KEY")
    BUNNY_CDN_URL = "https://videochat-avatars.b-cdn.net"
    
    if not BUNNY_STORAGE_API_KEY:
        raise HTTPException(status_code=500, detail="Bunny.net API key not configured")
    
    # Generate unique filename base
    timestamp = int(time.time())
    filename_base = f"{user_id}_{timestamp}"
    
    avatar_urls = {}
    total_size = 0
    
    # Upload each size to Bunny.net
    files_to_upload = {
        'thumbnail': thumbnail,
        'small': small,
        'medium': medium,
        'large': large
    }
    
    async with httpx.AsyncClient() as client:
        for size_name, file in files_to_upload.items():
            # Read file content
            content = await file.read()
            total_size += len(content)
            
            # Construct Bunny.net upload URL
            filename = f"{filename_base}_{size_name}.jpg"
            upload_url = f"https://storage.bunnycdn.com/{BUNNY_STORAGE_ZONE}/{filename}"
            
            # Upload to Bunny.net
            headers = {
                "AccessKey": BUNNY_STORAGE_API_KEY,
                "Content-Type": "application/octet-stream"
            }
            
            response = await client.put(upload_url, content=content, headers=headers)
            
            if response.status_code not in [200, 201]:
                raise HTTPException(
                    status_code=500, 
                    detail=f"Failed to upload {size_name} to CDN: {response.text}"
                )
            
            # Store CDN URL
            cdn_url = f"{BUNNY_CDN_URL}/{filename}"
            avatar_urls[size_name] = cdn_url
            
            print(f"✅ Uploaded {size_name}: {cdn_url} ({len(content) / 1024:.1f}KB)")
    
    # Update user in database
    await db.execute(
        """
        UPDATE users 
        SET avatar_urls = $1, 
            avatar_url = $2 
        WHERE id = $3
        """,
        avatar_urls,  # JSONB object
        avatar_urls['medium'],  # Backward compatibility
        user_id
    )
    
    total_size_mb = total_size / (1024 * 1024)
    
    return {
        "avatar_urls": avatar_urls,
        "avatar_url": avatar_urls['medium'],  # Backward compatibility
        "total_size_mb": round(total_size_mb, 2)
    }
```

**Environment Variable Required:**
```bash
# Add to Railway environment variables
BUNNY_STORAGE_API_KEY=your-bunny-storage-api-key-here
```

---

### 3. Update Profile Endpoint

**File:** `backend/main.py`

**Current endpoint:**
```python
@app.put("/users/{user_id}/profile")
async def update_profile(user_id: str, display_name: Optional[str] = None, avatar_url: Optional[str] = None):
```

**Update to accept avatar_urls:**
```python
from pydantic import BaseModel
from typing import Optional, Dict

class AvatarUrls(BaseModel):
    thumbnail: Optional[str] = None
    small: Optional[str] = None
    medium: Optional[str] = None
    large: Optional[str] = None

class ProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    avatar_urls: Optional[Dict[str, str]] = None  # NEW

@app.put("/users/{user_id}/profile")
async def update_profile(user_id: str, profile: ProfileUpdate):
    """Update user profile with optional multi-size avatar support"""
    
    update_fields = []
    params = []
    param_idx = 1
    
    if profile.display_name:
        update_fields.append(f"display_name = ${param_idx}")
        params.append(profile.display_name)
        param_idx += 1
    
    if profile.avatar_url:
        update_fields.append(f"avatar_url = ${param_idx}")
        params.append(profile.avatar_url)
        param_idx += 1
    
    if profile.avatar_urls:
        update_fields.append(f"avatar_urls = ${param_idx}")
        params.append(profile.avatar_urls)  # PostgreSQL will convert dict to JSONB
        param_idx += 1
        
        # If avatar_urls provided but no avatar_url, use medium as default
        if not profile.avatar_url and profile.avatar_urls.get('medium'):
            update_fields.append(f"avatar_url = ${param_idx}")
            params.append(profile.avatar_urls['medium'])
            param_idx += 1
    
    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    params.append(user_id)
    query = f"""
        UPDATE users 
        SET {', '.join(update_fields)}
        WHERE id = ${param_idx}
        RETURNING *
    """
    
    user = await db.fetchrow(query, *params)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "success": True,
        "user": dict(user)
    }
```

---

### 4. Update WebSocket Handler

**File:** `backend/main.py` (WebSocket endpoint)

**Update to broadcast avatar_urls:**

```python
@app.websocket("/ws/{room_id}/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    room_id: str,
    user_id: str,
    username: str = Query(...),
    avatar_url: str = Query(None)  # Keep for backward compatibility
):
    await websocket.accept()
    
    # Fetch user's avatar_urls from database
    user = await db.fetchrow("SELECT avatar_url, avatar_urls FROM users WHERE id = $1", user_id)
    
    user_avatar_urls = None
    if user and user['avatar_urls']:
        user_avatar_urls = user['avatar_urls']
    elif avatar_url:
        # Fallback: If only single avatar_url provided, use it for all sizes
        user_avatar_urls = {
            'thumbnail': avatar_url,
            'small': avatar_url,
            'medium': avatar_url,
            'large': avatar_url
        }
    
    # Update user's avatar_urls in database if provided via query param
    if avatar_url and not user_avatar_urls:
        await db.execute(
            "UPDATE users SET avatar_url = $1 WHERE id = $2",
            avatar_url, user_id
        )
    
    # Add to active connections
    await manager.connect(websocket, room_id, user_id, username, user_avatar_urls)
    
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            # Create message with avatar_urls
            message = {
                'id': str(uuid.uuid4()),
                'room_id': room_id,
                'user_id': user_id,
                'username': username,
                'content': message_data['content'],
                'timestamp': datetime.now().isoformat(),
                'avatar_url': user_avatar_urls.get('medium') if user_avatar_urls else None,
                'avatar_urls': user_avatar_urls  # NEW
            }
            
            # Persist to database
            await db.execute(
                """
                INSERT INTO messages (id, room_id, user_id, username, content, timestamp, avatar_url, avatar_urls)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                """,
                message['id'],
                room_id,
                user_id,
                username,
                message['content'],
                message['timestamp'],
                message['avatar_url'],
                message['avatar_urls']  # JSONB
            )
            
            # Broadcast to all in room
            await manager.broadcast(room_id, message)
            
    except WebSocketDisconnect:
        manager.disconnect(room_id, user_id)
```

---

### 5. Update Get Messages Endpoint

**File:** `backend/main.py`

**Update to return avatar_urls:**

```python
@app.get("/rooms/{room_id}/messages")
async def get_messages(room_id: str, limit: int = 50):
    """Get messages with multi-size avatar support"""
    
    messages = await db.fetch(
        """
        SELECT 
            m.id, 
            m.room_id, 
            m.user_id, 
            m.username, 
            m.content, 
            m.timestamp,
            m.avatar_url,
            m.avatar_urls  -- NEW
        FROM messages m
        WHERE m.room_id = $1
        ORDER BY m.timestamp DESC
        LIMIT $2
        """,
        room_id, limit
    )
    
    return [
        {
            'id': msg['id'],
            'room_id': msg['room_id'],
            'user_id': msg['user_id'],
            'username': msg['username'],
            'content': msg['content'],
            'timestamp': msg['timestamp'],
            'avatar_url': msg['avatar_url'],
            'avatar_urls': msg['avatar_urls']  # NEW
        }
        for msg in reversed(messages)
    ]
```

---

## 📦 Backend Dependencies

**Add to `backend/requirements.txt`:**

```txt
httpx>=0.24.0  # For async HTTP requests to Bunny.net
```

**Install:**
```bash
pip install httpx
```

---

## 🧪 Testing the System

### 1. Test Client-Side Processing

**In browser console:**
```javascript
// Select a test image file
const input = document.createElement('input');
input.type = 'file';
input.accept = 'image/*';
input.onchange = async (e) => {
  const file = e.target.files[0];
  
  // Test the processor
  const { ImageProcessor } = await import('/lib/image-processor');
  const processor = new ImageProcessor();
  const processed = await processor.processAvatar(file);
  
  console.log('Processed sizes:', {
    thumbnail: `${(processed.thumbnail.sizeInBytes / 1024).toFixed(1)}KB`,
    small: `${(processed.small.sizeInBytes / 1024).toFixed(1)}KB`,
    medium: `${(processed.medium.sizeInBytes / 1024).toFixed(1)}KB`,
    large: `${(processed.large.sizeInBytes / 1024).toFixed(1)}KB`,
    total: `${(processed.totalSizeInBytes / 1024).toFixed(1)}KB`
  });
};
input.click();
```

### 2. Test Backend Upload

**Using curl:**
```bash
curl -X POST \
  https://web-production-3ba7e.up.railway.app/users/test-user/avatar \
  -H "Content-Type: multipart/form-data" \
  -F "thumbnail=@thumbnail.jpg" \
  -F "small=@small.jpg" \
  -F "medium=@medium.jpg" \
  -F "large=@large.jpg"
```

**Expected Response:**
```json
{
  "avatar_urls": {
    "thumbnail": "https://videochat-avatars.b-cdn.net/test-user_1234567890_thumbnail.jpg",
    "small": "https://videochat-avatars.b-cdn.net/test-user_1234567890_small.jpg",
    "medium": "https://videochat-avatars.b-cdn.net/test-user_1234567890_medium.jpg",
    "large": "https://videochat-avatars.b-cdn.net/test-user_1234567890_large.jpg"
  },
  "avatar_url": "https://videochat-avatars.b-cdn.net/test-user_1234567890_medium.jpg",
  "total_size_mb": 0.07
}
```

### 3. Test End-to-End

1. **Upload avatar** via profile page
2. **Check database:**
   ```sql
   SELECT avatar_urls FROM users WHERE id = 'your-user-id';
   ```
3. **Verify chat messages** use thumbnail (2KB)
4. **Verify profile** uses large (50KB)
5. **Check bandwidth** in DevTools Network tab

---

## 🎯 Performance Benefits

### Before (Single Size)
- **Profile page:** 200KB avatar download
- **Chat message (10 messages):** 2MB total (200KB × 10)
- **User list (50 users):** 10MB total

### After (Multi-Size)
- **Profile page:** 50KB avatar download (75% reduction)
- **Chat message (10 messages):** 20KB total (2KB × 10) - **100x reduction**
- **User list (50 users):** 400KB total (8KB × 50) - **96% reduction**

### Real-World Impact
- **Chat room with 100 messages:** Before: 20MB → After: 200KB
- **Page load time:** Before: 3-5s → After: <1s
- **Mobile data usage:** 95%+ reduction
- **CDN bandwidth costs:** 95%+ reduction

---

## 🔄 Migration Strategy

### Phase 1: Backend Deployment (DO THIS FIRST)
1. Add `avatar_urls` column to database
2. Deploy new upload endpoint (accepts 4 files)
3. Update profile endpoint (accepts avatar_urls)
4. Update WebSocket (broadcasts avatar_urls)
5. Keep backward compatibility (avatar_url still works)

### Phase 2: Frontend Deployment
1. Already completed (frontend changes above)
2. Deploy to Vercel
3. Old clients still work (use avatar_url)
4. New clients use multi-size automatically

### Phase 3: Data Migration (Optional)
1. For existing users with single avatar_url:
   ```sql
   -- Create placeholder multi-size from existing avatar
   UPDATE users 
   SET avatar_urls = jsonb_build_object(
     'thumbnail', avatar_url,
     'small', avatar_url,
     'medium', avatar_url,
     'large', avatar_url
   )
   WHERE avatar_url IS NOT NULL AND avatar_urls IS NULL;
   ```
2. Users will get optimized versions when they re-upload

---

## ✅ Deployment Checklist

### Backend (Railway)
- [ ] Add `BUNNY_STORAGE_API_KEY` environment variable
- [ ] Run database migration (add avatar_urls column)
- [ ] Install `httpx` dependency
- [ ] Deploy updated `/users/{user_id}/avatar` endpoint
- [ ] Deploy updated `/users/{user_id}/profile` endpoint
- [ ] Deploy updated WebSocket handler
- [ ] Deploy updated `/rooms/{room_id}/messages` endpoint
- [ ] Test upload with 4 files
- [ ] Verify Bunny.net uploads work
- [ ] Check database has avatar_urls data

### Frontend (Vercel)
- [x] Client-side ImageProcessor implemented
- [x] ResponsiveAvatar component created
- [x] Type definitions updated
- [x] API client updated
- [x] AvatarUpload component upgraded
- [x] Profile page updated
- [ ] Update chat message displays (use thumbnail)
- [ ] Update user lists (use small)
- [ ] Deploy to Vercel
- [ ] Test end-to-end flow

### Testing
- [ ] Upload new avatar → verify 4 sizes created
- [ ] Check chat uses thumbnail (2KB)
- [ ] Check profile uses large (50KB)
- [ ] Verify backward compatibility (old clients work)
- [ ] Load test with 100 concurrent uploads
- [ ] Monitor CDN bandwidth reduction

---

## 🆘 Troubleshooting

### Issue: Backend rejects 4-file upload
**Solution:** Ensure FastAPI accepts multiple files with same parameter names

### Issue: Bunny.net upload fails
**Solution:** Check `BUNNY_STORAGE_API_KEY` environment variable is set

### Issue: Database error with JSONB
**Solution:** Ensure PostgreSQL version supports JSONB (9.4+)

### Issue: ResponsiveAvatar shows wrong size
**Solution:** Check that avatar_urls object has all 4 sizes

### Issue: Old messages missing avatar_urls
**Solution:** Normal - old messages use avatar_url, new messages use avatar_urls

---

## 📚 References

- **Bunny.net Storage API:** https://docs.bunny.net/reference/storage-api
- **PostgreSQL JSONB:** https://www.postgresql.org/docs/current/datatype-json.html
- **Canvas API:** https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
- **FastAPI File Uploads:** https://fastapi.tiangolo.com/tutorial/request-files/

---

**Status:** ✅ Frontend Complete | ⏳ Backend Pending Implementation

**Next Step:** Deploy backend changes to Railway with database migration
