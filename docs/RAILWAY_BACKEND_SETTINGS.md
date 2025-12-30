# Railway Backend Settings for Chat Reliability

## Required Environment Variables

- ALLOW_JOIN_AUTO_ROOMS: true
- ALLOW_JOIN_AUTO_USERS: true
- ALLOW_WEBSOCKET_AUTO_ROOMS: true
- CORS_ORIGINS: https://your-vercel-domain, http://localhost:3000
- CORS_ALLOW_CREDENTIALS: true

Notes:
- Ensure your exact Vercel domain is included in CORS_ORIGINS.
- If using regex, set CORS_ORIGIN_REGEX to match both local and Vercel.

## Deployment Steps

1. Update variables in Railway → Project → Variables.
2. Redeploy service to apply changes.
3. Verify health at /health and /_debug.

## Verification Commands

Create user:

```bash
curl -X POST "https://<railway-host>/users" \
  -H "Content-Type: application/json" \
  -d '{"username":"Ada Lovelace"}'
```

Create room:

```bash
curl -X POST "https://<railway-host>/rooms" \
  -H "Content-Type: application/json" \
  -d '{"name":"My Room"}'
```

Join room (persist avatar):

```bash
curl -X POST "https://<railway-host>/rooms/<room_id>/join" \
  -H "Content-Type: application/json" \
  -H "Origin: https://your-vercel-domain" \
  -d '{"user_id":"<user_id>","username":"Ada Lovelace","avatar_url":"https://i.pravatar.cc/150?img=9"}'
```

Connect WebSocket (with name + avatar):

```bash
npx wscat -H "Origin: https://your-vercel-domain" \
  -c "wss://<railway-host>/ws/<room_id>/<user_id>?username=Ada%20Lovelace&avatar_url=https%3A%2F%2Fi.pravatar.cc%2F150%3Fimg%3D9"
```

Fetch messages (should include avatar_url):

```bash
curl -H "Origin: https://your-vercel-domain" "https://<railway-host>/rooms/<room_id>/messages"
```

## Expected Logs

- No 403 for WebSocket connects
- Join logs with provided username and avatar_url
- Messages persisted with avatar_url returned by /rooms/{id}/messages
