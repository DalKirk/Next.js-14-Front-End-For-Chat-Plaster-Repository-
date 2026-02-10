"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * CanvasTrail — performant cursor/touch particle trail.
 *
 * Key optimizations:
 * 1. Single <canvas> element (zero DOM mutations)
 * 2. Object pool (no garbage collection)
 * 3. Pauses during scroll (doesn't fight browser compositor)
 * 4. Throttled emission (~60fps cap)
 * 5. Alpha fade instead of removing elements
 * 6. Auto-cleans when all particles die (no idle GPU cost)
 */

const MAX_PARTICLES = 50;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  radius: number;
  active: boolean;
  hue: number;
}

export default function CanvasTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const poolIndexRef = useRef(0);
  const mouseRef = useRef({ x: -100, y: -100 });
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const lastEmitRef = useRef(0);
  const rafRef = useRef<number>(0);
  const hasActiveRef = useRef(false);

  // Emit a particle from the pool
  const emitParticle = useCallback((x: number, y: number) => {
    const particles = particlesRef.current;
    const p = particles[poolIndexRef.current];
    p.x = x;
    p.y = y;
    p.vx = (Math.random() - 0.5) * 2;
    p.vy = (Math.random() - 0.5) * 2 - 0.5; // slight upward bias
    p.alpha = 1;
    p.radius = Math.random() * 2.5 + 1;
    p.active = true;
    p.hue = 220 + Math.random() * 60; // cool blue → warm purple
    poolIndexRef.current = (poolIndexRef.current + 1) % MAX_PARTICLES;
    hasActiveRef.current = true;
  }, []);

  // Animation loop
  const animate = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    ctx.clearRect(0, 0, w, h);

    let anyActive = false;
    const particles = particlesRef.current;

    for (const p of particles) {
      if (!p.active) continue;

      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.02;
      p.radius *= 0.98;

      if (p.alpha <= 0) {
        p.active = false;
        continue;
      }

      anyActive = true;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 70%, 75%, ${p.alpha})`;
      ctx.fill();
    }

    // Subtle glow at cursor when not scrolling
    const mouse = mouseRef.current;
    if (!isScrollingRef.current && mouse.x > 0) {
      const gradient = ctx.createRadialGradient(
        mouse.x, mouse.y, 0,
        mouse.x, mouse.y, 30
      );
      gradient.addColorStop(0, "rgba(160, 140, 255, 0.12)");
      gradient.addColorStop(1, "rgba(160, 140, 255, 0)");
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 30, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    if (anyActive) {
      hasActiveRef.current = true;
      rafRef.current = requestAnimationFrame(animate);
    } else {
      // Stop the loop when nothing to draw — zero idle cost
      hasActiveRef.current = false;
    }
  }, []);

  // Kick the animation loop if it's paused
  const ensureAnimating = useCallback(() => {
    if (!hasActiveRef.current) {
      hasActiveRef.current = true;
      rafRef.current = requestAnimationFrame(animate);
    }
  }, [animate]);

  useEffect(() => {
    // Initialize particle pool
    const pool: Particle[] = [];
    for (let i = 0; i < MAX_PARTICLES; i++) {
      pool.push({
        x: 0, y: 0, vx: 0, vy: 0,
        alpha: 0, radius: 0, active: false, hue: 0,
      });
    }
    particlesRef.current = pool;

    // Set up canvas
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctxRef.current = ctx;
      }
    };
    resize();

    // Pointer move handler (mouse + touch)
    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      const touch = "touches" in e ? e.touches[0] : null;
      const x = touch ? touch.clientX : (e as MouseEvent).clientX;
      const y = touch ? touch.clientY : (e as MouseEvent).clientY;

      const now = performance.now();
      if (now - lastEmitRef.current > 16 && !isScrollingRef.current) {
        emitParticle(x, y);
        if (Math.random() > 0.3) emitParticle(x, y);
        lastEmitRef.current = now;
        ensureAnimating();
      }

      mouseRef.current = { x, y };
    };

    // Scroll pause — key mobile optimization
    const onScroll = () => {
      isScrollingRef.current = true;
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        isScrollingRef.current = false;
      }, 150);
    };

    window.addEventListener("resize", resize);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("mousemove", onPointerMove);
    document.addEventListener("touchmove", onPointerMove, { passive: true });
    document.addEventListener("touchstart", onPointerMove as EventListener, { passive: true });

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("mousemove", onPointerMove);
      document.removeEventListener("touchmove", onPointerMove);
      document.removeEventListener("touchstart", onPointerMove as EventListener);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [emitParticle, ensureAnimating, animate]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 9999 }}
    />
  );
}
