"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ResponsiveAvatar } from "@/components/ResponsiveAvatar";
import { StorageUtils } from "@/lib/storage-utils";
import { User } from "@/lib/types";
import toast from "react-hot-toast";
import {
  UserCircleIcon,
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
import {
  Copy, Check, ChevronRight, X,
  Image as ImageIcon, Box, Video, Bot,
  MessageSquare, ShoppingCart, Gamepad2,
  Shield, Camera, Palette, User as UserIcon, LogOut,
} from "lucide-react";

/* ─── Types ─── */
interface ClaudeMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

/* ─── Feature data ─── */
const features = [
  {
    id: "image-gen",
    tag: "AI IMAGE",
    title: "Image Generation",
    desc: "Create stunning visuals from text prompts. Photorealistic, artistic, or abstract — powered by Flux.",
    borderGradient: "linear-gradient(135deg, #7c3aed, #ec4899, #f43f5e)",
    glowColor: "rgba(168,85,247,0.2)",
    accentColor: "#c084fc",
    icon: <ImageIcon className="w-5 h-5" />,
    stat: "~2s per image",
    badge: "NEW" as string | null,
    badgeStyle: { border: "1px solid rgba(34,211,238,0.4)", color: "#22d3ee", background: "rgba(34,211,238,0.08)" },
    href: "/3d-generator",
  },
  {
    id: "3d-gen",
    tag: "AI 3D",
    title: "3D Model Generation",
    desc: "Transform any image into a fully textured 3D model. Export GLB for games, AR, and web.",
    borderGradient: "linear-gradient(135deg, #06b6d4, #3b82f6, #6366f1)",
    glowColor: "rgba(6,182,212,0.2)",
    accentColor: "#67e8f9",
    icon: <Box className="w-5 h-5" />,
    stat: "~10-45s per model",
    badge: null,
    badgeStyle: {},
    href: "/3d-generator",
  },
  {
    id: "video-gen",
    tag: "AI VIDEO",
    title: "Video Generation",
    desc: "Bring images to life. Generate cinematic video clips from text or images with Wan2.1.",
    borderGradient: "linear-gradient(135deg, #f59e0b, #ef4444, #ec4899)",
    glowColor: "rgba(245,158,11,0.2)",
    accentColor: "#fbbf24",
    icon: <Video className="w-5 h-5" />,
    stat: "~2-4 min per clip",
    badge: "COMING SOON",
    badgeStyle: { border: "1px solid rgba(251,191,36,0.4)", color: "#fbbf24", background: "rgba(251,191,36,0.08)" },
    href: "#",
  },
  {
    id: "ai-chat",
    tag: "AI ASSISTANT",
    title: "Agentic AI",
    desc: "Ask anything. Get code, research, creative writing, and real-time answers with streaming AI.",
    borderGradient: "linear-gradient(135deg, #10b981, #06b6d4, #8b5cf6)",
    glowColor: "rgba(20,184,166,0.2)",
    accentColor: "#5eead4",
    icon: <Bot className="w-5 h-5" />,
    stat: "Streaming responses",
    badge: "COMING SOON",
    badgeStyle: { border: "1px solid rgba(251,191,36,0.4)", color: "#fbbf24", background: "rgba(251,191,36,0.08)" },
    href: "/ai-chat",
  },
];

const secondaryFeatures = [
  { title: "Chat Rooms", desc: "Live video & text rooms", icon: <MessageSquare className="w-5 h-5" />, gradient: "linear-gradient(135deg, #06b6d4, #8b5cf6)", href: "/chat", requiresAuth: true },
  { title: "Marketplace", desc: "Buy & sell digital assets", icon: <ShoppingCart className="w-5 h-5" />, gradient: "linear-gradient(135deg, #8b5cf6, #ec4899)", href: "/marketplace", requiresAuth: false },
  { title: "Game Builder", desc: "Build 2D games with Pluto", icon: <Gamepad2 className="w-5 h-5" />, gradient: "linear-gradient(135deg, #f59e0b, #ef4444)", href: "/game-builder", requiresAuth: false },
  { title: "Pentest Sim", desc: "Cybersecurity training", icon: <Shield className="w-5 h-5" />, gradient: "linear-gradient(135deg, #10b981, #06b6d4)", href: "/pentest-simulator", requiresAuth: false },
  { title: "Snapshot Analyzer", desc: "AI image analysis", icon: <Camera className="w-5 h-5" />, gradient: "linear-gradient(135deg, #3b82f6, #8b5cf6)", href: "/image-analysis", requiresAuth: false },
  { title: "Sprite Editor", desc: "Pixel art creation", icon: <Palette className="w-5 h-5" />, gradient: "linear-gradient(135deg, #ec4899, #f43f5e)", href: "/advanced-features-demo?tab=sprites", requiresAuth: false },
];

const sideMenuItems = [
  { id: "showcase", label: "Create", icon: "✦" },
  { id: "explore", label: "Explore", icon: "◈" },
  { id: "community", label: "Community", icon: "◉", href: "/chat", requiresAuth: true },
  { id: "profile", label: "Profile", icon: "◎", href: "/profile", requiresAuth: true },
  { id: "terms", label: "Terms", icon: "◇", href: "/terms", requiresAuth: false },
];

/* ─── Gradient border wrapper ─── */
function GradientBorderCard({
  gradient, glowColor, isHovered, children, onMouseEnter, onMouseLeave, className = "", onClick,
}: {
  gradient: string; glowColor: string; isHovered: boolean;
  children: React.ReactNode; onMouseEnter: () => void; onMouseLeave: () => void;
  className?: string; onClick?: () => void;
}) {
  return (
    <div
      className={`relative rounded-xl transition-all duration-500 ${className}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      style={{
        padding: 1,
        background: isHovered ? gradient : "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
        boxShadow: isHovered ? `0 0 40px ${glowColor}, 0 0 80px ${glowColor.replace("0.2", "0.08")}` : "none",
      }}
    >
      <div className="rounded-[11px] h-full" style={{ background: isHovered ? "rgba(8,8,15,0.95)" : "rgba(8,8,15,0.8)" }}>
        {children}
      </div>
    </div>
  );
}

function GradientBorderSmall({
  gradient, isHovered, children, onMouseEnter, onMouseLeave, onClick,
}: {
  gradient: string; isHovered: boolean; children: React.ReactNode;
  onMouseEnter: () => void; onMouseLeave: () => void; onClick?: () => void;
}) {
  return (
    <div
      className="relative rounded-lg transition-all duration-300 shrink-0"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      style={{
        padding: 1,
        width: 200,
        background: isHovered ? gradient : "linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
        boxShadow: isHovered ? "0 0 24px rgba(139,92,246,0.1)" : "none",
      }}
    >
      <div className="rounded-[7px] h-full" style={{ background: isHovered ? "rgba(12,12,24,0.95)" : "rgba(8,8,15,0.6)" }}>
        {children}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   HOMEPAGE
   ═══════════════════════════════════════════ */
export default function HomePage() {
  const router = useRouter();

  /* ── Auth state ── */
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  /* ── UI state ── */
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);
  const [hoveredSecondary, setHoveredSecondary] = useState<string | null>(null);
  const [activeSideItem, setActiveSideItem] = useState<string | null>(null);
  const [visibleSections, setVisibleSections] = useState(new Set<string>());
  const [heroVisible, setHeroVisible] = useState(false);

  /* ── AI Chat state ── */
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [claudeMessages, setClaudeMessages] = useState<ClaudeMessage[]>([]);
  const [claudeInput, setClaudeInput] = useState("");
  const [isClaudeTyping, setIsClaudeTyping] = useState(false);
  const [aiHealth, setAiHealth] = useState<{ ai_enabled: boolean } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [codeTheme] = useState<"vscDarkPlus" | "oneDark" | "tomorrow" | "dracula">("vscDarkPlus");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const themeMap: Record<string, any> = { vscDarkPlus, oneDark, tomorrow, dracula };

  /* ── Refs ── */
  const showcaseRef = useRef<HTMLElement>(null);
  const exploreRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* ═══════════════════════════════════════════
     AUTH & AVATAR EFFECTS (preserved from v1)
     ═══════════════════════════════════════════ */
  useEffect(() => {
    StorageUtils.cleanup();

    // Load avatar from dedicated storage
    try {
      const storedAvatar = localStorage.getItem("userAvatar");
      if (storedAvatar && typeof storedAvatar === "string" && storedAvatar.length > 0) {
        setUserAvatar(storedAvatar);
      }
    } catch {/* noop */}

    const storedUser = localStorage.getItem("chat-user");
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setCurrentUser(userData);
        const cached =
          (userData.avatar_urls &&
            (userData.avatar_urls.medium || userData.avatar_urls.small ||
              userData.avatar_urls.thumbnail || userData.avatar_urls.large)) ||
          userData.avatar_url;
        if (cached && typeof cached === "string") setUserAvatar((prev) => prev || cached);
      } catch (error) {
        console.error("Error parsing stored user:", error);
        localStorage.removeItem("chat-user");
      }
    }

    const storedProfile = localStorage.getItem("userProfile");
    if (storedProfile) {
      try {
        const profile = JSON.parse(storedProfile);
        if (profile.avatar) setUserAvatar((prev) => prev || profile.avatar);
      } catch {/* noop */}
    }

    // Live updates
    const onAvatarUpdated = (ev: Event) => {
      try {
        const detail = (ev as CustomEvent).detail || {};
        if (detail?.avatar && typeof detail.avatar === "string") {
          setUserAvatar(detail.avatar);
          try { localStorage.setItem("userAvatar", detail.avatar); } catch {/* noop */}
        }
      } catch {/* noop */}
    };
    const onProfileUpdated = (ev: Event) => {
      try {
        const detail = (ev as CustomEvent).detail || {};
        if (detail?.avatar && typeof detail.avatar === "string") setUserAvatar(detail.avatar);
        if (detail?.username && typeof detail.username === "string")
          setCurrentUser((prev) => (prev ? { ...prev, username: detail.username } : prev));
      } catch {/* noop */}
    };
    try {
      window.addEventListener("avatar-updated", onAvatarUpdated);
      window.addEventListener("profile-updated", onProfileUpdated);
    } catch {/* noop */}

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("avatar-updates");
      bc.onmessage = (msg) => {
        try {
          const detail = (msg as MessageEvent)?.data || {};
          if (detail?.avatar && typeof detail.avatar === "string") setUserAvatar(detail.avatar);
        } catch {/* noop */}
      };
    } catch {/* noop */}

    const onStorage = (e: StorageEvent) => {
      if (e.key === "userAvatar" && e.newValue) setUserAvatar(e.newValue);
    };
    try { window.addEventListener("storage", onStorage); } catch {/* noop */}

    return () => {
      try {
        window.removeEventListener("avatar-updated", onAvatarUpdated);
        window.removeEventListener("profile-updated", onProfileUpdated);
        window.removeEventListener("storage", onStorage);
      } catch {/* noop */}
      try { if (bc) { bc.close(); } } catch {/* noop */}
    };
  }, []);

  /* ── Scroll-based section reveal ── */
  useEffect(() => {
    setTimeout(() => setHeroVisible(true), 100);
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) setVisibleSections((prev) => { const next = new Set(Array.from(prev)); next.add(e.target.id); return next; });
        }),
      { threshold: 0.12 },
    );
    [showcaseRef, exploreRef, ctaRef].forEach((ref) => {
      if (ref.current) observer.observe(ref.current);
    });
    return () => observer.disconnect();
  }, []);

  /* ── AI health check ── */
  useEffect(() => {
    const checkAIHealth = async () => {
      try {
        const response = await fetch("/api/health");
        const health = await response.json();
        setAiHealth(health);
      } catch {
        setAiHealth({ ai_enabled: false });
      }
    };
    checkAIHealth();
  }, []);

  /* ── Auto-scroll chat ── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [claudeMessages]);

  /* ═══════════════════════════════════════════
     AUTH HANDLERS (preserved)
     ═══════════════════════════════════════════ */
  const handleLogin = async (credentials: { username: string; password: string }) => {
    setIsAuthLoading(true);
    try {
      const { user, token } = await apiClient.login(credentials.username, credentials.password);
      setCurrentUser(user);
      localStorage.setItem("chat-user", JSON.stringify((await import("@/lib/utils")).sanitizeUserForStorage(user)));
      localStorage.setItem("auth-token", token);
      toast.success(`Welcome back, ${user.username}!`);
      setShowAuthModal(false);
      router.push("/chat");
    } catch (error) {
      console.error("Login error:", error);
      toast.error(error instanceof Error ? error.message : "Login failed");
      throw error;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignUp = async (credentials: { username: string; email: string; password: string }) => {
    setIsAuthLoading(true);
    try {
      const { user, token } = await apiClient.signup(credentials.username, credentials.email, credentials.password);
      setCurrentUser(user);
      localStorage.setItem("chat-user", JSON.stringify((await import("@/lib/utils")).sanitizeUserForStorage(user)));
      localStorage.setItem("auth-token", token);
      toast.success(`Account created! Welcome, ${user.username}!`);
      setShowAuthModal(false);
      router.push("/profile?edit=true");
    } catch (error) {
      console.error("Signup error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create account");
      throw error;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("auth-token");
      if (token) await apiClient.logout();
      setCurrentUser(null);
      setUserAvatar(null);
      localStorage.removeItem("chat-user");
      localStorage.removeItem("auth-token");
      localStorage.removeItem("userProfile");
      toast.success("Logged out successfully");
      setShowMenu(false);
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to logout");
    }
  };

  /* ═══════════════════════════════════════════
     AI CHAT (streaming, preserved)
     ═══════════════════════════════════════════ */
  const AI_SYSTEM_PROMPT =
    "You are the Starcyeed AI assistant. Do not self-identify as \"Claude\" or mention model/provider names unless explicitly asked. Avoid greetings like \"Hi\" or \"I'm ...\". Be concise, friendly, and helpful. Focus on answering the user's question directly, with code blocks where useful.";

  const stripSelfIdentificationIntro = (text: string): string => {
    const lines = text.split("\n");
    let removeCount = 0;
    const isGreeting = (s: string) => /\b(hi|hello|hey|welcome|greetings)\b/i.test(s);
    const isSelfIntro = (s: string) => /\b(i\s*'?m|i\s*am|my\s*name\s*is)\b/i.test(s);
    const mentionsClaude = (s: string) => /\bclaude\b/i.test(s);
    const mentionsAssistant = (s: string) => /\ban\s+ai\s+assistant\b/i.test(s);
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      const s = lines[i].trim();
      if (i === 0 && isGreeting(s)) { removeCount++; continue; }
      if ((isSelfIntro(s) && (mentionsClaude(s) || mentionsAssistant(s))) || mentionsClaude(s)) { removeCount++; continue; }
      break;
    }
    let result = removeCount > 0 ? lines.slice(removeCount).join("\n").trimStart() : text;
    result = result.replace(/^\s*claude[:,]?\s*/i, "");
    return result;
  };

  const handleAskClaude = async () => {
    if (!claudeInput.trim()) return;
    if (aiHealth && !aiHealth.ai_enabled) { toast.error("AI is offline"); return; }

    const userMessage: ClaudeMessage = { id: Date.now().toString(), role: "user", content: claudeInput.trim(), timestamp: new Date() };
    setClaudeMessages((prev) => [...prev, userMessage]);
    const promptText = claudeInput.trim();
    setClaudeInput("");
    setIsClaudeTyping(true);

    const assistantMessageId = (Date.now() + 1).toString();
    setClaudeMessages((prev) => [...prev, { id: assistantMessageId, role: "assistant", content: "", timestamp: new Date() }]);

    try {
      const conversation_history = claudeMessages
        .filter((msg) => msg.content && msg.content.trim() !== "")
        .map((msg) => ({ role: msg.role, content: msg.content }));

      const response = await fetch("/api/ai-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: promptText,
          conversation_history,
          conversation_id: `conv_${Date.now()}`,
          enable_search: true,
          system_prompt: AI_SYSTEM_PROMPT,
        }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let hasError = false;
      let buffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.error) {
                const errorMsg = `⚠️ AI Error: ${parsed.error}\n\nPlease try again or contact support if the issue persists.`;
                setClaudeMessages((prev) => prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, content: errorMsg } : msg)));
                hasError = true;
                break;
              }
              if (parsed.content || parsed.text) {
                let newContent = parsed.content || parsed.text;
                if (!fullContent) newContent = stripSelfIdentificationIntro(newContent);
                fullContent += newContent;
                setClaudeMessages((prev) => prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, content: fullContent } : msg)));
              }
            } catch {
              /* skip unparseable chunks */
            }
          }
          if (hasError) break;
        }
      }
    } catch (error) {
      const errorMsg = `⚠️ Network Error: ${error instanceof Error ? error.message : "Unknown error"}\n\nPlease check your connection and try again.`;
      setClaudeMessages((prev) => prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, content: errorMsg } : msg)));
    } finally {
      setIsClaudeTyping(false);
    }
  };

  const handleClaudeKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAskClaude(); }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  /* ── Navigation helpers ── */
  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const navigateOrAuth = (href: string, requiresAuth: boolean) => {
    if (requiresAuth && !currentUser) {
      setShowAuthModal(true);
    } else {
      router.push(href);
    }
  };

  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */
  return (
    <div className="relative min-h-screen text-white overflow-x-hidden" style={{ background: "#030308" }}>
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLogin={handleLogin}
        onSignUp={handleSignUp}
        isLoading={isAuthLoading}
      />

      {/* ═══ AMBIENT ═══ */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute rounded-full" style={{ top: "-18%", left: "-10%", width: 600, height: 600, background: "radial-gradient(circle, rgba(124,58,237,0.07), transparent 65%)", filter: "blur(100px)" }} />
        <div className="absolute rounded-full" style={{ bottom: "-12%", right: "-10%", width: 500, height: 500, background: "radial-gradient(circle, rgba(6,182,212,0.06), transparent 65%)", filter: "blur(100px)" }} />
        <div className="absolute rounded-full" style={{ top: "50%", left: "50%", width: 400, height: 400, transform: "translate(-50%,-50%)", background: "radial-gradient(circle, rgba(139,92,246,0.03), transparent 60%)", filter: "blur(80px)" }} />
        <div className="absolute inset-0" style={{ opacity: 0.02, backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 4px)" }} />
        <div className="absolute left-0 right-0" style={{ top: "25%", height: 1, background: "linear-gradient(90deg, transparent 5%, rgba(6,182,212,0.1) 30%, rgba(139,92,246,0.1) 70%, transparent 95%)" }} />
        <div className="absolute left-0 right-0" style={{ top: "65%", height: 1, background: "linear-gradient(90deg, transparent 10%, rgba(139,92,246,0.07) 40%, rgba(6,182,212,0.07) 60%, transparent 90%)" }} />
      </div>

      {/* ═══ SIDE MENU (hidden on mobile) ═══ */}
      <nav className="fixed left-0 top-1/2 hidden sm:flex flex-col gap-1.5" style={{ transform: "translateY(-50%)", zIndex: 40 }}>
        {sideMenuItems.map((item) => {
          const active = activeSideItem === item.id;
          return (
            <button
              key={item.id}
              onMouseEnter={() => setActiveSideItem(item.id)}
              onMouseLeave={() => setActiveSideItem(null)}
              onClick={() => {
                if (item.href) {
                  navigateOrAuth(item.href, !!item.requiresAuth);
                } else {
                  scrollToSection(item.id);
                }
              }}
              className="flex items-center gap-2 rounded-r-xl transition-all duration-300 overflow-hidden"
              style={{
                width: active ? 140 : 40,
                padding: "8px 12px 8px 10px",
                background: active ? "rgba(139,92,246,0.06)" : "transparent",
                border: active ? "1px solid rgba(139,92,246,0.15)" : "1px solid transparent",
                backdropFilter: active ? "blur(20px)" : "none",
              }}
              aria-label={item.label}
              title={item.label}
            >
              <span className="shrink-0 text-sm transition-colors duration-200" style={{ color: active ? "#22d3ee" : "rgba(255,255,255,0.25)" }}>{item.icon}</span>
              <span className="text-xs font-medium tracking-wider whitespace-nowrap transition-opacity duration-200" style={{ opacity: active ? 1 : 0, color: "rgba(255,255,255,0.8)" }}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ═══ HEADER ═══ */}
      <header className="fixed top-0 left-0 right-0 px-4 py-3 flex items-center justify-between" style={{ zIndex: 50, background: "linear-gradient(180deg, rgba(3,3,8,0.9) 0%, transparent 100%)" }}>
        <Link href="/" className="flex items-center gap-2.5">
          <div className="relative h-[50px] w-[130px] sm:h-[70px] sm:w-[180px] overflow-hidden">
            <Image
              src="/FullLogo_Transparent (3).png"
              alt="Starcyeed"
              fill
              sizes="(max-width: 640px) 130px, 180px"
              style={{ objectPosition: "center center", transform: "scale(1.2)" }}
              className="object-cover"
            />
          </div>
        </Link>

        <div className="flex items-center gap-3">
          {!currentUser ? (
            <>
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-5 py-2 text-xs tracking-widest rounded transition-all duration-300 hover:shadow-[0_0_20px_rgba(34,211,238,0.1)] hover:bg-[rgba(34,211,238,0.08)] hover:border-[rgba(34,211,238,0.5)]"
                style={{ border: "1px solid rgba(34,211,238,0.3)", color: "#22d3ee", background: "transparent" }}
              >
                LOGIN
              </button>
            </>
          ) : (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-2 px-3 py-1.5 rounded transition-colors hover:bg-white/5"
                style={{ border: "1px solid rgba(255,255,255,0.1)" }}
              >
                {userAvatar ? (
                  <div className="w-6 h-6 rounded-full overflow-hidden border border-cyan-400/50">
                    <ResponsiveAvatar
                      avatarUrls={{ thumbnail: userAvatar, small: userAvatar, medium: userAvatar, large: userAvatar }}
                      username={currentUser.username}
                      size="small"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #06b6d4, #8b5cf6)" }}>
                    <span className="text-[10px] font-bold">{currentUser.username.charAt(0).toUpperCase()}</span>
                  </div>
                )}
                <span className="text-xs hidden sm:inline" style={{ color: "rgba(255,255,255,0.6)" }}>{currentUser.username}</span>
              </button>

              {showMenu && (
                <div
                  className="absolute right-0 mt-2 w-48 rounded-lg overflow-hidden shadow-2xl"
                  style={{ background: "rgba(10,10,20,0.95)", border: "1px solid rgba(139,92,246,0.12)", backdropFilter: "blur(20px)" }}
                >
                  <div className="px-4 py-2.5 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                    <div className="flex items-center gap-2">
                      {userAvatar ? (
                        <div className="relative w-5 h-5 rounded-full overflow-hidden border border-cyan-400/50">
                          <ResponsiveAvatar
                            avatarUrls={{ thumbnail: userAvatar, small: userAvatar, medium: userAvatar, large: userAvatar }}
                            username={currentUser.username}
                            size="small"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <UserCircleIcon className="w-5 h-5 text-cyan-300" />
                      )}
                      <span className="text-xs font-medium text-slate-300">{currentUser.username}</span>
                    </div>
                  </div>
                  {[
                    { label: "Profile", icon: <UserIcon className="w-3.5 h-3.5" />, href: "/profile" },
                    { label: "Edit Profile", icon: <UserCircleIcon className="w-3.5 h-3.5" />, href: "/profile?edit=true" },
                    { label: "Rooms", icon: <MessageSquare className="w-3.5 h-3.5" />, href: "/chat" },
                    { label: "Messages", icon: <MessageSquare className="w-3.5 h-3.5" />, href: "/messages" },
                    { label: "Agent", icon: <Bot className="w-3.5 h-3.5" />, href: "/ai-chat" },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={() => { router.push(item.href); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-xs transition-colors hover:bg-[rgba(139,92,246,0.06)] hover:text-white"
                      style={{ color: "rgba(255,255,255,0.5)" }}
                    >
                      {item.icon}{item.label}
                    </button>
                  ))}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-xs transition-colors hover:bg-[rgba(239,68,68,0.05)] hover:text-red-400"
                    style={{ color: "rgba(248,113,113,0.7)", borderTop: "1px solid rgba(255,255,255,0.05)" }}
                  >
                    <LogOut className="w-3.5 h-3.5" />Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ═══ HERO ═══ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-20 overflow-hidden">
        <div
          className="text-center transition-all duration-1000 w-full"
          style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? "translateY(0)" : "translateY(40px)" }}
        >
          {/* Scrolling Preview Bar */}
          <div className="w-full relative mb-8 overflow-hidden" style={{ maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)", WebkitMaskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)" }}>
            <div className="flex gap-5 py-4" style={{ animation: "marquee 35s linear infinite", width: "max-content" }}>
              {[
                { src: "/previews/image-gen.svg", alt: "Image Generation" },
                { src: "/previews/3d-gen.svg", alt: "3D Model Generator" },
                { src: "/previews/video-gen.svg", alt: "Video Generation" },
                { src: "/previews/ai-chat.svg?v=2", alt: "Agentic AI" },
                { src: "/previews/game-builder.svg", alt: "Game Builder" },
                { src: "/previews/snapshot.svg", alt: "Snapshot Analyzer" },
                { src: "/previews/sprite-editor.svg", alt: "Sprite Editor" },
                { src: "/previews/chat-rooms.svg", alt: "Chat Rooms" },
                { src: "/previews/image-gen.svg", alt: "Image Generation" },
                { src: "/previews/3d-gen.svg", alt: "3D Model Generator" },
                { src: "/previews/video-gen.svg", alt: "Video Generation" },
                { src: "/previews/ai-chat.svg?v=2", alt: "Agentic AI" },
                { src: "/previews/game-builder.svg", alt: "Game Builder" },
                { src: "/previews/snapshot.svg", alt: "Snapshot Analyzer" },
                { src: "/previews/sprite-editor.svg", alt: "Sprite Editor" },
                { src: "/previews/chat-rooms.svg", alt: "Chat Rooms" },
              ].map((item, i) => (
                <div key={i} className="flex-shrink-0 rounded-xl overflow-hidden transition-transform duration-300 hover:scale-105" style={{ width: 280, height: 182, boxShadow: "0 0 20px rgba(139,92,246,0.08)", position: "relative" }}>
                  <img src={item.src} alt={item.alt} className="w-full h-full object-cover" draggable={false} style={{ position: "relative", zIndex: 0 }} />
                  {item.alt === "Agentic AI" && (
                    <div style={{ position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 9999, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", background: "rgba(0,0,0,0.85)", border: "1.5px solid #f59e0b", color: "#f59e0b", zIndex: 20, whiteSpace: "nowrap" as const }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b", animation: "blink 1.4s ease-in-out infinite", boxShadow: "0 0 8px #f59e0b", display: "inline-block" }} />
                      COMING SOON
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <p className="text-sm sm:text-base max-w-lg mx-auto leading-relaxed mb-10" style={{ color: "rgba(255,255,255,0.3)" }}>
            Generate images, 3D models, and videos with open-source AI. Build games, chat in real-time, and explore a creative universe.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => scrollToSection("showcase")}
              className="group px-8 py-3.5 rounded-lg text-sm font-semibold tracking-wider transition-all duration-500 flex items-center gap-2 hover:shadow-[0_0_50px_rgba(139,92,246,0.35),0_0_100px_rgba(6,182,212,0.15)]"
              style={{ background: "linear-gradient(135deg, #06b6d4, #8b5cf6)", boxShadow: "0 0 25px rgba(139,92,246,0.2)" }}
            >
              EXPLORE TOOLS <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
            <button
              onClick={() => {
                if (currentUser) router.push("/chat");
                else setShowAuthModal(true);
              }}
              className="px-8 py-3.5 rounded-lg text-sm tracking-wider transition-all duration-300 hover:text-white hover:border-[rgba(139,92,246,0.4)] hover:bg-[rgba(139,92,246,0.05)]"
              style={{ border: "1px solid rgba(139,92,246,0.2)", color: "rgba(255,255,255,0.5)" }}
            >
              GET STARTED
            </button>
          </div>
        </div>
      </section>

      {/* ═══ AI FEATURE SHOWCASE ═══ */}
      <section id="showcase" ref={showcaseRef} className="relative py-28 px-4" style={{ zIndex: 1 }}>
        <div className="max-w-6xl mx-auto">
          <div
            className="mb-16 transition-all duration-700"
            style={{ opacity: visibleSections.has("showcase") ? 1 : 0, transform: visibleSections.has("showcase") ? "translateY(0)" : "translateY(20px)" }}
          >
            <div className="text-[10px] tracking-[0.5em] mb-3" style={{ color: "rgba(139,92,246,0.5)" }}>GENERATION SUITE</div>
            <h2 className="text-3xl sm:text-5xl font-bold" style={{ letterSpacing: "-0.03em" }}>AI Creation Tools</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {features.map((f, i) => (
              <GradientBorderCard
                key={f.id}
                gradient={f.borderGradient}
                glowColor={f.glowColor}
                isHovered={hoveredFeature === f.id}
                onMouseEnter={() => setHoveredFeature(f.id)}
                onMouseLeave={() => setHoveredFeature(null)}
                onClick={() => { if (f.href !== "#") router.push(f.href); }}
                className="cursor-pointer"
              >
                <div
                  className="p-6 sm:p-8"
                  style={{
                    opacity: visibleSections.has("showcase") ? 1 : 0,
                    transform: visibleSections.has("showcase") ? "translateY(0)" : "translateY(40px)",
                    transition: `all 0.6s ease ${i * 0.12}s`,
                  }}
                >
                  <div className="flex items-center justify-between mb-5 gap-2 flex-nowrap">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="shrink-0" style={{ color: hoveredFeature === f.id ? f.accentColor : "rgba(255,255,255,0.15)", transition: "color 0.3s" }}>{f.icon}</span>
                      <span className="text-[10px] tracking-[0.3em] truncate" style={{ color: "rgba(255,255,255,0.2)" }}>{f.tag}</span>
                    </div>
                    {f.badge && <span className="text-[9px] tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1.5 whitespace-nowrap shrink-0" style={f.badgeStyle}><span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#fbbf24", animation: "blink 1.4s ease-in-out infinite" }} />{f.badge}</span>}
                  </div>
                  <h3
                    className="text-xl sm:text-2xl font-bold mb-2.5 transition-colors duration-300"
                    style={{ color: hoveredFeature === f.id ? "white" : "rgba(255,255,255,0.85)" }}
                  >
                    {f.title}
                  </h3>
                  <p className="text-sm leading-relaxed mb-7 transition-colors duration-300" style={{ color: hoveredFeature === f.id ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.25)" }}>
                    {f.desc}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] tracking-wide" style={{ color: "rgba(255,255,255,0.12)" }}>{f.stat}</span>
                    <span className="text-xs tracking-wider flex items-center gap-1 transition-all duration-300" style={{ opacity: hoveredFeature === f.id ? 1 : 0, color: f.accentColor }}>
                      Launch <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </GradientBorderCard>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SECONDARY FEATURES ═══ */}
      <section id="explore" ref={exploreRef} className="relative py-20 px-4" style={{ zIndex: 1 }}>
        <div className="max-w-6xl mx-auto">
          <div
            className="mb-12 transition-all duration-700"
            style={{ opacity: visibleSections.has("explore") ? 1 : 0, transform: visibleSections.has("explore") ? "translateY(0)" : "translateY(20px)" }}
          >
            <div className="text-[10px] tracking-[0.5em] mb-3" style={{ color: "rgba(6,182,212,0.4)" }}>MORE TOOLS</div>
            <h2 className="text-2xl sm:text-4xl font-bold" style={{ letterSpacing: "-0.02em" }}>Explore the Platform</h2>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4" style={{ scrollbarWidth: "none" }}>
            {secondaryFeatures.map((f, i) => (
              <GradientBorderSmall
                key={f.title}
                gradient={f.gradient}
                isHovered={hoveredSecondary === f.title}
                onMouseEnter={() => setHoveredSecondary(f.title)}
                onMouseLeave={() => setHoveredSecondary(null)}
                onClick={() => navigateOrAuth(f.href, f.requiresAuth)}
              >
                <div
                  className="p-5 cursor-pointer"
                  style={{
                    opacity: visibleSections.has("explore") ? 1 : 0,
                    transform: visibleSections.has("explore") ? "translateX(0)" : "translateX(20px)",
                    transition: `all 0.5s ease ${i * 0.07}s`,
                  }}
                >
                  <div className="mb-3 transition-colors duration-300" style={{ color: hoveredSecondary === f.title ? "#22d3ee" : "rgba(255,255,255,0.2)" }}>{f.icon}</div>
                  <h4 className="text-sm font-semibold mb-1 transition-colors duration-300" style={{ color: hoveredSecondary === f.title ? "white" : "rgba(255,255,255,0.8)" }}>{f.title}</h4>
                  <p className="text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.25)" }}>{f.desc}</p>
                </div>
              </GradientBorderSmall>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section id="cta" ref={ctaRef} className="relative py-28 px-4" style={{ zIndex: 1 }}>
        <div
          className="max-w-2xl mx-auto text-center transition-all duration-700"
          style={{ opacity: visibleSections.has("cta") ? 1 : 0, transform: visibleSections.has("cta") ? "translateY(0)" : "translateY(20px)" }}
        >
          <div className="mx-auto mb-10" style={{ width: 60, height: 1, background: "linear-gradient(90deg, #06b6d4, #8b5cf6)" }} />
          <h2 className="text-3xl sm:text-5xl font-bold mb-4" style={{ letterSpacing: "-0.03em" }}>Start Creating</h2>
          <p className="text-sm mb-10" style={{ color: "rgba(255,255,255,0.25)" }}>Free to use. Open source AI. No watermarks.</p>
          <div style={{ padding: 1, borderRadius: 10, background: "linear-gradient(135deg, #06b6d4, #8b5cf6, #ec4899)", display: "inline-block" }}>
            <button
              onClick={() => {
                if (currentUser) scrollToSection("showcase");
                else setShowAuthModal(true);
              }}
              className="px-10 py-3.5 rounded-[9px] text-sm font-semibold tracking-wider transition-all duration-300 hover:bg-[rgba(139,92,246,0.1)]"
              style={{ background: "#030308" }}
            >
              {currentUser ? "GO TO DASHBOARD" : "CREATE ACCOUNT"}
            </button>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="py-8 px-4" style={{ borderTop: "1px solid rgba(139,92,246,0.06)" }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]" style={{ color: "rgba(255,255,255,0.15)" }}>
          <span>&copy; 2026 Starcyeed. All rights reserved.</span>
          <div className="flex gap-6">
            <Link href="/terms" className="transition-colors hover:text-white/40">Terms</Link>
            <Link href="/terms" className="transition-colors hover:text-white/40">Privacy</Link>
            <Link href="/ai-chat" className="transition-colors hover:text-white/40">AI Chat</Link>
          </div>
        </div>
      </footer>

      {/* ═══ AI CHAT WIDGET (full streaming) ═══ */}
      {isChatOpen && (
        <div className="fixed flex flex-col rounded-xl overflow-hidden shadow-2xl" style={{ bottom: 80, right: 16, left: "auto", zIndex: 2000, width: "min(360px, calc(100vw - 32px))", maxHeight: "65vh", background: "rgba(8,8,15,0.95)", border: "1px solid rgba(139,92,246,0.12)", backdropFilter: "blur(20px)" }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(139,92,246,0.08)" }}>
            <div className="flex items-center gap-2">
              <SparklesIcon className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-semibold">AI Assistant</span>
              <div className={`w-1.5 h-1.5 rounded-full ${aiHealth?.ai_enabled ? "bg-green-400" : "bg-red-400"}`} />
            </div>
            <button onClick={() => setIsChatOpen(false)} className="text-white/30 hover:text-white/60 transition-colors" aria-label="Close AI Chat">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: 200, maxHeight: "calc(65vh - 110px)" }}>
            {claudeMessages.length === 0 && (
              <div className="text-center text-xs py-8" style={{ color: "rgba(255,255,255,0.2)" }}>
                Ask me anything about the platform, coding, or AI generation.
              </div>
            )}
            {claudeMessages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-lg p-3 overflow-hidden ${message.role === "user" ? "bg-cyan-600 text-white" : "bg-slate-700/80 text-slate-100"}`}>
                  {message.role === "assistant" ? (
                    <div className="prose prose-sm prose-invert max-w-none break-words">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          a({ children, href, ...props }) {
                            return (<a href={href} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline" {...props}>{children}</a>);
                          },
                          code({ className, children, ...props }: any) {
                            const inline = !className;
                            const match = /language-(\w+)/.exec(className || "");
                            const language = match ? match[1] : "";
                            const codeString = String(children).replace(/\n$/, "");
                            if (!inline && language) {
                              return (
                                <div className="relative">
                                  <button onClick={() => copyToClipboard(codeString)} className="absolute top-2 right-2 p-1 rounded bg-slate-600 hover:bg-slate-500 text-white z-10" title="Copy code">
                                    {copiedCode === codeString ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                  <SyntaxHighlighter style={themeMap[codeTheme]} language={language} PreTag="div" className="text-xs rounded-md overflow-x-auto max-w-full" {...props}>
                                    {codeString}
                                  </SyntaxHighlighter>
                                </div>
                              );
                            }
                            return (<code className={`${className} break-all`} {...props}>{children}</code>);
                          },
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                  )}
                </div>
              </div>
            ))}
            {isClaudeTyping && (
              <div className="flex justify-start">
                <div className="bg-slate-700/80 rounded-lg p-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-2" style={{ borderTop: "1px solid rgba(139,92,246,0.08)" }}>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={claudeInput}
                onChange={(e) => setClaudeInput(e.target.value)}
                onKeyDown={handleClaudeKeyPress}
                placeholder="Ask anything..."
                disabled={isClaudeTyping || !!(aiHealth && !aiHealth.ai_enabled)}
                className="flex-1 px-3 py-2 rounded text-xs outline-none disabled:opacity-50"
                style={{ background: "rgba(139,92,246,0.04)", border: "1px solid rgba(139,92,246,0.1)", color: "white" }}
              />
              <button
                onClick={handleAskClaude}
                disabled={!claudeInput.trim() || isClaudeTyping || !!(aiHealth && !aiHealth.ai_enabled)}
                className="px-3 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "rgba(6,182,212,0.12)", border: "1px solid rgba(34,211,238,0.12)" }}
                aria-label="Send message"
              >
                {isClaudeTyping ? (
                  <Cog6ToothIcon className="w-4 h-4 animate-spin text-cyan-400" />
                ) : (
                  <PaperAirplaneIcon className="w-4 h-4 text-cyan-400" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat toggle */}
      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed rounded-full transition-all duration-300 hover:shadow-[0_0_25px_rgba(139,92,246,0.15)] hover:border-[rgba(139,92,246,0.4)]"
        style={{ bottom: 24, right: 16, zIndex: 40, padding: 12, background: "rgba(8,8,15,0.8)", border: "1px solid rgba(139,92,246,0.2)", backdropFilter: "blur(8px)" }}
        title={isChatOpen ? "Close AI Chat" : "Open AI Chat"}
        aria-label={isChatOpen ? "Close AI Chat" : "Open AI Chat"}
      >
        <SparklesIcon className="w-5 h-5 text-cyan-400" />
      </button>

      {/* Shimmer animation */}
      <style>{`
        @keyframes shimmer { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.2; } }
      `}</style>
    </div>
  );
}

