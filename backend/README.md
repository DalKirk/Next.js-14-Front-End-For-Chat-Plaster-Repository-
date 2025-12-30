# FastAPI Backend (Local Dev)

Implements minimal endpoints required by the frontend:

- `POST /rooms/{room_id}/join` — registers user with `username` and `avatar_url`
- `POST /rooms/{room_id}/messages` — stores message including avatar and broadcasts via WebSocket
- `GET /rooms/{room_id}/messages` — returns messages with avatars
- `WS /ws/{room_id}/{user_id}` — accepts connections, auto-registers users, supports typing and keep-alive, broadcasts messages

## Quick Start

1. Create a Python venv (recommended):

```powershell
python -m venv .venv
. .venv/Scripts/Activate.ps1
pip install -r backend/requirements.txt
```

2. Run the server:

```powershell
python -m uvicorn backend.server:app --host 0.0.0.0 --port 8000 --reload
```

3. Configure the frontend to point to the local backend by creating `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

4. Start the frontend dev server:

```powershell
npm run dev
```

## Notes

- This backend uses in-memory storage. Restarting will clear rooms/users/messages.
- For production, replace in-memory dicts with Redis/DB per `CHAT_ISSUES_FIX.md` guidance.
- CORS is configured to allow `http://localhost:3000` and the Vercel deploy domains listed.
