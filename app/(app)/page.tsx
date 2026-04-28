"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { ResponsiveAvatar } from "@/components/ResponsiveAvatar";
import { StorageUtils } from "@/lib/storage-utils";
import { User } from "@/lib/types";
import toast from "react-hot-toast";
import {
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { AuthModal } from "@/components/auth/AuthModal";
import { NotificationBellButton } from "@/components/PushNotificationProvider";
import { apiClient } from "@/lib/api";
import {
  ChevronRight,
  Image as ImageIcon, Box, Video, Bot,
  MessageSquare, ShoppingCart, Gamepad2,
  Camera, Palette, User as UserIcon, LogOut, Type,
  Sparkles,
} from "lucide-react";
const UnifiedAIPanel = dynamic(() => import("@/components/UnifiedAIPanel"), { ssr: false });

/* ─── Lazy Video (mounts <video> only when near viewport, unmounts when far away) ─── */
function LazyVideo({ src, className, style }: { src: string; className?: string; style?: React.CSSProperties }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isNear, setIsNear] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setIsNear(entry.isIntersecting),
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={containerRef} className={className} style={style}>
      {isNear ? (
        <video
          src={src}
          autoPlay
          preload="metadata"
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
          draggable={false}
        />
      ) : (
        <div className="w-full h-full banner-placeholder" />
      )}
    </div>
  );
}

/* ─── Feature data ─── */
const features = [
  {
    id: "image-gen",
    tag: "AI IMAGE",
    title: "Image Generation",
    desc: "Create stunning visuals from text prompts. Photorealistic, artistic, or abstract.",
    borderGradient: "linear-gradient(135deg, #7c3aed, #ec4899, #f43f5e)",
    glowColor: "rgba(168,85,247,0.2)",
    accentColor: "#c084fc",
    icon: <ImageIcon className="w-5 h-5" />,
    stat: "",
    badge: "ONLINE" as string | null,
    badgeStyle: { border: "1px solid rgba(57,255,20,0.4)", color: "#39ff14", background: "rgba(57,255,20,0.08)" },
    href: "/image-gen",
  },
  {
    id: "video-gen",
    tag: "AI VIDEO",
    title: "Video Generation",
    desc: "Bring images to life. Generate cinematic video clips from text or images.",
    borderGradient: "linear-gradient(135deg, #f59e0b, #ef4444, #ec4899)",
    glowColor: "rgba(245,158,11,0.2)",
    accentColor: "#fbbf24",
    icon: <Video className="w-5 h-5" />,
    stat: "",
    badge: "ONLINE" as string | null,
    badgeStyle: { border: "1px solid rgba(57,255,20,0.4)", color: "#39ff14", background: "rgba(57,255,20,0.08)" },
    href: "/video-gen",
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
    stat: "",
    badge: "TESTING" as string | null,
    badgeStyle: { border: "1px solid rgba(251,191,36,0.4)", color: "#fbbf24", background: "rgba(251,191,36,0.08)" },
    href: "/3d-generator",
  },
  {
    id: "ideogram-gen",
    tag: "AI DESIGN",
    title: "Logex",
    desc: "Logos, typography & text-in-image. The best AI for graphic design and readable text.",
    borderGradient: "linear-gradient(135deg, #ec4899, #a855f7, #06b6d4)",
    glowColor: "rgba(236,72,153,0.2)",
    accentColor: "#f472b6",
    icon: <Type className="w-5 h-5" />,
    stat: "",
    badge: "ONLINE" as string | null,
    badgeStyle: { border: "1px solid rgba(57,255,20,0.4)", color: "#39ff14", background: "rgba(57,255,20,0.08)" },
    href: "/ideogram-gen",
  },
];

const secondaryFeatures = [
  { title: "Chat Rooms", desc: "Live video & text rooms", icon: <MessageSquare className="w-5 h-5" />, gradient: "linear-gradient(135deg, #06b6d4, #8b5cf6)", href: "/chat", requiresAuth: true },
  { title: "Marketplace", desc: "Buy & sell digital assets", icon: <ShoppingCart className="w-5 h-5" />, gradient: "linear-gradient(135deg, #8b5cf6, #ec4899)", href: "/marketplace", requiresAuth: false },
  { title: "Pluto v.2", desc: "Build 2D games with Pluto", icon: <Gamepad2 className="w-5 h-5" />, gradient: "linear-gradient(135deg, #f59e0b, #ef4444)", href: "/game-builder", requiresAuth: false },
  { title: "Snapshot Analyzer", desc: "AI image analysis", icon: <Camera className="w-5 h-5" />, gradient: "linear-gradient(135deg, #3b82f6, #8b5cf6)", href: "/image-analysis", requiresAuth: false },
  { title: "Sprite Editor", desc: "Pixel art creation", icon: <Palette className="w-5 h-5" />, gradient: "linear-gradient(135deg, #ec4899, #f43f5e)", href: "/advanced-features-demo?tab=sprites", requiresAuth: false },
];

const sideMenuItems = [
  { id: "showcase", label: "Create", icon: "✦" },
  { id: "explore", label: "Explore", icon: "◈" },
  { id: "agent",   label: "Agent",  icon: "✧", action: "openAgent" },
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
  onMouseEnter: () => void; onMouseLeave: () => void; onClick?: (e: React.MouseEvent) => void;
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

  /* ── AI Panel state ── */
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [aiInitialTab, setAIInitialTab] = useState<"chat" | "create" | "voice">("chat");
  const [voiceActivated, setVoiceActivated] = useState(false);

  /* ── Refs ── */
  const showcaseRef = useRef<HTMLElement>(null);
  const exploreRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const wakeRecRef = useRef<SpeechRecognition | null>(null);
  const wakeActiveRef = useRef(false);
  const panelWasOpenRef = useRef(false);

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

  /* ── "Hey Star" wake word listener (page-level, runs when panel is closed) ── */
  useEffect(() => {
    // Skip on mobile — voice is desktop-only
    if (/Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator?.userAgent || "")) return;

    const SR = typeof window !== "undefined"
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;
    if (!SR) return;

    let startTimer: ReturnType<typeof setTimeout> | null = null;

    const launch = () => {
      if (!wakeActiveRef.current) return;

      const r = new SR();
      r.continuous = true;
      r.interimResults = true;
      r.lang = "en-US";
      r.maxAlternatives = 1;
      wakeRecRef.current = r;

      r.onresult = (e: SpeechRecognitionEvent) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const text = e.results[i][0].transcript.toLowerCase().trim();
          if (text.includes("hey star")) {
            console.log("[page] Wake word detected — opening Voice panel");
            stopWake();
            setAIInitialTab("voice");
            setVoiceActivated(true);
            setIsAIOpen(true);
            return;
          }
        }
      };

      r.onend = () => {
        if (wakeActiveRef.current) {
          setTimeout(launch, 250);
        }
      };

      r.onerror = (e: SpeechRecognitionErrorEvent) => {
        if (e.error === "aborted" || e.error === "no-speech") {
          if (wakeActiveRef.current) setTimeout(launch, 250);
          return;
        }
        console.error("[page] Wake word error:", e.error);
        if (wakeActiveRef.current) setTimeout(launch, 2000);
      };

      try {
        r.start();
        console.log("[page] Wake word listener started");
      } catch {
        console.log("[page] Wake start failed, retrying...");
        if (wakeActiveRef.current) setTimeout(launch, 1000);
      }
    };

    const startWake = (delay: number) => {
      if (wakeActiveRef.current) return;
      wakeActiveRef.current = true;
      // Delay lets any previous SpeechRecognition (from VoiceTab) fully release the mic
      startTimer = setTimeout(launch, delay);
    };

    const stopWake = () => {
      wakeActiveRef.current = false;
      if (startTimer) { clearTimeout(startTimer); startTimer = null; }
      if (wakeRecRef.current) {
        try { wakeRecRef.current.stop(); } catch { /* ignore */ }
        wakeRecRef.current = null;
      }
    };

    if (!isAIOpen) {
      // Panel closed — delay longer after panel was open to let VoiceTab release mic
      const delay = panelWasOpenRef.current ? 1200 : 300;
      panelWasOpenRef.current = false;
      startWake(delay);
    } else {
      panelWasOpenRef.current = true;
      stopWake();
    }

    return () => stopWake();
  }, [isAIOpen]);

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



  /* ── Navigation helpers ── */
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const top = rect.top + window.scrollY - 20;
    window.scrollTo({ top, behavior: "smooth" });
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
                if ((item as any).action === "openAgent") {
                  setIsAIOpen(true);
                } else if (item.href) {
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
              <span className="shrink-0 text-sm transition-colors duration-200" style={{ color: active ? "#22d3ee" : "rgba(255,255,255,0.45)" }}>{item.icon}</span>
              <span className="text-xs font-medium tracking-wider whitespace-nowrap transition-opacity duration-200" style={{ opacity: active ? 1 : 0, color: "rgba(255,255,255,0.8)" }}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ═══ HEADER ═══ */}
      <header className="fixed top-0 left-0 right-0 px-4 py-3 flex items-center justify-between" style={{ zIndex: 50, background: "linear-gradient(180deg, rgba(3,3,8,0.9) 0%, transparent 100%)", paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}>
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
            <div className="flex items-center gap-2 relative">
              <NotificationBellButton className="text-slate-400 hover:text-white" />
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
                  className="absolute right-0 top-full mt-2 w-48 rounded-lg overflow-hidden shadow-2xl"
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
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-12 sm:pt-20 overflow-hidden" style={{ justifyContent: 'flex-start', paddingTop: 'clamp(60px, 12vh, 120px)' }}>
        <div
          className="text-center transition-all duration-1000 w-full"
          style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? "translateY(0)" : "translateY(40px)" }}
        >
          {/* Scrolling Preview Bar — pure CSS auto-scroll, click to navigate */}
          <div
            ref={bannerRef}
            className="w-full relative mb-8 mt-6 overflow-hidden"
            style={{ maskImage: "linear-gradient(to right, transparent, black 4%, black 96%, transparent)", WebkitMaskImage: "linear-gradient(to right, transparent, black 4%, black 96%, transparent)" }}
          >
            <div className="banner-scroll-track flex gap-5 py-4 px-4" style={{ width: "max-content", willChange: "transform" }}>
              {[
                { src: "/previews/Tiger.mp4", alt: "Tiger", href: "/video-gen" },
                { src: "/previews/StatueGuy.mp4", alt: "Statue Guy", href: "/image-gen" },
                { src: "/previews/Santafrog1.mp4", alt: "Santafrog 1", href: "/video-gen" },
                { src: "/previews/Smile%20moon.mp4", alt: "Smile Moon", href: "/game-builder" },
                { src: "/previews/Ocean.mp4", alt: "Ocean", href: "/sprite-editor" },
                { src: "/previews/Neon%20bear.mp4", alt: "Neon Bear", href: "/chat-rooms" },
                { src: "/previews/Ninja.mp4", alt: "Ninja", href: "/chat" },
                { src: "/previews/Neon%20woman1.png", alt: "Neon Woman 1", href: "/3d-generator" },
                // duplicate set for seamless scroll loop
                { src: "/previews/Tiger.mp4", alt: "Tiger", href: "/video-gen" },
                { src: "/previews/StatueGuy.mp4", alt: "Statue Guy", href: "/image-gen" },
                { src: "/previews/Santafrog1.mp4", alt: "Santafrog 1", href: "/video-gen" },
                { src: "/previews/Smile%20moon.mp4", alt: "Smile Moon", href: "/game-builder" },
                { src: "/previews/Ocean.mp4", alt: "Ocean", href: "/sprite-editor" },
                { src: "/previews/Neon%20bear.mp4", alt: "Neon Bear", href: "/chat-rooms" },
                { src: "/previews/Ninja.mp4", alt: "Ninja", href: "/chat" },
                { src: "/previews/Neon%20woman1.png", alt: "Neon Woman 1", href: "/3d-generator" },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 rounded-xl overflow-hidden"
                  style={{ width: 'clamp(300px, 50vw, 340px)', height: 'clamp(200px, 40vw, 380px)', boxShadow: "0 0 20px rgba(139,92,246,0.08)", position: "relative", transform: "translateZ(0)" }}
                >
                  {item.src.endsWith('.mp4') ? (
                    <LazyVideo
                      src={item.src}
                      className="w-full h-full object-cover"
                      style={{ position: "relative", zIndex: 0 }}
                    />
                  ) : (
                    <img
                      src={item.src}
                      alt={item.alt}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      draggable={false}
                      style={{ position: "relative", zIndex: 0 }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
          <p className="text-sm sm:text-base max-w-lg mx-auto leading-relaxed mb-8 sm:mb-16" style={{ color: "rgba(255,255,255,0.6)" }}>
            Generate images, 3D models, and videos with AI. Build games, chat in real-time, and explore a creative universe.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => {
                try {
                  const a = new Audio('/previews/audiopapkin-mechanical-sound-design-elements-robot-ps-005-295036.mp3');
                  a.play().catch(() => {});
                  (window as any).__wsLoadingAudio = a;
                } catch { /* ignore */ }
                router.push('/workspace');
              }}
              className="group px-8 py-3.5 rounded-lg text-sm font-semibold tracking-wider transition-all duration-500 flex items-center gap-2 hover:shadow-[0_0_50px_rgba(0,255,100,0.4),0_0_100px_rgba(0,255,100,0.15)]"
              style={{ background: "#39ff14", color: "#000", boxShadow: "0 0 25px rgba(57,255,20,0.3)" }}
            >
              LAUNCH <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
            {!currentUser && (
            <button
              onClick={() => {
                if (currentUser) router.push("/chat");
                else setShowAuthModal(true);
              }}
              className="px-8 py-3.5 rounded-lg text-sm tracking-wider transition-all duration-300 hover:text-white hover:border-[rgba(139,92,246,0.4)] hover:bg-[rgba(139,92,246,0.05)]"
              style={{ border: "1px solid rgba(139,92,246,0.2)", color: "rgba(255,255,255,0.7)" }}
            >
              GET STARTED
            </button>
            )}
          </div>
        </div>
      </section>

      {/* ═══ AI FEATURE SHOWCASE ═══ */}
      <section id="showcase" ref={showcaseRef} className="relative py-10 sm:py-16 px-3 sm:px-4" style={{ zIndex: 1 }}>
        <div className="max-w-6xl mx-auto">
          <div
            className="mb-8 sm:mb-16 transition-all duration-700"
            style={{ opacity: visibleSections.has("showcase") ? 1 : 0, transform: visibleSections.has("showcase") ? "translateY(0)" : "translateY(20px)" }}
          >
            <div className="text-[10px] tracking-[0.5em] mb-2 sm:mb-3" style={{ color: "rgba(139,92,246,0.5)" }}>GENERATION SUITE</div>
            <h2 className="text-2xl sm:text-5xl font-bold" style={{ letterSpacing: "-0.03em" }}>AI Creation Tools</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5">
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
                  className="p-4 sm:p-8"
                  style={{
                    opacity: visibleSections.has("showcase") ? 1 : 0,
                    transform: visibleSections.has("showcase") ? "translateY(0)" : "translateY(40px)",
                    transition: `all 0.6s ease ${i * 0.12}s`,
                  }}
                >
                  <div className="flex items-center justify-between mb-3 sm:mb-5 gap-2 flex-nowrap">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="shrink-0" style={{ color: hoveredFeature === f.id ? f.accentColor : "rgba(255,255,255,0.35)", transition: "color 0.3s" }}>{f.icon}</span>
                      <span className="text-[10px] tracking-[0.3em] truncate" style={{ color: "rgba(255,255,255,0.45)" }}>{f.tag}</span>
                    </div>
                    {f.badge && <span className="text-[9px] tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1.5 whitespace-nowrap shrink-0" style={f.badgeStyle}><span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: f.badge === "ONLINE" ? "#39ff14" : "#fbbf24", boxShadow: f.badge === "ONLINE" ? "0 0 6px rgba(57,255,20,0.5)" : "none", animation: f.badge === "ONLINE" ? "none" : "blink 1.4s ease-in-out infinite" }} />{f.badge}</span>}
                  </div>
                  <h3
                    className="text-lg sm:text-2xl font-bold mb-1.5 sm:mb-2.5 transition-colors duration-300"
                    style={{ color: hoveredFeature === f.id ? "white" : "rgba(255,255,255,0.85)" }}
                  >
                    {f.title}
                  </h3>
                  <p className="text-xs sm:text-sm leading-relaxed mb-4 sm:mb-7 transition-colors duration-300" style={{ color: hoveredFeature === f.id ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.5)" }}>
                    {f.desc}
                  </p>
                  <div className="flex items-center justify-end">
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

          <div
            className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide cursor-grab active:cursor-grabbing"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
            onMouseDown={(e) => {
              const el = e.currentTarget;
              const startX = e.pageX - el.offsetLeft;
              const scrollLeft = el.scrollLeft;
              let dragged = false;
              const onMove = (ev: MouseEvent) => { dragged = true; el.scrollLeft = scrollLeft - (ev.pageX - el.offsetLeft - startX); };
              const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); if (dragged) { el.dataset.dragged = "true"; setTimeout(() => delete el.dataset.dragged, 0); } };
              document.addEventListener("mousemove", onMove);
              document.addEventListener("mouseup", onUp);
            }}
          >
            {secondaryFeatures.map((f, i) => (
              <GradientBorderSmall
                key={f.title}
                gradient={f.gradient}
                isHovered={hoveredSecondary === f.title}
                onMouseEnter={() => setHoveredSecondary(f.title)}
                onMouseLeave={() => setHoveredSecondary(null)}
                onClick={(e) => {
                  const container = (e.currentTarget as HTMLElement).closest("[data-dragged]");
                  if (container) return;
                  navigateOrAuth(f.href, f.requiresAuth);
                }}
              >
                <div
                  className="p-5 cursor-pointer"
                  style={{
                    opacity: visibleSections.has("explore") ? 1 : 0,
                    transform: visibleSections.has("explore") ? "translateX(0)" : "translateX(20px)",
                    transition: `all 0.5s ease ${i * 0.07}s`,
                  }}
                >
                  <div className="mb-3 transition-colors duration-300" style={{ color: hoveredSecondary === f.title ? "#22d3ee" : "rgba(255,255,255,0.4)" }}>{f.icon}</div>
                  <h4 className="text-sm font-semibold mb-1 transition-colors duration-300" style={{ color: hoveredSecondary === f.title ? "white" : "rgba(255,255,255,0.8)" }}>{f.title}</h4>
                  <p className="text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>{f.desc}</p>
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

          <div style={{ padding: 1, borderRadius: 10, background: "linear-gradient(135deg, #06b6d4, #8b5cf6, #ec4899)", display: "inline-block" }}>
            <button
              onClick={() => {
                if (currentUser) router.push("/workspace");
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
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
          <span>&copy; 2026 Starcyeed. All rights reserved.</span>
          <div className="flex gap-6">
            <Link href="/terms" className="transition-colors hover:text-white/40">Terms</Link>
            <Link href="/privacy" className="transition-colors hover:text-white/40">Privacy</Link>
            <Link href="/contact" className="transition-colors hover:text-white/40">Contact</Link>
            <Link href="/api-access" className="transition-colors hover:text-white/40">API</Link>
            <Link href="/ai-chat" className="transition-colors hover:text-white/40">AI Chat</Link>
          </div>
        </div>
      </footer>

      {/* ═══ UNIFIED AI PANEL ═══ */}
      <UnifiedAIPanel isOpen={isAIOpen} onClose={() => { setIsAIOpen(false); setAIInitialTab("chat"); setVoiceActivated(false); }} />

      {/* AI toggle button */}
      <button
        onClick={() => { setAIInitialTab("chat"); setIsAIOpen(!isAIOpen); }}
        className="fixed rounded-full transition-all duration-300"
        style={{
          bottom: 24, right: 16, zIndex: 40, padding: 13,
          background: "rgba(8,8,15,0.85)",
          backdropFilter: "blur(8px)",
          boxShadow: "0 0 12px rgba(139,92,246,0.2)",
          position: "fixed", border: "none",
        }}
        aria-label="Open AI"
      >
        <div className="ai-btn-rainbow-border" />
        <Sparkles className="w-5 h-5 relative z-10" style={{ color: "#c084fc" }} />
      </button>

      {/* Shimmer animation */}
      <style>{`
        @keyframes shimmer { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .banner-scroll-track {
          animation: marquee 40s linear infinite;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .banner-placeholder {
          background: linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(6,182,212,0.06) 100%);
        }
        @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.2; } }
        @keyframes rainbowSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes rainbowPulse { 0%,100% { opacity: 1; filter: blur(4px) brightness(1.8); } 50% { opacity: 1; filter: blur(6px) brightness(2.2); } }
        .ai-btn-rainbow-border {
          position: absolute; inset: -3px; border-radius: 9999px; z-index: 0; overflow: hidden;
          animation: rainbowPulse 2s ease-in-out infinite;
        }
        .ai-btn-rainbow-border::before {
          content: ''; position: absolute; inset: -50%; border-radius: 9999px;
          background: conic-gradient(from 0deg, #ff3333, #ffaa00, #33ff66, #00ddff, #aa66ff, #ff44aa, #ff3333);
          animation: rainbowSpin 2.5s linear infinite;
        }
        .ai-btn-rainbow-border::after {
          content: ''; position: absolute; inset: 2px; border-radius: 9999px;
          background: rgba(8,8,15,0.85);
        }
        .ai-chat-rainbow-border {
          position: absolute; inset: -6px; border-radius: 14px; z-index: 0; overflow: hidden;
          animation: rainbowPulse 2s ease-in-out infinite;
          box-shadow: 0 0 30px rgba(139,92,246,0.5), 0 0 60px rgba(139,92,246,0.3), 0 0 100px rgba(139,92,246,0.15), 0 0 160px rgba(139,92,246,0.06);
        }
        .ai-chat-rainbow-border::before {
          content: ''; position: absolute; inset: -100%; border-radius: 14px;
          background: conic-gradient(from 0deg, #ff3333, #ffaa00, #33ff66, #00ddff, #aa66ff, #ff44aa, #ff3333);
          animation: rainbowSpin 2.5s linear infinite;
          filter: blur(8px);
        }
        .ai-chat-rainbow-border::after {
          content: ''; position: absolute; inset: 5px; border-radius: 8px;
          background: rgba(8,8,15,0.98);
        }
        @keyframes greenPulse {
          0%, 100% { opacity: 1; filter: blur(8px) brightness(2.5); }
          50%      { opacity: 1; filter: blur(14px) brightness(3.5); }
        }
        @keyframes greenSpin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .ai-chat-speaking-border {
          position: absolute; inset: -8px; border-radius: 14px; z-index: 0; overflow: hidden;
          animation: greenPulse 0.8s ease-in-out infinite;
          box-shadow: 0 0 40px rgba(0,255,65,0.8), 0 0 80px rgba(0,255,65,0.5), 0 0 120px rgba(0,255,65,0.25), 0 0 200px rgba(0,255,65,0.1);
        }
        .ai-chat-speaking-border::before {
          content: ''; position: absolute; inset: -100%; border-radius: 14px;
          background: conic-gradient(from 0deg, #00ff41, #39ff14, #00ff41, #00e639, #00ff41);
          animation: greenSpin 1.2s linear infinite;
          filter: blur(10px);
        }
        .ai-chat-speaking-border::after {
          content: ''; position: absolute; inset: 5px; border-radius: 8px;
          background: rgba(8,8,15,0.98);
        }
        @keyframes silverPulse {
          0%, 100% { opacity: 1; filter: blur(8px) brightness(3); }
          50%      { opacity: 1; filter: blur(16px) brightness(5); }
        }
        @keyframes silverSpin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .ai-chat-silver-border {
          position: absolute; inset: -8px; border-radius: 14px; z-index: 0; overflow: hidden;
          animation: silverPulse 0.7s ease-in-out infinite;
          box-shadow: 0 0 50px rgba(220,220,255,0.9), 0 0 100px rgba(200,200,255,0.6), 0 0 160px rgba(180,180,255,0.35), 0 0 240px rgba(200,200,255,0.15);
        }
        .ai-chat-silver-border::before {
          content: ''; position: absolute; inset: -100%; border-radius: 14px;
          background: conic-gradient(from 0deg, #e8e8ff, #ffffff, #c8c8ff, #f0f0ff, #d0d0ff, #ffffff, #e8e8ff);
          animation: silverSpin 1s linear infinite;
          filter: blur(10px) brightness(2);
        }
        .ai-chat-silver-border::after {
          content: ''; position: absolute; inset: 5px; border-radius: 8px;
          background: rgba(8,8,15,0.98);
        }
      `}</style>
    </div>
  );
}

