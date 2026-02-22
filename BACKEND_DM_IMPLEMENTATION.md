# Backend Changes Required: Direct Messages (DMs)

> **Scope**: Implement direct messaging between users
>
> **Endpoints affected**: New endpoints for DM functionality

---

## Overview

The frontend now supports:
1. **Viewing conversations** - List of users the current user has messaged
2. **Sending direct messages** - One-on-one private messages
3. **Unread notifications** - Badge showing unread message count
4. **Real-time updates** - Messages appear instantly (via polling or WebSocket)

---

## 1. Database Schema

### SQL (PostgreSQL)

```sql
-- Conversations table (tracks who has talked to whom)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Conversation participants (many-to-many)
CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (conversation_id, user_id)
);

-- Direct messages table
CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_dm_conversation ON direct_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_dm_receiver ON direct_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_dm_created ON direct_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_participants ON conversation_participants(user_id);
```

### MongoDB

```javascript
// conversations collection
{
  _id: ObjectId,
  participants: [userId1, userId2],
  created_at: ISODate,
  last_message_at: ISODate
}

// direct_messages collection
{
  _id: ObjectId,
  conversation_id: ObjectId,
  sender_id: String,
  receiver_id: String,
  content: String,
  read: Boolean,
  created_at: ISODate
}
```

---

## 2. API Endpoints

### GET /users/{user_id}/conversations

Get all conversations for a user with contact info and unread counts.

**Response:**
```json
{
  "conversations": [
    {
      "id": "conv-uuid",
      "participants": ["user-1", "user-2"],
      "lastMessage": {
        "id": "msg-uuid",
        "content": "Hey there!",
        "timestamp": "2026-02-21T10:00:00Z",
        "sender_id": "user-2"
      },
      "unreadCount": 3
    }
  ],
  "contacts": [
    {
      "id": "user-2",
      "username": "john_doe",
      "avatar_url": "https://...",
      "avatar_urls": { "thumbnail": "...", "small": "...", "medium": "...", "large": "..." },
      "status": "online",
      "lastSeen": "2h ago",
      "unread": 3
    }
  ]
}
```

### GET /conversations/{conversation_id}/messages

Get messages for a specific conversation.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | integer | 50 | Max messages to return |
| `before` | string | (none) | Cursor for pagination |

**Response:**
```json
[
  {
    "id": "msg-uuid",
    "conversation_id": "conv-uuid",
    "sender_id": "user-1",
    "receiver_id": "user-2",
    "content": "Hello!",
    "read": true,
    "timestamp": "2026-02-21T10:00:00Z"
  }
]
```

### POST /messages/direct

Send a direct message.

**Request Body:**
```json
{
  "sender_id": "user-1",
  "receiver_id": "user-2",
  "content": "Hey, how are you?"
}
```

**Response:**
```json
{
  "id": "msg-uuid",
  "conversation_id": "conv-uuid",
  "sender_id": "user-1",
  "receiver_id": "user-2",
  "content": "Hey, how are you?",
  "read": false,
  "timestamp": "2026-02-21T10:00:00Z"
}
```

### POST /conversations/{conversation_id}/read

Mark all messages in a conversation as read.

**Request Body:**
```json
{
  "user_id": "user-1"
}
```

**Response:**
```json
{
  "success": true,
  "marked_count": 5
}
```

### GET /users/{user_id}/unread-count

Get total unread message count for notification badge.

**Response:**
```json
{
  "count": 7
}
```

### DELETE /messages/{message_id}

Delete a single direct message.

**Request Body:**
```json
{
  "user_id": "user-1"
}
```

**Response:**
```json
{
  "success": true,
  "deleted": true
}
```

### DELETE /conversations/{conversation_id}

Delete an entire conversation and all its messages.

**Request Body:**
```json
{
  "user_id": "user-1"
}
```

**Response:**
```json
{
  "success": true,
  "messages_deleted": 15
}
```

---

## 3. Implementation (FastAPI)

```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import uuid
from datetime import datetime

router = APIRouter()

class SendMessageRequest(BaseModel):
    sender_id: str
    receiver_id: str
    content: str

class MarkReadRequest(BaseModel):
    user_id: str

@router.get("/users/{user_id}/conversations")
async def get_conversations(user_id: str):
    """Get all conversations for a user."""
    # Find all conversations where user is a participant
    conversations = await db.conversation_participants.find(
        {"user_id": user_id}
    ).to_list(length=100)
    
    result = {
        "conversations": [],
        "contacts": []
    }
    
    for conv in conversations:
        conv_id = conv["conversation_id"]
        
        # Get conversation details
        conv_data = await db.conversations.find_one({"_id": conv_id})
        
        # Get last message
        last_msg = await db.direct_messages.find_one(
            {"conversation_id": conv_id},
            sort=[("created_at", -1)]
        )
        
        # Get unread count for this user
        unread = await db.direct_messages.count_documents({
            "conversation_id": conv_id,
            "receiver_id": user_id,
            "read": False
        })
        
        # Get other participant's info
        other_user_id = next(p for p in conv_data["participants"] if p != user_id)
        other_user = await db.users.find_one({"id": other_user_id})
        
        result["conversations"].append({
            "id": str(conv_id),
            "participants": conv_data["participants"],
            "lastMessage": last_msg,
            "unreadCount": unread
        })
        
        result["contacts"].append({
            "id": other_user_id,
            "username": other_user.get("username", "Unknown"),
            "avatar_url": other_user.get("avatar_url"),
            "avatar_urls": other_user.get("avatar_urls"),
            "status": "offline",  # Could implement presence tracking
            "lastSeen": "recently",
            "unread": unread
        })
    
    return result

@router.get("/conversations/{conversation_id}/messages")
async def get_messages(conversation_id: str, limit: int = 50, before: Optional[str] = None):
    """Get messages for a conversation."""
    query = {"conversation_id": conversation_id}
    
    if before:
        query["created_at"] = {"$lt": before}
    
    messages = await db.direct_messages.find(query).sort(
        "created_at", 1
    ).limit(limit).to_list(length=limit)
    
    return [
        {
            "id": str(m["_id"]),
            "conversation_id": m["conversation_id"],
            "sender_id": m["sender_id"],
            "receiver_id": m["receiver_id"],
            "content": m["content"],
            "read": m.get("read", False),
            "timestamp": m["created_at"].isoformat() + "Z"
        }
        for m in messages
    ]

@router.post("/messages/direct")
async def send_direct_message(req: SendMessageRequest):
    """Send a direct message."""
    if not req.content.strip():
        raise HTTPException(400, "Message content cannot be empty")
    
    # Find or create conversation
    conversation = await db.conversations.find_one({
        "participants": {"$all": [req.sender_id, req.receiver_id]}
    })
    
    if not conversation:
        # Create new conversation
        conv_id = str(uuid.uuid4())
        conversation = {
            "_id": conv_id,
            "participants": [req.sender_id, req.receiver_id],
            "created_at": datetime.utcnow()
        }
        await db.conversations.insert_one(conversation)
        
        # Add participants
        await db.conversation_participants.insert_many([
            {"conversation_id": conv_id, "user_id": req.sender_id},
            {"conversation_id": conv_id, "user_id": req.receiver_id}
        ])
    else:
        conv_id = str(conversation["_id"])
    
    # Create message
    message = {
        "_id": str(uuid.uuid4()),
        "conversation_id": conv_id,
        "sender_id": req.sender_id,
        "receiver_id": req.receiver_id,
        "content": req.content.strip(),
        "read": False,
        "created_at": datetime.utcnow()
    }
    
    await db.direct_messages.insert_one(message)
    
    # Update conversation last_message_at
    await db.conversations.update_one(
        {"_id": conv_id},
        {"$set": {"last_message_at": message["created_at"]}}
    )
    
    return {
        "id": message["_id"],
        "conversation_id": conv_id,
        "sender_id": message["sender_id"],
        "receiver_id": message["receiver_id"],
        "content": message["content"],
        "read": False,
        "timestamp": message["created_at"].isoformat() + "Z"
    }

@router.post("/conversations/{conversation_id}/read")
async def mark_messages_read(conversation_id: str, req: MarkReadRequest):
    """Mark all messages as read for a user in a conversation."""
    result = await db.direct_messages.update_many(
        {
            "conversation_id": conversation_id,
            "receiver_id": req.user_id,
            "read": False
        },
        {"$set": {"read": True}}
    )
    
    return {
        "success": True,
        "marked_count": result.modified_count
    }

@router.get("/users/{user_id}/unread-count")
async def get_unread_count(user_id: str):
    """Get total unread message count for a user."""
    count = await db.direct_messages.count_documents({
        "receiver_id": user_id,
        "read": False
    })
    
    return {"count": count}

class DeleteMessageRequest(BaseModel):
    user_id: str

@router.delete("/messages/{message_id}")
async def delete_message(message_id: str, req: DeleteMessageRequest):
    """Delete a single direct message."""
    # Verify the user owns this message (is the sender)
    message = await db.direct_messages.find_one({"_id": message_id})
    
    if not message:
        raise HTTPException(404, "Message not found")
    
    if message["sender_id"] != req.user_id:
        raise HTTPException(403, "You can only delete your own messages")
    
    await db.direct_messages.delete_one({"_id": message_id})
    
    return {
        "success": True,
        "deleted": True
    }

@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, req: DeleteMessageRequest):
    """Delete an entire conversation and all its messages for a user."""
    # Verify user is part of this conversation
    conversation = await db.conversations.find_one({"_id": conversation_id})
    
    if not conversation:
        raise HTTPException(404, "Conversation not found")
    
    if req.user_id not in conversation.get("participants", []):
        raise HTTPException(403, "You are not part of this conversation")
    
    # Delete all messages in the conversation
    result = await db.direct_messages.delete_many({
        "conversation_id": conversation_id
    })
    
    # Remove conversation participants entry for this user
    await db.conversation_participants.delete_one({
        "conversation_id": conversation_id,
        "user_id": req.user_id
    })
    
    # Check if any participants remain
    remaining = await db.conversation_participants.count_documents({
        "conversation_id": conversation_id
    })
    
    # If no participants remain, delete the conversation itself
    if remaining == 0:
        await db.conversations.delete_one({"_id": conversation_id})
    
    return {
        "success": True,
        "messages_deleted": result.deleted_count
    }
```

---

## 4. Frontend API Calls

The frontend already sends these requests:

```typescript
// Get conversations
apiClient.getConversations(userId);
// → GET /users/{userId}/conversations

// Get messages for a conversation
apiClient.getDirectMessages(conversationId, 50);
// → GET /conversations/{conversationId}/messages?limit=50

// Send a direct message
apiClient.sendDirectMessage(receiverId, senderId, "Hello!");
// → POST /messages/direct { receiver_id, sender_id, content }

// Mark messages as read
apiClient.markMessagesRead(conversationId, userId);
// → POST /conversations/{conversationId}/read { user_id }

// Get unread count for notification badge
apiClient.getUnreadCount(userId);
// → GET /users/{userId}/unread-count

// Delete a single message
apiClient.deleteDirectMessage(messageId, userId);
// → DELETE /messages/{messageId} { user_id }

// Delete entire conversation
apiClient.deleteConversation(conversationId, userId);
// → DELETE /conversations/{conversationId} { user_id }
```

---

## 5. Testing Checklist

### GET /users/{user_id}/conversations
- [ ] Returns empty arrays for user with no conversations
- [ ] Returns conversations with other user's info
- [ ] Includes correct unread counts
- [ ] Orders by most recent message

### GET /conversations/{conversation_id}/messages
- [ ] Returns messages in chronological order
- [ ] Respects limit parameter
- [ ] Pagination works with `before` cursor

### POST /messages/direct
- [ ] Creates new conversation if none exists
- [ ] Adds message to existing conversation
- [ ] Rejects empty content
- [ ] Returns created message with timestamp

### POST /conversations/{conversation_id}/read
- [ ] Marks all unread messages as read
- [ ] Only marks messages for the specified user
- [ ] Returns count of marked messages

### GET /users/{user_id}/unread-count
- [ ] Returns correct count
- [ ] Updates after marking messages read
- [ ] Updates after receiving new messages

### DELETE /messages/{message_id}
- [ ] Only allows sender to delete their own messages
- [ ] Returns 403 if user tries to delete someone else's message
- [ ] Returns 404 if message doesn't exist
- [ ] Actually removes message from database

### DELETE /conversations/{conversation_id}
- [ ] Only allows participants to delete conversation
- [ ] Deletes all messages in conversation
- [ ] Removes user from conversation participants
- [ ] Deletes conversation if no participants remain
- [ ] Returns 403 if user is not a participant

---

## 6. WebSocket Integration

For real-time message delivery, extend the existing WebSocket:

### Connection Manager (IMPORTANT - Don't iterate over message string!)

```python
class ConnectionManager:
    def __init__(self):
        # Store connections by user_id
        self.user_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.user_connections[user_id] = websocket
    
    def disconnect(self, user_id: str):
        if user_id in self.user_connections:
            del self.user_connections[user_id]
    
    async def send_to_user(self, message: str, user_id: str):
        """Send message to a specific user - MUST send entire string at once!"""
        if user_id in self.user_connections:
            ws = self.user_connections[user_id]
            # ⚠️ CRITICAL: Send the ENTIRE message string at once
            # DO NOT iterate over the message - that sends each character separately!
            await ws.send_text(message)  # ✅ Correct
            # NOT: for char in message: await ws.send_text(char)  # ❌ Wrong!

manager = ConnectionManager()
```

### DM Message Handler

```python
# Handle real-time DM messages via WebSocket
if msg_type == "dm_message":
    dm_sender_id = message_data.get("sender_id") or user_id
    dm_receiver_id = message_data.get("receiver_id")
    dm_content = message_data.get("content", "").strip()
    
    if not dm_receiver_id or not dm_content:
        await websocket.send_text(json.dumps({
            "type": "error", 
            "message": "DM requires receiver_id and content"
        }))
        continue
    
    try:
        # Save the DM to database
        saved_message = await db.send_direct_message(dm_sender_id, dm_receiver_id, dm_content)
        
        # Send confirmation to sender
        await websocket.send_text(json.dumps({
            "type": "dm_sent",
            **saved_message
        }))
        
        # Send to receiver if they're connected
        if dm_receiver_id in manager.user_connections:
            dm_payload = json.dumps({
                "type": "dm_received",
                "message": saved_message,  # Nest under 'message' key
                **saved_message  # Also spread for backwards compatibility
            })
            # ⚠️ IMPORTANT: send_to_user must send the entire string at once!
            await manager.send_to_user(dm_payload, dm_receiver_id)
            logger.info(f"📨 DM delivered from {dm_sender_id} to {dm_receiver_id}")
        else:
            logger.info(f"📨 DM saved for offline user {dm_receiver_id}")
    except Exception as e:
        logger.error(f"Error sending DM: {e}")
        await websocket.send_text(json.dumps({
            "type": "error", 
            "message": "Failed to send DM"
        }))
    continue
```

### DM Read Receipt Handler

```python
# Handle DM read receipts via WebSocket
if msg_type == "dm_read":
    reader_id = message_data.get("reader_id")
    sender_id = message_data.get("sender_id")
    conversation_id = message_data.get("conversation_id")
    
    if reader_id:
        # Mark messages as read in database
        if conversation_id:
            try:
                await db.mark_dm_messages_read(conversation_id, reader_id)
            except Exception as e:
                logger.error(f"Error marking DM messages as read: {e}")
        
        # Notify the sender that their messages were read
        if sender_id and sender_id in manager.user_connections:
            read_receipt = json.dumps({
                "type": "dm_read_receipt",
                "reader_id": reader_id,
                "conversation_id": conversation_id,
                "timestamp": datetime.now(timezone.utc).isoformat() + "Z"
            })
            await manager.send_to_user(read_receipt, sender_id)
    continue
```

---

## Summary Checklist

### Database
- [ ] Create `conversations` table
- [ ] Create `conversation_participants` table  
- [ ] Create `direct_messages` table
- [ ] Add necessary indexes

### Endpoints
- [ ] GET /users/{user_id}/conversations
- [ ] GET /conversations/{conversation_id}/messages
- [ ] POST /messages/direct
- [ ] POST /conversations/{conversation_id}/read
- [ ] GET /users/{user_id}/unread-count
- [ ] DELETE /messages/{message_id}
- [ ] DELETE /conversations/{conversation_id}
- [ ] Deploy new endpoints
- [ ] Test with frontend
