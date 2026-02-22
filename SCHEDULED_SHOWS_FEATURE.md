# Scheduled Shows Feature

This document describes the Scheduled Shows feature that allows users to schedule upcoming live streams from their profile.

---

## Overview

Users can now schedule upcoming live shows/streams directly from their profile page. These scheduled shows are visible to profile visitors, helping build anticipation and notify followers of upcoming content.

---

## Features

### 1. Schedule Tab in Profile Edit Mode

A new **"Schedule"** tab has been added to the profile edit section with the following capabilities:

- **Create new shows** - Click "New Show" to schedule a live stream
- **Edit existing shows** - Click the pencil icon on any show to modify details
- **Cancel shows** - Click the X icon to cancel a scheduled show
- **Upload thumbnails** - Add custom thumbnails for each show (max 2MB)

### 2. Show Details

Each scheduled show includes:

| Field | Description | Required |
|-------|-------------|----------|
| Title | Name of the show/stream | ✅ Yes |
| Description | What the show is about | No |
| Date & Time | When the show starts | ✅ Yes |
| Duration | Length in minutes (15-480) | No (default: 60) |
| Category | Gaming, Music, Art, etc. | No (default: Social) |
| Thumbnail | Custom image for the show | No |

### 3. Profile Display

Scheduled shows appear on the user's profile in the **"Upcoming Lives"** section:

- Displays up to **6 upcoming shows**
- Shows thumbnail with gradient fallback
- Includes date, time, and category badges
- Shows description preview
- Visible to both profile owner and visitors

---

## User Interface

### Creating a Show

1. Go to **Profile** → **Edit Profile**
2. Click the **"Schedule"** tab
3. Click **"New Show"** button
4. Fill in show details:
   - Click thumbnail area to upload an image
   - Enter title (required)
   - Select category
   - Add description
   - Set date & time (required)
   - Set duration
5. Click **"Schedule Show"**

### Editing a Show

1. In the Schedule tab, find the show you want to edit
2. Click the **pencil icon** (✏️)
3. Modify any fields including thumbnail
4. Click **"Save Changes"**

### Cancelling a Show

1. In the Schedule tab, find the show
2. Click the **X icon**
3. Show will be marked as cancelled

---

## Technical Implementation

### Frontend Storage (Current)

Shows are currently stored in **localStorage** per user:
```
Key: scheduled-shows-{userId}
Value: JSON array of ScheduledShow objects
```

### Data Structure

```typescript
interface ScheduledShow {
  id: string;           // Unique identifier
  title: string;        // Show name
  description?: string; // Show description
  scheduledAt: string;  // ISO date string
  duration?: number;    // Duration in minutes
  category?: string;    // Category name
  thumbnail?: string;   // Base64 data URL or CDN URL
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
}
```

### Auto-Completion

Shows are automatically marked as **"completed"** when their scheduled time has passed.

---

## Profile Page Locations

### Edit Mode (Schedule Tab)
```
Profile → Edit Profile → Schedule Tab
├── New Show Button
├── Show Form (create/edit)
│   ├── Thumbnail Upload
│   ├── Title Input
│   ├── Category Select
│   ├── Description Textarea
│   ├── Date/Time Input
│   └── Duration Input
└── Upcoming Shows List
    └── Show Cards (with edit/cancel buttons)
```

### View Mode (Profile Display)
```
Profile Page
└── Upcoming Lives Section
    └── Show Cards Grid (1-3 columns responsive)
        ├── Thumbnail Image
        ├── Title
        ├── Date & Time
        ├── Category Badge
        └── Description Preview
```

---

## Categories Available

- Gaming
- Study
- Social
- Work
- Music
- Art
- Tech
- Sports
- Other

---

## Responsive Design

| Screen Size | Shows Grid | Thumbnail Size |
|-------------|------------|----------------|
| Mobile | 1 column | Full width, 96px height |
| Tablet | 2 columns | Full width, 112px height |
| Desktop | 3 columns | Full width, 112px height |

---

## Backend Integration (Future)

When the backend implements the scheduled shows API:

1. Shows will sync across all devices
2. Followers can be notified of upcoming shows
3. Thumbnails can be uploaded to CDN
4. Show history will be preserved

See **[BACKEND_SCHEDULED_SHOWS.md](BACKEND_SCHEDULED_SHOWS.md)** for API specifications.

---

## Files Modified

| File | Changes |
|------|---------|
| `app/profile/page.tsx` | Added Schedule tab, show form, edit functionality, profile display |
| `BACKEND_SCHEDULED_SHOWS.md` | Backend API documentation |

---

## Future Enhancements

- [ ] Backend API integration
- [ ] Push notifications for followers
- [ ] Reminder system (15 min before show)
- [ ] Recurring shows
- [ ] Show analytics
- [ ] Calendar export (iCal)
- [ ] Social sharing links
