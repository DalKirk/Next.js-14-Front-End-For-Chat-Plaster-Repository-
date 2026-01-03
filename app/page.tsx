"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ResponsiveAvatar } from "@/components/ResponsiveAvatar";
import { StorageUtils } from "@/lib/storage-utils";
import { User } from "@/lib/types";
import toast from "react-hot-toast";
import {
  UserCircleIcon,
  ArrowRightIcon,
  ChatBubbleLeftRightIcon,
  SparklesIcon,
  PaperAirplaneIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import { AuthModal } from "@/components/auth/AuthModal";
import { apiClient } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus, oneDark, tomorrow, dracula } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check } from "lucide-react";

interface ContentItem {
  title: string;
  description: string;
  features: string[];
}

interface ClaudeMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const contentData: Record<string, ContentItem> = {
  services: {
    title: "Services",
    description:
      "We offer comprehensive digital solutions tailored to your business needs.",
    features: [
      "Web Development & Design",
      "Mobile App Development",
      "Cloud Infrastructure",
      "AI & Machine Learning",
      "DevOps & Automation",
    ],
  },
  portfolio: {
    title: "Portfolio",
    description: "Explore our award-winning projects spanning multiple industries.",
    features: [
      "150+ Completed Projects",
      "Fortune 500 Clients",
      "25+ Industry Awards",
      "Global Reach",
      "99% Client Satisfaction",
    ],
  },
  team: {
    title: "Team",
    description:
      "A diverse group of passionate creators, engineers, and strategists.",
    features: [
      "Penetration Testing Simulator",
      "15 Countries Represented",
      "100+ Years Combined Experience",
      "Remote-First Culture",
      "Continuous Learning",
    ],
  },
  blog: {
    title: "Blog",
    description:
      "Insights, tutorials, and thought leadership from our experts.",
    features: [
      "Weekly Tech Articles",
      "Case Study Deep Dives",
      "Industry Trend Analysis",
      "Tutorial Series",
      "Podcast Episodes",
    ],
  },
  careers: {
    title: "Careers",
    description:
      "Join a team that values innovation, creativity, and growth.",
    features: [
      "3 Open Positions",
      "Competitive Salary",
      "Remote Flexibility",
      "3D Gen",
    ],
  },
  about: {
    title: "About Us",
    description:
      "Founded in 2015, we've been pushing the boundaries of digital innovation.",
    features: [
      "User Profile",
      "Chat Rooms",
      "Community Focused",
      "Open Source Contributors",
      "Industry Leaders",
    ],
  },
  awards: {
    title: "Awards",
    description: "Recognition for excellence in design and development.",
    features: [
      "Snapshot Analyzer",
      "Awwwards Site of the Day",
      "CSS Design Awards",
      "Best Agency 2023",
      "Innovation Award",
    ],
  },
};

interface OrbitItemData {
  id: string;
  angle: number;
  radius: number;
  icon: string;
  title: string;
  desc: string;
  badge?: string;
  inner?: boolean;
}

const orbitItems: OrbitItemData[] = [
  { id: "services", angle: 0, radius: 300, icon: "●", title: "Services", desc: "Full-stack solutions" },
  { id: "portfolio", angle: 60, radius: 300, icon: "●", title: "Portfolio", desc: "Award-winning projects", badge: "NEW" },
  { id: "team", angle: 120, radius: 300, icon: "●", title: "Team", desc: "Meet the crew" },
  { id: "blog", angle: 180, radius: 300, icon: "●", title: "Blog", desc: "Latest insights" },
  { id: "careers", angle: 300, radius: 300, icon: "●", title: "Careers", desc: "Join our team", badge: "3" },
  { id: "about", angle: 30, radius: 160, icon: "●", title: "About", desc: "Our story", inner: true },
  { id: "awards", angle: 270, radius: 160, icon: "●", title: "Awards", desc: "Recognition", inner: true },
];

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [viewportScale, setViewportScale] = useState(1);
  const [touchedButton, setTouchedButton] = useState<string | null>(null);
  
  // Claude AI State
  const [claudeMessages, setClaudeMessages] = useState<ClaudeMessage[]>([]);
  const [claudeInput, setClaudeInput] = useState('');
  const [isClaudeTyping, setIsClaudeTyping] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [aiHealth, setAiHealth] = useState<{ ai_enabled: boolean } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [codeTheme] = useState<'vscDarkPlus' | 'oneDark' | 'tomorrow' | 'dracula'>('vscDarkPlus');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const themeMap: Record<string, any> = { vscDarkPlus, oneDark, tomorrow, dracula };

  const hubSystemRef = useRef<HTMLDivElement>(null);
  const connectionsRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    StorageUtils.cleanup();

    const storedUser = localStorage.getItem("chat-user");
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setCurrentUser(userData);
      } catch (error) {
        console.error("Error parsing stored user:", error);
        localStorage.removeItem("chat-user");
      }
    }

    const storedProfile = localStorage.getItem("userProfile");
    if (storedProfile) {
      try {
        const profile = JSON.parse(storedProfile);
        if (profile.avatar) {
          setUserAvatar(profile.avatar);
        }
      } catch (error) {
        console.error("Error parsing user profile:", error);
      }
    }
  }, []);

  useEffect(() => {
    // Compute scale based on container size and apply CSS variables
    let localScale = 1;
    let ringInnerRadius = 0;
    let ringOuterRadius = 0;

    const updateLayoutMetrics = () => {
      const container = hubSystemRef.current;
      if (!container) return;
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      const baseW = 1200;
      const baseH = 800;
      localScale = Math.min(cw / baseW, ch / baseH);
      // Clamp scale (allow smaller on narrow screens like 320px)
      const minScale = cw < 480 ? 0.32 : 0.6;
      localScale = Math.max(minScale, Math.min(localScale, 1.25));
      setViewportScale(localScale);
      const hubSize = 280 * localScale;
      const marginHub = 24 * localScale; // spacing from hub
      const marginBetweenCards = 24 * localScale; // spacing between neighbors
      const innerCardSize = 140 * localScale;
      const outerCardSize = 160 * localScale;
      const innerCardHalf = innerCardSize / 2;
      const outerCardHalf = outerCardSize / 2;
      const minInnerRadiusHub = hubSize / 2 + innerCardHalf + marginHub;
      const minOuterRadiusHub = hubSize / 2 + outerCardHalf + marginHub;

      // Angular spacing constraints: chord length c = 2R sin(Δ/2) >= cardSize + marginBetweenCards
      const degToRad = (d: number) => (d * Math.PI) / 180;
      const innerDelta = 120; // 3 items on inner ring
      const outerDelta = 60; // 6 items on outer ring
      const minInnerRadiusSep = (innerCardSize + marginBetweenCards) / (2 * Math.sin(degToRad(innerDelta / 2)));
      const minOuterRadiusSep = (outerCardSize + marginBetweenCards) / (2 * Math.sin(degToRad(outerDelta / 2)));
      const minInnerRadius = Math.max(minInnerRadiusHub, minInnerRadiusSep);
      const minOuterRadius = Math.max(minOuterRadiusHub, minOuterRadiusSep);

      // Rings reflect minimum safe radii visually
      // Choose ring radii: honor base radii scaled, but ensure safety
      ringInnerRadius = Math.max(160 * localScale, minInnerRadius);
      ringOuterRadius = Math.max(300 * localScale, minOuterRadius);

      // Cross-ring radial gap: ensure inner vs outer ring cards don't touch
      const crossRingGap = (outerCardSize + innerCardSize) / 2 + 24 * localScale;
      if (ringOuterRadius < ringInnerRadius + crossRingGap) {
        ringOuterRadius = ringInnerRadius + crossRingGap;
      }

      // Add extra breathing room to the outer ring
      ringOuterRadius += 20 * localScale;

      // Clamp radii to fit within container bounds (avoid out-of-screen)
      const edgeMargin = 12 * localScale;
      const maxInnerRadius = Math.min(
        cw / 2 - innerCardHalf - edgeMargin,
        ch / 2 - innerCardHalf - edgeMargin
      );
      ringInnerRadius = Math.min(ringInnerRadius, Math.max(0, maxInnerRadius));

      const maxOuterRadius = Math.min(
        cw / 2 - outerCardHalf - edgeMargin,
        ch / 2 - outerCardHalf - edgeMargin
      );
      ringOuterRadius = Math.min(ringOuterRadius, Math.max(0, maxOuterRadius));

      const innerRingDiameter = Math.max(400 * localScale, 2 * ringInnerRadius);
      const outerRingDiameter = Math.max(700 * localScale, 2 * ringOuterRadius);

      container.style.setProperty('--inner-ring', `${innerRingDiameter}px`);
      container.style.setProperty('--outer-ring', `${outerRingDiameter}px`);
      container.style.setProperty('--hub-size', `${hubSize}px`);
      container.style.setProperty('--outer-card', `${160 * localScale}px`);
      container.style.setProperty('--inner-card', `${140 * localScale}px`);
    };

    const positionOrbitItems = () => {
      const items = document.querySelectorAll('.orbit-item');
      items.forEach((item) => {
        const htmlItem = item as HTMLElement;
        const angle = parseFloat(htmlItem.dataset.angle || '0');
        const isInner = htmlItem.dataset.inner === 'true';
        // Use uniform ring radius for consistency and even spacing
        const radius = isInner ? ringInnerRadius : ringOuterRadius;

        const radians = (angle - 90) * (Math.PI / 180);
        const x = radius * Math.cos(radians);
        const y = radius * Math.sin(radians);

        htmlItem.style.left = `calc(50% + ${x}px - ${htmlItem.offsetWidth / 2}px)`;
        htmlItem.style.top = `calc(50% + ${y}px - ${htmlItem.offsetHeight / 2}px)`;
      });
    };

    const createConnectionLines = () => {
      if (!connectionsRef.current) return;
      connectionsRef.current.innerHTML = '';

      orbitItems.forEach(item => {
        const line = document.createElement('div');
        line.className = 'connection-line';
        line.dataset.target = item.id;
        connectionsRef.current?.appendChild(line);
      });
    };

    const updateConnectionLines = () => {
      const hubElement = document.querySelector('.center-hub');
      const containerElement = connectionsRef.current;

      if (!hubElement || !containerElement) return;

      const hubRect = hubElement.getBoundingClientRect();
      const containerRect = containerElement.getBoundingClientRect();
      const hubCenterX = hubRect.left + hubRect.width / 2 - containerRect.left;
      const hubCenterY = hubRect.top + hubRect.height / 2 - containerRect.top;

      document.querySelectorAll('.connection-line').forEach(line => {
        const htmlLine = line as HTMLElement;
        const targetId = htmlLine.dataset.target;
        const targetItem = document.querySelector(`[data-id="${targetId}"]`);

        if (targetItem) {
          const itemRect = targetItem.getBoundingClientRect();
          const itemCenterX = itemRect.left + itemRect.width / 2 - containerRect.left;
          const itemCenterY = itemRect.top + itemRect.height / 2 - containerRect.top;

          const dx = itemCenterX - hubCenterX;
          const dy = itemCenterY - hubCenterY;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);

          htmlLine.style.width = `${length}px`;
          htmlLine.style.left = `${hubCenterX}px`;
          htmlLine.style.top = `${hubCenterY}px`;
          htmlLine.style.transform = `rotate(${angle}deg)`;
        }
      });
    };

    updateLayoutMetrics();
    positionOrbitItems();
    createConnectionLines();
    updateConnectionLines();

    const interval = setInterval(updateConnectionLines, 50);

    const handleResize = () => {
      updateLayoutMetrics();
      positionOrbitItems();
      updateConnectionLines();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleLogin = async (credentials: { username: string; password: string }) => {
    setIsAuthLoading(true);
    try {
      const { user, token } = await apiClient.login(
        credentials.username,
        credentials.password
      );
      setCurrentUser(user);
      localStorage.setItem("chat-user", JSON.stringify(user));
      localStorage.setItem("auth-token", token);
      toast.success(`Welcome back, ${user.username}!`);
      setShowAuthModal(false);
      // Redirect to chat after successful login
      router.push("/chat");
    } catch (error) {
      console.error("Login error:", error);
      toast.error(error instanceof Error ? error.message : "Login failed");
      throw error;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignUp = async (credentials: {
    username: string;
    email: string;
    password: string;
  }) => {
    setIsAuthLoading(true);
    try {
      const { user, token } = await apiClient.signup(
        credentials.username,
        credentials.email,
        credentials.password
      );
      setCurrentUser(user);
      localStorage.setItem("chat-user", JSON.stringify(user));
      localStorage.setItem("auth-token", token);
      toast.success(`Account created! Welcome, ${user.username}!`);
      setShowAuthModal(false);
      router.push("/profile?edit=true");
    } catch (error) {
      console.error("Signup error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create account"
      );
      throw error;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("auth-token");
      if (token) {
        await apiClient.logout();
      }
      setCurrentUser(null);
      setUserAvatar(null);
      localStorage.removeItem("chat-user");
      localStorage.removeItem("auth-token");
      localStorage.removeItem("userProfile");
      toast.success("Logged out successfully");
      setShowUserMenu(false);
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to logout");
    }
  };

  // Claude AI Functions
  const AI_SYSTEM_PROMPT = `You are the Starcyeed AI assistant. Do not self-identify as "Claude" or mention model/provider names unless explicitly asked. Avoid greetings like "Hi" or "I'm ...". Be concise, friendly, and helpful. Focus on answering the user's question directly, with code blocks where useful.`;

  const stripSelfIdentificationIntro = (text: string): string => {
    const lines = text.split('\n');
    let removeCount = 0;
    const isGreeting = (s: string) => /\b(hi|hello|hey)\b/i.test(s);
    const isClaudeIntro = (s: string) => /\bi'?m\s+claude\b/i.test(s) || /\ban\s+ai\s+assistant\b/i.test(s);
    for (let i = 0; i < Math.min(2, lines.length); i++) {
      const s = lines[i].trim();
      if (i === 0 && isGreeting(s)) {
        removeCount++;
        continue;
      }
      if (isClaudeIntro(s)) {
        removeCount++;
        continue;
      }
      break;
    }
    if (removeCount > 0) {
      return lines.slice(removeCount).join('\n').trimStart();
    }
    return text;
  };
  const checkAIHealth = async () => {
    try {
      const response = await fetch('/api/health');
      const health = await response.json();
      setAiHealth(health);
    } catch (error) {
      console.error('AI health check failed:', error);
      setAiHealth({ ai_enabled: false });
    }
  };
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [claudeMessages]);

  useEffect(() => {
    checkAIHealth();
  }, []);

  const handleAskClaude = async () => {
    if (!claudeInput.trim()) return;
    if (aiHealth && !aiHealth.ai_enabled) {
      toast.error('AI is offline');
      return;
    }
    
    const userMessage: ClaudeMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: claudeInput.trim(),
      timestamp: new Date()
    };
    
    setClaudeMessages(prev => [...prev, userMessage]);
    const promptText = claudeInput.trim();
    setClaudeInput('');
    setIsClaudeTyping(true);
    
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: ClaudeMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    };
    setClaudeMessages(prev => [...prev, assistantMessage]);
    
    try {
      // Build conversation history from claudeMessages
      const conversation_history = claudeMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await fetch('/api/ai-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: promptText,
          conversation_history: conversation_history,
          conversation_id: `conv_${Date.now()}`, // Generate conversation ID
          enable_search: true,
          system_prompt: AI_SYSTEM_PROMPT
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let hasError = false;
      let buffer = '';

      if (reader) {
        console.log('📍 Starting to read streaming response...');
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log('📍 Stream reading complete');
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            console.log('📍 Processing line:', line);
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6);
            console.log('📍 Raw data from backend:', data);
            if (data === '[DONE]') {
              console.log('📍 Received [DONE] signal');
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              console.log('📍 Parsed data on home page:', parsed);

              // Handle error responses
              if (parsed.error) {
                console.error('❌ AI Error:', parsed.error);
                const errorMsg = `⚠️ AI Error: ${parsed.error}\n\nPlease try again or contact support if the issue persists.`;
                setClaudeMessages(prev => 
                  prev.map(msg => 
                    msg.id === assistantMessageId
                      ? { ...msg, content: errorMsg }
                      : msg
                  )
                );
                hasError = true;
                break;
              }

              // Handle content updates
              if (parsed.content || parsed.text) {
                let newContent = parsed.content || parsed.text;
                if (!fullContent) {
                  newContent = stripSelfIdentificationIntro(newContent);
                }
                fullContent += newContent;
                setClaudeMessages(prev => 
                  prev.map(msg => 
                    msg.id === assistantMessageId
                      ? { ...msg, content: fullContent }
                      : msg
                  )
                );
              }
            } catch (e) {
              console.warn('Failed to parse streaming data:', e);
            }
          }

          if (hasError) break;
        }
      }
    } catch (error) {
      console.error('❌ Error sending message:', error);
      const errorMsg = `⚠️ Network Error: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease check your connection and try again.`;
      setClaudeMessages(prev => 
        prev.map(msg => 
          msg.id === assistantMessageId
            ? { ...msg, content: errorMsg }
            : msg
        )
      );
    } finally {
      setIsClaudeTyping(false);
    }
  };

  const handleClaudeKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAskClaude();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent">
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLogin={handleLogin}
        onSignUp={handleSignUp}
        isLoading={isAuthLoading}
      />

      {/* Side index tabs (quick open detail panels) */}
      <div className="fixed left-0 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2">
        {orbitItems.map((item) => {
          const isActive = activeItem === item.id;
          const isTouched = touchedButton === item.id;
          
          return (
            <button
              key={`tab-${item.id}`}
              onClick={() => setActiveItem(item.id)}
              onTouchStart={(e) => {
                setTouchedButton(item.id);
              }}
              onTouchEnd={(e) => {
                setTimeout(() => setTouchedButton(null), 200);
              }}
              onMouseEnter={() => setTouchedButton(item.id)}
              onMouseLeave={() => setTouchedButton(null)}
              style={
                isActive
                  ? { width: '14rem' }
                  : isTouched
                  ? { width: '11rem' }
                  : undefined
              }
              className={
                "index-tab-button group flex items-center gap-2 overflow-hidden rounded-r-2xl rounded-l-none pl-2 pr-3 py-2 text-left text-xs sm:text-sm backdrop-blur-xl transition-[transform,background-color,border-color,box-shadow,width] duration-200 " +
                // Width and transform (fallback)
                (isActive
                  ? "w-48 sm:w-56 translate-x-2 "
                  : "w-11 sm:w-12 active:w-44 hover:w-44 sm:hover:w-52 active:translate-x-1 hover:translate-x-1 ") +
                // Colors and effects
                (isActive
                  ? "bg-[#9333ea]/15 border border-[#8a2be2]/50 text-slate-100 shadow-[0_0_24px_rgba(147,51,234,0.25)]"
                  : isTouched
                  ? "bg-[#9333ea]/10 border border-[#9333ea]/40 text-slate-300"
                  : "bg-[#0a0a0f]/60 border border-[#4b0082]/40 text-slate-300 hover:bg-[#9333ea]/10 hover:border-[#9333ea]/40 active:bg-[#9333ea]/15 active:border-[#8a2be2]/40")
              }
              aria-label={`Open ${item.title} details`}
              title={item.title}
              type="button"
            >
              <span className="text-base sm:text-lg leading-none shrink-0">{item.icon}</span>
              <span 
                style={
                  isTouched || isActive ? { opacity: 1 } : undefined
                }
                className="tab-text whitespace-nowrap font-semibold tracking-wide transition-opacity duration-200 opacity-0 group-hover:opacity-100 group-active:opacity-100"
              >
                {item.title}
              </span>
              {item.badge && (
                <span 
                  style={
                    isTouched || isActive ? { opacity: 1 } : undefined
                  }
                  className="tab-badge ml-auto rounded-full bg-cyan-400/90 px-2 py-0.5 text-[10px] font-bold text-black transition-opacity duration-200 opacity-0 group-hover:opacity-100 group-active:opacity-100"
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {activeItem && (
          <button
            onClick={() => setActiveItem(null)}
            onTouchStart={() => setTouchedButton('close')}
            onTouchEnd={() => setTimeout(() => setTouchedButton(null), 200)}
            onMouseEnter={() => setTouchedButton('close')}
            onMouseLeave={() => setTouchedButton(null)}
            style={
              touchedButton === 'close' ? { width: '11rem' } : undefined
            }
            className="index-tab-button mt-2 group flex items-center gap-2 overflow-hidden rounded-r-2xl rounded-l-none pl-2 pr-3 py-2 text-xs sm:text-sm bg-[#0a0a0f]/60 border border-[#4b0082]/40 text-slate-300 hover:bg-[#9333ea]/10 hover:border-[#9333ea]/40 hover:text-slate-100 transition-[transform,width] duration-200 w-11 sm:w-12 hover:w-44 sm:hover:w-52 hover:translate-x-1 active:w-44 active:translate-x-1 active:bg-[#9333ea]/15 active:border-[#8a2be2]/40"
            aria-label="Close details panel"
            title="Close"
            type="button"
          >
            <span className="text-base sm:text-lg leading-none shrink-0">×</span>
            <span 
              style={
                touchedButton === 'close' ? { opacity: 1 } : undefined
              }
              className="tab-text whitespace-nowrap font-semibold tracking-wide transition-opacity duration-200 opacity-0 group-hover:opacity-100 group-active:opacity-100"
            >Close</span>
          </button>
        )}
      </div>

      {/* Background handled globally in RootLayout */}

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-0 left-0 right-0 z-50 bg-transparent p-3 sm:p-4"
      >
        <div className="fixed -top-2 left-0 z-50 p-4 sm:p-6">
          <div className="relative h-[80px] w-[200px] sm:h-[120px] sm:w-[300px] overflow-hidden">
            <Image
              src="/FullLogo_Transparent (3).png"
              alt="Starcyeed"
              fill
              priority
              unoptimized
              sizes="(max-width: 640px) 200px, 300px"
              style={{ objectPosition: "center center", transform: "scale(1.2)" }}
              className="object-cover"
            />
          </div>
        </div>

        {currentUser && (
          <div className="absolute right-4 top-8 -translate-y-1/2">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="bg-transparent border-none p-2 cursor-pointer"
            >
              <div className="w-6 h-5 flex flex-col justify-between">
                <div className="w-full h-0.5 bg-cyan-400 rounded-full shadow-[0_0_12px_rgba(34,211,238,0.9)]"></div>
                <div className="w-full h-0.5 bg-cyan-400 rounded-full shadow-[0_0_12px_rgba(34,211,238,0.9)]"></div>
                <div className="w-full h-0.5 bg-cyan-400 rounded-full shadow-[0_0_12px_rgba(34,211,238,0.9)]"></div>
              </div>
            </button>

            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute right-0 mt-2 bg-black/90 backdrop-blur-xl border border-slate-700/50 rounded-xl p-3 space-y-2 min-w-[200px] shadow-[0_20px_60px_rgba(0,0,0,0.9)] z-50"
              >
                <div className="px-3 py-2 border-b border-slate-700/50">
                  <div className="flex items-center gap-2">
                    {userAvatar ? (
                      <div className="relative w-5 h-5 rounded-full overflow-hidden border border-cyan-400/50">
                        <ResponsiveAvatar
                          avatarUrls={{
                            thumbnail: userAvatar,
                            small: userAvatar,
                            medium: userAvatar,
                            large: userAvatar,
                          }}
                          username={currentUser!.username}
                          size="small"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <UserCircleIcon className="w-5 h-5 text-cyan-300" />
                    )}
                    <span className="text-slate-300 font-medium text-sm">
                      {currentUser!.username}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    router.push("/profile");
                    setShowUserMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-slate-400 hover:text-slate-300 hover:bg-cyan-500/15 rounded-lg transition-all flex items-center gap-2"
                >
                  <UserCircleIcon className="w-4 h-4" />
                  Profile
                </button>
                <button
                  onClick={() => {
                    router.push("/chat");
                    setShowUserMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-slate-400 hover:text-slate-300 hover:bg-cyan-500/15 rounded-lg transition-all flex items-center gap-2"
                >
                  <ChatBubbleLeftRightIcon className="w-4 h-4" />
                  Rooms
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-all flex items-center gap-2 border-t border-slate-700/50 mt-2 pt-3"
                >
                  <ArrowRightIcon className="w-4 h-4 rotate-180" />
                  Logout
                </button>
              </motion.div>
            )}
          </div>
        )}

        {!currentUser && (
          <div className="absolute right-4 top-16 sm:top-20 flex flex-col items-end gap-2">
            <a
              href="/ai-chat"
              className="bg-gradient-to-r from-[#0096ff] to-[#00ffcc] text-black font-semibold px-4 py-2 rounded-lg hover:shadow-[0_0_20px_rgba(0,150,255,0.5)] transition-all duration-300 hover:scale-105 text-sm"
              aria-label="Open AI Chat"
            >
              AI Chat
            </a>
            <button
              onClick={() => setShowAuthModal(true)}
              className="bg-gradient-to-r from-[#00ffcc] to-[#0096ff] text-black font-semibold px-4 py-2 rounded-lg hover:shadow-[0_0_20px_rgba(0,255,204,0.5)] transition-all duration-300 hover:scale-105 text-sm"
              title="Login"
            >
              Login
            </button>
          </div>
        )}
      </motion.header>

      {/* Main Container */}
      <div className="pt-[92px] sm:pt-20 min-h-screen flex items-center justify-center p-3 sm:p-4 z-10 relative">
        <div
          ref={hubSystemRef}
          className="relative w-full max-w-[1200px] h-[calc(100vh-120px)] max-h-[800px] flex items-center justify-center"
        >
          {/* Orbital rings removed (replaced by background effect) */}

          {/* Center visual removed (Lottie)
              Keeping space for future non-blocking visual */}
        </div>
      </div>

      {/* Detail panel (CSS-based toggle) */}
      <div className={`detail-panel ${activeItem ? 'active' : ''}`}>
        <button className="detail-close" onClick={() => setActiveItem(null)}>×</button>
        {activeItem && contentData[activeItem] && (
          <div className="detail-content">
            <h2>{contentData[activeItem].title}</h2>
            {/* Text description and feature list removed per request */}
            <div className="space-y-3">
              {activeItem === 'awards' && (
                <button
                  onClick={() => {
                    window.location.href = '/image-analysis';
                  }}
                  className="block w-full py-3 px-6 bg-gradient-to-r from-[#8a2be2] to-[#9333ea] text-white font-bold rounded-lg hover:shadow-[0_0_30px_rgba(147,51,234,0.5)] transition-all duration-300 hover:scale-105 cursor-pointer text-center"
                >
                  Launch Snapshot Analyzer
                </button>
              )}
              {activeItem === 'about' && (
                <>
                  <button
                    onClick={() => {
                      window.location.href = '/profile';
                    }}
                    className="block w-full py-3 px-6 bg-gradient-to-r from-[#8a2be2] to-[#9333ea] text-white font-bold rounded-lg hover:shadow-[0_0_30px_rgba(147,51,234,0.5)] transition-all duration-300 hover:scale-105 cursor-pointer text-center"
                  >
                    Open User Profile
                  </button>
                  <button
                    onClick={() => {
                      if (currentUser) {
                        window.location.href = '/chat';
                      } else {
                        setShowAuthModal(true);
                      }
                    }}
                    className="block w-full py-3 px-6 bg-gradient-to-r from-[#8a2be2] to-[#9333ea] text-white font-bold rounded-lg hover:shadow-[0_0_30px_rgba(147,51,234,0.5)] transition-all duration-300 hover:scale-105 cursor-pointer text-center"
                  >
                    {currentUser ? 'Launch Chat Rooms' : 'Join Chat Rooms'}
                  </button>
                </>
              )}
              {activeItem === 'team' && (
                <button
                  onClick={() => {
                    window.location.href = '/pentest-simulator';
                  }}
                  className="block w-full py-3 px-6 bg-gradient-to-r from-[#8a2be2] to-[#9333ea] text-white font-bold rounded-lg hover:shadow-[0_0_30px_rgba(147,51,234,0.5)] transition-all duration-300 hover:scale-105 cursor-pointer text-center"
                >
                  Launch Pentest Simulator
                </button>
              )}
              {activeItem === 'careers' && (
                <button
                  onClick={() => {
                    window.location.href = '/3d-generator';
                  }}
                  className="block w-full py-3 px-6 bg-gradient-to-r from-[#8a2be2] to-[#9333ea] text-white font-bold rounded-lg hover:shadow-[0_0_30px_rgba(147,51,234,0.5)] transition-all duration-300 hover:scale-105 cursor-pointer text-center"
                >
                  Launch 3D Gen
                </button>
              )}
            </div>
            {activeItem === 'careers' && (
              <>
                <button
                  onClick={() => {
                    console.log('Navigating to game builder...');
                    window.location.href = '/game-builder';
                  }}
                  className="block mt-6 w-full py-3 px-6 bg-gradient-to-r from-[#8a2be2] to-[#9333ea] text-white font-bold rounded-lg hover:shadow-[0_0_30px_rgba(147,51,234,0.5)] transition-all duration-300 hover:scale-105 cursor-pointer text-center"
                >
                  Launch Pluto Game Builder
                </button>
                <button
                  onClick={() => {
                    console.log('Navigating to tile editor...');
                    window.location.href = '/advanced-features-demo?tab=tiles';
                  }}
                  className="block mt-4 w-full py-3 px-6 bg-gradient-to-r from-[#8a2be2] to-[#9333ea] text-white font-bold rounded-lg hover:shadow-[0_0_30px_rgba(147,51,234,0.5)] transition-all duration-300 hover:scale-105 cursor-pointer text-center"
                >
                  Launch Tile Editor
                </button>
                <button
                  onClick={() => {
                    console.log('Navigating to sprite editor...');
                    window.location.href = '/advanced-features-demo?tab=sprites';
                  }}
                  className="block mt-4 w-full py-3 px-6 bg-gradient-to-r from-[#8a2be2] to-[#9333ea] text-white font-bold rounded-lg hover:shadow-[0_0_30px_rgba(147,51,234,0.5)] transition-all duration-300 hover:scale-105 cursor-pointer text-center"
                >
                  Launch Sprite Editor
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Embedded AI Chat Interface */}
      {isAIChatOpen && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:bottom-4 z-[2000] max-w-md md:w-96 pointer-events-auto">
          <div className="bg-gradient-to-br from-slate-900/95 to-indigo-900/95 backdrop-blur-xl rounded-xl border border-slate-700/50 shadow-2xl">
            {/* AI Chat Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
              <div className="flex items-center space-x-2">
                <SparklesIcon className="h-5 w-5 text-cyan-400" />
                <h3 className="text-sm font-semibold text-white">AI Assistant</h3>
                <div className={`w-2 h-2 rounded-full ${aiHealth?.ai_enabled ? 'bg-green-400' : 'bg-red-400'}`} />
              </div>
              <button
                onClick={() => setIsAIChatOpen(false)}
                className="p-1 hover:bg-slate-700/50 rounded-md transition-colors"
                title="Close AI Chat"
              >
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="h-64 overflow-y-auto p-4 space-y-3">
            {claudeMessages.length === 0 && (
              <div className="text-center text-slate-400 text-sm">
                Ask me anything! I can help with coding, research, and more.
              </div>
            )}
            
            {claudeMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg p-3 overflow-hidden ${
                    message.role === 'user'
                      ? 'bg-cyan-600 text-white'
                      : 'bg-slate-700/80 text-slate-100'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <div className="prose prose-sm prose-invert max-w-none break-words overflow-wrap-anywhere">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          a({ node, children, href, ...props }) {
                            return (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="neon-link"
                                {...props}
                              >
                                {children}
                              </a>
                            );
                          },
                          code({ className, children, ...props }: any) {
                            const inline = !className;
                            const match = /language-(\w+)/.exec(className || '');
                            const language = match ? match[1] : '';
                            const codeString = String(children).replace(/\n$/, '');
                            
                            if (!inline && language) {
                              return (
                                <div className="relative">
                                  <button
                                    onClick={() => copyToClipboard(codeString)}
                                    className="absolute top-2 right-2 p-1 rounded bg-slate-600 hover:bg-slate-500 text-white z-10"
                                    title="Copy code"
                                  >
                                    {copiedCode === codeString ? (
                                      <Check className="w-3 h-3" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                  <SyntaxHighlighter
                                    style={themeMap[codeTheme]}
                                    language={language}
                                    PreTag="div"
                                    className="text-xs rounded-md overflow-x-auto max-w-full"
                                    {...props}
                                  >
                                    {codeString}
                                  </SyntaxHighlighter>
                                </div>
                              );
                            } else {
                              return (
                                <code className={`${className} break-all overflow-wrap-anywhere`} {...props}>
                                  {children}
                                </code>
                              );
                            }
                          },
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere">{message.content}</p>
                  )}
                </div>
              </div>
            ))}
            
            {isClaudeTyping && (
              <div className="flex justify-start">
                <div className="bg-slate-700/80 rounded-lg p-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-slate-700/50">
            <div className="flex space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={claudeInput}
                onChange={(e) => setClaudeInput(e.target.value)}
                onKeyPress={handleClaudeKeyPress}
                placeholder="Ask AI anything..."
                disabled={isClaudeTyping || !!(aiHealth && !aiHealth.ai_enabled)}
                className="flex-1 bg-slate-800/80 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent disabled:opacity-50"
              />
              <button
                onClick={handleAskClaude}
                disabled={!claudeInput.trim() || isClaudeTyping || !!(aiHealth && !aiHealth.ai_enabled)}
                className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 transition-colors"
              >
                {isClaudeTyping ? (
                  <Cog6ToothIcon className="h-4 w-4 animate-spin text-cyan-400" />
                ) : (
                  <PaperAirplaneIcon className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      

      {/* AI Chat Toggle Button */}
      <button
        onClick={() => setIsAIChatOpen(!isAIChatOpen)}
        className="fixed bottom-28 right-4 sm:right-6 z-40 p-3 sm:p-4 bg-gradient-to-br from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 text-white rounded-full shadow-[0_0_20px_rgba(0,255,255,0.4)] hover:shadow-[0_0_30px_rgba(0,255,255,0.6)] transition backdrop-blur-sm transform hover:scale-110 active:scale-95"
        title={isAIChatOpen ? "Close AI Chat" : "Open AI Chat"}
      >
        <SparklesIcon className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      {/* Login button moved to header below AI Chat */}

      {/* Footer removed per request */}
    </div>
  );
}

