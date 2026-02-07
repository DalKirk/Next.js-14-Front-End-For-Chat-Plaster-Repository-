'use client';

import React from 'react';

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

export interface FontPreset {
  name: string;
  family: string;
  url: string;
  style: string;
}

export interface PresetTheme {
  name: string;
  gradient: string;
  glassColor: string;
  borderGlow: string;
  accent: string;
  text: string;
}

export interface GlassStyleDef {
  name: string;
  blur: number;
  edges: string;
}

export interface EffectsState {
  depthLayers: boolean;
  tilt3D: boolean;
  ripple: boolean;
  particles: string;
  particleCount: number;
  particleSpeed: string;
}

export interface CustomThemeState {
  name: string;
  colors: string[];
  blurStrength: number;
  fonts: {
    heading: string;
    body: string;
    headingColor: string;
    bodyColor: string;
  };
}

export interface UploadedFont {
  name: string;
  family: string;
}

// ═══════════════════════════════════════════════════════════════════════
// Font Presets
// ═══════════════════════════════════════════════════════════════════════

export const fontPresets: Record<string, FontPreset> = {
  inter: { name: 'Inter', family: 'Inter, system-ui, sans-serif', url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap', style: 'Modern sans-serif' },
  playfair: { name: 'Playfair Display', family: '"Playfair Display", serif', url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap', style: 'Elegant serif' },
  poppins: { name: 'Poppins', family: 'Poppins, sans-serif', url: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap', style: 'Friendly rounded' },
  montserrat: { name: 'Montserrat', family: 'Montserrat, sans-serif', url: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap', style: 'Geometric' },
  lora: { name: 'Lora', family: 'Lora, serif', url: 'https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&display=swap', style: 'Classic serif' },
  dancing: { name: 'Dancing Script', family: '"Dancing Script", cursive', url: 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;600;700&display=swap', style: 'Handwritten' },
  roboto: { name: 'Roboto', family: 'Roboto, sans-serif', url: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap', style: 'Clean readable' },
  bebas: { name: 'Bebas Neue', family: '"Bebas Neue", sans-serif', url: 'https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap', style: 'Bold display' },
};

// ═══════════════════════════════════════════════════════════════════════
// Preset Themes
// ═══════════════════════════════════════════════════════════════════════

export const presetThemes: Record<string, PresetTheme> = {
  sunset: { name: 'Sunset Ombre', gradient: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 25%, #FFB84D 50%, #FF6B9D 75%, #C06C84 100%)', glassColor: 'rgba(255,255,255,0.1)', borderGlow: 'rgba(255,107,107,0.6)', accent: '#FF6B6B', text: '#2D1B1B' },
  ocean: { name: 'Ocean Depths', gradient: 'linear-gradient(135deg, #667eea 0%, #0077BE 35%, #00B4D8 70%, #48CAE4 100%)', glassColor: 'rgba(255,255,255,0.08)', borderGlow: 'rgba(72,202,228,0.7)', accent: '#00B4D8', text: '#0A2540' },
  lavender: { name: 'Lavender Dream', gradient: 'linear-gradient(135deg, #9D50BB 0%, #DDA0DD 40%, #E0B0FF 75%, #F8D7FF 100%)', glassColor: 'rgba(255,255,255,0.12)', borderGlow: 'rgba(224,176,255,0.8)', accent: '#B185DB', text: '#3D1A4A' },
  mint: { name: 'Mint Fresh', gradient: 'linear-gradient(135deg, #14B8A6 0%, #2DD4BF 30%, #5EEAD4 60%, #98F5E1 100%)', glassColor: 'rgba(255,255,255,0.1)', borderGlow: 'rgba(152,245,225,0.7)', accent: '#2DD4BF', text: '#0D3331' },
  rose: { name: 'Rose Gold', gradient: 'linear-gradient(135deg, #E0AFA0 0%, #DDA15E 30%, #BC6C25 60%, #F4ACB7 100%)', glassColor: 'rgba(255,255,255,0.15)', borderGlow: 'rgba(244,172,183,0.8)', accent: '#E0AFA0', text: '#3D2616' },
  cherry: { name: 'Cherry Pop', gradient: 'linear-gradient(135deg, #DC2626 0%, #F87171 50%, #FED7D7 100%)', glassColor: 'rgba(255,255,255,0.12)', borderGlow: 'rgba(254,215,215,0.8)', accent: '#DC2626', text: '#450A0A' },
  midnight: { name: 'Midnight', gradient: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', glassColor: 'rgba(255,255,255,0.06)', borderGlow: 'rgba(100,100,200,0.5)', accent: '#818cf8', text: '#e2e8f0' },
};

// Default dark theme (no custom theme applied)
export const defaultTheme: PresetTheme = {
  name: 'Default',
  gradient: 'linear-gradient(135deg, #000000 0%, #0f172a 50%, #000000 100%)',
  glassColor: 'rgba(255,255,255,0.05)',
  borderGlow: 'rgba(34,211,238,0.4)',
  accent: '#22d3ee',
  text: '#e2e8f0',
};

// ═══════════════════════════════════════════════════════════════════════
// Glass Styles
// ═══════════════════════════════════════════════════════════════════════

export const glassStyles: Record<string, GlassStyleDef> = {
  ombre: { name: 'Ombre Glass', blur: 12, edges: 'rounded-3xl' },
  frosted: { name: 'Frosted', blur: 24, edges: 'rounded-2xl' },
  crystal: { name: 'Crystal', blur: 4, edges: 'rounded-lg' },
  liquid: { name: 'Liquid', blur: 16, edges: 'rounded-[2rem]' },
  holographic: { name: 'Holographic', blur: 8, edges: 'rounded-2xl' },
  metallic: { name: 'Metallic', blur: 6, edges: 'rounded-xl' },
};

// ═══════════════════════════════════════════════════════════════════════
// SVG Particle Shapes
// ═══════════════════════════════════════════════════════════════════════

export const ParticleShapes: Record<string, (color: string) => React.ReactNode> = {
  hearts: (color) => (<svg width="24" height="24" viewBox="0 0 24 24" fill={color}><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>),
  dots: (color) => (<svg width="24" height="24" viewBox="0 0 24 24" fill={color}><circle cx="12" cy="12" r="8"/></svg>),
  triangles: (color) => (<svg width="24" height="24" viewBox="0 0 24 24" fill={color}><path d="M12 2L2 20h20L12 2z"/></svg>),
  diamonds: (color) => (<svg width="24" height="24" viewBox="0 0 24 24" fill={color}><path d="M12 2l8 10-8 10L4 12 12 2z"/></svg>),
  circles: (color) => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><circle cx="12" cy="12" r="9"/></svg>),
  squares: (color) => (<svg width="24" height="24" viewBox="0 0 24 24" fill={color}><rect x="4" y="4" width="16" height="16" rx="2"/></svg>),
  stars: (color) => (<svg width="24" height="24" viewBox="0 0 24 24" fill={color}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>),
  petals: (color) => (<svg width="24" height="24" viewBox="0 0 24 24" fill={color}><path d="M12 2c1.1 4.55 1.1 5.45 1.1 7.5 0 3-2 5-4 5s-4-2-4-5c0-2.05 0-2.95 1.1-7.5 1.4.5 3.4.5 5.8 0z" transform="rotate(0 12 12)"/><path d="M12 2c1.1 4.55 1.1 5.45 1.1 7.5 0 3-2 5-4 5s-4-2-4-5c0-2.05 0-2.95 1.1-7.5 1.4.5 3.4.5 5.8 0z" transform="rotate(72 12 12)"/><path d="M12 2c1.1 4.55 1.1 5.45 1.1 7.5 0 3-2 5-4 5s-4-2-4-5c0-2.05 0-2.95 1.1-7.5 1.4.5 3.4.5 5.8 0z" transform="rotate(144 12 12)"/><path d="M12 2c1.1 4.55 1.1 5.45 1.1 7.5 0 3-2 5-4 5s-4-2-4-5c0-2.05 0-2.95 1.1-7.5 1.4.5 3.4.5 5.8 0z" transform="rotate(216 12 12)"/><path d="M12 2c1.1 4.55 1.1 5.45 1.1 7.5 0 3-2 5-4 5s-4-2-4-5c0-2.05 0-2.95 1.1-7.5 1.4.5 3.4.5 5.8 0z" transform="rotate(288 12 12)"/></svg>),
};

// ═══════════════════════════════════════════════════════════════════════
// Utility: resolve a ThemeConfig into display values
// ═══════════════════════════════════════════════════════════════════════

export function resolveTheme(
  preset: string,
  customColors: string[],
  activeTab: string,
): PresetTheme {
  if (activeTab === 'custom' || preset === 'custom') {
    const stops = customColors.map((c, i) => `${c} ${(i / (customColors.length - 1)) * 100}%`);
    return {
      name: 'Custom',
      gradient: `linear-gradient(135deg, ${stops.join(', ')})`,
      glassColor: 'rgba(255,255,255,0.1)',
      borderGlow: customColors[0] ? `${customColors[0]}99` : 'rgba(255,107,107,0.6)',
      accent: customColors[0] || '#FF6B6B',
      text: '#2D1B1B',
    };
  }
  return presetThemes[preset] || presetThemes.sunset;
}

export function resolveFont(
  fontKey: string,
  uploadedFonts: UploadedFont[],
): string {
  return (
    fontPresets[fontKey]?.family ||
    uploadedFonts.find((f) => f.name === fontKey)?.family ||
    'Inter, sans-serif'
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Theme Animation CSS (inject into a <style> tag)
// ═══════════════════════════════════════════════════════════════════════

export const themeAnimationCSS = `
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
  input[type="range"].theme-range {
    -webkit-appearance: none; appearance: none;
    background: rgba(255,255,255,0.2); outline: none; border-radius: 10px;
  }
  input[type="range"].theme-range::-webkit-slider-thumb {
    -webkit-appearance: none; appearance: none;
    width: 20px; height: 20px; border-radius: 50%;
    background: currentColor; cursor: pointer; transition: transform 0.1s;
  }
  input[type="range"].theme-range::-webkit-slider-thumb:hover { transform: scale(1.2); }
  input[type="range"].theme-range::-moz-range-thumb {
    width: 20px; height: 20px; border-radius: 50%;
    background: currentColor; cursor: pointer; border: none; transition: transform 0.1s;
  }
  input[type="range"].theme-range::-moz-range-thumb:hover { transform: scale(1.2); }
`;
