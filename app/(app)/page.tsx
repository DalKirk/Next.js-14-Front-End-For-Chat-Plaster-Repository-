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
  Sparkles, Mail,
} from "lucide-react";
const UnifiedAIPanel = dynamic(() => import("@/components/UnifiedAIPanel"), { ssr: false });
import { SiUnity, SiGodotengine, SiHtml5, SiGamemaker, SiConstruct3 } from 'react-icons/si';

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

const heroVideos = [
  { src: "/previews/Tiger.mp4",         label: "Tiger" },
  { src: "/previews/Ninja.mp4",         label: "Ninja" },
  { src: "/previews/Ocean.mp4",         label: "Ocean" },
  { src: "/previews/Neon%20bear.mp4",   label: "Neon Bear" },
  { src: "/previews/StatueGuy.mp4",     label: "Statue" },
];

const HERO_H1 = 'Create Without Limits';
const HERO_BODY_WORDS = "An AI-powered creative studio with browser-based gaming, cloud development IDE, and digital marketplace. Build, generate, code, collaborate, and sell your creations — all on a social platform.".split(' ');

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
  const [heroVideoIndex, setHeroVideoIndex] = useState(0);
  const [hoveredSecondary, setHoveredSecondary] = useState<string | null>(null);
  const [activeSideItem, setActiveSideItem] = useState<string | null>(null);
  const [visibleSections, setVisibleSections] = useState(new Set<string>());
  const [heroVisible, setHeroVisible] = useState(false);
  const [heroTransitioning, setHeroTransitioning] = useState(false);

  /* ── Hero text streaming ── */
  // SSR: initialize with full text so crawlers/scrapers see real content.
  // On client mount we reset and run the typewriter animation.
  const [streamedH1, setStreamedH1] = useState(HERO_H1);
  const [streamedWords, setStreamedWords] = useState(HERO_BODY_WORDS.length);
  const [streamDone, setStreamDone] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);

  /* ── AI Panel state ── */
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [aiInitialTab, setAIInitialTab] = useState<"chat" | "create" | "voice">("chat");
  const [voiceActivated, setVoiceActivated] = useState(false);

  /* ── Refs ── */
  const showcaseRef = useRef<HTMLElement>(null);
  const exploreRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const wakeRecRef = useRef<SpeechRecognition | null>(null);
  const wakeActiveRef = useRef(false);
  const panelWasOpenRef = useRef(false);
  const sharpVideoRef = useRef<HTMLVideoElement>(null);
  const bgVideoRef = useRef<HTMLVideoElement>(null);
  const isFirstVideoRender = useRef(true);

  /* ── Close menu on outside click ── */
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [showMenu]);

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

  /* ── Reload video when index changes (crossfade — no key remount) ── */
  useEffect(() => {
    if (isFirstVideoRender.current) {
      isFirstVideoRender.current = false;
      return;
    }
    if (bgVideoRef.current) {
      bgVideoRef.current.load();
      bgVideoRef.current.play().catch(() => {});
    }
    if (sharpVideoRef.current) {
      sharpVideoRef.current.load();
      sharpVideoRef.current.play().catch(() => {});
    }
  }, [heroVideoIndex]);

  /* ── Reset to empty on first client mount so animation can run ── */
  useEffect(() => {
    setHasMounted(true);
    setStreamedH1('');
    setStreamedWords(0);
    setStreamDone(false);
  }, []);

  /* ── Stream hero headline then body text ── */
  useEffect(() => {
    if (!heroVisible || !hasMounted) return;
    let bodyTimer: ReturnType<typeof setInterval> | null = null;
    let h1i = 0;
    const h1Timer = setInterval(() => {
      h1i++;
      setStreamedH1(HERO_H1.slice(0, h1i));
      if (h1i >= HERO_H1.length) {
        clearInterval(h1Timer);
        // Short pause then stream body word by word
        setTimeout(() => {
          let wi = 0;
          bodyTimer = setInterval(() => {
            wi++;
            setStreamedWords(wi);
            if (wi >= HERO_BODY_WORDS.length) {
              if (bodyTimer) clearInterval(bodyTimer);
              setStreamDone(true);
            }
          }, 160);
        }, 700);
      }
    }, 130);
    return () => {
      clearInterval(h1Timer);
      if (bodyTimer) clearInterval(bodyTimer);
    };
  }, [heroVisible, hasMounted]);

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
    <div className="relative min-h-screen text-white overflow-x-hidden" style={{ background: "#030308", fontFamily: "'Exo 2', 'Exo', sans-serif" }}>
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
            <div className="flex items-center gap-2 relative" ref={menuRef}>
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
                    { label: "Messages", icon: <Mail className="w-3.5 h-3.5" />, href: "/messages" },
                    { label: "Rooms", icon: <MessageSquare className="w-3.5 h-3.5" />, href: "/chat" },
                    { label: "Workspace", icon: <Bot className="w-3.5 h-3.5" />, href: "/workspace" },
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

      {/* ═══ HERO — Cinematic Billboard ═══ */}
      <section className="relative" style={{ height: '100dvh', minHeight: 640, overflow: 'hidden' }}>

        {/* Blurred backdrop — fills black bars without cropping the content */}
        <video
          ref={bgVideoRef}
          src={heroVideos[heroVideoIndex].src}
          autoPlay
          muted
          playsInline
          className="absolute inset-0 w-full h-full"
          style={{ objectFit: 'cover', filter: 'blur(28px) brightness(0.45) saturate(1.4)', transform: 'scale(1.08)', opacity: heroTransitioning ? 0 : 1, transition: 'opacity 0.4s ease' }}
        />

        {/* Full-bleed sharp video — crossfades on end */}
        <video
          ref={sharpVideoRef}
          src={heroVideos[heroVideoIndex].src}
          autoPlay
          muted
          playsInline
          className="absolute inset-0 w-full h-full"
          style={{ objectFit: 'contain', objectPosition: 'center center', opacity: heroTransitioning ? 0 : 1, transition: 'opacity 0.4s ease' }}
          onEnded={() => {
            setHeroTransitioning(true);
            setTimeout(() => {
              setHeroVideoIndex(i => (i + 1) % heroVideos.length);
              setTimeout(() => setHeroTransitioning(false), 150);
            }, 400);
          }}
        />

        {/* Left vignette — keeps text legible over the video */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(100deg, rgba(3,3,8,0.96) 0%, rgba(3,3,8,0.82) 28%, rgba(3,3,8,0.35) 60%, rgba(3,3,8,0.0) 80%)' }} />
        {/* Bottom vignette — bleed into page background */}
        <div className="absolute inset-x-0 bottom-0" style={{ height: '45%', background: 'linear-gradient(to bottom, transparent 0%, rgba(3,3,8,0.7) 55%, #030308 100%)' }} />
        {/* Top vignette — softens header overlap */}
        <div className="absolute inset-x-0 top-0" style={{ height: '22%', background: 'linear-gradient(to bottom, rgba(3,3,8,0.72) 0%, transparent 100%)' }} />

        {/* Content — left-aligned, cinematic placement */}
        <div
          className="absolute inset-0 flex flex-col justify-between sm:justify-center"
          style={{ paddingLeft: 'max(5vw, 24px)', paddingRight: '5vw', paddingBottom: 'max(9vh, 72px)', paddingTop: 'max(13vh, 96px)' }}
        >
          {/* Headline + description */}
          <div
            style={{
              maxWidth: 500,
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? 'translateY(0)' : 'translateY(32px)',
              transition: 'opacity 1s ease, transform 1s ease',
            }}
          >
            <div className="flex items-center gap-2 mb-5">
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#39ff14', display: 'inline-block', boxShadow: '0 0 6px #39ff14', animation: 'blink 1s step-end infinite' }} />
              <span className="text-[10px] tracking-[0.35em] uppercase" style={{ color: 'rgba(255,255,255,0.5)' }}>Public Beta</span>
            </div>
            <h1
              className="font-extralight mb-4 leading-[1.12] uppercase"
              style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.9rem)', letterSpacing: '0.22em' }}
            >
              {streamedH1}
              {streamedH1.length < HERO_H1.length && (
                <span style={{ color: '#39ff14', animation: 'blink 0.6s step-end infinite' }}>_</span>
              )}
            </h1>
            <p
              className="mb-8 leading-relaxed"
              style={{ fontSize: 'clamp(0.8rem, 1.4vw, 0.95rem)', color: 'rgba(255,255,255,0.72)', maxWidth: 400, minHeight: '6em' }}
            >
              {HERO_BODY_WORDS.slice(0, streamedWords).join(' ')}
              {!streamDone && streamedWords > 0 && (
                <span style={{ color: '#39ff14', animation: 'blink 0.6s step-end infinite' }}>{' '}▋</span>
              )}
            </p>
            {/* Buttons — desktop only (shown inline with text) */}
            <div className="hidden sm:flex flex-wrap gap-3">
              <button
                onClick={() => {
                  try {
                    const a = new Audio('/previews/audiopapkin-mechanical-sound-design-elements-robot-ps-005-295036.mp3');
                    a.play().catch(() => {});
                    (window as any).__wsLoadingAudio = a;
                  } catch { /* ignore */ }
                  router.push('/workspace');
                }}
                className="group px-7 py-3 rounded-lg text-sm font-semibold tracking-wider transition-all duration-500 flex items-center gap-2 hover:shadow-[0_0_50px_rgba(0,255,100,0.4),0_0_100px_rgba(0,255,100,0.15)]"
                style={{ background: '#39ff14', color: '#000', boxShadow: '0 0 25px rgba(57,255,20,0.3)' }}
              >
                LAUNCH <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
              {!currentUser && (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="px-7 py-3 rounded-lg text-sm tracking-wider transition-all duration-300 hover:text-white hover:border-[rgba(139,92,246,0.4)] hover:bg-[rgba(139,92,246,0.05)]"
                  style={{ border: '1px solid rgba(139,92,246,0.2)', color: 'rgba(255,255,255,0.7)' }}
                >
                  GET STARTED
                </button>
              )}
            </div>
          </div>

          {/* Buttons — mobile only (pushed to bottom by justify-between) */}
          <div
            className="flex sm:hidden flex-wrap gap-3"
            style={{ opacity: heroVisible ? 1 : 0, transition: 'opacity 1s ease 0.3s' }}
          >
            <button
              onClick={() => {
                try {
                  const a = new Audio('/previews/audiopapkin-mechanical-sound-design-elements-robot-ps-005-295036.mp3');
                  a.play().catch(() => {});
                  (window as any).__wsLoadingAudio = a;
                } catch { /* ignore */ }
                router.push('/workspace');
              }}
              className="group px-7 py-3 rounded-lg text-sm font-semibold tracking-wider transition-all duration-500 flex items-center gap-2"
              style={{ background: '#39ff14', color: '#000', boxShadow: '0 0 25px rgba(57,255,20,0.3)' }}
            >
              LAUNCH <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
            {!currentUser && (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-7 py-3 rounded-lg text-sm tracking-wider transition-all duration-300 hover:text-white"
                style={{ border: '1px solid rgba(139,92,246,0.2)', color: 'rgba(255,255,255,0.7)' }}
              >
                GET STARTED
              </button>
            )}
          </div>
        </div>

      </section>



      {/* ═══ GAME PLATFORM ═══ */}
      <section id="showcase" ref={showcaseRef} className="relative py-10 sm:py-16 px-3 sm:px-4" style={{ zIndex: 1 }}>
        <div className="max-w-6xl mx-auto">
          <div
            className="mb-8 sm:mb-12 transition-all duration-700"
            style={{ opacity: visibleSections.has("showcase") ? 1 : 0, transform: visibleSections.has("showcase") ? "translateY(0)" : "translateY(20px)" }}
          >
            <div className="text-[10px] tracking-[0.5em] mb-2 sm:mb-3" style={{ color: "rgba(139,92,246,0.5)" }}>GAME PLATFORM</div>
            <h2 className="text-2xl sm:text-5xl font-bold" style={{ letterSpacing: "-0.03em" }}>Share, Buy & Sell Games</h2>
          </div>

          <div
            className="rounded-2xl p-8 sm:p-12 transition-all duration-700"
            style={{
              opacity: visibleSections.has("showcase") ? 1 : 0,
              transform: visibleSections.has("showcase") ? "translateY(0)" : "translateY(30px)",
            }}
          >
              <div className="grid sm:grid-cols-2 gap-8 sm:gap-16 items-center">

                {/* Text side */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Gamepad2 className="w-5 h-5" style={{ color: "#a78bfa" }} />
                    <span className="text-[10px] tracking-[0.3em]" style={{ color: "rgba(255,255,255,0.45)" }}>GAME UPLOADS</span>
                  </div>
                  <h3 className="text-xl sm:text-3xl font-bold mb-4 leading-tight" style={{ letterSpacing: "-0.02em" }}>
                    Upload games from your favorite engines
                  </h3>
                  <p className="text-sm sm:text-base leading-relaxed mb-8" style={{ color: "rgba(255,255,255,0.6)", maxWidth: 380 }}>
                    Share your creations with the community, list them on the marketplace, or sell directly to players — all from one place.
                  </p>
                  <button
                    onClick={() => router.push('/games')}
                    className="group px-7 py-3 rounded-lg text-sm font-semibold tracking-wider flex items-center gap-2 transition-all duration-300 hover:text-white hover:border-[rgba(139,92,246,0.4)]"
                    style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)', background: 'transparent' }}
                  >
                    Browse Games <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>

                {/* Engine icons grid */}
                <div className="grid grid-cols-3 gap-3 sm:gap-4">
                  {[
                    { label: "Unity",     color: "#CCCCCC", icon: <SiUnity size={28} /> },
                    { label: "Godot",     color: "#478CBF", icon: <SiGodotengine size={28} /> },
                    { label: "HTML5",     color: "#E34F26", icon: <SiHtml5 size={28} /> },
                    { label: "Phaser",    color: "#2CCA8F", icon: (
                      <svg width={28} height={28} viewBox="0 0 24 24" fill="currentColor">
                        <path fillRule="evenodd" clipRule="evenodd" d="M3 2h11a6 6 0 010 12H7v8H3V2zm4 2v8h7a4 4 0 000-8H7z" />
                      </svg>
                    )},
                    { label: "GameMaker", color: "#FAAF17", icon: <SiGamemaker size={28} /> },
                    { label: "Construct", color: "#00FFDA", icon: <SiConstruct3 size={28} /> },
                  ].map((eng) => (
                    <div
                      key={eng.label}
                      className="flex flex-col items-center gap-2 rounded-xl p-4 transition-all duration-300"
                      style={{ background: "transparent" }}
                    >
                      <span style={{ color: eng.color }}>{eng.icon}</span>
                      <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.55)" }}>{eng.label}</span>
                    </div>
                  ))}
                </div>

              </div>
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
        @import url('https://fonts.googleapis.com/css2?family=Exo+2:ital,wght@0,100..900;1,100..900&display=swap');
        @keyframes shimmer { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
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

