# 🎬 Video Chat Platform - Modern Frontend

# 🎬 Video Chat Platform - Frontend

A beautiful, modern Next.js 14 frontend for real-time video chat with Bunny.net streaming integration. Features glassmorphism design, live streaming capabilities, and seamless FastAPI backend integration.

## ⚠️ **Current Backend Status**

**Railway Backend:** The backend server may be temporarily unavailable due to Railway's free-tier sleep policy. 

**Common Issues:**
- **502 Bad Gateway**: The Railway service is sleeping. First request will wake it (takes 30-60 seconds)
- **Connection Timeout**: Backend is starting up or restarting

**Quick Fix:**
1. Wait 30-60 seconds and retry
2. Check the server status indicator (top-right corner)
3. Visit the [Troubleshooting Page](/troubleshooting) for detailed diagnostics

**Backend URL:** `https://web-production-3ba7e.up.railway.app`

## 🌐 **Live Demo - Test It Now!**

### 🚀 **[https://video-chat-frontend-ruby.vercel.app](https://video-chat-frontend-ruby.vercel.app)**

**No installation required!** Jump straight into testing the full application:

![Next.js](https://img.shields.io/badge/Next.js-14.2.33-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-Latest-blue?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-Latest-38B2AC?style=for-the-badge&logo=tailwind-css)
![Bunny.net](https://img.shields.io/badge/Bunny.net-Video-FF6B6B?style=for-the-badge)

## 🎯 **Quick Test Guide**

### 🆕 **New to this app? Start here:**
1. **🔗 Click**: [Live Demo Link](https://video-chat-frontend-ruby.vercel.app)
2. **✅ Check Status**: Look for the server status indicator in the top-right corner
   - 🟢 Green = Ready to use
   - 🟡 Yellow = Checking connection
   - 🔴 Red/Orange = Server sleeping (wait 30-60 seconds)
3. **👤 Create User**: Enter any username (e.g., "TestUser123")
4. **🏠 Join Room**: Click "Join Room" or enter room name (e.g., "general")
5. **💬 Test Chat**: 
   - Scroll through existing demo messages
   - Send your own messages using the input at the bottom
   - Watch messages align left/right based on sender
6. **🎛️ Try Features**:
   - **🔴 Live**: Test live streaming UI
   - **📹 Upload**: Test video upload interface
   - **📜 Scroll**: Navigate through chat history with custom scrollbar

### ✅ **What Works Right Now**
- ✅ **User Creation**: Always functional (demo mode if backend unavailable)
- ✅ **Server Status Indicator**: Real-time connection monitoring
- ✅ **Chat Interface**: Real-time message UI with glassmorphism design  
- ✅ **Scroll Functionality**: Custom purple scrollbar, smooth navigation
- ✅ **Room Navigation**: Join different chat rooms
- ✅ **Video UI**: Professional video upload and streaming interfaces
- ✅ **Responsive Design**: Works perfectly on mobile, tablet, desktop
- ✅ **Backend Integration**: Connected to Railway FastAPI backend
- ✅ **Troubleshooting Page**: Built-in diagnostics for connection issues

### 🎨 **Latest Updates (Just Deployed!)**
- 🏥 **Server Status Indicator**: Real-time backend health monitoring with detailed error messages
- 🔧 **Troubleshooting Page**: Comprehensive guide for connection issues
- 💬 **Enhanced Error Messages**: Clear, actionable feedback for server problems
- ⏰ **Auto-reconnect**: Automatic retries when Railway wakes from sleep
- 🎨 **Custom Scrollbar**: Beautiful purple-themed scrollbar matching the glassmorphism design
- 📱 **Fixed Message Alignment**: Messages properly align left (others) and right (yours)  
- 🗨️ **Enhanced Chat History**: 15 demo messages to fully test scrolling functionality
- ⚡ **Improved Performance**: Optimized container layouts for smooth scrolling
- 🚫 **CORS Error Handling**: Better detection and guidance for CORS configuration issues

## ✨ Features

- 🎨 **Glassmorphism Design** - Modern glass-effect UI with beautiful animations
- 📱 **Mobile-First Responsive** - Perfect experience on all devices
- 🎬 **Bunny.net Video Integration** - Professional video player with live streaming
- ⚡ **Real-time Chat** - WebSocket connection to FastAPI backend
- 🔄 **Live Streaming** - RTMP streaming with OBS integration
- 📹 **Video Upload** - Drag & drop video sharing
- 🎯 **TypeScript** - Full type safety and IntelliSense
- 🎭 **Framer Motion** - Smooth animations and transitions

## 🚀 Quick Start

> **👆 Prefer to test online?** Use the [Live Demo](https://video-chat-frontend-ruby.vercel.app) above - no setup required!

### For Developers - Local Development

#### Prerequisites

- Node.js 18+ 
- npm, yarn, or pnpm
- (Optional) Your FastAPI backend running for full features

### Installation

1. **Navigate to the frontend directory:**
   ```bash
   cd video-chat-frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables:**
   Create a `.env.local` file:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   NEXT_PUBLIC_WS_URL=ws://localhost:8000
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

5. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🎨 Design System

### Color Palette
- **Primary**: Blue gradient (#0ea5e9 to #8b5cf6)
- **Accent Green**: #00ff88 (success, video ready)
- **Accent Red**: #ff4757 (live streaming, errors)
- **Accent Blue**: #00d4ff (interactive elements)
- **Glass Effects**: rgba(255,255,255,0.1) with backdrop blur

### Components
- **Glass Cards** - Transparent cards with blur effects
- **Gradient Buttons** - Beautiful hover animations
- **Video Players** - HLS video player with Bunny.net integration
- **Message Bubbles** - Animated chat messages
- **Modals** - Smooth slide-in dialogs

## 🏗️ Architecture

### Tech Stack
```
Frontend:
├── Next.js 14 (App Router)
├── TypeScript
├── Tailwind CSS
├── Framer Motion
├── React Query
└── Socket.io Client

Video:
├── HLS.js
├── React Dropzone
└── WebRTC support

State Management:
├── React Query (server state)
├── React Hooks (local state)
└── Context API (user sessions)
```

### Project Structure
```
app/
├── layout.tsx          # Root layout with providers
├── page.tsx            # Home page with user creation
├── chat/
│   └── page.tsx        # Chat room selection
├── room/
│   └── [id]/
│       └── page.tsx    # Individual chat room
└── providers.tsx       # React Query & Toast providers

components/
├── ui/                 # Reusable UI components
│   ├── button.tsx
│   ├── input.tsx
│   ├── modal.tsx
│   └── loading.tsx
├── chat/               # Chat-specific components
│   ├── chat-room.tsx
│   ├── message-list.tsx
│   ├── message-bubble.tsx
│   └── message-input.tsx
└── video/              # Video components
    ├── video-player.tsx
    ├── live-stream.tsx
    └── video-upload.tsx

lib/
├── api.ts              # API client (FastAPI integration)
├── socket.ts           # WebSocket management
├── types.ts            # TypeScript definitions
└── utils.ts            # Helper functions

hooks/
├── use-chat.ts         # Chat functionality
├── use-socket.ts       # WebSocket connection
└── use-video.ts        # Video operations
```

## 🔧 Configuration

### Environment Variables
```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000

# Production URLs (for deployment)
NEXT_PUBLIC_API_URL=https://web-production-3ba7e.up.railway.app
NEXT_PUBLIC_WS_URL=wss://web-production-3ba7e.up.railway.app
```

### Tailwind Configuration
Custom theme with:
- Glass effect utilities
- Custom animations
- Responsive breakpoints
- Color system matching your backend

## 🚀 Deployment

### Vercel (Recommended)
**🚀 Live Demo**: [https://video-chat-frontend-ruby.vercel.app](https://video-chat-frontend-ruby.vercel.app)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FDalKirk%2FNext.js-14-Front-End-For-Chat-Plaster-Repository-)

1. Push code to GitHub
2. Connect to Vercel
3. Set environment variables
4. Deploy automatically

### Netlify
```bash
npm run build
# Upload dist folder to Netlify
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🎯 Integration with FastAPI Backend

### API Endpoints Used
- `POST /users` - Create user
- `GET /rooms` - List rooms
- `POST /rooms` - Create room
- `POST /rooms/{id}/join` - Join room
- `GET /rooms/{id}/messages` - Load messages
- `POST /rooms/{id}/live-stream` - Start live stream
- `POST /rooms/{id}/video-upload` - Upload video
- `WebSocket /ws/{room_id}/{user_id}` - Real-time chat

### WebSocket Events
```typescript
// Outgoing
{ type: 'message', content: string }

// Incoming
{ 
  type: 'message' | 'video_ready' | 'live_stream_created',
  username: string,
  content: string,
  timestamp: string,
  playback_id?: string,
  title?: string
}
```

## 🎬 Bunny.net Integration

### Video Player Features
- Auto-generated thumbnails
- Adaptive bitrate streaming
- Professional video controls
- Mobile-optimized interface
- Live stream support

### Live Streaming Workflow
1. User clicks "🔴 Live" button
2. Frontend calls `/rooms/{id}/live-stream`
3. Backend creates Bunny.net live stream
4. User gets RTMP key for OBS
5. Stream appears in chat with HLS Player

### Video Upload Workflow
1. User clicks "📹 Upload" button
2. Select video file via drag & drop
3. Frontend gets signed upload URL
4. Direct upload to Bunny.net storage
5. Webhook notifies when ready
6. Video appears in chat

## 📖 How the Code Works

This is a Next.js 14 frontend application for a real-time video chat platform with the following architecture and functionality:

### Core Architecture

**Framework & Tech Stack:**
- Next.js 14 with App Router
- TypeScript for type safety
- Tailwind CSS for styling with glassmorphism design
- Framer Motion for animations
- React Query for server state management
- Axios for HTTP requests
- WebSocket for real-time messaging

### Application Flow

#### 1. **Entry Point (app/page.tsx)**
- Landing page with user creation form
- Allows creating usernames and rooms
- Stores user data in localStorage
- Redirects to chat room selection

#### 2. **Room Selection (app/chat/page.tsx)**
- Displays list of available chat rooms
- Fetches rooms from backend API
- Allows joining existing rooms
- Shows room creation timestamps

#### 3. **Chat Room Interface (app/room/[id]/page.tsx)**
The main chat functionality includes:

**Real-time Messaging:**
- WebSocket connection to FastAPI backend
- Auto-reconnect with exponential backoff
- Optimistic UI updates for sent messages
- Message history loading on room join

**Video Features:**
- **Live Streaming:** Creates RTMP streams via Bunny.net, displays in chat
- **Video Upload:** Direct upload to Bunny.net CDN, shows HLS player in messages
- **Video Player:** HLS.js integration for cross-browser video playback

**UI Components:**
- Glassmorphism design with backdrop blur effects
- Responsive layout for mobile/desktop
- Auto-scroll to new messages with manual scroll controls
- Message bubbles with timestamps and user identification

### Key Libraries & Integrations

#### **API Layer (lib/api.ts)**
- Axios-based client for FastAPI backend
- Handles Railway deployment quirks (server sleeping)
- Comprehensive error handling with user-friendly messages
- Endpoints for users, rooms, messages, and video operations

#### **WebSocket Management (lib/socket.ts)**
- Singleton SocketManager class
- Handles connection lifecycle and reconnection
- Message routing for different event types
- Production-ready with Railway WebSocket URLs

#### **Video Integration**
- **Bunny.net CDN** for video hosting and streaming
- **HLS.js** for browser video playback
- Direct upload URLs for efficient file transfers
- Playback ID system for video identification

#### **UI Components**
- **MessageBubble:** Handles text, video, and live stream messages
- **VideoPlayer:** HLS video player with error states
- **Modal:** For video upload and live stream creation
- **ServerStatus:** Real-time backend health monitoring

### Data Flow

1. **User Creation:** POST to `/users` → Store in localStorage
2. **Room Join:** POST to `/rooms/{id}/join` → WebSocket connect
3. **Message Send:** WebSocket emit → Backend broadcast → UI update
4. **Video Upload:** Get signed URL → Direct upload → Webhook → Message display
5. **Live Stream:** Create stream → Get RTMP key → Embed player

### Error Handling

- Network errors with retry logic
- CORS configuration guidance
- Backend availability checks
- Graceful degradation for missing features
- User-friendly error messages throughout

The application is designed for production deployment on Vercel with a FastAPI backend on Railway, featuring modern React patterns, real-time capabilities, and professional video streaming integration.

## 🎨 Customization

### Theme Colors
Edit `tailwind.config.js`:
```javascript
theme: {
  extend: {
    colors: {
      accent: {
        green: '#your-color',
        red: '#your-color',
        blue: '#your-color',
      }
    }
  }
}
```

### Animation Styles
Customize in `globals.css`:
```css
@layer components {
  .custom-animation {
    @apply animate-pulse;
  }
}
```

## 🐛 Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check NEXT_PUBLIC_WS_URL in .env.local
   - Ensure FastAPI backend is running
   - Verify CORS settings in backend

2. **Video Player Not Loading**
   - Check Bunny.net credentials in backend
   - Verify playback IDs are valid
   - Check browser console for errors

3. **Build Errors**
   ```bash
   # Clear cache and reinstall
   rm -rf .next node_modules package-lock.json
   npm install
   npm run dev
   ```

### Detailed Connection Issues

If you encounter issues connecting to the backend, visit the [Troubleshooting Page](/troubleshooting) for detailed diagnostics and solutions.

#### CORS Configuration Issues

**Problem:** Getting CORS errors when uploading videos or making API calls?

**Solution:** Your FastAPI backend needs CORS middleware configured:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://video-chat-frontend-ruby.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

See [CORS_FIX_GUIDE.md](CORS_FIX_GUIDE.md) for complete setup instructions.

## 📚 Additional Resources

- [Next.js 14 Documentation](https://nextjs.org/docs)
- [Bunny.net Documentation](https://docs.bunny.net/)
- [HLS.js](https://github.com/video-dev/hls.js/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Framer Motion](https://www.framer.com/motion/)

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Test First**: Try the [live demo](https://video-chat-frontend-ruby.vercel.app) to understand the app
2. **Fork the Repository**: Click the fork button on GitHub
3. **Clone Your Fork**: 
   ```bash
   git clone https://github.com/your-username/Next.js-14-Front-End-For-Chat-Plaster-Repository-.git
   cd Next.js-14-Front-End-For-Chat-Plaster-Repository-
   ```
4. **Install Dependencies**: `npm install`
5. **Start Development**: `npm run dev`
6. **Make Changes**: Focus on UI/UX improvements, bug fixes, or new features
7. **Test Thoroughly**: Ensure scrolling, messaging, and responsive design work
8. **Submit PR**: Create a pull request with clear description

### 🐛 Found a Bug?
- Test it on the [live demo](https://video-chat-frontend-ruby.vercel.app) first
- Check if it's reproducible
- Open an issue with screenshots and steps to reproduce

## 🎉 Next Steps

### 🧪 **For Testers**
1. **🔗 Visit**: [Live Demo](https://video-chat-frontend-ruby.vercel.app)
2. **📱 Test**: Try on different devices (mobile, tablet, desktop)
3. **🐛 Report**: Found issues? Open a GitHub issue with details

### 👨‍💻 **For Developers**
1. **Fork & Clone**: Get the code locally
2. **Start Development**: Run `npm run dev` and start customizing
3. **Connect Backend**: Optional FastAPI integration for full features
4. **Deploy**: Push to Vercel for instant deployment
5. **Customize**: Modify colors, animations, and layout to match your brand

### 🚀 **For Contributors**
1. **🎯 Focus Areas**: UI improvements, bug fixes, mobile optimization
2. **🎨 Design**: Enhance the glassmorphism theme
3. **⚡ Performance**: Optimize loading and animations
4. **📱 Mobile**: Improve mobile experience
5. **🧪 Testing**: Add tests for components and features

**Happy coding! 🚀**