# Backend Updates — December 31, 2025

This document outlines the current backend updates required to enable durable profile storage in Postgres and real-time broadcasts, plus a simple password update path.

## Overview
- Pluggable user storage: In-memory for local dev; Postgres when `DATABASE_URL` is set.
- Profile updates: `PUT /users/{user_id}/profile` writes to storage and broadcasts `profile_updated` to room clients.
- Password updates: `PUT /users/{user_id}/password` hashes off the event loop and stores the hash.
- Read profile: `GET /users/{user_id}` returns the stored profile for verification.
- CORS: Static CORS or optional dynamic middleware.

## Changes in the repo
- Added: `backend/storage.py` — storage abstraction with `InMemoryUserStore` and `PostgresUserStore` (asyncpg).
- Updated: `backend/server.py` — routes use storage and broadcast; added `GET /users/{id}`; startup initializes storage.
- Updated: `backend/requirements.txt` — includes `asyncpg`.

See:
- [backend/storage.py](backend/storage.py)
- [backend/server.py](backend/server.py)
- [backend/requirements.txt](backend/requirements.txt)

## Environment
- `DATABASE_URL` — enables Postgres persistence (e.g. `postgresql://USER:PASSWORD@HOST:5432/DBNAME`).
- Optional: `JWT_SECRET_KEY` if/when auth is used (not required for these routes).

## Dependencies
- FastAPI, Uvicorn, Pydantic, AsyncPG.
- Optional for stronger password hashing: `passlib[bcrypt]`. Current code will try `passlib` and fall back to SHA256 if not installed (not recommended for production). To enable bcrypt hashing, add to requirements:

```
passlib[bcrypt]==1.7.4
```

## Endpoints (current)
- `GET /` — health.
- `PUT /users/{user_id}/profile` — body accepts: `display_name`, `username`, `bio`, `email`, `avatar_url`, `avatar_urls`.
  - Persists to storage (Postgres if configured).
  - Broadcasts `profile_updated` on room WebSockets.
- `PUT /users/{user_id}/password` — body: `{ new_password: string }` (min length 8); stores `password_hash`.
- `GET /users/{user_id}` — returns `{ user_id, profile }` when using in-memory; DB-backed server returns row-like fields.

Note: Your Railway backend currently returns 405 for `PUT /users/{id}/password`, indicating it has not been deployed with these changes yet.

## Railway deployment
1. Ensure `DATABASE_URL` is set in Railway environment.
2. Install backend deps from `backend/requirements.txt`.
3. Start command should point to FastAPI app:

```bash
uvicorn backend.server:app --host 0.0.0.0 --port 8000
```

4. Healthcheck can target `/`.
5. CORS: If needed, add your frontend origin to `allow_origins` in `backend/server.py` (or use `DynamicCORSMiddleware` when available).

## Verify (PowerShell examples)

```powershell
$ErrorActionPreference = "Stop"
$env:BASE = "https://YOUR-RAILWAY-APP.up.railway.app"

# Create user (if your backend supports POST /users)
$user = Invoke-RestMethod -Uri "$env:BASE/users" -Method Post -ContentType "application/json" -Body (@{ username = "e2e_user_$(Get-Random)" } | ConvertTo-Json)
$userId = $user.id

# Update profile (persists + broadcasts)
Invoke-RestMethod -Uri "$env:BASE/users/$userId/profile" -Method Put -ContentType "application/json" -Body (@{
  display_name = "Alice";
  email = "alice@example.com";
  bio = "Hello";
  avatar_url = "https://ui-avatars.com/api/?name=Alice&background=random"
} | ConvertTo-Json)

# Read back from storage
Invoke-RestMethod -Uri "$env:BASE/users/$userId" -Method Get | ConvertTo-Json -Compress | Write-Output

# Update password (requires updated backend)
Invoke-RestMethod -Uri "$env:BASE/users/$userId/password" -Method Put -ContentType "application/json" -Body (@{ new_password = "Str0ngPassw0rd!" } | ConvertTo-Json)
```

## Notes
- If your deployed backend already includes additional user endpoints (e.g., `POST /users`, `/users/{id}/avatar`), these remain compatible. The new storage layer only affects profile/password routes.
- If `PUT /users/{id}/password` returns 405 on Railway, redeploy from this workspace to include the route.
- WebSocket broadcasts remain room-scoped: clients connected to a room receive `profile_updated` events instantly.

## Next steps
- Deploy the updated backend to Railway (ensuring it references `backend/server.py`).
- Optionally add `passlib[bcrypt]` for production-grade password hashing.
- Confirm CORS origins include your frontend deployment URL.
- Test from two devices: edit profile and verify real-time updates in a joined room.
