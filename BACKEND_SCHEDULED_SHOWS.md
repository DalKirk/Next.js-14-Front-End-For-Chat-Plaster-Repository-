# Backend Changes: Scheduled Shows

This document outlines the backend changes required to support scheduled shows/lives functionality.

---

## Overview

Users can schedule upcoming live shows from their profile. The backend needs to:
1. Store scheduled shows in the database
2. Provide CRUD endpoints for scheduled shows
3. Return scheduled shows when fetching user profiles

---

## 1. Database Schema

### PostgreSQL

```sql
-- Create scheduled_shows table
CREATE TABLE IF NOT EXISTS scheduled_shows (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    scheduled_at TIMESTAMP NOT NULL,
    duration INTEGER DEFAULT 60,  -- minutes
    category VARCHAR(100),
    thumbnail TEXT,
    status VARCHAR(50) DEFAULT 'scheduled',  -- scheduled, live, completed, cancelled
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scheduled_shows_user_id ON scheduled_shows(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_shows_scheduled_at ON scheduled_shows(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_shows_status ON scheduled_shows(status);
```

### MongoDB

```javascript
// scheduled_shows collection schema
{
  _id: ObjectId,
  user_id: String,        // Reference to user
  title: String,
  description: String,
  scheduled_at: Date,
  duration: Number,       // minutes
  category: String,
  thumbnail: String,
  status: String,         // 'scheduled' | 'live' | 'completed' | 'cancelled'
  created_at: Date,
  updated_at: Date
}

// Create indexes
db.scheduled_shows.createIndex({ user_id: 1 });
db.scheduled_shows.createIndex({ scheduled_at: 1 });
db.scheduled_shows.createIndex({ status: 1 });
```

---

## 2. API Endpoints

### POST /users/{user_id}/scheduled-shows - Create a scheduled show

```python
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

class ScheduledShowCreate(BaseModel):
    title: str
    description: Optional[str] = None
    scheduled_at: datetime
    duration: Optional[int] = 60  # minutes
    category: Optional[str] = None
    thumbnail: Optional[str] = None

@app.post("/users/{user_id}/scheduled-shows")
async def create_scheduled_show(
    user_id: str,
    show_data: ScheduledShowCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new scheduled show for the user"""
    
    # Verify user is creating their own show
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Cannot create shows for other users")
    
    show_id = str(uuid.uuid4())
    
    new_show = ScheduledShow(
        id=show_id,
        user_id=user_id,
        title=show_data.title,
        description=show_data.description,
        scheduled_at=show_data.scheduled_at,
        duration=show_data.duration or 60,
        category=show_data.category,
        thumbnail=show_data.thumbnail,
        status='scheduled',
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    
    db.add(new_show)
    db.commit()
    db.refresh(new_show)
    
    return {
        "id": new_show.id,
        "user_id": new_show.user_id,
        "title": new_show.title,
        "description": new_show.description,
        "scheduled_at": new_show.scheduled_at.isoformat(),
        "duration": new_show.duration,
        "category": new_show.category,
        "thumbnail": new_show.thumbnail,
        "status": new_show.status,
        "created_at": new_show.created_at.isoformat(),
    }
```

### GET /users/{user_id}/scheduled-shows - Get user's scheduled shows

```python
@app.get("/users/{user_id}/scheduled-shows")
async def get_user_scheduled_shows(
    user_id: str,
    status: Optional[str] = None,  # Filter by status
    upcoming_only: bool = True,     # Only future shows
    db: Session = Depends(get_db)
):
    """Get scheduled shows for a user"""
    
    query = db.query(ScheduledShow).filter(ScheduledShow.user_id == user_id)
    
    if status:
        query = query.filter(ScheduledShow.status == status)
    
    if upcoming_only:
        query = query.filter(ScheduledShow.scheduled_at >= datetime.utcnow())
    
    shows = query.order_by(ScheduledShow.scheduled_at.asc()).all()
    
    return [
        {
            "id": show.id,
            "user_id": show.user_id,
            "title": show.title,
            "description": show.description,
            "scheduled_at": show.scheduled_at.isoformat(),
            "duration": show.duration,
            "category": show.category,
            "thumbnail": show.thumbnail,
            "status": show.status,
            "created_at": show.created_at.isoformat(),
        }
        for show in shows
    ]
```

### PUT /users/{user_id}/scheduled-shows/{show_id} - Update a scheduled show

```python
class ScheduledShowUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    duration: Optional[int] = None
    category: Optional[str] = None
    thumbnail: Optional[str] = None
    status: Optional[str] = None

@app.put("/users/{user_id}/scheduled-shows/{show_id}")
async def update_scheduled_show(
    user_id: str,
    show_id: str,
    show_data: ScheduledShowUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a scheduled show"""
    
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Cannot update other users' shows")
    
    show = db.query(ScheduledShow).filter(
        ScheduledShow.id == show_id,
        ScheduledShow.user_id == user_id
    ).first()
    
    if not show:
        raise HTTPException(status_code=404, detail="Show not found")
    
    # Update fields if provided
    if show_data.title is not None:
        show.title = show_data.title
    if show_data.description is not None:
        show.description = show_data.description
    if show_data.scheduled_at is not None:
        show.scheduled_at = show_data.scheduled_at
    if show_data.duration is not None:
        show.duration = show_data.duration
    if show_data.category is not None:
        show.category = show_data.category
    if show_data.thumbnail is not None:
        show.thumbnail = show_data.thumbnail
    if show_data.status is not None:
        show.status = show_data.status
    
    show.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(show)
    
    return {
        "id": show.id,
        "user_id": show.user_id,
        "title": show.title,
        "description": show.description,
        "scheduled_at": show.scheduled_at.isoformat(),
        "duration": show.duration,
        "category": show.category,
        "thumbnail": show.thumbnail,
        "status": show.status,
        "updated_at": show.updated_at.isoformat(),
    }
```

### DELETE /users/{user_id}/scheduled-shows/{show_id} - Delete/cancel a show

```python
@app.delete("/users/{user_id}/scheduled-shows/{show_id}")
async def delete_scheduled_show(
    user_id: str,
    show_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete or cancel a scheduled show"""
    
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Cannot delete other users' shows")
    
    show = db.query(ScheduledShow).filter(
        ScheduledShow.id == show_id,
        ScheduledShow.user_id == user_id
    ).first()
    
    if not show:
        raise HTTPException(status_code=404, detail="Show not found")
    
    # Option 1: Soft delete (mark as cancelled)
    show.status = 'cancelled'
    show.updated_at = datetime.utcnow()
    db.commit()
    
    # Option 2: Hard delete
    # db.delete(show)
    # db.commit()
    
    return {"message": "Show cancelled successfully"}
```

---

## 3. SQLAlchemy Model

```python
from sqlalchemy import Column, String, DateTime, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship

class ScheduledShow(Base):
    __tablename__ = "scheduled_shows"
    
    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    scheduled_at = Column(DateTime, nullable=False)
    duration = Column(Integer, default=60)
    category = Column(String(100), nullable=True)
    thumbnail = Column(Text, nullable=True)
    status = Column(String(50), default='scheduled')
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    user = relationship("User", back_populates="scheduled_shows")

# Add to User model:
# scheduled_shows = relationship("ScheduledShow", back_populates="user", cascade="all, delete-orphan")
```

---

## 4. Request/Response Examples

### Create a scheduled show

**Request:**
```bash
POST /users/user-123/scheduled-shows
Content-Type: application/json
Authorization: Bearer <token>

{
    "title": "Friday Night Gaming",
    "description": "Playing the latest releases with viewers!",
    "scheduled_at": "2026-02-28T20:00:00Z",
    "duration": 120,
    "category": "Gaming"
}
```

**Response:**
```json
{
    "id": "show-uuid-456",
    "user_id": "user-123",
    "title": "Friday Night Gaming",
    "description": "Playing the latest releases with viewers!",
    "scheduled_at": "2026-02-28T20:00:00Z",
    "duration": 120,
    "category": "Gaming",
    "thumbnail": null,
    "status": "scheduled",
    "created_at": "2026-02-22T15:30:00Z"
}
```

### Get upcoming shows

**Request:**
```bash
GET /users/user-123/scheduled-shows?upcoming_only=true&status=scheduled
```

**Response:**
```json
[
    {
        "id": "show-uuid-456",
        "user_id": "user-123",
        "title": "Friday Night Gaming",
        "description": "Playing the latest releases with viewers!",
        "scheduled_at": "2026-02-28T20:00:00Z",
        "duration": 120,
        "category": "Gaming",
        "thumbnail": null,
        "status": "scheduled",
        "created_at": "2026-02-22T15:30:00Z"
    },
    {
        "id": "show-uuid-789",
        "user_id": "user-123",
        "title": "Music & Chill Sunday",
        "description": "Relaxed vibes and good music",
        "scheduled_at": "2026-03-01T18:00:00Z",
        "duration": 90,
        "category": "Music",
        "thumbnail": null,
        "status": "scheduled",
        "created_at": "2026-02-22T16:00:00Z"
    }
]
```

---

## 5. Frontend Integration

The frontend currently stores shows in localStorage. Once the backend is ready:

1. Replace localStorage calls with API calls in `app/profile/page.tsx`
2. Load shows on profile view with `GET /users/{user_id}/scheduled-shows`
3. Create shows with `POST /users/{user_id}/scheduled-shows`
4. Cancel shows with `PUT /users/{user_id}/scheduled-shows/{show_id}` (status: 'cancelled')

---

## 6. Optional: Notification System

For notifying followers when a show is about to start:

```python
# Background job (every minute)
async def check_upcoming_shows():
    now = datetime.utcnow()
    fifteen_min_later = now + timedelta(minutes=15)
    
    # Find shows starting in 15 minutes
    shows = db.query(ScheduledShow).filter(
        ScheduledShow.status == 'scheduled',
        ScheduledShow.scheduled_at >= now,
        ScheduledShow.scheduled_at <= fifteen_min_later,
        ScheduledShow.notification_sent == False
    ).all()
    
    for show in shows:
        # Get followers
        followers = get_user_followers(show.user_id)
        
        # Send notifications
        for follower in followers:
            send_notification(
                user_id=follower.id,
                title=f"{show.user.username} is going live soon!",
                body=f"{show.title} starts in 15 minutes",
                data={"show_id": show.id, "user_id": show.user_id}
            )
        
        show.notification_sent = True
        db.commit()
```

---

## Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/users/{user_id}/scheduled-shows` | POST | Create a new scheduled show |
| `/users/{user_id}/scheduled-shows` | GET | Get user's scheduled shows |
| `/users/{user_id}/scheduled-shows/{show_id}` | PUT | Update a scheduled show |
| `/users/{user_id}/scheduled-shows/{show_id}` | DELETE | Cancel/delete a show |

Once these endpoints are deployed, scheduled shows will sync across all devices and be visible to profile visitors.
