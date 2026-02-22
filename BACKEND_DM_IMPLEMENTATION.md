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

---

## 6. Optional: WebSocket Integration

For real-time message delivery, extend the existing WebSocket:

```python
# In WebSocket handler
@socketio.on('direct_message')
async def handle_dm(data):
    receiver_id = data['receiver_id']
    
    # Save message to DB
    message = await send_direct_message(data)
    
    # Emit to receiver if online
    await socketio.emit('new_dm', message, room=f'user_{receiver_id}')

# Client subscribes to their user room on connect
@socketio.on('connect')
async def handle_connect(user_id):
    join_room(f'user_{user_id}')
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

### Deploy
- [ ] Run database migration
- [ ] Deploy new endpoints
- [ ] Test with frontend
