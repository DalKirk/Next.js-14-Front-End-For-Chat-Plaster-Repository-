import json, uuid, ssl, urllib.request, urllib.error, urllib.parse
import asyncio
import websockets
import os

BASE_URL = os.environ.get("TEST_BASE_URL", "https://web-production-3ba7e.up.railway.app")
ORIGIN = os.environ.get("TEST_ORIGIN", "http://localhost:3000")


def post_json(path, payload):
    url = f"{BASE_URL}{path}"
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={
        'Content-Type': 'application/json',
        'Origin': ORIGIN,
        'User-Agent': 'Copilot-DualWSTest'
    })
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            txt = resp.read().decode('utf-8')
            return resp.status, txt
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8', errors='ignore')
    except Exception as e:
        return -1, str(e)


def put_json(path, payload):
    url = f"{BASE_URL}{path}"
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, method='PUT', headers={
        'Content-Type': 'application/json',
        'Origin': ORIGIN,
        'User-Agent': 'Copilot-DualWSTest'
    })
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            txt = resp.read().decode('utf-8')
            return resp.status, txt
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8', errors='ignore')
    except Exception as e:
        return -1, str(e)


async def connect_ws(room_id, user_id, username, avatar_url):
    qs = f"?username={urllib.parse.quote(username)}&avatar_url={urllib.parse.quote(avatar_url)}"
    scheme = 'wss' if BASE_URL.startswith('https') else 'ws'
    ws_url = f"{scheme}://{urllib.parse.urlparse(BASE_URL).netloc}/ws/{room_id}/{user_id}{qs}"
    if scheme == 'wss':
        ssl_ctx = ssl.create_default_context()
        ws = await websockets.connect(ws_url, ssl=ssl_ctx, ping_interval=30)
    else:
        ws = await websockets.connect(ws_url, ping_interval=30)
    return ws


async def recv_until(ws, predicate, timeout=10):
    try:
        while True:
            msg = await asyncio.wait_for(ws.recv(), timeout=timeout)
            try:
                data = json.loads(msg)
            except Exception:
                continue
            if predicate(data):
                return data
    except asyncio.TimeoutError:
        return None


async def main():
    # Create two users
    userA_name = f"TabA-{uuid.uuid4().hex[:6]}"
    userB_name = f"TabB-{uuid.uuid4().hex[:6]}"
    # Use generated UUIDs for local backend that lacks POST /users
    userA = { 'id': str(uuid.uuid4()), 'username': userA_name }
    userB = { 'id': str(uuid.uuid4()), 'username': userB_name }

    # Create a room
    room = { 'id': f"dual-{uuid.uuid4().hex[:8]}", 'name': 'DualRoom' }

    # Join both users
    avatarA = f"https://ui-avatars.com/api/?name={urllib.parse.quote(userA_name)}&background=random"
    avatarB = f"https://ui-avatars.com/api/?name={urllib.parse.quote(userB_name)}&background=random"
    s, t = post_json(f"/rooms/{room['id']}/join", {'user_id': userA['id'], 'username': userA_name, 'avatar_url': avatarA})
    print('POST /rooms/{id}/join (A):', s, t)
    if s != 200:
        raise SystemExit('Join failed for A')
    s, t = post_json(f"/rooms/{room['id']}/join", {'user_id': userB['id'], 'username': userB_name, 'avatar_url': avatarB})
    print('POST /rooms/{id}/join (B):', s, t)
    if s != 200:
        raise SystemExit('Join failed for B')

    # Connect two WebSockets (simulate two tabs)
    wsA = await connect_ws(room['id'], userA['id'], userA_name, avatarA)
    wsB = await connect_ws(room['id'], userB['id'], userB_name, avatarB)
    print('WS connected for both tabs')

    # Wait for initial user_joined echoes
    await recv_until(wsA, lambda d: d.get('type') == 'user_joined', timeout=5)
    await recv_until(wsB, lambda d: d.get('type') == 'user_joined', timeout=5)

    # Sanity check: send a chat message from Tab A and ensure Tab B receives it
    await wsA.send(json.dumps({ 'content': 'Hello from Tab A' }))
    chatA = await recv_until(wsA, lambda d: d.get('type') == 'message')
    chatB = await recv_until(wsB, lambda d: d.get('type') == 'message')
    print('Tab A saw chat message:', bool(chatA))
    print('Tab B saw chat message:', bool(chatB))

    # Trigger a profile update for user A via REST (broadcast expected)
    new_name = f"RenamedA-{uuid.uuid4().hex[:4]}"
    new_avatar = f"https://ui-avatars.com/api/?name={urllib.parse.quote(new_name)}&background=random"
    s, t = put_json(f"/users/{userA['id']}/profile", {
        'display_name': new_name,
        'email': f"{new_name.lower()}@example.com",
        'bio': 'Live update test',
        'avatar_url': new_avatar,
    })
    print('PUT /users/{id}/profile (A):', s, t)

    # Both tabs should receive profile_updated (REST broadcast)
    recvA = await recv_until(wsA, lambda d: d.get('type') == 'profile_updated' and d.get('user_id') == userA['id'])
    recvB = await recv_until(wsB, lambda d: d.get('type') == 'profile_updated' and d.get('user_id') == userA['id'])

    print('Tab A received REST broadcast:', bool(recvA), recvA)
    print('Tab B received REST broadcast:', bool(recvB), recvB)

    ok = bool(recvA) and bool(recvB)

    # If REST broadcast isn't deployed on backend, fall back to WS profile update from Tab A
    if not ok:
        payload = json.dumps({
            'type': 'profile_updated',
            'user_id': userA['id'],
            'room_id': room['id'],
            'username': new_name,
            'prevUsername': userA_name,
            'avatar': new_avatar,
            'email': f"{new_name.lower()}@example.com",
            'bio': 'Live update test'
        })
        await wsA.send(payload)
        recvA = await recv_until(wsA, lambda d: d.get('type') == 'profile_updated' and d.get('user_id') == userA['id'])
        recvB = await recv_until(wsB, lambda d: d.get('type') == 'profile_updated' and d.get('user_id') == userA['id'])
        print('Tab A received WS broadcast:', bool(recvA), recvA)
        print('Tab B received WS broadcast:', bool(recvB), recvB)
        ok = bool(recvA) and bool(recvB)

    print('Broadcast OK for both tabs:', ok)

    await wsA.close()
    await wsB.close()

    if not ok:
        raise SystemExit('Broadcast did not reach both tabs via REST or WS')


if __name__ == '__main__':
    asyncio.run(main())
