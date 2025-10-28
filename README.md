
**[🚀 Try it Live](https://next-js-14-front-end-for-chat-plast-kappa.vercel.app)**

---


### 🎨 Syntax Highlighting
- **150+ programming languages** supported (JavaScript, Python, Java, C++, SQL, and more)
- **Automatic language detection** - paste code and watch it format instantly
- **OneDark theme** - professional, eye-friendly color scheme
- **Language badges** - clearly shows detected programming language
- **Copy to clipboard** - one-click code copying
- **Line numbers** - professional code display

### 👤 User Profiles
- **Profile-first onboarding** - guided setup for new users
- **Customizable profiles** - bio, theme preferences, and settings
- **User statistics** - track rooms joined and messages sent
- **Recent activity** - quick access to your recent conversations
- **Session management** - secure login/logout functionality

### 💬 Real-time Chat
- **Instant messaging** - WebSockage
- **Typing indicators** - see when others are typing
- **Message timestamps** - track conversation flow
- **Room management** - create and join multiple chat rooms

### 🎥 Video Chat (Coming Soon)
- HD video calling capabilities
- Screen sharing support
- Face-to-face collaboration

### 📁 File Sharing
- **Drag & drop** - easy file uploads
- **Code file support** - automatic syntax detection for uploaded files
- **Multi-file support** - share multiple files at once

### 🎯 User Experience
- **Glassmorphism UI** - modern, beautiful design with purple OKLCH theme
- **Custom fonts** - Bitcount Prop Double Ink for branding
- **Mobile responsive** - works seamlessly on all devices
- **Smooth animations** - Framer Motion powered transitions
- **Dark theme** - easy on the eyes for long coding sessions

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** Next.js 14.2 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 
- **Animations:** Framer Motion
- **Syntax Highlighting:** react-syntax-highlighter (Prism)
- **State Management:** React Hooks
- **Notifications:** react-hot-toast

### Backend
- **API:** Railway-hosted Python backend
- **WebSocket:** Real-time messaging
- **Database:** (Backend handles storage)

### Deployment
- **Frontend:** Vercel
- **Backend:** Railway
- **CI/CD:** Automated via GitHub integration

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/DalKirk/Next.js-14-Front-End-For-Chat-Plaster-Repository-.git
cd Next.js-14-Front-End-For-Chat-Plaster-Repository-
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**

Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_API_URL=https://web-production-3ba7e.up.railway.app
NEXT_PUBLIC_WS_URL=wss://web-production-3ba7e.up.railway.app
```

4. **Run the development server**
```bash
npm run dev
```

5. **Open your browser**
Navigate to [http://localhost:3000](http://localhost:3000)

### Build for Production
```bash
npm run build
npm start
```

---

## 📖 Usage

### Creating a Profile
1. Enter your username on the homepage
2. Click "Create Profile"
3. Complete your profile setup with bio and preferences
4. You're ready to start chatting!

### Sharing Code
**Method 1: Inline Code Blocks**
```
Type your message with code:
```javascript
function hello() {
  console.log("Hello, CHATTER BOX!");
}
```
```

**Method 2: Auto-Detection**
- Simply paste code into the message box
- CHATTER BOX automatically detects and highlights it

**Method 3: File Upload**
- Drag and drop code files into the chat
- Or use the file upload button

### Joining Rooms
1. Browse available rooms or create your own
2. Click "Join Room" to enter
3. Start collaborating with other developers!

---

## 🎨 Code Sharing Features

CHATTER BOX is designed specifically for developers who need to share and discuss code:

### ✅ What Makes It Great
- **Zero-friction sharing** - no setup required, just paste and send
- **Beautiful formatting** - professional syntax highlighting out of the box
- **Real-time collaboration** - see code updates instantly
- **Perfect for:**
  - Code reviews
  - Pair programming discussions
  - Teaching and mentoring
  - Troubleshooting sessions
  - Technical interviews

### 📋 Supported Languages
JavaScript, TypeScript, Python, Java, C, C++, C#, Ruby, PHP, Go, Rust, Swift, Kotlin, SQL, HTML, CSS, SCSS, JSON, YAML, XML, Markdown, Bash, Shell, PowerShell, and 130+ more!

---

## 🏗️ Project Structure

```
video-chat-frontend/
├── app/
│   ├── page.tsx              # Homepage with enhanced hero section
│   ├── layout.tsx            # Root layout with fonts & theming
│   ├── globals.css           # Global styles & glassmorphism
│   ├── chat/
│   │   └── page.tsx          # Chat room browser
│   ├── profile/
│   │   └── page.tsx          # User profile & onboarding
│   └── room/
│       └── [id]/
│           └── page.tsx      # Chat room interface
├── components/
│   ├── chat/
│   │   └── message-bubble.tsx  # Message display with syntax highlighting
│   ├── ui/
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── modal.tsx
│   │   └── server-status.tsx
│   └── video/
│       └── video-player.tsx
├── lib/
│   ├── api.ts                # API client
│   ├── socket.ts             # WebSocket integration
│   ├── types.ts              # TypeScript definitions
│   └── utils.ts              # Utility functions
└── public/                   # Static assets
```

---

## 🎨 Design System

### Colors (OKLCH)
- **Primary Background:** `oklch(25.7% 0.09 281.288)` - Deep purple
- **Glassmorphism:** 8% white opacity with 20px backdrop blur
- **Accents:** Blue-to-purple gradients

### Typography
- **Headings:** Bitcount Prop Double Ink (Google Fonts)
- **Body:** Bungee (Google Fonts)
- **Code:** SF Mono, Monaco, Consolas

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

---

## 🔗 Links

- **Live Demo:** [https://next-js-14-front-end-for-chat-plast-kappa.vercel.app](https://next-js-14-front-end-for-chat-plast-kappa.vercel.app)
- **Repository:** [https://github.com/DalKirk/Next.js-14-Front-End-For-Chat-Plaster-Repository-](https://github.com/DalKirk/Next.js-14-Front-End-For-Chat-Plaster-Repository-)
- **Backend API:** [https://web-production-3ba7e.up.railway.app](https://web-production-3ba7e.up.railway.app)

---

## 👨‍💻 Author

**DalKirk**
- GitHub: [@DalKirk](https://github.com/DalKirk)

---

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Vercel for seamless deployment
- Railway for backend hosting
- react-syntax-highlighter for beautiful code formatting
- The open-source community

---

<div align="center">

**Built with ❤️ for developers, by developers**

[Report Bug](https://github.com/DalKirk/Next.js-14-Front-End-For-Chat-Plaster-Repository-/issues) · [Request Feature](https://github.com/DalKirk/Next.js-14-Front-End-For-Chat-Plaster-Repository-/issues)

</div>
