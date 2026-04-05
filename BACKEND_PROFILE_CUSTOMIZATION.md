# Backend: Profile Customization Fields

The frontend now sends additional profile customization fields via `PUT /users/{userId}/profile`.

## New Fields to Add to Users Table

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `accent_color` | `VARCHAR(20)` | `'#f97316'` | User's chosen accent color (hex) |
| `banner_color` | `VARCHAR(20)` | `'#7c3aed'` | User's chosen banner color (hex) |
| `name_font` | `VARCHAR(50)` | `'dm-sans'` | Font key for display name |
| `bio_font` | `VARCHAR(50)` | `'dm-sans'` | Font key for bio section |
| `about_font` | `VARCHAR(50)` | `'dm-sans'` | Font key for about section |
| `banner_media_url` | `TEXT` | `NULL` | URL to banner image/video (Bunny CDN) |
| `banner_media_type` | `VARCHAR(10)` | `NULL` | `'image'` or `'video'` |

## PUT /users/{userId}/profile

The existing endpoint should accept & persist these new optional fields in the request body:

```json
{
  "accent_color": "#f97316",
  "banner_color": "#7c3aed",
  "name_font": "dm-sans",
  "bio_font": "playfair",
  "about_font": "space-mono",
  "banner_media_url": "https://cdn.example.com/banner.mp4",
  "banner_media_type": "video"
}
```

## GET /users/{userId}/profile

The response should include these fields so other users can see them:

```json
{
  "id": "...",
  "username": "...",
  "accent_color": "#f97316",
  "banner_color": "#7c3aed",
  "name_font": "dm-sans",
  "bio_font": "dm-sans",
  "about_font": "dm-sans",
  "banner_media_url": "https://cdn.example.com/banner.mp4",
  "banner_media_type": "video"
}
```

## Frontend Behavior

- On save: sends all customization fields to backend
- On load: reads from backend response first, falls back to localStorage for migration
- Banner media upload/remove also persists `banner_media_url` and `banner_media_type` immediately
