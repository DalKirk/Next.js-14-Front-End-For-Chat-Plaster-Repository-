# 💬 Video Chat Frontend with Syntax Highlighting

A modern real-time chat application built with Next.js 14, featuring professional code sharing capabilities with syntax highlighting.

## 🚀 Live Demo

**🌐 Production**: [https://next-js-14-front-end-for-chat-plaster-repository.vercel.app](https://next-js-14-front-end-for-chat-plaster-repository.vercel.app)

**🔧 Backend API**: [https://web-production-3ba7e.up.railway.app](https://web-production-3ba7e.up.railway.app)

## ✨ Features

### 💬 Real-Time Chat
- **WebSocket-powered** instant messaging
- **Multi-user rooms** with live typing indicators
- **Smart timestamps** (relative time, smart formatting)
- **Message persistence** across sessions
- **Connection status** indicators

### 🎨 Professional Code Sharing
- **Syntax highlighting** for 100+ languages (HTML, JavaScript, Python, CSS, TypeScript, SQL, JSON, Bash, etc.)
- **Language badges** with automatic detection
- **Line numbers** for easy reference
- **One-click copy** for code blocks and entire messages
- **oneDark theme** for professional appearance
- **Multi-line input** with Shift+Enter support

### 🎥 Media Features
- **Live streaming** support with RTMP
- **Video uploads** and sharing
- **Bunny.net integration** for video hosting
- **Real-time video notifications**

### 🎯 Modern UX
- **Glass morphism design** with OKLCH colors
- **Responsive layout** (mobile-friendly)
- **Smooth animations** with Framer Motion
- **Error boundaries** and graceful fallbacks
- **Auto-scroll** with manual controls

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** (App Router)
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **React Markdown** with GitHub Flavored Markdown
- **react-syntax-highlighter** (Prism.js)
- **Framer Motion** for animations
- **WebSocket** for real-time communication

### Backend
- **FastAPI** (Python)
- **Railway** hosting
- **WebSocket** support
- **Bunny.net** for video streaming

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+**
- **npm** or **yarn**

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
   ```bash
   cp .env.example .env.local
   ```
   
   Configure your `.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=https://web-production-3ba7e.up.railway.app
   API_BASE_URL=https://web-production-3ba7e.up.railway.app
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

## 📚 How to Use

### Basic Chat
1. **Create a username** on the homepage
2. **Join or create a room**
3. **Start chatting** with real-time messaging

### Code Sharing
1. **Type your message** in the textarea
2. **Add code blocks** using triple backticks:
   ```
   Here's some code:
   ```javascript
   console.log('Hello World!');
   ```
   ```
3. **Use Shift+Enter** for new lines, **Enter** to send
4. **Copy code** using the copy button
5. **View source** to see raw markdown

### Code Block Examples

Check out [`CODE_BLOCK_EXAMPLES.md`](./CODE_BLOCK_EXAMPLES.md) for ready-to-copy examples in:
- HTML, CSS, JavaScript, TypeScript
- Python, SQL, JSON, Bash
- Multiple code blocks per message

## 🎨 Supported Languages

The syntax highlighter supports 100+ languages including:

| Language | Identifier | Language | Identifier |
|----------|------------|----------|------------|
| HTML | `html` | Python | `python` |
| CSS | `css` | Java | `java` |
| JavaScript | `javascript` | C++ | `cpp` |
| TypeScript | `typescript` | C# | `csharp` |
| SQL | `sql` | PHP | `php` |
| JSON | `json` | Ruby | `ruby` |
| Bash | `bash` | Go | `go` |
| PowerShell | `powershell` | Rust | `rust` |

## 🔧 Development

### Project Structure
```
src/
├── app/                 # Next.js 14 App Router
│   ├── page.tsx        # Homepage (user creation)
│   ├── chat/           # Room browser
│   └── room/[id]/      # Chat room
├── components/
│   ├── chat/           # Chat components
│   ├── ui/             # Reusable UI components
│   └── video/          # Video components
├── hooks/              # Custom React hooks
└── lib/                # Utilities and API clients
```

### Key Components
- **`MessageBubble`** - Renders messages with syntax highlighting
- **`Textarea`** - Multi-line input with keyboard shortcuts
- **`VideoPlayer`** - Bunny.net video integration
- **`ErrorBoundary`** - Graceful error handling

### Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript checking
```

## 🚀 Deployment

### Vercel (Recommended)
1. **Connect GitHub repo** to Vercel
2. **Set environment variables**:
   - `NEXT_PUBLIC_API_URL`
   - `API_BASE_URL`
3. **Deploy automatically** on push to main

### Manual Deploy
```bash
npm run build
npm run start
```

## 🌟 Features in Detail

### Syntax Highlighting
- **Manual parser** bypasses ReactMarkdown issues
- **Professional styling** with oneDark theme
- **Language detection** from code fence identifiers
- **Copy functionality** for code blocks and messages
- **Line numbers** for easy reference

### Real-Time Features
- **WebSocket connection** with auto-reconnect
- **Typing indicators** show who's typing
- **Live message updates** across all users
- **Connection status** indicators

### Video Integration
- **Live streaming** support
- **Video uploads** via Bunny.net
- **Real-time notifications** for new videos
- **Responsive video player**

## 🐛 Troubleshooting

### Common Issues
1. **WebSocket connection fails**
   - Check backend server is running
   - Verify API URLs in environment variables

2. **Code blocks not highlighting**
   - Ensure proper triple backtick format
   - Check language identifier spelling

3. **Messages not sending**
   - Verify WebSocket connection status
   - Check network connectivity

## 🤝 Contributing

1. **Fork the repository**
2. **Create feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit changes** (`git commit -m 'Add amazing feature'`)
4. **Push to branch** (`git push origin feature/amazing-feature`)
5. **Open Pull Request**

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Next.js team** for the amazing framework
- **Vercel** for seamless deployment
- **Railway** for backend hosting
- **Prism.js** for syntax highlighting
- **Bunny.net** for video streaming

---

**Built with ❤️ using Next.js 14 and modern web technologies**

<!-- Build: 2025-10-19_10-30-15 -->