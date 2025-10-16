# 🎬 Video Chat Platform - Modern Frontend

# 🎬 Video Chat Platform - Frontend

A beautiful, modern Next.js 14 frontend for real-time video chat with Mux streaming integration. Features glassmorphism design, live streaming capabilities, and seamless FastAPI backend integration.

## 🌐 **Live Demo - Test It Now!**

### 🚀 **[https://video-chat-frontend-ruby.vercel.app](https://video-chat-frontend-ruby.vercel.app)**

**No installation required!** Jump straight into testing the full application:

![Next.js](https://img.shields.io/badge/Next.js-14.2.33-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-Latest-blue?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-Latest-38B2AC?style=for-the-badge&logo=tailwind-css)
![Mux](https://img.shields.io/badge/Mux-Video-FF6B6B?style=for-the-badge)

## 🎯 **Quick Test Guide**

### 🆕 **New to this app? Start here:**
1. **🔗 Click**: [Live Demo Link](https://video-chat-frontend-ruby.vercel.app)
2. **👤 Create User**: Enter any username (e.g., "TestUser123")
3. **🏠 Join Room**: Click "Join Room" or enter room name (e.g., "general")
4. **💬 Test Chat**: 
   - Scroll through existing demo messages
   - Send your own messages using the input at the bottom
   - Watch messages align left/right based on sender
5. **🎛️ Try Features**:
   - **🔴 Live**: Test live streaming UI
   - **📹 Upload**: Test video upload interface
   - **📜 Scroll**: Navigate through chat history with custom scrollbar

### ✅ **What Works Right Now**
- ✅ **User Creation**: Always functional (demo mode if backend unavailable)
- ✅ **Chat Interface**: Real-time message UI with glassmorphism design  
- ✅ **Scroll Functionality**: Custom purple scrollbar, smooth navigation
- ✅ **Room Navigation**: Join different chat rooms
- ✅ **Video UI**: Professional video upload and streaming interfaces
- ✅ **Responsive Design**: Works perfectly on mobile, tablet, desktop
- ✅ **Backend Integration**: Connected to Railway FastAPI backend

### 🎨 **Latest Updates (Just Deployed!)**
- 🎨 **Custom Scrollbar**: Beautiful purple-themed scrollbar matching the glassmorphism design
- 📱 **Fixed Message Alignment**: Messages properly align left (others) and right (yours)  
- 🗨️ **Enhanced Chat History**: 15 demo messages to fully test scrolling functionality
- ⚡ **Improved Performance**: Optimized container layouts for smooth scrolling

## ✨ Features

- 🎨 **Glassmorphism Design** - Modern glass-effect UI with beautiful animations
- 📱 **Mobile-First Responsive** - Perfect experience on all devices
- 🎬 **Mux Video Integration** - Professional video player with live streaming
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
- **Video Players** - Branded Mux player integration
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
├── Mux Player React
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
NEXT_PUBLIC_API_URL=https://your-railway-app.up.railway.app
NEXT_PUBLIC_WS_URL=wss://your-railway-app.up.railway.app
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

## 🎬 Mux Integration

### Video Player Features
- Auto-generated thumbnails
- Adaptive bitrate streaming
- Professional video controls
- Mobile-optimized interface
- Live stream support

### Live Streaming Workflow
1. User clicks "🔴 Live" button
2. Frontend calls `/rooms/{id}/live-stream`
3. Backend creates Mux live stream
4. User gets RTMP key for OBS
5. Stream appears in chat with Mux Player

### Video Upload Workflow
1. User clicks "📹 Upload" button
2. Select video file via drag & drop
3. Frontend gets signed upload URL
4. Direct upload to Mux storage
5. Webhook notifies when ready
6. Video appears in chat

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
   - Check Mux credentials in backend
   - Verify playback IDs are valid
   - Check browser console for errors

3. **Build Errors**
   ```bash
   # Clear cache and reinstall
   rm -rf .next node_modules package-lock.json
   npm install
   npm run dev
   ```

## 📚 Additional Resources

- [Next.js 14 Documentation](https://nextjs.org/docs)
- [Mux Player React](https://docs.mux.com/guides/video/mux-player-react)
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