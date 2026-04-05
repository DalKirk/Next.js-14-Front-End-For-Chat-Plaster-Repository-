# Backend: Username Propagation on Profile Update

## Problem

When a user changes their display name/username on the frontend, the `PUT /users/{userId}/profile` endpoint updates the **users table** only. If the `posts` and `comments` tables store a denormalized `username` column (copied at creation time), old posts and comments will forever display the stale username.

## Current Frontend Behavior

1. **`POST /posts`** sends `{ user_id, content, media_urls }` — no username
2. **`POST /posts/{postId}/comments`** sends `{ user_id, content }` — no username
3. **`PUT /users/{userId}/profile`** sends `{ username, display_name, ... }` — updates users table only
4. **`GET /feed`** returns posts with `username` field — source of this field determines whether the bug exists

## What Needs to Happen

When a user's `username` or `display_name` is updated via `PUT /users/{userId}/profile`, **all existing posts and comments by that user must also be updated**.

### Option A: Denormalized (username stored on posts/comments rows)

If your schema looks like this:

```sql
-- posts table has a username column
CREATE TABLE posts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  username TEXT,       -- ← denormalized, copied at creation
  content TEXT,
  ...
);

-- comments table has a username column
CREATE TABLE comments (
  id UUID PRIMARY KEY,
  post_id UUID REFERENCES posts(id),
  user_id UUID REFERENCES users(id),
  username TEXT,       -- ← denormalized, copied at creation
  content TEXT,
  ...
);
```

**Add this to the profile update handler** (inside the `PUT /users/{userId}/profile` endpoint, after updating the users table):

```sql
UPDATE posts SET username = :new_username WHERE user_id = :user_id;
UPDATE comments SET username = :new_username WHERE user_id = :user_id;
```

**Python (SQLAlchemy) example:**

```python
@router.put("/users/{user_id}/profile")
async def update_profile(user_id: str, payload: ProfileUpdate, db: Session = Depends(get_db)):
    # ... existing user update logic ...

    # Propagate username to posts and comments
    if payload.username:
        db.execute(
            text("UPDATE posts SET username = :name WHERE user_id = :uid"),
            {"name": payload.username, "uid": user_id}
        )
        db.execute(
            text("UPDATE comments SET username = :name WHERE user_id = :uid"),
            {"name": payload.username, "uid": user_id}
        )
        db.commit()

    return {"success": True}
```

### Option B: Normalized (JOIN at query time)

If your `/feed` and `/posts/{id}/comments` endpoints already JOIN on the `users` table to get the username:

```sql
SELECT p.*, u.username, u.avatar_url
FROM posts p
JOIN users u ON p.user_id = u.id
ORDER BY p.created_at DESC;
```

**No changes needed.** Updating the users table is sufficient — all queries will automatically return the new username.

## How to Check Which Approach You Use

Run this query on your database:

```sql
-- Check if posts table has a username column
SELECT column_name FROM information_schema.columns
WHERE table_name = 'posts' AND column_name = 'username';

-- Check if comments table has a username column
SELECT column_name FROM information_schema.columns
WHERE table_name = 'comments' AND column_name = 'username';
```

- **If rows are returned** → You have denormalized usernames → Use **Option A**
- **If no rows** → Usernames come from JOINs → Already working, no backend change needed

## Also Update: Shared Posts

If you have a `shared_posts` or the shared post embed stores a username:

```sql
UPDATE posts SET username = :new_username WHERE user_id = :user_id;
-- If shared_post data is stored as JSON, you may need application-level logic
```

## Frontend Already Handles

The frontend already:
- Updates `localStorage['chat-user']` with the new username
- Dispatches a `profile-updated` event so the feed page re-reads the current user
- Invalidates the React Query feed cache to refetch posts with fresh data
- Runs `updateUsernameEverywhere()` to patch cached chat messages in localStorage
