'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Heart, Star, Sparkles, Eye, Users, MessageSquare, Camera, Crown,
  Palette, Layers, Wand2, Save, Type, Upload
} from 'lucide-react';
import type { ThemeConfig } from '@/types/backend';

// ─── Types ────────────────────────────────────────────────────────────
interface FontPreset {
  name: string;
  family: string;
  url: string;
  style: string;
}

interface PresetTheme {
  name: string;
  gradient: string;
  glassColor: string;
  borderGlow: string;
  accent: string;
  text: string;
}

interface GlassStyle {
  name: string;
  blur: number;
  edges: string;
}

interface EffectsState {
  depthLayers: boolean;
  tilt3D: boolean;
  ripple: boolean;
  particles: string;
  particleCount: number;
  particleSpeed: string;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
}

interface UploadedFont {
  name: string;
  family: string;
}

interface ProfileThemeEditorProps {
  /** Current saved theme (or null for first-time) */
  initialTheme?: ThemeConfig | null;
  /** Called when user clicks Save */
  onSave?: (config: ThemeConfig) => void;
}

// ─── Constants ────────────────────────────────────────────────────────
const fontPresets: Record<string, FontPreset> = {
  inter: { name: 'Inter', family: 'Inter, system-ui, sans-serif', url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap', style: 'Modern sans-serif' },
  playfair: { name: 'Playfair Display', family: '"Playfair Display", serif', url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap', style: 'Elegant serif' },
  poppins: { name: 'Poppins', family: 'Poppins, sans-serif', url: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap', style: 'Friendly rounded' },
  montserrat: { name: 'Montserrat', family: 'Montserrat, sans-serif', url: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap', style: 'Geometric' },
  lora: { name: 'Lora', family: 'Lora, serif', url: 'https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&display=swap', style: 'Classic serif' },
  dancing: { name: 'Dancing Script', family: '"Dancing Script", cursive', url: 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;600;700&display=swap', style: 'Handwritten' },
  roboto: { name: 'Roboto', family: 'Roboto, sans-serif', url: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap', style: 'Clean readable' },
  bebas: { name: 'Bebas Neue', family: '"Bebas Neue", sans-serif', url: 'https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap', style: 'Bold display' },
};

const presetThemes: Record<string, PresetTheme> = {
  sunset: { name: 'Sunset Ombre', gradient: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 25%, #FFB84D 50%, #FF6B9D 75%, #C06C84 100%)', glassColor: 'rgba(255,255,255,0.1)', borderGlow: 'rgba(255,107,107,0.6)', accent: '#FF6B6B', text: '#2D1B1B' },
  ocean: { name: 'Ocean Depths', gradient: 'linear-gradient(135deg, #667eea 0%, #0077BE 35%, #00B4D8 70%, #48CAE4 100%)', glassColor: 'rgba(255,255,255,0.08)', borderGlow: 'rgba(72,202,228,0.7)', accent: '#00B4D8', text: '#0A2540' },
  lavender: { name: 'Lavender Dream', gradient: 'linear-gradient(135deg, #9D50BB 0%, #DDA0DD 40%, #E0B0FF 75%, #F8D7FF 100%)', glassColor: 'rgba(255,255,255,0.12)', borderGlow: 'rgba(224,176,255,0.8)', accent: '#B185DB', text: '#3D1A4A' },
  mint: { name: 'Mint Fresh', gradient: 'linear-gradient(135deg, #14B8A6 0%, #2DD4BF 30%, #5EEAD4 60%, #98F5E1 100%)', glassColor: 'rgba(255,255,255,0.1)', borderGlow: 'rgba(152,245,225,0.7)', accent: '#2DD4BF', text: '#0D3331' },
  rose: { name: 'Rose Gold', gradient: 'linear-gradient(135deg, #E0AFA0 0%, #DDA15E 30%, #BC6C25 60%, #F4ACB7 100%)', glassColor: 'rgba(255,255,255,0.15)', borderGlow: 'rgba(244,172,183,0.8)', accent: '#E0AFA0', text: '#3D2616' },
  cherry: { name: 'Cherry Pop', gradient: 'linear-gradient(135deg, #DC2626 0%, #F87171 50%, #FED7D7 100%)', glassColor: 'rgba(255,255,255,0.12)', borderGlow: 'rgba(254,215,215,0.8)', accent: '#DC2626', text: '#450A0A' },
};

const glassStyles: Record<string, GlassStyle> = {
  ombre: { name: 'Ombre Glass', blur: 12, edges: 'rounded-3xl' },
  frosted: { name: 'Frosted', blur: 24, edges: 'rounded-2xl' },
  crystal: { name: 'Crystal', blur: 4, edges: 'rounded-lg' },
  liquid: { name: 'Liquid', blur: 16, edges: 'rounded-[2rem]' },
  holographic: { name: 'Holographic', blur: 8, edges: 'rounded-2xl' },
  metallic: { name: 'Metallic', blur: 6, edges: 'rounded-xl' },
};

// ─── SVG-based particle shapes ────────────────────────────────────────
const ParticleShapes: Record<string, (color: string) => React.ReactNode> = {
  hearts: (color) => (<svg width="24" height="24" viewBox="0 0 24 24" fill={color}><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>),
  dots: (color) => (<svg width="24" height="24" viewBox="0 0 24 24" fill={color}><circle cx="12" cy="12" r="8"/></svg>),
  triangles: (color) => (<svg width="24" height="24" viewBox="0 0 24 24" fill={color}><path d="M12 2L2 20h20L12 2z"/></svg>),
  diamonds: (color) => (<svg width="24" height="24" viewBox="0 0 24 24" fill={color}><path d="M12 2l8 10-8 10L4 12 12 2z"/></svg>),
  circles: (color) => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><circle cx="12" cy="12" r="9"/></svg>),
  squares: (color) => (<svg width="24" height="24" viewBox="0 0 24 24" fill={color}><rect x="4" y="4" width="16" height="16" rx="2"/></svg>),
  stars: (color) => (<svg width="24" height="24" viewBox="0 0 24 24" fill={color}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>),
  petals: (color) => (<svg width="24" height="24" viewBox="0 0 24 24" fill={color}><path d="M12 2c1.1 4.55 1.1 5.45 1.1 7.5 0 3-2 5-4 5s-4-2-4-5c0-2.05 0-2.95 1.1-7.5 1.4.5 3.4.5 5.8 0z" transform="rotate(0 12 12)"/><path d="M12 2c1.1 4.55 1.1 5.45 1.1 7.5 0 3-2 5-4 5s-4-2-4-5c0-2.05 0-2.95 1.1-7.5 1.4.5 3.4.5 5.8 0z" transform="rotate(72 12 12)"/><path d="M12 2c1.1 4.55 1.1 5.45 1.1 7.5 0 3-2 5-4 5s-4-2-4-5c0-2.05 0-2.95 1.1-7.5 1.4.5 3.4.5 5.8 0z" transform="rotate(144 12 12)"/><path d="M12 2c1.1 4.55 1.1 5.45 1.1 7.5 0 3-2 5-4 5s-4-2-4-5c0-2.05 0-2.95 1.1-7.5 1.4.5 3.4.5 5.8 0z" transform="rotate(216 12 12)"/><path d="M12 2c1.1 4.55 1.1 5.45 1.1 7.5 0 3-2 5-4 5s-4-2-4-5c0-2.05 0-2.95 1.1-7.5 1.4.5 3.4.5 5.8 0z" transform="rotate(288 12 12)"/></svg>),
};

// ─── Component ────────────────────────────────────────────────────────
export default function ProfileThemeEditor({ initialTheme, onSave }: ProfileThemeEditorProps) {
  // Hydrate state from initialTheme (or use defaults)
  const [activeTab, setActiveTab] = useState('presets');
  const [selectedPreset, setSelectedPreset] = useState(initialTheme?.preset || 'sunset');
  const [glassStyle, setGlassStyle] = useState(initialTheme?.glassStyle || 'ombre');
  const [customTheme, setCustomTheme] = useState({
    name: 'My Custom Theme',
    colors: initialTheme?.colors || ['#FF6B6B', '#FFB84D', '#FF6B9D', '#C06C84'],
    blurStrength: initialTheme?.blurStrength ?? 12,
    fonts: {
      heading: initialTheme?.fonts?.heading || 'inter',
      body: initialTheme?.fonts?.body || 'inter',
      headingColor: initialTheme?.fonts?.headingColor || '#2D1B1B',
      bodyColor: initialTheme?.fonts?.bodyColor || '#5A3A3A',
    },
  });
  const [effects, setEffects] = useState<EffectsState>({
    depthLayers: initialTheme?.effects?.depthLayers ?? false,
    tilt3D: initialTheme?.effects?.tilt3D ?? false,
    ripple: initialTheme?.effects?.ripple ?? true,
    particles: initialTheme?.effects?.particles || 'hearts',
    particleCount: initialTheme?.effects?.particleCount ?? 15,
    particleSpeed: initialTheme?.effects?.particleSpeed || 'medium',
  });
  const [uploadedFonts, setUploadedFonts] = useState<UploadedFont[]>([]);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const themeNameInputRef = useRef<HTMLInputElement>(null);

  // ─── Load Google Fonts ──────────────────────────────────────────────
  useEffect(() => {
    const loadFont = (fontKey: string) => {
      const font = fontPresets[fontKey];
      if (!font) return;
      const linkId = `font-${fontKey}`;
      if (document.getElementById(linkId)) return;
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = font.url;
      document.head.appendChild(link);
    };
    if (customTheme.fonts.heading) loadFont(customTheme.fonts.heading);
    if (customTheme.fonts.body) loadFont(customTheme.fonts.body);
  }, [customTheme.fonts.heading, customTheme.fonts.body]);

  // ─── Font file upload handler ───────────────────────────────────────
  const handleFontUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'heading' | 'body') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.match(/\.(ttf|otf|woff|woff2)$/i)) {
      alert('❌ Please upload a valid font file (.ttf, .otf, .woff, .woff2)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const fontName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9-]/g, '-');
      const fontData = event.target?.result as string;
      const styleId = `custom-font-${fontName}`;
      let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
      if (!styleEl) { styleEl = document.createElement('style'); styleEl.id = styleId; document.head.appendChild(styleEl); }
      styleEl.textContent = `@font-face { font-family: "${fontName}"; src: url("${fontData}"); }`;
      const newFont: UploadedFont = { name: fontName, family: `"${fontName}", sans-serif` };
      setUploadedFonts(prev => [...prev.filter(f => f.name !== fontName), newFont]);
      setCustomTheme(prev => ({ ...prev, fonts: { ...prev.fonts, [type]: fontName } }));
    };
    reader.readAsDataURL(file);
  };

  // ─── 3D tilt effect ─────────────────────────────────────────────────
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (effects.tilt3D) {
        cardRefs.current.forEach(cardRef => {
          if (!cardRef) return;
          const rect = cardRef.getBoundingClientRect();
          const tiltX = ((e.clientY - (rect.top + rect.height / 2)) / rect.height) * 2;
          const tiltY = (((rect.left + rect.width / 2) - e.clientX) / rect.width) * 2;
          cardRef.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
        });
      } else {
        cardRefs.current.forEach(cardRef => { if (cardRef) cardRef.style.transform = 'none'; });
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [effects.tilt3D]);

  // ─── Ripple effect ──────────────────────────────────────────────────
  const createRipple = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!effects.ripple) return;
    const target = e.target as HTMLElement;
    if (['INPUT', 'TEXTAREA', 'BUTTON'].includes(target.tagName)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const newRipple: Ripple = { id: Date.now(), x: e.clientX - rect.left, y: e.clientY - rect.top };
    setRipples(prev => [...prev, newRipple]);
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== newRipple.id)), 1000);
  }, [effects.ripple]);

  // ─── Derived theme ──────────────────────────────────────────────────
  const getCustomGradient = () => {
    const stops = customTheme.colors.map((c, i) => `${c} ${(i / (customTheme.colors.length - 1)) * 100}%`);
    return `linear-gradient(135deg, ${stops.join(', ')})`;
  };

  const theme: PresetTheme = activeTab === 'custom'
    ? { name: customTheme.name, gradient: getCustomGradient(), glassColor: 'rgba(255,255,255,0.1)', borderGlow: customTheme.colors[0] ? `${customTheme.colors[0]}99` : 'rgba(255,107,107,0.6)', accent: customTheme.colors[0] || '#FF6B6B', text: '#2D1B1B' }
    : presetThemes[selectedPreset] || presetThemes.sunset;

  const currentGlass = glassStyles[glassStyle] || glassStyles.ombre;

  const getHeadingFont = () => fontPresets[customTheme.fonts.heading]?.family || uploadedFonts.find(f => f.name === customTheme.fonts.heading)?.family || 'Inter, sans-serif';
  const getBodyFont = () => fontPresets[customTheme.fonts.body]?.family || uploadedFonts.find(f => f.name === customTheme.fonts.body)?.family || 'Inter, sans-serif';

  // ─── Build ThemeConfig for save ─────────────────────────────────────
  const buildConfig = (): ThemeConfig => ({
    preset: activeTab === 'custom' ? 'custom' : selectedPreset,
    glassStyle,
    colors: customTheme.colors,
    blurStrength: customTheme.blurStrength,
    fonts: { ...customTheme.fonts },
    effects: { ...effects },
  });

  // ─── Sub-components ─────────────────────────────────────────────────
  const GlassCard = ({ children, className = '', refIndex }: { children: React.ReactNode; className?: string; refIndex?: number }) => (
    <div
      ref={refIndex !== undefined ? (el: HTMLDivElement | null) => { cardRefs.current[refIndex] = el; } : undefined}
      onMouseDown={createRipple}
      className={`relative ${currentGlass.edges} border-2 overflow-hidden transition-all duration-300 hover:scale-[1.01] ${className}`}
      style={{
        background: theme.glassColor,
        backdropFilter: `blur(${currentGlass.blur}px) saturate(180%)`,
        WebkitBackdropFilter: `blur(${currentGlass.blur}px) saturate(180%)`,
        borderColor: 'rgba(255,255,255,0.25)',
        boxShadow: `0 0 20px ${theme.borderGlow}, 0 8px 32px rgba(0,0,0,0.1)`,
        transformStyle: effects.depthLayers ? 'preserve-3d' : 'flat',
      }}
    >
      {effects.depthLayers && (<>
        <div className={`absolute inset-3 ${currentGlass.edges} border pointer-events-none`} style={{ borderColor: 'rgba(255,255,255,0.15)', boxShadow: `inset 0 0 20px ${theme.borderGlow}` }} />
        <div className={`absolute inset-6 ${currentGlass.edges} border pointer-events-none`} style={{ borderColor: 'rgba(255,255,255,0.1)', boxShadow: `inset 0 0 15px ${theme.borderGlow}` }} />
      </>)}
      {glassStyle === 'holographic' && (<div className="absolute inset-0 opacity-40 mix-blend-overlay pointer-events-none" style={{ background: 'linear-gradient(45deg, rgba(255,0,255,0.2), rgba(0,255,255,0.2), rgba(255,255,0,0.2))' }} />)}
      {glassStyle === 'metallic' && (<div className="absolute inset-0 opacity-60 mix-blend-overlay pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(200,200,200,0.2) 50%, rgba(255,255,255,0.4) 100%)' }} />)}
      <div className="absolute top-0 left-0 w-32 h-32 pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 50%)', opacity: 0.6 }} />
      {glassStyle === 'ombre' && (<div className={`absolute inset-0 ${currentGlass.edges} opacity-60 pointer-events-none`} style={{ padding: '2px', background: `linear-gradient(135deg, ${theme.borderGlow} 0%, transparent 50%, ${theme.borderGlow} 100%)`, WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }} />)}
      {ripples.map(r => (<span key={r.id} className="absolute rounded-full pointer-events-none" style={{ left: `${r.x}px`, top: `${r.y}px`, width: '0', height: '0', background: theme.accent, opacity: 0.6, transform: 'translate(-50%,-50%)', animation: 'ripple-expand 1s ease-out forwards' }} />))}
      <div className="relative z-10">{children}</div>
    </div>
  );

  const FloatingParticles = () => {
    if (effects.particles === 'none') return null;
    const speeds: Record<string, number> = { slow: 10, medium: 7, fast: 4 };
    const duration = speeds[effects.particleSpeed] || 7;
    return (
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
        {Array.from({ length: effects.particleCount }).map((_, i) => {
          const size = 16 + (i % 3) * 8;
          return (
            <div key={i} className="absolute" style={{ left: `${(i * 7) % 100}%`, bottom: `-${100 + (i % 3) * 10}px`, width: `${size}px`, height: `${size}px`, opacity: 0.5 + (i % 3) * 0.15, animation: `float-up ${duration + (i % 3)}s linear infinite`, animationDelay: `${(i * 0.5) % duration}s` }}>
              {ParticleShapes[effects.particles]?.(theme.accent)}
            </div>
          );
        })}
      </div>
    );
  };

  // ─── Render ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="fixed inset-0" style={{ background: theme.gradient }} />
      <div className="fixed inset-0 opacity-[0.015] mix-blend-overlay pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='3.5' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }} />
      <FloatingParticles />

      <div className="relative z-10 p-6 max-w-7xl mx-auto">
        {/* Header card */}
        <GlassCard className="mb-6 p-6" refIndex={0}>
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-3" style={{ color: theme.text }}>
                <Palette className="w-10 h-10" style={{ color: theme.accent }} />
                Profile Theme Editor
              </h1>
              <p style={{ color: theme.text, opacity: 0.8 }}>Customize colors, fonts, glass effects &amp; animations</p>
            </div>
            <button
              className="px-6 py-3 rounded-2xl font-bold flex items-center gap-2 border-2 transition-all hover:scale-105"
              style={{ background: theme.accent, borderColor: 'rgba(255,255,255,0.3)', color: '#ffffff', boxShadow: `0 0 20px ${theme.accent}80` }}
              onClick={() => onSave?.(buildConfig())}
            >
              <Save className="w-5 h-5" />
              Save Theme
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 flex-wrap">
            {([
              { id: 'presets', label: 'Preset Themes', icon: Star },
              { id: 'custom', label: 'Custom Builder', icon: Wand2 },
              { id: 'fonts', label: 'Fonts', icon: Type },
              { id: 'glass', label: 'Glass Styles', icon: Layers },
              { id: 'effects', label: 'Effects', icon: Sparkles },
            ] as const).map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className="px-5 py-2.5 rounded-xl font-semibold transition-all hover:scale-105 flex items-center gap-2 border-2"
                  style={{ background: activeTab === tab.id ? theme.accent : 'rgba(255,255,255,0.1)', borderColor: activeTab === tab.id ? theme.accent : 'rgba(255,255,255,0.2)', color: activeTab === tab.id ? '#ffffff' : theme.text, backdropFilter: 'blur(8px)' }}>
                  <Icon className="w-4 h-4" />{tab.label}
                </button>
              );
            })}
          </div>
        </GlassCard>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ─── Left column: controls ──────────────────── */}
          <div className="lg:col-span-1">
            <GlassCard className="p-6" refIndex={1}>
              {/* Presets tab */}
              {activeTab === 'presets' && (
                <div>
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: theme.text }}>
                    <Star className="w-5 h-5" style={{ color: theme.accent }} /> Preset Themes
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(presetThemes).map(([key, preset]) => (
                      <button key={key} onClick={() => setSelectedPreset(key)}
                        className="w-full p-4 rounded-xl border-2 transition-all hover:scale-[1.02] text-left relative overflow-hidden"
                        style={{ background: selectedPreset === key ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)', borderColor: selectedPreset === key ? theme.accent : 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}>
                        <div className="h-12 rounded-lg mb-3" style={{ background: preset.gradient }} />
                        <div className="font-semibold" style={{ color: theme.text }}>{preset.name}</div>
                        {selectedPreset === key && (<div className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ background: theme.accent }}>✓</div>)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom tab */}
              {activeTab === 'custom' && (
                <div>
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: theme.text }}>
                    <Wand2 className="w-5 h-5" style={{ color: theme.accent }} /> Custom Theme
                  </h3>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>Theme Name</label>
                      <input ref={themeNameInputRef} type="text" value={customTheme.name}
                        onChange={(e) => setCustomTheme(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-4 py-2 rounded-xl border-2"
                        style={{ background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)', color: theme.text }} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-3" style={{ color: theme.text }}>Gradient Colors</label>
                      <div className="h-16 rounded-xl mb-4 border-2 pointer-events-none" style={{ background: getCustomGradient(), borderColor: 'rgba(255,255,255,0.3)' }} />
                      <div className="grid grid-cols-2 gap-3">
                        {customTheme.colors.map((color, i) => (
                          <div key={i} className="space-y-2">
                            <input type="color" value={color} onChange={(e) => setCustomTheme(prev => { const nc = [...prev.colors]; nc[i] = e.target.value; return { ...prev, colors: nc }; })} className="w-full h-16 rounded-lg cursor-pointer border-2" style={{ borderColor: 'rgba(255,255,255,0.3)' }} />
                            <input type="text" value={color} onChange={(e) => setCustomTheme(prev => { const nc = [...prev.colors]; nc[i] = e.target.value; return { ...prev, colors: nc }; })} className="w-full px-2 py-1 text-xs font-mono rounded border text-center uppercase" style={{ background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)', color: theme.text }} />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-3" style={{ color: theme.text }}>Blur Strength: {customTheme.blurStrength}px</label>
                      <input type="range" min="4" max="32" value={customTheme.blurStrength} onChange={(e) => setCustomTheme(prev => ({ ...prev, blurStrength: parseInt(e.target.value) }))} className="w-full h-3 rounded-lg cursor-pointer" style={{ accentColor: theme.accent }} />
                      <div className="flex justify-between text-xs mt-1" style={{ color: theme.text, opacity: 0.6 }}><span>4px Sharp</span><span>32px Heavy</span></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Fonts tab */}
              {activeTab === 'fonts' && (
                <div>
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: theme.text }}>
                    <Type className="w-5 h-5" style={{ color: theme.accent }} /> Font Settings
                  </h3>
                  <div className="space-y-6">
                    {/* Heading font */}
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>Heading Font</label>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                        {Object.entries(fontPresets).map(([key, font]) => (
                          <button key={key} onClick={() => setCustomTheme(prev => ({ ...prev, fonts: { ...prev.fonts, heading: key } }))}
                            className="w-full p-3 rounded-lg border-2 transition-all hover:scale-[1.02] text-left"
                            style={{ background: customTheme.fonts.heading === key ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)', borderColor: customTheme.fonts.heading === key ? theme.accent : 'rgba(255,255,255,0.2)', fontFamily: font.family }}>
                            <div className="font-semibold mb-1" style={{ color: theme.text }}>{font.name}</div>
                            <div className="text-xs" style={{ color: theme.text, opacity: 0.6 }}>{font.style}</div>
                          </button>
                        ))}
                        {uploadedFonts.map(font => (
                          <button key={font.name} onClick={() => setCustomTheme(prev => ({ ...prev, fonts: { ...prev.fonts, heading: font.name } }))}
                            className="w-full p-3 rounded-lg border-2 transition-all hover:scale-[1.02] text-left"
                            style={{ background: customTheme.fonts.heading === font.name ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)', borderColor: customTheme.fonts.heading === font.name ? theme.accent : 'rgba(255,255,255,0.2)', fontFamily: font.family }}>
                            <div className="font-semibold mb-1" style={{ color: theme.text }}>{font.name}</div>
                            <div className="text-xs" style={{ color: theme.text, opacity: 0.6 }}>Custom Upload</div>
                          </button>
                        ))}
                      </div>
                      <div className="mt-3">
                        <label className="block text-xs font-medium mb-2" style={{ color: theme.text }}>Heading Color</label>
                        <div className="flex gap-2">
                          <input type="color" value={customTheme.fonts.headingColor} onChange={(e) => setCustomTheme(prev => ({ ...prev, fonts: { ...prev.fonts, headingColor: e.target.value } }))} className="w-20 h-10 rounded-lg cursor-pointer border-2" style={{ borderColor: 'rgba(255,255,255,0.3)' }} />
                          <input type="text" value={customTheme.fonts.headingColor} onChange={(e) => setCustomTheme(prev => ({ ...prev, fonts: { ...prev.fonts, headingColor: e.target.value } }))} className="flex-1 px-3 py-2 text-sm font-mono rounded-lg border-2 text-center uppercase" style={{ background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)', color: theme.text }} />
                        </div>
                      </div>
                      <label className="mt-3 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all hover:scale-105" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.2)', color: theme.text }}>
                        <Upload className="w-4 h-4" /><span className="text-sm font-medium">Upload Heading Font</span>
                        <input type="file" accept=".ttf,.otf,.woff,.woff2" onChange={(e) => handleFontUpload(e, 'heading')} className="hidden" />
                      </label>
                    </div>
                    {/* Body font */}
                    <div className="pt-6 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                      <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>Body Font</label>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                        {Object.entries(fontPresets).map(([key, font]) => (
                          <button key={key} onClick={() => setCustomTheme(prev => ({ ...prev, fonts: { ...prev.fonts, body: key } }))}
                            className="w-full p-3 rounded-lg border-2 transition-all hover:scale-[1.02] text-left"
                            style={{ background: customTheme.fonts.body === key ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)', borderColor: customTheme.fonts.body === key ? theme.accent : 'rgba(255,255,255,0.2)', fontFamily: font.family }}>
                            <div className="font-semibold mb-1" style={{ color: theme.text }}>{font.name}</div>
                            <div className="text-xs" style={{ color: theme.text, opacity: 0.6 }}>{font.style}</div>
                          </button>
                        ))}
                        {uploadedFonts.map(font => (
                          <button key={font.name} onClick={() => setCustomTheme(prev => ({ ...prev, fonts: { ...prev.fonts, body: font.name } }))}
                            className="w-full p-3 rounded-lg border-2 transition-all hover:scale-[1.02] text-left"
                            style={{ background: customTheme.fonts.body === font.name ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)', borderColor: customTheme.fonts.body === font.name ? theme.accent : 'rgba(255,255,255,0.2)', fontFamily: font.family }}>
                            <div className="font-semibold mb-1" style={{ color: theme.text }}>{font.name}</div>
                            <div className="text-xs" style={{ color: theme.text, opacity: 0.6 }}>Custom Upload</div>
                          </button>
                        ))}
                      </div>
                      <div className="mt-3">
                        <label className="block text-xs font-medium mb-2" style={{ color: theme.text }}>Body Color</label>
                        <div className="flex gap-2">
                          <input type="color" value={customTheme.fonts.bodyColor} onChange={(e) => setCustomTheme(prev => ({ ...prev, fonts: { ...prev.fonts, bodyColor: e.target.value } }))} className="w-20 h-10 rounded-lg cursor-pointer border-2" style={{ borderColor: 'rgba(255,255,255,0.3)' }} />
                          <input type="text" value={customTheme.fonts.bodyColor} onChange={(e) => setCustomTheme(prev => ({ ...prev, fonts: { ...prev.fonts, bodyColor: e.target.value } }))} className="flex-1 px-3 py-2 text-sm font-mono rounded-lg border-2 text-center uppercase" style={{ background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)', color: theme.text }} />
                        </div>
                      </div>
                      <label className="mt-3 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all hover:scale-105" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.2)', color: theme.text }}>
                        <Upload className="w-4 h-4" /><span className="text-sm font-medium">Upload Body Font</span>
                        <input type="file" accept=".ttf,.otf,.woff,.woff2" onChange={(e) => handleFontUpload(e, 'body')} className="hidden" />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Glass tab */}
              {activeTab === 'glass' && (
                <div>
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: theme.text }}>
                    <Layers className="w-5 h-5" style={{ color: theme.accent }} /> Glass Styles
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(glassStyles).map(([key, style]) => (
                      <button key={key} onClick={() => setGlassStyle(key)}
                        className="w-full p-4 rounded-xl border-2 transition-all hover:scale-[1.02] text-left relative"
                        style={{ background: glassStyle === key ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)', borderColor: glassStyle === key ? theme.accent : 'rgba(255,255,255,0.2)' }}>
                        <div className="font-semibold mb-2" style={{ color: theme.text }}>{style.name}</div>
                        <div className="text-xs" style={{ color: theme.text, opacity: 0.7 }}>Blur: {style.blur}px • {style.edges}</div>
                        {glassStyle === key && (<div className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ background: theme.accent }}>✓</div>)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Effects tab */}
              {activeTab === 'effects' && (
                <div>
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: theme.text }}>
                    <Sparkles className="w-5 h-5" style={{ color: theme.accent }} /> Dynamic Effects
                  </h3>
                  <div className="space-y-4">
                    {([
                      { key: 'depthLayers' as const, label: 'Depth Layers', icon: '🎚️' },
                      { key: 'tilt3D' as const, label: '3D Tilt (Subtle)', icon: '🎲' },
                      { key: 'ripple' as const, label: 'Click Ripple', icon: '💧' },
                    ]).map(effect => (
                      <label key={effect.key} className="flex items-center justify-between p-4 rounded-xl cursor-pointer hover:bg-white/5 border" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                        <span className="flex items-center gap-3" style={{ color: theme.text }}>
                          <span className="text-xl">{effect.icon}</span><span className="font-medium">{effect.label}</span>
                        </span>
                        <input type="checkbox" checked={effects[effect.key] as boolean} onChange={(e) => setEffects(prev => ({ ...prev, [effect.key]: e.target.checked }))} className="w-5 h-5 rounded" style={{ accentColor: theme.accent }} />
                      </label>
                    ))}
                    <div className="pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                      <label className="block text-sm font-medium mb-3" style={{ color: theme.text }}>Floating Particles</label>
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        {Object.keys(ParticleShapes).map(type => (
                          <button key={type} onClick={() => setEffects(prev => ({ ...prev, particles: type }))}
                            className="px-3 py-2 rounded-lg border-2 capitalize text-sm transition-all hover:scale-105 flex items-center justify-center gap-1"
                            style={{ background: effects.particles === type ? theme.accent : 'rgba(255,255,255,0.1)', borderColor: effects.particles === type ? theme.accent : 'rgba(255,255,255,0.2)', color: effects.particles === type ? '#ffffff' : theme.text }}>
                            <span className="w-4 h-4 flex items-center justify-center">{ParticleShapes[type](effects.particles === type ? '#ffffff' : theme.text)}</span>
                            <span>{type}</span>
                          </button>
                        ))}
                        <button onClick={() => setEffects(prev => ({ ...prev, particles: 'none' }))}
                          className="px-3 py-2 rounded-lg border-2 capitalize text-sm transition-all hover:scale-105"
                          style={{ background: effects.particles === 'none' ? theme.accent : 'rgba(255,255,255,0.1)', borderColor: effects.particles === 'none' ? theme.accent : 'rgba(255,255,255,0.2)', color: effects.particles === 'none' ? '#ffffff' : theme.text }}>
                          none
                        </button>
                      </div>
                      {effects.particles !== 'none' && (<>
                        <div className="mb-4">
                          <label className="block text-sm mb-2" style={{ color: theme.text }}>Count: <strong>{effects.particleCount}</strong></label>
                          <input type="range" min="5" max="40" step="5" value={effects.particleCount} onChange={(e) => setEffects(prev => ({ ...prev, particleCount: parseInt(e.target.value) }))} className="w-full h-3 cursor-pointer" style={{ accentColor: theme.accent }} />
                        </div>
                        <div>
                          <label className="block text-sm mb-2" style={{ color: theme.text }}>Speed</label>
                          <div className="grid grid-cols-3 gap-2">
                            {['slow', 'medium', 'fast'].map(speed => (
                              <button key={speed} onClick={() => setEffects(prev => ({ ...prev, particleSpeed: speed }))}
                                className="px-3 py-2 rounded-lg border capitalize text-sm"
                                style={{ background: effects.particleSpeed === speed ? theme.accent : 'rgba(255,255,255,0.1)', borderColor: effects.particleSpeed === speed ? theme.accent : 'rgba(255,255,255,0.2)', color: effects.particleSpeed === speed ? '#ffffff' : theme.text }}>
                                {speed}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>)}
                    </div>
                  </div>
                </div>
              )}
            </GlassCard>
          </div>

          {/* ─── Right column: live preview ─────────────── */}
          <div className="lg:col-span-2 space-y-6">
            <GlassCard className="p-8" refIndex={2}>
              <div className="flex flex-col sm:flex-row gap-6 mb-8">
                <div className="relative flex-shrink-0">
                  <div className="w-32 h-32 rounded-3xl overflow-hidden border-4" style={{ borderColor: 'rgba(255,255,255,0.3)', boxShadow: `0 0 30px ${theme.borderGlow}` }}>
                    <div className="w-full h-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-4xl text-white/80">
                      <Users className="w-12 h-12" />
                    </div>
                  </div>
                  <div className="absolute -bottom-2 -right-2 px-3 py-1.5 rounded-full border-2 flex items-center gap-1.5" style={{ background: 'rgba(255,255,255,0.1)', borderColor: theme.accent, color: theme.accent }}>
                    <Crown className="w-4 h-4" fill="currentColor" /><span className="text-xs font-bold">VIP</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h2 className="text-4xl font-bold mb-3" style={{ color: customTheme.fonts.headingColor, fontFamily: getHeadingFont() }}>Preview User</h2>
                  <p className="text-lg mb-4" style={{ color: customTheme.fonts.bodyColor, fontFamily: getBodyFont() }}>Full-stack developer | Coffee enthusiast ☕</p>
                  <div className="flex gap-3">
                    <button className="px-8 py-3 rounded-2xl font-bold flex items-center gap-2 border-2 transition-all hover:scale-105" style={{ background: theme.accent, borderColor: 'rgba(255,255,255,0.3)', color: '#ffffff', fontFamily: getBodyFont() }}>
                      <Heart className="w-5 h-5" fill="currentColor" /> Like
                    </button>
                    <button className="px-8 py-3 rounded-2xl font-bold border-2 transition-all hover:scale-105" style={{ background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)', color: customTheme.fonts.bodyColor, fontFamily: getBodyFont() }}>
                      <MessageSquare className="w-5 h-5 inline mr-2" /> Message
                    </button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {([
                  { icon: Heart, value: '2.4K', label: 'Likes' },
                  { icon: Eye, value: '12.8K', label: 'Views' },
                  { icon: MessageSquare, value: '567', label: 'Messages' },
                  { icon: Users, value: '1.2K', label: 'Followers' },
                ] as const).map((stat, i) => {
                  const Icon = stat.icon;
                  return (
                    <GlassCard key={i} className="p-5" refIndex={3 + i}>
                      <Icon className="w-6 h-6 mb-2" style={{ color: theme.accent }} />
                      <div className="text-3xl font-bold mb-1" style={{ color: customTheme.fonts.headingColor, fontFamily: getHeadingFont() }}>{stat.value}</div>
                      <div className="text-sm" style={{ color: customTheme.fonts.bodyColor, fontFamily: getBodyFont() }}>{stat.label}</div>
                    </GlassCard>
                  );
                })}
              </div>
            </GlassCard>

            <GlassCard className="p-6" refIndex={7}>
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: customTheme.fonts.headingColor, fontFamily: getHeadingFont() }}>
                <Camera className="w-5 h-5" style={{ color: theme.accent }} /> Gallery Preview
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <GlassCard key={i} className="aspect-square overflow-hidden p-0" refIndex={8 + i}>
                    <div className="w-full h-full bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center text-white/40 text-xs">Photo {i}</div>
                  </GlassCard>
                ))}
              </div>
            </GlassCard>
          </div>
        </div>
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes float-up {
          0% { transform: translateY(0) scale(0.8) rotate(0deg); opacity: 0; }
          10% { opacity: 0.6; }
          90% { opacity: 0.6; }
          100% { transform: translateY(-120vh) scale(1.2) rotate(360deg); opacity: 0; }
        }
        @keyframes ripple-expand {
          0% { width: 0; height: 0; opacity: 0.6; }
          100% { width: 500px; height: 500px; opacity: 0; }
        }
        input[type="range"] { -webkit-appearance: none; appearance: none; background: rgba(255,255,255,0.2); outline: none; border-radius: 10px; }
        input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 20px; height: 20px; border-radius: 50%; background: currentColor; cursor: pointer; transition: transform 0.1s; }
        input[type="range"]::-webkit-slider-thumb:hover { transform: scale(1.2); }
        input[type="range"]::-moz-range-thumb { width: 20px; height: 20px; border-radius: 50%; background: currentColor; cursor: pointer; border: none; transition: transform 0.1s; }
        input[type="range"]::-moz-range-thumb:hover { transform: scale(1.2); }
      `}</style>
    </div>
  );
}
