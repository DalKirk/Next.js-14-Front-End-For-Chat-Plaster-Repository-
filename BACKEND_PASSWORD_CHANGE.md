# Backend: Password Change Endpoint

## Required Endpoint

```
PUT /users/{user_id}/password
```

## Request Body

```json
{
  "new_password": "string (min 8 characters)"
}
```

## Expected Response

**Success (200):**
```json
{
  "success": true
}
```

**Validation Error (422):**
```json
{
  "detail": "Password must be at least 8 characters"
}
```

**User Not Found (404):**
```json
{
  "detail": "User not found"
}
```

## Implementation

### Route Handler (FastAPI)

```python
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class PasswordUpdate(BaseModel):
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

@router.put("/users/{user_id}/password")
async def update_password(
    user_id: str,
    payload: PasswordUpdate,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = pwd_context.hash(payload.new_password)
    db.commit()

    return {"success": True}
```

### Database Requirement

The `users` table needs a `password_hash` column:

```sql
-- Check if it exists
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'password_hash';

-- Add if missing
ALTER TABLE users ADD COLUMN password_hash TEXT;
```

### Dependencies

If not already installed:

```bash
pip install passlib[bcrypt]
# or
pip install bcrypt
```

## Security Notes

- **Never store plaintext passwords** — always hash with bcrypt (or argon2)
- The frontend sends `new_password` over HTTPS — the backend must hash it before storing
- The frontend already validates minimum 8 characters and matching confirmation — but the backend should also validate independently
- Consider adding rate limiting to prevent brute-force password resets
- Optional: require the current password before allowing a change (add `current_password` field and verify it against the existing hash before updating)

## Frontend Already Handles

The frontend (`app/profile/page.tsx`) already has:
- Two password inputs (new + confirm) in the profile edit panel
- Client-side validation: minimum 8 characters, passwords must match
- Calls `PUT /users/{userId}/password` with `{ new_password }` body
- Handles 405 response (endpoint not available) gracefully
- Shows success/error toasts
- Clears inputs on success
- Loading state with spinner during the request

## Optional Enhancement: Require Current Password

If you want to verify the user knows their current password before changing:

### Updated Request Body

```json
{
  "current_password": "string",
  "new_password": "string (min 8 characters)"
}
```

### Updated Handler

```python
class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str

@router.put("/users/{user_id}/password")
async def update_password(user_id: str, payload: PasswordUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not pwd_context.verify(payload.current_password, user.password_hash):
        raise HTTPException(status_code=403, detail="Current password is incorrect")

    user.password_hash = pwd_context.hash(payload.new_password)
    db.commit()
    return {"success": True}
```

If you add this, let me know and I'll update the frontend to include a "Current password" input field.
