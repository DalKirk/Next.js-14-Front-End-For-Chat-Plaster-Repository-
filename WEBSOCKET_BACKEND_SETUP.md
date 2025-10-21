# WebSocket Backend Setup Required

## 🚨 Current Issue
Your frontend is trying to connect to WebSocket for real-time messaging, but your backend doesn't have WebSocket support implemented yet.

## Error Details
```
WebSocket connection to 'wss://web-production-3ba7e.up.railway.app/ws/{roomId}/{userId}' failed
Error code: 1006 (Connection closed abnormally)
```

## What's Needed
Your Railway backend at `https://web-production-3ba7e.up.railway.app` needs to implement a WebSocket server.

### Required Endpoint
```
wss://web-production-3ba7e.up.railway.app/ws/{roomId}/{userId}
```

### Expected Behavior
1. **Connection**: Accept WebSocket connections at `/ws/{roomId}/{userId}`
2. **Authentication**: Validate that the user and room exist
3. **Broadcasting**: Broadcast messages to all users in the same room
4. **Message Format**: 
```json
{
  "type": "message",
  "id": "message-uuid",
  "user_id": "user-uuid",
  "username": "John Doe",
  "content": "Hello!",
  "timestamp": "2025-10-21T12:00:00Z",
  "room_id": "room-uuid"
}
```

## Backend Implementation Examples

### Python (FastAPI + WebSockets)
```python
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from typing import Dict, Set
import json

app = FastAPI()

# Store active connections per room
active_connections: Dict[str, Set[WebSocket]] = {}

@app.websocket("/ws/{room_id}/{user_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, user_id: str):
    await websocket.accept()
    
    # Add connection to room
    if room_id not in active_connections:
        active_connections[room_id] = set()
    active_connections[room_id].add(websocket)
    
    try:
        while True:
            # Receive message
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            # Broadcast to all users in room
            for connection in active_connections[room_id]:
                await connection.send_text(json.dumps({
                    "type": "message",
                    "content": message_data["content"],
                    "user_id": user_id,
                    "room_id": room_id,
                    "timestamp": datetime.now().isoformat()
                }))
    except WebSocketDisconnect:
        active_connections[room_id].remove(websocket)
```

### Node.js (Express + ws)
```javascript
const WebSocket = require('ws');
const express = require('express');
const app = express();

const server = app.listen(3000);
const wss = new WebSocket.Server({ server });

const rooms = new Map();

wss.on('connection', (ws, req) => {
  const [_, roomId, userId] = req.url.split('/').slice(-2);
  
  // Add to room
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
  }
  rooms.get(roomId).add(ws);
  
  ws.on('message', (data) => {
    const message = JSON.parse(data);
    
    // Broadcast to room
    rooms.get(roomId).forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'message',
          content: message.content,
          user_id: userId,
          room_id: roomId,
          timestamp: new Date().toISOString()
        }));
      }
    });
  });
  
  ws.on('close', () => {
    rooms.get(roomId).delete(ws);
  });
});
```

## Alternative: Polling Fallback (Temporary Solution)
If you can't implement WebSocket immediately, the frontend could poll for new messages:

### REST API Endpoint Needed
```
GET /rooms/{roomId}/messages?since={timestamp}
```

Returns messages created after the given timestamp.

### Frontend Modification
Add polling in `app/room/[id]/page.tsx`:
```typescript
useEffect(() => {
  if (!wsConnected) {
    // Poll for messages every 3 seconds
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }
}, [wsConnected]);
```

## Testing WebSocket
Test if your WebSocket endpoint works:
```bash
# Using wscat (npm install -g wscat)
wscat -c wss://web-production-3ba7e.up.railway.app/ws/test-room/test-user
```

## Current Frontend Configuration
- WebSocket URL: `wss://web-production-3ba7e.up.railway.app/ws/{roomId}/{userId}`
- Auto-reconnect: Yes (10 attempts with exponential backoff)
- Keep-alive: Every 10 seconds

## Next Steps
1. ✅ Implement WebSocket endpoint on your Railway backend
2. ✅ Test connection using wscat or similar tool
3. ✅ Verify message broadcasting works
4. ✅ Deploy to Railway
5. ✅ Test from frontend

## Additional Resources
- [FastAPI WebSockets](https://fastapi.tiangolo.com/advanced/websockets/)
- [Node.js WebSocket (ws)](https://github.com/websockets/ws)
- [Railway WebSocket Docs](https://docs.railway.app/guides/websockets)
