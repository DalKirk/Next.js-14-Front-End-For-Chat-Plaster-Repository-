'use client';

import React, { useEffect, useState } from 'react';
import type { ThemeConfig } from '@/types/backend';

// ─── Preset gradients (must match ProfileThemeEditor) ────────────────
const PRESET_GRADIENTS: Record<string, string> = {
  sunset: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 25%, #FFB84D 50%, #FF6B9D 75%, #C06C84 100%)',
  ocean: 'linear-gradient(135deg, #667eea 0%, #0077BE 35%, #00B4D8 70%, #48CAE4 100%)',
  lavender: 'linear-gradient(135deg, #9D50BB 0%, #DDA0DD 40%, #E0B0FF 75%, #F8D7FF 100%)',
  mint: 'linear-gradient(135deg, #14B8A6 0%, #2DD4BF 30%, #5EEAD4 60%, #98F5E1 100%)',
  rose: 'linear-gradient(135deg, #E0AFA0 0%, #DDA15E 30%, #BC6C25 60%, #F4ACB7 100%)',
  cherry: 'linear-gradient(135deg, #DC2626 0%, #F87171 50%, #FED7D7 100%)',
};

const PRESET_ACCENTS: Record<string, string> = {
  sunset: '#FF6B6B',
  ocean: '#00B4D8',
  lavender: '#B185DB',
  mint: '#2DD4BF',
  rose: '#E0AFA0',
  cherry: '#DC2626',
};

// ─── Font URL map ────────────────────────────────────────────────────
const FONT_URLS: Record<string, string> = {
  inter: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  playfair: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap',
  poppins: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap',
  montserrat: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap',
  lora: 'https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&display=swap',
  dancing: 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;600;700&display=swap',
  roboto: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
  bebas: 'https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap',
};

const FONT_FAMILIES: Record<string, string> = {
  inter: 'Inter, system-ui, sans-serif',
  playfair: '"Playfair Display", serif',
  poppins: 'Poppins, sans-serif',
  montserrat: 'Montserrat, sans-serif',
  lora: 'Lora, serif',
  dancing: '"Dancing Script", cursive',
  roboto: 'Roboto, sans-serif',
  bebas: '"Bebas Neue", sans-serif',
};

// ─── SVG particles ───────────────────────────────────────────────────
const ParticleShapes: Record<string, (color: string) => React.ReactNode> = {
  hearts: (c) => (<svg width="24" height="24" viewBox="0 0 24 24" fill={c}><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>),
  dots: (c) => (<svg width="24" height="24" viewBox="0 0 24 24" fill={c}><circle cx="12" cy="12" r="8"/></svg>),
  triangles: (c) => (<svg width="24" height="24" viewBox="0 0 24 24" fill={c}><path d="M12 2L2 20h20L12 2z"/></svg>),
  diamonds: (c) => (<svg width="24" height="24" viewBox="0 0 24 24" fill={c}><path d="M12 2l8 10-8 10L4 12 12 2z"/></svg>),
  circles: (c) => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><circle cx="12" cy="12" r="9"/></svg>),
  squares: (c) => (<svg width="24" height="24" viewBox="0 0 24 24" fill={c}><rect x="4" y="4" width="16" height="16" rx="2"/></svg>),
  stars: (c) => (<svg width="24" height="24" viewBox="0 0 24 24" fill={c}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>),
  petals: (c) => (<svg width="24" height="24" viewBox="0 0 24 24" fill={c}><path d="M12 2c1.1 4.55 1.1 5.45 1.1 7.5 0 3-2 5-4 5s-4-2-4-5c0-2.05 0-2.95 1.1-7.5 1.4.5 3.4.5 5.8 0z" transform="rotate(0 12 12)"/><path d="M12 2c1.1 4.55 1.1 5.45 1.1 7.5 0 3-2 5-4 5s-4-2-4-5c0-2.05 0-2.95 1.1-7.5 1.4.5 3.4.5 5.8 0z" transform="rotate(72 12 12)"/><path d="M12 2c1.1 4.55 1.1 5.45 1.1 7.5 0 3-2 5-4 5s-4-2-4-5c0-2.05 0-2.95 1.1-7.5 1.4.5 3.4.5 5.8 0z" transform="rotate(144 12 12)"/><path d="M12 2c1.1 4.55 1.1 5.45 1.1 7.5 0 3-2 5-4 5s-4-2-4-5c0-2.05 0-2.95 1.1-7.5 1.4.5 3.4.5 5.8 0z" transform="rotate(216 12 12)"/><path d="M12 2c1.1 4.55 1.1 5.45 1.1 7.5 0 3-2 5-4 5s-4-2-4-5c0-2.05 0-2.95 1.1-7.5 1.4.5 3.4.5 5.8 0z" transform="rotate(288 12 12)"/></svg>),
};

// ─── Floating particles sub-component ────────────────────────────────
function FloatingParticles({ type, count, speed, accentColor }: { type: string; count: number; speed: string; accentColor: string }) {
  if (type === 'none' || !ParticleShapes[type]) return null;
  const durations: Record<string, number> = { slow: 10, medium: 7, fast: 4 };
  const duration = durations[speed] || 7;
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-20">
      {Array.from({ length: count }).map((_, i) => {
        const size = 16 + (i % 3) * 8;
        return (
          <div key={i} className="absolute" style={{ left: `${(i * 7) % 100}%`, bottom: `-${100 + (i % 3) * 10}px`, width: `${size}px`, height: `${size}px`, opacity: 0.5 + (i % 3) * 0.15, animation: `themed-float-up ${duration + (i % 3)}s linear infinite`, animationDelay: `${(i * 0.5) % duration}s` }}>
            {ParticleShapes[type](accentColor)}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main wrapper ────────────────────────────────────────────────────
interface ThemedProfileWrapperProps {
  children: React.ReactNode;
  theme: ThemeConfig | null | undefined;
}

export default function ThemedProfileWrapper({ children, theme }: ThemedProfileWrapperProps) {
  const [mounted, setMounted] = useState(false);

  // SSR safety
  useEffect(() => { setMounted(true); }, []);

  // Dynamically load Google Fonts used by the theme
  useEffect(() => {
    if (!theme?.fonts) return;
    const load = (key: string) => {
      const url = FONT_URLS[key];
      if (!url) return;
      const id = `theme-font-${key}`;
      if (document.getElementById(id)) return;
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = url;
      document.head.appendChild(link);
    };
    load(theme.fonts.heading);
    load(theme.fonts.body);
  }, [theme?.fonts]);

  // If no theme or not yet hydrated, just render children normally
  if (!theme || !mounted) return <>{children}</>;

  // Resolve gradient
  const gradient = theme.preset === 'custom'
    ? `linear-gradient(135deg, ${theme.colors.map((c, i) => `${c} ${(i / (theme.colors.length - 1)) * 100}%`).join(', ')})`
    : PRESET_GRADIENTS[theme.preset] || PRESET_GRADIENTS.sunset;

  const accentColor = theme.preset === 'custom'
    ? (theme.colors[0] || '#FF6B6B')
    : (PRESET_ACCENTS[theme.preset] || '#FF6B6B');

  const bodyFontFamily = FONT_FAMILIES[theme.fonts?.body] || 'Inter, sans-serif';

  return (
    <div className="min-h-screen relative" style={{ background: gradient, fontFamily: bodyFontFamily }}>
      {/* Grain texture overlay */}
      <div
        className="fixed inset-0 opacity-[0.015] mix-blend-overlay pointer-events-none z-10"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='3.5' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }}
      />

      {/* Floating particles */}
      {theme.effects?.particles && theme.effects.particles !== 'none' && (
        <FloatingParticles
          type={theme.effects.particles}
          count={theme.effects.particleCount ?? 15}
          speed={theme.effects.particleSpeed || 'medium'}
          accentColor={accentColor}
        />
      )}

      <div className="relative z-30">
        {children}
      </div>

      {/* Keyframe animation for floating particles */}
      <style>{`
        @keyframes themed-float-up {
          0% { transform: translateY(0) scale(0.8) rotate(0deg); opacity: 0; }
          10% { opacity: 0.6; }
          90% { opacity: 0.6; }
          100% { transform: translateY(-120vh) scale(1.2) rotate(360deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
