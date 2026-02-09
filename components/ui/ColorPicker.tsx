'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface ColorPickerProps {
  value: string; // hex like "#FF6B6B"
  onChange: (hex: string) => void;
  accentColor?: string;
  textColor?: string;
}

// ── Helpers: HSL ↔ Hex ──────────────────────────────────────────────

function hexToHSL(hex: string): { h: number; s: number; l: number } {
  let r = 0, g = 0, b = 0;
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16) / 255;
    g = parseInt(clean[1] + clean[1], 16) / 255;
    b = parseInt(clean[2] + clean[2], 16) / 255;
  } else if (clean.length === 6) {
    r = parseInt(clean.substring(0, 2), 16) / 255;
    g = parseInt(clean.substring(2, 4), 16) / 255;
    b = parseInt(clean.substring(4, 6), 16) / 255;
  }
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const a = sNorm * Math.min(lNorm, 1 - lNorm);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = lNorm - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

export function ColorPicker({ value, onChange, accentColor = '#00d4ff', textColor = '#e6f7ff' }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hsl, setHSL] = useState(() => hexToHSL(value));
  const [hexInput, setHexInput] = useState(value.toUpperCase());
  const pickerRef = useRef<HTMLDivElement>(null);

  // Sync when value prop changes externally
  useEffect(() => {
    const newHSL = hexToHSL(value);
    setHSL(newHSL);
    setHexInput(value.toUpperCase());
  }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const updateFromHSL = useCallback((newH: number, newS: number, newL: number) => {
    const newHex = hslToHex(newH, newS, newL);
    setHSL({ h: newH, s: newS, l: newL });
    setHexInput(newHex);
    onChange(newHex);
  }, [onChange]);

  const handleHexChange = useCallback((newHex: string) => {
    setHexInput(newHex);
    const clean = newHex.replace('#', '');
    if (/^[0-9A-Fa-f]{6}$/.test(clean)) {
      const formatted = `#${clean.toUpperCase()}`;
      const newHSL = hexToHSL(formatted);
      setHSL(newHSL);
      onChange(formatted);
    }
  }, [onChange]);

  const satGradient = `linear-gradient(to right, hsl(${hsl.h},0%,${hsl.l}%), hsl(${hsl.h},100%,${hsl.l}%))`;
  const lightGradient = `linear-gradient(to right, hsl(${hsl.h},${hsl.s}%,0%), hsl(${hsl.h},${hsl.s}%,50%), hsl(${hsl.h},${hsl.s}%,100%))`;

  return (
    <div className="relative" ref={pickerRef}>
      {/* Swatch button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-10 xs:h-12 sm:h-14 rounded-lg cursor-pointer border-2 transition-all hover:scale-[1.02] active:scale-95"
        style={{
          backgroundColor: value,
          borderColor: isOpen ? accentColor : 'rgba(255,255,255,0.3)',
          boxShadow: isOpen ? `0 0 12px ${accentColor}40` : 'none',
        }}
        aria-label="Open color picker"
      />

      {/* Picker dropdown */}
      {isOpen && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-[60] mt-2 p-2.5 xs:p-3 sm:p-4 rounded-xl border space-y-3 xs:space-y-4 w-[min(300px,calc(100vw-1.5rem))]"
          style={{
            background: 'rgba(15, 20, 30, 0.95)',
            borderColor: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          }}
        >
          {/* Preview swatch */}
          <div className="flex items-center gap-2 xs:gap-3">
            <div
              className="w-9 h-9 xs:w-10 xs:h-10 sm:w-12 sm:h-12 rounded-lg border-2 flex-shrink-0"
              style={{ backgroundColor: value, borderColor: 'rgba(255,255,255,0.3)' }}
            />
            <input
              type="text"
              value={hexInput}
              onChange={(e) => handleHexChange(e.target.value)}
              className="flex-1 px-2 xs:px-3 py-1.5 xs:py-2 text-xs xs:text-sm font-mono rounded-lg border text-center uppercase"
              style={{
                background: 'rgba(255,255,255,0.1)',
                borderColor: 'rgba(255,255,255,0.2)',
                color: textColor,
              }}
              maxLength={7}
              placeholder="#FF6B6B"
            />
          </div>

          {/* Hue slider */}
          <div>
            <label className="block text-[11px] xs:text-xs font-medium mb-1 xs:mb-1.5" style={{ color: textColor, opacity: 0.7 }}>
              Hue: {hsl.h}°
            </label>
            <input
              type="range"
              min="0"
              max="360"
              value={hsl.h}
              onChange={(e) => updateFromHSL(parseInt(e.target.value), hsl.s, hsl.l)}
              className="w-full h-2.5 xs:h-3 rounded-lg cursor-pointer hue-slider"
              style={{ touchAction: 'pan-x' } as any}
            />
          </div>

          {/* Saturation slider */}
          <div>
            <label className="block text-[11px] xs:text-xs font-medium mb-1 xs:mb-1.5" style={{ color: textColor, opacity: 0.7 }}>
              Saturation: {hsl.s}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={hsl.s}
              onChange={(e) => updateFromHSL(hsl.h, parseInt(e.target.value), hsl.l)}
              className="w-full h-2.5 xs:h-3 rounded-lg cursor-pointer"
              style={{ background: satGradient, touchAction: 'pan-x' } as any}
            />
          </div>

          {/* Lightness slider */}
          <div>
            <label className="block text-[11px] xs:text-xs font-medium mb-1 xs:mb-1.5" style={{ color: textColor, opacity: 0.7 }}>
              Lightness: {hsl.l}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={hsl.l}
              onChange={(e) => updateFromHSL(hsl.h, hsl.s, parseInt(e.target.value))}
              className="w-full h-2.5 xs:h-3 rounded-lg cursor-pointer"
              style={{ background: lightGradient, touchAction: 'pan-x' } as any}
            />
          </div>

          {/* Quick presets row */}
          <div>
            <label className="block text-[11px] xs:text-xs font-medium mb-1 xs:mb-1.5" style={{ color: textColor, opacity: 0.7 }}>
              Quick Colors
            </label>
            <div className="flex flex-wrap gap-1.5 xs:gap-2">
              {[
                '#FF6B6B', '#FFB84D', '#FF6B9D', '#C06C84',
                '#00D4FF', '#6C63FF', '#2ECC71', '#F39C12',
                '#E74C3C', '#9B59B6', '#1ABC9C', '#E91E63',
                '#FF5722', '#00BCD4', '#8BC34A', '#FFC107',
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    const newHSL = hexToHSL(preset);
                    setHSL(newHSL);
                    setHexInput(preset);
                    onChange(preset);
                  }}
                  className="w-6 h-6 xs:w-7 xs:h-7 rounded-full border-2 transition-all hover:scale-110 active:scale-90"
                  style={{
                    backgroundColor: preset,
                    borderColor: value.toUpperCase() === preset ? '#fff' : 'rgba(255,255,255,0.2)',
                    boxShadow: value.toUpperCase() === preset ? '0 0 8px rgba(255,255,255,0.4)' : 'none',
                  }}
                  aria-label={`Select ${preset}`}
                />
              ))}
            </div>
          </div>

          {/* Done button */}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="w-full py-1.5 xs:py-2 rounded-lg text-xs xs:text-sm font-medium text-white transition-all hover:brightness-110 active:scale-95"
            style={{ background: accentColor }}
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
