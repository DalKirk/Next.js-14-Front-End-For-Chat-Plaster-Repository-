import json, uuid, ssl, urllib.request, urllib.error, urllib.parse
import asyncio
import websockets

import os
BASE_URL = os.environ.get("TEST_BASE_URL", "https://web-production-3ba7e.up.railway.app")
ORIGIN = os.environ.get("TEST_ORIGIN", "https://video-chat-frontend-ruby.vercel.app")

def post_json(path, payload):
    url = f"{BASE_URL}{path}"
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={
        'Content-Type': 'application/json',
        'Origin': ORIGIN,
        'User-Agent': 'Copilot-SmokeTest'
    })
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            txt = resp.read().decode('utf-8')
            return resp.status, txt
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8', errors='ignore')
    except Exception as e:
        return -1, str(e)

def get_text(path):
    url = f"{BASE_URL}{path}"
    req = urllib.request.Request(url, headers={'Origin': ORIGIN, 'User-Agent': 'Copilot-SmokeTest'})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return resp.status, resp.read().decode('utf-8')
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8', errors='ignore')
    except Exception as e:
        return -1, str(e)

async def ws_test(room_id, user_id, username, avatar_url):
    qs = f"?username={urllib.parse.quote(username)}&avatar_url={urllib.parse.quote(avatar_url)}"
    ws_url = f"wss://web-production-3ba7e.up.railway.app/ws/{room_id}/{user_id}{qs}"
    print("WS connect:", ws_url)
    ssl_ctx = ssl.create_default_context()
    try:
        async with websockets.connect(ws_url, ssl=ssl_ctx, ping_interval=30) as ws:
            await ws.send(json.dumps({"content": "Hello from smoke test"}))
            for i in range(3):
                try:
                    msg = await asyncio.wait_for(ws.recv(), timeout=5)
                    print(f"WS recv[{i}]:", msg)
                except asyncio.TimeoutError:
                    break
        return True
    except Exception as e:
        print("WS error:", e)
        return False

if __name__ == '__main__':
    username = f"ProdUser-{uuid.uuid4().hex[:6]}"
    status, txt = post_json('/users', { 'username': username })
    print('POST /users:', status, txt)
    user = json.loads(txt) if status == 200 else None
    if not user or 'id' not in user:
        raise SystemExit('Failed to create user')

    room_name = f"Room-{uuid.uuid4().hex[:6]}"
    status, txt = post_json('/rooms', { 'name': room_name })
    print('POST /rooms:', status, txt)
    room = json.loads(txt) if status == 200 else None
    if not room or 'id' not in room:
        raise SystemExit('Failed to create room')

    # Use UI Avatars for first-letter fallback to match frontend
    avatar_url = f"https://ui-avatars.com/api/?name={urllib.parse.quote(username)}&background=random"
    status, txt = post_json(f"/rooms/{room['id']}/join", {
        'user_id': user['id'],
        'username': username,
        'avatar_url': avatar_url,
    })
    print('POST /rooms/{id}/join:', status, txt)
    if status != 200:
        raise SystemExit('Join failed: ' + txt)

    ok = asyncio.get_event_loop().run_until_complete(ws_test(room['id'], user['id'], username, avatar_url))
    print('WS connected ok:', ok)

    status, txt = get_text(f"/rooms/{room['id']}/messages")
    print('GET /rooms/{id}/messages:', status, txt)
    print('\nSmoke test complete')
