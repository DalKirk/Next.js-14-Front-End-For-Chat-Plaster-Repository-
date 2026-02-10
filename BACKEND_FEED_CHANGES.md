# Backend Changes Required: Social Feed + Follow System + Reposts

> **Scope**: Add REST endpoints + database tables for social feed, follow system, and reposts.
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
    -- Repost: references the original post being shared
    shared_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_shared_post_id ON posts(shared_post_id);
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

### `follows` table

```sql
CREATE TABLE IF NOT EXISTS follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followed_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(follower_id, followed_id)
);

CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_followed ON follows(followed_id);
```

### Add columns to `users` table (if not already present)

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS followers_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS following_count INTEGER NOT NULL DEFAULT 0;
```

---

## 2. New Endpoints

### `GET /feed`

Returns a list of posts for the feed.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `type` | string | `foryou` | One of `foryou`, `following`, `trending` |
| `user_id` | string | (none) | Current user's ID — needed for `following` filter and `user_liked` field |
| `page` | int | `1` | Page number for pagination (1-indexed) |
| `limit` | int | `20` | Number of posts per page (max 50 recommended) |

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
    "user_liked": false,
    "shared_post_id": null,
    "shared_post": null
  },
  {
    "id": "repost-uuid",
    "user_id": "reposter-uuid",
    "username": "john_doe",
    "avatar_url": "https://cdn.example.com/john.jpg",
    "content": "Check this out!",
    "media_urls": [],
    "likes_count": 5,
    "comments_count": 0,
    "shares_count": 0,
    "created_at": "2026-02-08T16:00:00Z",
    "user_liked": false,
    "shared_post_id": "abc123",
    "shared_post": {
      "id": "abc123",
      "user_id": "user-uuid",
      "username": "sarah_chen",
      "avatar_url": "https://cdn.example.com/avatar.jpg",
      "content": "Just launched my new portfolio! 🚀",
      "media_urls": ["https://cdn.example.com/photo1.jpg"],
      "likes_count": 247,
      "comments_count": 23,
      "shares_count": 12,
      "created_at": "2026-02-08T14:30:00Z"
    }
  }
]
```

**Implementation notes:**
- `foryou`: Return all posts ordered by `created_at DESC` (newest first).
- `following`: Filter posts to only users that `user_id` follows (via `follows` table). Falls back to `foryou` if no follows.
- `trending`: Return posts ordered by `(likes_count + comments_count + shares_count) DESC` within the last 7 days.
- `user_liked`: Check `post_likes` for the requesting `user_id`. Default `false` if no `user_id`.
- If `shared_post_id` is set, include the full `shared_post` object by joining/subquerying the original post + its author.
- Join with `users` table to get `username` and `avatar_url`.
- **Pagination**: Use `LIMIT` and `OFFSET` in SQL: `LIMIT $limit OFFSET (($page - 1) * $limit)`

**Pagination SQL example:**
```sql
-- For "foryou" feed with pagination
SELECT p.*, u.username, u.avatar_url
FROM posts p
JOIN users u ON p.user_id = u.id
ORDER BY p.created_at DESC
LIMIT $1 OFFSET $2
-- where $1 = limit (e.g., 20), $2 = (page - 1) * limit
```

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

Create a repost of an existing post. This inserts a new post with `shared_post_id` pointing to the original, and increments the original post's `shares_count`.

**Request:**
```json
{
  "user_id": "user-uuid",
  "content": "Check this out!"
}
```

- `content` is optional — the reposter can add their own comment text, or leave it blank.

**Response:**
Returns the newly created repost (full post object), with the original post embedded as `shared_post`:
```json
{
  "id": "repost-uuid",
  "user_id": "reposter-uuid",
  "username": "john_doe",
  "avatar_url": "https://cdn.example.com/john.jpg",
  "content": "Check this out!",
  "media_urls": [],
  "likes_count": 0,
  "comments_count": 0,
  "shares_count": 0,
  "created_at": "2026-02-08T16:00:00Z",
  "user_liked": false,
  "shared_post_id": "abc123",
  "shared_post": {
    "id": "abc123",
    "user_id": "user-uuid",
    "username": "sarah_chen",
    "avatar_url": "https://cdn.example.com/avatar.jpg",
    "content": "Just launched my new portfolio! 🚀",
    "media_urls": ["https://cdn.example.com/photo1.jpg"],
    "likes_count": 247,
    "comments_count": 23,
    "shares_count": 13,
    "created_at": "2026-02-08T14:30:00Z"
  }
}
```

**Implementation notes:**
- Insert a new row in `posts` with `shared_post_id = post_id`, `user_id = req.user_id`, `content = req.content`.
- Increment `shares_count` on the original post.
- Return the new repost joined with the reposter's user info AND the original post + its author.
- Prevent reposting your own post (optional guard).

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
    "user_liked": false,
    "shared_post_id": null,
    "shared_post": null
  }
]
```

**Implementation notes:**
- Return posts where `user_id` matches the path parameter, ordered by `created_at DESC`.
- Join with `users` table to get `username` and `avatar_url`.
- If `shared_post_id` is set, include the full `shared_post` object (same as in `GET /feed`).
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

### `POST /users/{user_id}/follow`

Toggle follow/unfollow on a user.

**Request:**
```json
{
  "user_id": "current-user-uuid"
}
```

- `user_id` in the URL path is the **target** user to follow/unfollow.
- `user_id` in the request body is the **current** (requesting) user.

**Response:**
```json
{
  "following": true,
  "followers_count": 42,
  "following_count": 18
}
```

**Implementation notes:**
- Check `follows` table for existing row `(follower_id=body.user_id, followed_id=path.user_id)`.
- If exists → delete the row (unfollow). If not → insert (follow).
- Update `followers_count` on the target user and `following_count` on the current user.
- Return `following: true` if now following, `false` if unfollowed.
- Return the **target user's** updated `followers_count` and the **current user's** updated `following_count`.
- Prevent self-follow.

---

### `GET /users/{user_id}/follow-status`

Check if the current user is following a target user.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `user_id` | string | The current (requesting) user's ID |

**Response:**
```json
{
  "following": true
}
```

**Implementation notes:**
- Check `follows` table for `(follower_id=query.user_id, followed_id=path.user_id)`.
- Return `following: true` if a row exists, `false` otherwise.

---

### `GET /users/{user_id}/followers`

Returns a list of users who follow this user.

**Response:**
```json
[
  {
    "id": "follower-uuid",
    "username": "jane_doe",
    "avatar_url": "https://cdn.example.com/jane.jpg"
  }
]
```

**Implementation notes:**
- Query `follows` table where `followed_id = path.user_id`.
- Join with `users` table to get `username` and `avatar_url`.
- Order by `created_at DESC` (most recent followers first).

---

### `GET /users/{user_id}/following`

Returns a list of users this user follows.

**Response:**
```json
[
  {
    "id": "followed-uuid",
    "username": "sarah_chen",
    "avatar_url": "https://cdn.example.com/sarah.jpg"
  }
]
```

**Implementation notes:**
- Query `follows` table where `follower_id = path.user_id`.
- Join with `users` table to get `username` and `avatar_url`.
- Order by `created_at DESC` (most recently followed first).

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
    content: str = ""


class FollowRequest(BaseModel):
    user_id: str


@router.get("/feed")
async def get_feed(
    type: str = "foryou",
    user_id: Optional[str] = None,
    page: int = 1,
    limit: int = 20
):
    """Return feed posts with pagination.
    
    - foryou: all posts, newest first
    - following: posts from users that user_id follows
    - trending: posts sorted by engagement in last 7 days
    
    If shared_post_id is set on a post, include the full shared_post object.
    If user_id is provided, check post_likes to set user_liked on each post.
    """
    # Clamp limit to prevent abuse
    limit = min(limit, 50)
    offset = (page - 1) * limit
    
    # Example with raw SQL:
    # if type == "following" and user_id:
    #     rows = await conn.fetch("""
    #         SELECT p.*, u.username, u.avatar_url
    #         FROM posts p
    #         JOIN users u ON p.user_id = u.id
    #         WHERE p.user_id IN (
    #             SELECT followed_id FROM follows WHERE follower_id = $1
    #         )
    #         ORDER BY p.created_at DESC
    #         LIMIT $2 OFFSET $3
    #     """, user_id, limit, offset)
    # elif type == "trending":
    #     rows = await conn.fetch("""
    #         SELECT p.*, u.username, u.avatar_url
    #         FROM posts p JOIN users u ON p.user_id = u.id
    #         WHERE p.created_at > NOW() - INTERVAL '7 days'
    #         ORDER BY (p.likes_count + p.comments_count + p.shares_count) DESC
    #         LIMIT $1 OFFSET $2
    #     """, limit, offset)
    # else:
    #     rows = await conn.fetch("""
    #         SELECT p.*, u.username, u.avatar_url
    #         FROM posts p JOIN users u ON p.user_id = u.id
    #         ORDER BY p.created_at DESC
    #         LIMIT $1 OFFSET $2
    #     """, limit, offset)
    #
    # # For each post with shared_post_id, fetch the original post
    # # For each post, check user_liked if user_id provided
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
    """Create a repost of an existing post."""
    # repost_id = str(uuid.uuid4())
    # # Insert a new post with shared_post_id pointing to the original
    # await conn.execute("""
    #     INSERT INTO posts (id, user_id, content, shared_post_id)
    #     VALUES ($1, $2, $3, $4)
    # """, repost_id, req.user_id, req.content, post_id)
    #
    # # Increment shares_count on original post
    # await conn.execute("UPDATE posts SET shares_count = shares_count + 1 WHERE id=$1", post_id)
    #
    # # Return the new repost with the embedded original post
    # row = await conn.fetchrow("""
    #     SELECT p.*, u.username, u.avatar_url
    #     FROM posts p JOIN users u ON p.user_id = u.id
    #     WHERE p.id = $1
    # """, repost_id)
    #
    # original = await conn.fetchrow("""
    #     SELECT p.*, u.username, u.avatar_url
    #     FROM posts p JOIN users u ON p.user_id = u.id
    #     WHERE p.id = $1
    # """, post_id)
    #
    # result = dict(row)
    # result["shared_post"] = dict(original) if original else None
    # return result
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
    # # For posts with shared_post_id, include the full shared_post object
    # return [dict(row) for row in rows]
    return []


@router.post("/users/{target_user_id}/follow")
async def toggle_follow(target_user_id: str, req: FollowRequest):
    """Toggle follow/unfollow on a user."""
    # if req.user_id == target_user_id:
    #     raise HTTPException(400, "Cannot follow yourself")
    #
    # existing = await conn.fetchrow(
    #     "SELECT id FROM follows WHERE follower_id=$1 AND followed_id=$2",
    #     req.user_id, target_user_id
    # )
    # if existing:
    #     await conn.execute("DELETE FROM follows WHERE id=$1", existing['id'])
    #     await conn.execute("UPDATE users SET followers_count = followers_count - 1 WHERE id=$1", target_user_id)
    #     await conn.execute("UPDATE users SET following_count = following_count - 1 WHERE id=$1", req.user_id)
    #     following = False
    # else:
    #     await conn.execute(
    #         "INSERT INTO follows (follower_id, followed_id) VALUES ($1, $2)",
    #         req.user_id, target_user_id
    #     )
    #     await conn.execute("UPDATE users SET followers_count = followers_count + 1 WHERE id=$1", target_user_id)
    #     await conn.execute("UPDATE users SET following_count = following_count + 1 WHERE id=$1", req.user_id)
    #     following = True
    #
    # target = await conn.fetchrow("SELECT followers_count FROM users WHERE id=$1", target_user_id)
    # current = await conn.fetchrow("SELECT following_count FROM users WHERE id=$1", req.user_id)
    # return {
    #     "following": following,
    #     "followers_count": target['followers_count'],
    #     "following_count": current['following_count']
    # }
    return {"following": True, "followers_count": 1, "following_count": 1}


@router.get("/users/{target_user_id}/follow-status")
async def get_follow_status(target_user_id: str, user_id: str):
    """Check if current user follows target user."""
    # row = await conn.fetchrow(
    #     "SELECT id FROM follows WHERE follower_id=$1 AND followed_id=$2",
    #     user_id, target_user_id
    # )
    # return {"following": row is not None}
    return {"following": False}


@router.get("/users/{user_id}/followers")
async def get_followers(user_id: str):
    """Return list of users who follow this user."""
    # rows = await conn.fetch("""
    #     SELECT u.id, u.username, u.avatar_url
    #     FROM follows f JOIN users u ON f.follower_id = u.id
    #     WHERE f.followed_id = $1
    #     ORDER BY f.created_at DESC
    # """, user_id)
    # return [dict(row) for row in rows]
    return []


@router.get("/users/{user_id}/following")
async def get_following(user_id: str):
    """Return list of users this user follows."""
    # rows = await conn.fetch("""
    #     SELECT u.id, u.username, u.avatar_url
    #     FROM follows f JOIN users u ON f.followed_id = u.id
    #     WHERE f.follower_id = $1
    #     ORDER BY f.created_at DESC
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
// Feed & Posts (with pagination support)
apiClient.getFeed(type, userId?, page?, limit?)  // → GET /feed?type=...&user_id=...&page=1&limit=20
apiClient.getUserPosts(userId)                   // → GET /posts/user/{userId}
apiClient.createPost(data)                       // → POST /posts
apiClient.likePost(postId, uid)                  // → POST /posts/{id}/like
apiClient.commentOnPost(id, uid, content)        // → POST /posts/{id}/comments
apiClient.getComments(postId)                    // → GET /posts/{id}/comments
apiClient.sharePost(postId, uid, content?)       // → POST /posts/{id}/share (creates a repost)
apiClient.deletePost(postId)                     // → DELETE /posts/{id}

// Follow System
apiClient.toggleFollow(targetId, currentId)      // → POST /users/{id}/follow
apiClient.checkFollowing(targetId, currentId)    // → GET /users/{id}/follow-status?user_id=...
apiClient.getFollowers(userId)                   // → GET /users/{id}/followers
apiClient.getFollowing(userId)                   // → GET /users/{id}/following
```

### Frontend Features Already Implemented

| Feature | Description |
|---------|-------------|
| **Pagination** | `getFeed()` sends `page` and `limit` query params |
| **Infinite scroll** | Uses `IntersectionObserver` to load next page when user scrolls near bottom |
| **React Query caching** | `useInfiniteQuery` with 60s `staleTime` — tab switches feel instant |
| **Optimistic updates** | Likes, comments, shares, and deletes update UI immediately |
| **Error handling** | Error state with "Try Again" button |

Media upload is sent directly from the browser to `POST /posts/upload-media` (bypasses the Next.js proxy).

**Once the backend endpoints support pagination (`page` & `limit` params), the feed will be fully functional.**

---

## Summary Checklist

### Database
- [ ] Create `posts` table with columns: id, user_id, content, media_urls, shared_post_id (nullable FK → posts.id), likes_count, comments_count, shares_count, created_at, updated_at
- [ ] Create `post_likes` table with unique constraint on (post_id, user_id)
- [ ] Create `post_comments` table
- [ ] Create `follows` table with columns: id, follower_id (FK → users.id), followed_id (FK → users.id), created_at — unique constraint on (follower_id, followed_id)
- [ ] Add `followers_count` (default 0) and `following_count` (default 0) columns to `users` table

### Feed & Post Endpoints
- [ ] Add `GET /feed` endpoint → returns posts with user info, repost embeds, user_liked; supports `type` and `user_id` params
- [ ] Add `POST /posts` endpoint → creates post, returns full post object
- [ ] Add `POST /posts/{post_id}/like` endpoint → toggles like, returns `{liked: bool}`
- [ ] Add `POST /posts/{post_id}/comments` endpoint → adds comment, returns comment
- [ ] Add `GET /posts/{post_id}/comments` endpoint → returns comments for a post
- [ ] Add `POST /posts/{post_id}/share` endpoint → creates repost with embedded original, increments shares_count
- [ ] Add `DELETE /posts/{post_id}` endpoint → deletes post
- [ ] Add `POST /posts/upload-media` endpoint → uploads files, returns CDN URLs
- [ ] Add `GET /posts/user/{user_id}` endpoint → returns posts by a specific user (with repost embeds)

### Follow System Endpoints
- [ ] Add `POST /users/{user_id}/follow` endpoint → toggles follow, returns `{following, followers_count, following_count}`
- [ ] Add `GET /users/{user_id}/follow-status` endpoint → returns `{following: bool}` for given user_id query param
- [ ] Add `GET /users/{user_id}/followers` endpoint → returns list of follower users
- [ ] Add `GET /users/{user_id}/following` endpoint → returns list of followed users

### Deploy
- [ ] Deploy all changes to production
