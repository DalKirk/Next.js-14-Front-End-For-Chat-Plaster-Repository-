# Backend Changes Required: Social Feed

> **Scope**: Add 9 new REST endpoints + 3 new database tables so users can create posts, like, comment, share, and browse a social feed.
>
> **Nothing else changes.** All existing endpoints (profile, avatar, gallery, auth, rooms, themes, etc.) remain untouched.

---

## 1. Database Migrations

### `posts` table

```sql
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL DEFAULT '',
    media_urls JSONB DEFAULT '[]'::jsonb,
    likes_count INTEGER NOT NULL DEFAULT 0,
    comments_count INTEGER NOT NULL DEFAULT 0,
    shares_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
```

### `post_likes` table

```sql
CREATE TABLE IF NOT EXISTS post_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);
```

### `post_comments` table

```sql
CREATE TABLE IF NOT EXISTS post_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_post_comments_post_id ON post_comments(post_id);
```

---

## 2. New Endpoints

### `GET /feed`

Returns a list of posts for the feed.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `type` | string | `foryou` | One of `foryou`, `following`, `trending` |

**Response:**
```json
[
  {
    "id": "abc123",
    "user_id": "user-uuid",
    "username": "sarah_chen",
    "avatar_url": "https://cdn.example.com/avatar.jpg",
    "content": "Just launched my new portfolio! 🚀",
    "media_urls": ["https://cdn.example.com/photo1.jpg"],
    "likes_count": 247,
    "comments_count": 23,
    "shares_count": 12,
    "created_at": "2026-02-08T14:30:00Z",
    "user_liked": false
  }
]
```

**Implementation notes:**
- `foryou`: Return all posts ordered by `created_at DESC` (newest first). Optionally mix in engagement-weighted posts.
- `following`: Return posts only from users the current user follows (if you have a follow system; otherwise return the same as `foryou`).
- `trending`: Return posts ordered by `(likes_count + comments_count + shares_count) DESC` within the last 7 days.
- `user_liked`: Requires checking `post_likes` for the requesting user. If no auth context, default to `false`.
- Join with `users` table to get `username` and `avatar_url`.

---

### `POST /posts`

Create a new post.

**Request:**
```json
{
  "user_id": "user-uuid",
  "content": "Hello world!",
  "media_urls": ["https://cdn.example.com/uploaded-photo.jpg"]
}
```

**Response:**
```json
{
  "id": "new-post-uuid",
  "user_id": "user-uuid",
  "username": "sarah_chen",
  "avatar_url": "https://cdn.example.com/avatar.jpg",
  "content": "Hello world!",
  "media_urls": ["https://cdn.example.com/uploaded-photo.jpg"],
  "likes_count": 0,
  "comments_count": 0,
  "shares_count": 0,
  "created_at": "2026-02-08T15:00:00Z",
  "user_liked": false
}
```

**Implementation notes:**
- Insert into `posts` table.
- Return the full post object (joined with user info) so the frontend can immediately display it.

---

### `POST /posts/{post_id}/like`

Toggle like on a post (like if not liked, unlike if already liked).

**Request:**
```json
{
  "user_id": "user-uuid"
}
```

**Response:**
```json
{
  "liked": true
}
```

**Implementation notes:**
- If a row exists in `post_likes` for this `(post_id, user_id)`, delete it and decrement `posts.likes_count`. Return `{"liked": false}`.
- If no row exists, insert one and increment `posts.likes_count`. Return `{"liked": true}`.

---

### `POST /posts/{post_id}/comments`

Add a comment to a post.

**Request:**
```json
{
  "user_id": "user-uuid",
  "content": "Great post! 🔥"
}
```

**Response:**
```json
{
  "id": "comment-uuid",
  "post_id": "post-uuid",
  "user_id": "user-uuid",
  "username": "john_doe",
  "content": "Great post! 🔥",
  "created_at": "2026-02-08T15:05:00Z"
}
```

**Implementation notes:**
- Insert into `post_comments` and increment `posts.comments_count`.

---

### `GET /posts/{post_id}/comments`

Returns all comments for a post (for the expandable comment thread).

**Response:**
```json
[
  {
    "id": "comment-uuid",
    "post_id": "post-uuid",
    "user_id": "user-uuid",
    "username": "john_doe",
    "avatar_url": "https://cdn.example.com/avatar.jpg",
    "content": "Great post! 🔥",
    "created_at": "2026-02-08T15:05:00Z"
  }
]
```

**Implementation notes:**
- Return comments where `post_id` matches, ordered by `created_at ASC` (oldest first).
- Join with `users` table to get `username` and `avatar_url`.
- No pagination needed initially (most posts won't exceed 50 comments).

---

### `POST /posts/{post_id}/share`

Record a share of a post.

**Request:**
```json
{
  "user_id": "user-uuid"
}
```

**Response:**
```json
{
  "shared": true
}
```

**Implementation notes:**
- Increment `posts.shares_count`.
- Optionally track shares in a separate table for analytics.

---

### `DELETE /posts/{post_id}`

Delete a post (owner only).

**Request:**
```
DELETE /posts/{post_id}
```

**Response:**
```json
{
  "success": true
}
```

**Implementation notes:**
- Delete from `posts` table. Cascading foreign keys will clean up `post_likes` and `post_comments`.
- Optionally verify that the requesting user is the post owner.

---

### `POST /posts/upload-media`

Upload media files (images/videos) for a post.

---

### `GET /posts/user/{user_id}`

Returns all posts by a specific user (for their profile page).

**Response:**
```json
[
  {
    "id": "abc123",
    "user_id": "user-uuid",
    "username": "sarah_chen",
    "avatar_url": "https://cdn.example.com/avatar.jpg",
    "content": "Just launched my new portfolio! 🚀",
    "media_urls": ["https://cdn.example.com/photo1.jpg"],
    "likes_count": 247,
    "comments_count": 23,
    "shares_count": 12,
    "created_at": "2026-02-08T14:30:00Z",
    "user_liked": false
  }
]
```

**Implementation notes:**
- Return posts where `user_id` matches the path parameter, ordered by `created_at DESC`.
- Join with `users` table to get `username` and `avatar_url`.
- Same response shape as `GET /feed` so the frontend can reuse PostCard.

---

**Upload media endpoint (continued below):**

### `POST /posts/upload-media`

**Request:**
```
POST /posts/upload-media
Content-Type: multipart/form-data

files: [file1, file2, ...]
userId: "user-uuid"
```

**Response:**
```json
{
  "urls": [
    "https://cdn.example.com/posts/user-uuid/photo1.jpg",
    "https://cdn.example.com/posts/user-uuid/photo2.jpg"
  ]
}
```

**Implementation notes:**
- Accept up to 4 files, max 10MB each.
- Upload to your storage (Bunny.net CDN, S3, etc.).
- Return the public CDN URLs so the frontend can include them in the `createPost` call.

---

## 3. Example Python (FastAPI) Implementation

```python
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import List, Optional
from pydantic import BaseModel
import uuid
from datetime import datetime

router = APIRouter()


class CreatePostRequest(BaseModel):
    user_id: str
    content: str = ""
    media_urls: List[str] = []


class LikeRequest(BaseModel):
    user_id: str


class CommentRequest(BaseModel):
    user_id: str
    content: str


class ShareRequest(BaseModel):
    user_id: str


@router.get("/feed")
async def get_feed(type: str = "foryou"):
    """Return feed posts."""
    # Example with raw SQL:
    # if type == "trending":
    #     rows = await conn.fetch("""
    #         SELECT p.*, u.username, u.avatar_url
    #         FROM posts p JOIN users u ON p.user_id = u.id
    #         WHERE p.created_at > NOW() - INTERVAL '7 days'
    #         ORDER BY (p.likes_count + p.comments_count + p.shares_count) DESC
    #         LIMIT 50
    #     """)
    # else:
    #     rows = await conn.fetch("""
    #         SELECT p.*, u.username, u.avatar_url
    #         FROM posts p JOIN users u ON p.user_id = u.id
    #         ORDER BY p.created_at DESC
    #         LIMIT 50
    #     """)
    #
    # return [dict(row) for row in rows]
    return []


@router.post("/posts")
async def create_post(req: CreatePostRequest):
    """Create a new post."""
    # post_id = str(uuid.uuid4())
    # await conn.execute("""
    #     INSERT INTO posts (id, user_id, content, media_urls)
    #     VALUES ($1, $2, $3, $4::jsonb)
    # """, post_id, req.user_id, req.content, json.dumps(req.media_urls))
    #
    # row = await conn.fetchrow("""
    #     SELECT p.*, u.username, u.avatar_url
    #     FROM posts p JOIN users u ON p.user_id = u.id
    #     WHERE p.id = $1
    # """, post_id)
    # return dict(row)
    return {"id": str(uuid.uuid4()), "content": req.content}


@router.post("/posts/{post_id}/like")
async def toggle_like(post_id: str, req: LikeRequest):
    """Toggle like on a post."""
    # existing = await conn.fetchrow(
    #     "SELECT id FROM post_likes WHERE post_id=$1 AND user_id=$2",
    #     post_id, req.user_id
    # )
    # if existing:
    #     await conn.execute("DELETE FROM post_likes WHERE id=$1", existing['id'])
    #     await conn.execute("UPDATE posts SET likes_count = likes_count - 1 WHERE id=$1", post_id)
    #     return {"liked": False}
    # else:
    #     await conn.execute(
    #         "INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)",
    #         post_id, req.user_id
    #     )
    #     await conn.execute("UPDATE posts SET likes_count = likes_count + 1 WHERE id=$1", post_id)
    #     return {"liked": True}
    return {"liked": True}


@router.post("/posts/{post_id}/comments")
async def add_comment(post_id: str, req: CommentRequest):
    """Add a comment to a post."""
    # comment_id = str(uuid.uuid4())
    # await conn.execute("""
    #     INSERT INTO post_comments (id, post_id, user_id, content)
    #     VALUES ($1, $2, $3, $4)
    # """, comment_id, post_id, req.user_id, req.content)
    # await conn.execute("UPDATE posts SET comments_count = comments_count + 1 WHERE id=$1", post_id)
    # return {"id": comment_id, "content": req.content}
    return {"id": str(uuid.uuid4()), "content": req.content}


@router.get("/posts/{post_id}/comments")
async def get_comments(post_id: str):
    """Return all comments for a post."""
    # rows = await conn.fetch("""
    #     SELECT c.*, u.username, u.avatar_url
    #     FROM post_comments c JOIN users u ON c.user_id = u.id
    #     WHERE c.post_id = $1
    #     ORDER BY c.created_at ASC
    # """, post_id)
    # return [dict(row) for row in rows]
    return []


@router.post("/posts/{post_id}/share")
async def share_post(post_id: str, req: ShareRequest):
    """Share a post."""
    # await conn.execute("UPDATE posts SET shares_count = shares_count + 1 WHERE id=$1", post_id)
    return {"shared": True}


@router.delete("/posts/{post_id}")
async def delete_post(post_id: str):
    """Delete a post."""
    # await conn.execute("DELETE FROM posts WHERE id=$1", post_id)
    return {"success": True}


@router.post("/posts/upload-media")
async def upload_media(
    files: List[UploadFile] = File(...),
    userId: str = Form(...)
):
    """Upload media files for a post."""
    if len(files) > 4:
        raise HTTPException(400, "Maximum 4 files allowed")

    urls = []
    for file in files:
        # Upload to your CDN (Bunny.net, S3, etc.)
        # url = await upload_to_cdn(file, userId)
        # urls.append(url)
        urls.append(f"https://cdn.example.com/posts/{userId}/{file.filename}")

    return {"urls": urls}


@router.get("/posts/user/{user_id}")
async def get_user_posts(user_id: str):
    """Return all posts by a specific user."""
    # rows = await conn.fetch("""
    #     SELECT p.*, u.username, u.avatar_url
    #     FROM posts p JOIN users u ON p.user_id = u.id
    #     WHERE p.user_id = $1
    #     ORDER BY p.created_at DESC
    #     LIMIT 50
    # """, user_id)
    # return [dict(row) for row in rows]
    return []
```

**Register the router:**
```python
# In server.py
app.include_router(feed_router)  # or prefix="/api" if needed
```

---

## 4. Frontend API Calls (Already Done)

The frontend in `lib/api.ts` already has these methods wired up:

```typescript
apiClient.getFeed(type)          // → GET  /feed?type=foryou|following|trending
apiClient.getUserPosts(userId)   // → GET  /posts/user/{userId}
apiClient.createPost(data)       // → POST /posts
apiClient.likePost(postId, uid)  // → POST /posts/{id}/like
apiClient.commentOnPost(id,uid,c)// → POST /posts/{id}/comments
apiClient.getComments(postId)    // → GET  /posts/{id}/comments
apiClient.sharePost(postId, uid) // → POST /posts/{id}/share
apiClient.deletePost(postId)     // → DELETE /posts/{id}
```

Media upload is sent directly from the browser to `POST /posts/upload-media` (bypasses the Next.js proxy).

**No frontend changes are needed.** Once the backend endpoints are live, the social feed will work automatically.

---

## Summary Checklist

- [ ] Create `posts` table with columns: id, user_id, content, media_urls, likes_count, comments_count, shares_count, created_at, updated_at
- [ ] Create `post_likes` table with unique constraint on (post_id, user_id)
- [ ] Create `post_comments` table
- [ ] Add `GET /feed` endpoint → returns array of posts with user info
- [ ] Add `POST /posts` endpoint → creates post, returns full post object
- [ ] Add `POST /posts/{post_id}/like` endpoint → toggles like, returns `{liked: bool}`
- [ ] Add `POST /posts/{post_id}/comments` endpoint → adds comment, returns comment
- [ ] Add `GET /posts/{post_id}/comments` endpoint → returns comments for a post
- [ ] Add `POST /posts/{post_id}/share` endpoint → increments share count
- [ ] Add `DELETE /posts/{post_id}` endpoint → deletes post
- [ ] Add `POST /posts/upload-media` endpoint → uploads files, returns CDN URLs
- [ ] Add `GET /posts/user/{user_id}` endpoint → returns posts by a specific user
- [ ] Deploy
