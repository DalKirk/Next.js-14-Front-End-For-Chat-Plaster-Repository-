# Backend Change Required: Edit Post Endpoint

> **Scope**: Add a `PATCH /posts/{post_id}` endpoint to allow users to edit their own posts' text content.

---

## New Endpoint

### `PATCH /posts/{post_id}`

Allows the post author to update the text content of an existing post.

**Request Body (JSON):**
```json
{
  "content": "Updated post text here"
}
```

**Headers:**
| Header | Description |
|--------|-------------|
| `Authorization` | Bearer token or session cookie |

**Validation:**
- The `post_id` must exist in the `posts` table.
- The requesting user (`user_id` from auth) must be the owner of the post (`posts.user_id`).
- `content` must be a non-empty string (trim whitespace).

**SQL:**
```sql
UPDATE posts
SET content = :content, updated_at = NOW()
WHERE id = :post_id AND user_id = :user_id
RETURNING *;
```

**Success Response (200):**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "content": "Updated post text",
  "media_urls": ["..."],
  "likes_count": 0,
  "comments_count": 0,
  "shares_count": 0,
  "shared_post_id": null,
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:01:00Z"
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 404 | Post not found |
| 403 | User is not the post author |
| 400 | Content is empty after trimming |

---

## FastAPI Implementation (skeleton)

```python
from pydantic import BaseModel

class EditPostRequest(BaseModel):
    content: str

@router.patch("/posts/{post_id}")
async def edit_post(post_id: str, body: EditPostRequest, user_id: str = Depends(get_current_user)):
    content = body.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Content cannot be empty")

    async with pool.acquire() as conn:
        post = await conn.fetchrow("SELECT * FROM posts WHERE id=$1", post_id)
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")
        if str(post["user_id"]) != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to edit this post")

        updated = await conn.fetchrow(
            "UPDATE posts SET content=$1, updated_at=NOW() WHERE id=$2 RETURNING *",
            content, post_id
        )
        return dict(updated)
```

---

## Frontend Already Done

The frontend already calls `PATCH /posts/{postId}` with `{ content }` body from:
- `lib/api.ts` → `editPost(postId, content)`
- `app/feed/page.tsx` → `handleEdit` with optimistic cache update
- `app/profile/page.tsx` → `handlePostEdit` with optimistic state update
- `components/feed/PostCard.tsx` → inline edit UI with Save/Cancel buttons

No frontend changes needed once the backend endpoint is deployed.
