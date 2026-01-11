# FastAPI WebSocket Handler for WebRTC Video Streaming
# Add this to your existing FastAPI WebSocket endpoint

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from typing import Dict, Set
import json

# Connection manager (you likely already have this)
class ConnectionManager:
    def __init__(self):
        # room_id -> set of (websocket, user_id, username)
        self.active_connections: Dict[str, Set[tuple]] = {}
        # user_id -> websocket (for direct messaging)
        self.user_sockets: Dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, room_id: str, user_id: str, username: str):
        await websocket.accept()
        
        if room_id not in self.active_connections:
            self.active_connections[room_id] = set()
        
        self.active_connections[room_id].add((websocket, user_id, username))
        self.user_sockets[user_id] = websocket
        
        print(f"✅ User {username} ({user_id}) connected to room {room_id}")
    
    def disconnect(self, websocket: WebSocket, room_id: str, user_id: str):
        if room_id in self.active_connections:
            # Remove user from room
            self.active_connections[room_id] = {
                conn for conn in self.active_connections[room_id] 
                if conn[0] != websocket
            }
            
            # Clean up empty rooms
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]
        
        # Remove from user sockets
        if user_id in self.user_sockets:
            del self.user_sockets[user_id]
        
        print(f"❌ User {user_id} disconnected from room {room_id}")
    
    async def broadcast_to_room(self, room_id: str, message: dict, exclude_user: str = None):
        """Send message to all users in a room (optionally exclude sender)"""
        if room_id not in self.active_connections:
            return
        
        for websocket, user_id, username in self.active_connections[room_id]:
            if exclude_user and user_id == exclude_user:
                continue
            
            try:
                await websocket.send_json(message)
            except Exception as e:
                print(f"Error sending to {user_id}: {e}")
    
    async def send_to_user(self, user_id: str, message: dict):
        """Send message to specific user"""
        if user_id in self.user_sockets:
            try:
                await self.user_sockets[user_id].send_json(message)
                print(f"📤 Sent to user {user_id}: {message.get('type')}")
            except Exception as e:
                print(f"Error sending to user {user_id}: {e}")

manager = ConnectionManager()

@app.websocket("/ws/{room_id}/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket, 
    room_id: str, 
    user_id: str,
    username: str = "Anonymous",
    avatar_url: str = ""
):
    # Connect user
    await manager.connect(websocket, room_id, user_id, username)
    
    # Notify room that user joined
    await manager.broadcast_to_room(room_id, {
        "type": "user_joined",
        "user_id": user_id,
        "username": username,
        "avatar_url": avatar_url
    }, exclude_user=user_id)
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            message_type = data.get("type")
            
            print(f"📥 Received {message_type} from {username}")
            
            # === CHAT MESSAGE ===
            if message_type == "message":
                # Broadcast chat message to all users in room
                await manager.broadcast_to_room(room_id, {
                    "type": "message",
                    "content": data.get("content"),
                    "user_id": user_id,
                    "username": username,
                    "avatar_url": avatar_url,
                    "timestamp": data.get("timestamp")
                })
            
            # === WEBRTC SIGNALING ===
            elif message_type == "webrtc-signal":
                # Forward WebRTC signal to specific user (peer-to-peer)
                target_user_id = data.get("target_user_id")
                
                if target_user_id:
                    await manager.send_to_user(target_user_id, {
                        "type": "webrtc-signal",
                        "from_user_id": user_id,
                        "from_username": username,
                        "signal": data.get("signal")
                    })
                    print(f"📡 Relayed WebRTC signal: {user_id} → {target_user_id}")
            
            # === BROADCAST STARTED ===
            elif message_type == "broadcast-started":
                # Notify all users that someone started streaming
                await manager.broadcast_to_room(room_id, {
                    "type": "broadcast-started",
                    "user_id": user_id,
                    "username": username
                }, exclude_user=user_id)
                print(f"📡 Broadcast started by {username}")
            
            # === BROADCAST STOPPED ===
            elif message_type == "broadcast-stopped":
                # Notify all users that broadcast ended
                await manager.broadcast_to_room(room_id, {
                    "type": "broadcast-stopped",
                    "user_id": user_id,
                    "username": username
                })
                print(f"🛑 Broadcast stopped by {username}")
            
            # === TYPING INDICATORS ===
            elif message_type == "typing_start" or message_type == "typing_stop":
                await manager.broadcast_to_room(room_id, {
                    "type": message_type,
                    "user_id": user_id,
                    "username": username
                }, exclude_user=user_id)
            
            # === UNKNOWN MESSAGE TYPE ===
            else:
                print(f"⚠️ Unknown message type: {message_type}")
    
    except WebSocketDisconnect:
        print(f"🔌 WebSocket disconnected: {username}")
    except Exception as e:
        print(f"❌ Error in WebSocket: {e}")
    finally:
        # Cleanup
        manager.disconnect(websocket, room_id, user_id)
        
        # Notify room that user left
        await manager.broadcast_to_room(room_id, {
            "type": "user_left",
            "user_id": user_id,
            "username": username
        })


# === OPTIONAL: Health check endpoint ===
@app.get("/ws/health")
async def websocket_health():
    active_rooms = len(manager.active_connections)
    total_users = len(manager.user_sockets)
    
    return {
        "status": "healthy",
        "active_rooms": active_rooms,
        "total_connected_users": total_users
    }
