# Backend Changes and Frontend Integration (Current State)

This guide consolidates what’s running on Railway, what’s available in this repo, and the minimal steps to get durable profile updates, multi-size avatars, and real-time sync working reliably.

## Overview
- Two backends exist:
  - Legacy app (main.py) — currently active on Railway per startup logs.
  - Modular app (backend/server.py) — simpler FastAPI with pluggable storage and room WS broadcasts.
- Storage:
  - Postgres via `DATABASE_URL` (asyncpg) when available.
  - In-memory fallback for local/dev.

## What’s Running on Railway (from your logs)
- Service starts `main.py` and connects to Postgres; health at `/health` returns 200.
- AI client and avatar routes appear initialized; conversations persist in DB.
- Password route in modular backend (`PUT /users/{id}/password`) is not yet deployed on Railway (405 observed).

## Current Repo Changes (modular backend)
- Pluggable storage: [backend/storage.py](backend/storage.py)
- Routes + broadcasts: [backend/server.py](backend/server.py)
  - `PUT /users/{id}/profile` persists to storage and emits `profile_updated` to room WS clients.
  - `GET /users/{id}` returns stored profile (DB-backed or in-memory).
  - `PUT /users/{id}/password` hashes off the event loop and stores hash (requires deploy to be available remotely).
- Dependencies: [backend/requirements.txt](backend/requirements.txt) includes `asyncpg`.

## Endpoint Summary
- Legacy (Railway active):
  - Health: `GET /health`
  - Users: `POST /users`, `GET /users/{id}`, `PUT /users/{id}/profile`
  - Avatars: likely `POST /avatars/upload/{user_id}` (and/or alias `PUT /users/{id}/avatar`)
  - WS: `/ws/{room_id}/{user_id}`
- Modular (repo):
  - Health: `GET /` (and optionally add `/health`)
  - Users: `POST /users` (optional), `GET /users/{id}`, `PUT /users/{id}/profile`, `PUT /users/{id}/password`
  - WS: `/ws/{room_id}/{user_id}` with `profile_updated` broadcasts

## Minimal Backend Actions
- Postgres: Keep `DATABASE_URL` set — modular backend auto-creates a `users` table.
- Deploy choice:
  - Stay on legacy (`main.py`) — profile + avatars work now; password change stays as-is.
  - Switch to modular (`backend.server:app`) — enables simple password route and explicit WS `profile_updated` broadcasts.
- CORS: Ensure your frontend origin is allowed in `backend/server.py` (or use dynamic CORS if present).

## Switch to Modular Backend (Railway)
- Update Start Command or env var:
  - `APP_MODULE=backend.server:app` (if your Docker/Procfile supports it), or start: `uvicorn backend.server:app --host 0.0.0.0 --port 8000`
- Ensure `DATABASE_URL` is present; redeploy.
- Healthcheck: point to `/` or add `/health` if preferred.

## Verify (PowerShell)
```powershell
$ErrorActionPreference = "Stop"
$env:BASE = "https://YOUR-RAILWAY-APP.up.railway.app"

# Create user (if supported)
$user = Invoke-RestMethod -Uri "$env:BASE/users" -Method Post -ContentType "application/json" -Body (@{ username = "e2e_user_$(Get-Random)" } | ConvertTo-Json)
$userId = $user.id

# Update profile (persists + room WS broadcast on modular)
Invoke-RestMethod -Uri "$env:BASE/users/$userId/profile" -Method Put -ContentType "application/json" -Body (@{
  display_name = "Alice";
  email = "alice@example.com";
  bio = "Hello";
  avatar_url = "https://ui-avatars.com/api/?name=Alice&background=random"
} | ConvertTo-Json)

# Read back from storage
Invoke-RestMethod -Uri "$env:BASE/users/$userId" -Method Get | ConvertTo-Json -Compress | Write-Output

# Password (requires modular backend deployed)
Invoke-RestMethod -Uri "$env:BASE/users/$userId/password" -Method Put -ContentType "application/json" -Body (@{ new_password = "Str0ngPassw0rd!" } | ConvertTo-Json)
```

## Frontend Integration Notes
- On `GET /users/{id}` 404: call `POST /users` with `{ username }` and cache returned `id`.
- Avatar upload: send multipart with sizes `thumbnail`, `small`, `medium`, `large`; persist returned `avatar_urls` and include on future profile updates.
- Profile save: call `PUT /users/{id}/profile` (already wired in `app/profile/page.tsx`).
- Real-time: when using modular backend, listen for `profile_updated` on room WS and refresh UI.

## Optional Security Hardening
- Add `passlib[bcrypt]` to requirements for production-grade password hashing.
- Consider JWT auth routes for protected operations.

## Next Steps
- Decide whether to remain on legacy or switch to modular.
- If switching, redeploy with `backend.server:app` and re-test password updates.
- Confirm CORS settings include your frontend domain.
- Validate from two devices: edit profile and observe instant updates in a joined room.
