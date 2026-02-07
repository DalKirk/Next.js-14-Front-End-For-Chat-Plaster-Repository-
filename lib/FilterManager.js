'use client';

import * as PIXI from 'pixi.js';
import { 
  GlowFilter, 
  CRTFilter, 
  PixelateFilter,
  ColorOverlayFilter,
  AdjustmentFilter,
  OldFilmFilter,
  ShockwaveFilter,
  OutlineFilter
} from 'pixi-filters';

/**
 * FilterManager - Advanced visual effects for PixiJS
 * 
 * Phase 4 Features:
 * - CRT/retro screen effects
 * - Dynamic glow animations
 * - Day/night cycle lighting
 * - Screen shake and shockwave
 * - Color grading and adjustments
 */
export class FilterManager {
  constructor(app) {
    this.app = app;
    this.filters = new Map();
    this.animations = [];
    this.enabled = true;
    
    // Time tracking for animations
    this.time = 0;
    
    // Preset configurations
    this.presets = {
      retro: this.createRetroPreset.bind(this),
      underwater: this.createUnderwaterPreset.bind(this),
      sunset: this.createSunsetPreset.bind(this),
      night: this.createNightPreset.bind(this),
      dream: this.createDreamPreset.bind(this),
    };
  }

  // ============================================
  // GLOW EFFECTS
  // ============================================

  /**
   * Create a glow filter
   */
  createGlow(options = {}) {
    const defaults = {
      distance: 15,
      outerStrength: 2,
      innerStrength: 1,
      color: 0xFFD700,
      quality: 0.3
    };
    return new GlowFilter({ ...defaults, ...options });
  }

  /**
   * Create an animated pulsing glow
   */
  createPulsingGlow(sprite, options = {}) {
    const {
      color = 0xFFD700,
      minStrength = 1,
      maxStrength = 3,
      speed = 0.005,
      distance = 15
    } = options;

    const glow = new GlowFilter({
      distance,
      outerStrength: minStrength,
      innerStrength: 0.5,
      color,
      quality: 0.3
    });

    sprite.filters = [...(sprite.filters || []), glow];

    // Add animation
    const animation = {
      type: 'pulsingGlow',
      filter: glow,
      minStrength,
      maxStrength,
      speed,
      phase: Math.random() * Math.PI * 2 // Random start phase
    };
    this.animations.push(animation);

    return glow;
  }

  /**
   * Create rainbow cycling glow
   */
  createRainbowGlow(sprite, options = {}) {
    const { speed = 0.002, strength = 2, distance = 15 } = options;

    const glow = new GlowFilter({
      distance,
      outerStrength: strength,
      innerStrength: 0.5,
      color: 0xFF0000,
      quality: 0.3
    });

    sprite.filters = [...(sprite.filters || []), glow];

    const animation = {
      type: 'rainbowGlow',
      filter: glow,
      speed
    };
    this.animations.push(animation);

    return glow;
  }

  // ============================================
  // CRT / RETRO EFFECTS
  // ============================================

  /**
   * Create CRT monitor effect
   */
  createCRT(options = {}) {
    const defaults = {
      curvature: 1,
      lineWidth: 1,
      lineContrast: 0.25,
      verticalLine: false,
      noise: 0.1,
      noiseSize: 1,
      seed: Math.random(),
      vignetting: 0.3,
      vignettingAlpha: 1,
      vignettingBlur: 0.3,
      time: 0
    };
    return new CRTFilter({ ...defaults, ...options });
  }

  /**
   * Create animated CRT with scanline movement
   */
  createAnimatedCRT(container, options = {}) {
    const crt = this.createCRT(options);
    container.filters = [...(container.filters || []), crt];

    const animation = {
      type: 'crt',
      filter: crt,
      speed: options.speed || 0.5
    };
    this.animations.push(animation);

    this.filters.set('crt', crt);
    return crt;
  }

  /**
   * Create old film effect (scratches, grain)
   */
  createOldFilm(options = {}) {
    const defaults = {
      sepia: 0.3,
      noise: 0.3,
      noiseSize: 1,
      scratch: 0.5,
      scratchDensity: 0.3,
      scratchWidth: 1,
      vignetting: 0.3,
      vignettingAlpha: 1,
      vignettingBlur: 0.3
    };
    return new OldFilmFilter({ ...defaults, ...options });
  }

  // ============================================
  // COLOR EFFECTS
  // ============================================

  /**
   * Create color overlay
   */
  createColorOverlay(color = 0x000000, alpha = 0.5) {
    return new ColorOverlayFilter(color, alpha);
  }

  /**
   * Create adjustment filter for color grading
   */
  createAdjustment(options = {}) {
    const defaults = {
      gamma: 1,
      saturation: 1,
      contrast: 1,
      brightness: 1,
      red: 1,
      green: 1,
      blue: 1,
      alpha: 1
    };
    return new AdjustmentFilter({ ...defaults, ...options });
  }

  /**
   * Create day/night cycle effect
   */
  createDayNightCycle(container, options = {}) {
    const {
      dayDuration = 60000,  // 1 minute full cycle
      nightColor = 0x1a1a40,
      nightAlpha = 0.6,
      sunsetColor = 0xff6b35,
      sunsetAlpha = 0.3
    } = options;

    const overlay = new ColorOverlayFilter(0x000000, 0);
    const adjustment = new AdjustmentFilter();
    
    container.filters = [...(container.filters || []), overlay, adjustment];

    const animation = {
      type: 'dayNight',
      overlay,
      adjustment,
      dayDuration,
      nightColor,
      nightAlpha,
      sunsetColor,
      sunsetAlpha
    };
    this.animations.push(animation);

    this.filters.set('dayNightOverlay', overlay);
    this.filters.set('dayNightAdjustment', adjustment);

    return { overlay, adjustment };
  }

  // ============================================
  // BLUR & PIXELATE
  // ============================================

  /**
   * Create blur filter (using PIXI's built-in BlurFilter)
   */
  createBlur(strength = 8, quality = 4) {
    return new PIXI.BlurFilter({ strength, quality });
  }

  /**
   * Create pixelate filter (for retro look)
   */
  createPixelate(size = 4) {
    return new PixelateFilter(size);
  }

  /**
   * Create focus blur (blur edges, clear center)
   */
  createFocusBlur(container, options = {}) {
    const { radius = 100, strength = 4 } = options;
    
    // This would need a custom shader for true focus blur
    // For now, we'll use vignetting from CRT as approximation
    const crt = new CRTFilter({
      curvature: 0,
      lineWidth: 0,
      lineContrast: 0,
      noise: 0,
      vignetting: 0.5,
      vignettingAlpha: 0.5,
      vignettingBlur: strength / 10
    });

    container.filters = [...(container.filters || []), crt];
    return crt;
  }

  // ============================================
  // SPECIAL EFFECTS
  // ============================================

  /**
   * Create outline effect
   */
  createOutline(options = {}) {
    const defaults = {
      thickness: 2,
      color: 0x000000,
      quality: 0.5
    };
    return new OutlineFilter({ ...defaults, ...options });
  }

  /**
   * Create shockwave effect (emanating ring)
   */
  createShockwave(x, y, options = {}) {
    const {
      amplitude = 30,
      wavelength = 160,
      speed = 500,
      radius = -1, // Start value
      brightness = 1
    } = options;

    const shockwave = new ShockwaveFilter([x, y], {
      amplitude,
      wavelength,
      speed,
      radius,
      brightness
    });

    const animation = {
      type: 'shockwave',
      filter: shockwave,
      startTime: this.time,
      duration: 1000,
      maxRadius: 500
    };
    this.animations.push(animation);

    return shockwave;
  }

  /**
   * Trigger shockwave on a container
   */
  triggerShockwave(container, x, y, options = {}) {
    const shockwave = this.createShockwave(x, y, options);
    container.filters = [...(container.filters || []), shockwave];
    
    // Remove after animation completes
    setTimeout(() => {
      const idx = container.filters.indexOf(shockwave);
      if (idx > -1) {
        container.filters.splice(idx, 1);
      }
    }, options.duration || 1000);

    return shockwave;
  }

  // ============================================
  // PRESETS
  // ============================================

  createRetroPreset() {
    return {
      crt: this.createCRT({ lineContrast: 0.3, noise: 0.15 }),
      pixelate: this.createPixelate(2)
    };
  }

  createUnderwaterPreset() {
    return {
      overlay: this.createColorOverlay(0x004466, 0.3),
      adjustment: this.createAdjustment({ blue: 1.2, saturation: 0.8 })
    };
  }

  createSunsetPreset() {
    return {
      overlay: this.createColorOverlay(0xff6b35, 0.2),
      adjustment: this.createAdjustment({ red: 1.1, saturation: 1.2, contrast: 1.1 })
    };
  }

  createNightPreset() {
    return {
      overlay: this.createColorOverlay(0x1a1a40, 0.5),
      adjustment: this.createAdjustment({ brightness: 0.7, saturation: 0.6 })
    };
  }

  createDreamPreset() {
    return {
      blur: this.createBlur(2),
      overlay: this.createColorOverlay(0xff88ff, 0.1),
      adjustment: this.createAdjustment({ saturation: 1.3, brightness: 1.1 })
    };
  }

  /**
   * Apply a preset to a container
   */
  applyPreset(container, presetName) {
    const preset = this.presets[presetName];
    if (!preset) {
      console.warn(`[FilterManager] Unknown preset: ${presetName}`);
      return null;
    }

    const filters = preset();
    container.filters = [...(container.filters || []), ...Object.values(filters)];
    return filters;
  }

  // ============================================
  // ANIMATION UPDATE
  // ============================================

  /**
   * Update all animated filters (call each frame)
   */
  update(delta) {
    if (!this.enabled) return;

    this.time += delta * 16;

    this.animations = this.animations.filter(anim => {
      switch (anim.type) {
        case 'pulsingGlow':
          anim.phase += anim.speed * delta * 16;
          const pulse = (Math.sin(anim.phase) + 1) / 2;
          anim.filter.outerStrength = anim.minStrength + pulse * (anim.maxStrength - anim.minStrength);
          return true;

        case 'rainbowGlow':
          const hue = (this.time * anim.speed) % 360;
          anim.filter.color = this.hslToHex(hue, 100, 50);
          return true;

        case 'crt':
          anim.filter.time += anim.speed * delta;
          anim.filter.seed = Math.random();
          return true;

        case 'dayNight':
          const cycleProgress = (this.time % anim.dayDuration) / anim.dayDuration;
          const { overlay, adjustment, nightColor, nightAlpha, sunsetColor, sunsetAlpha } = anim;
          
          // 0-0.25: dawn, 0.25-0.5: day, 0.5-0.75: sunset, 0.75-1: night
          if (cycleProgress < 0.1) {
            // Dawn
            const t = cycleProgress / 0.1;
            overlay.color = this.lerpColor(nightColor, sunsetColor, t);
            overlay.alpha = nightAlpha - t * (nightAlpha - sunsetAlpha);
            adjustment.brightness = 0.7 + t * 0.3;
          } else if (cycleProgress < 0.4) {
            // Day
            overlay.alpha = 0;
            adjustment.brightness = 1;
          } else if (cycleProgress < 0.5) {
            // Sunset start
            const t = (cycleProgress - 0.4) / 0.1;
            overlay.color = sunsetColor;
            overlay.alpha = t * sunsetAlpha;
            adjustment.brightness = 1;
          } else if (cycleProgress < 0.6) {
            // Sunset to dusk
            const t = (cycleProgress - 0.5) / 0.1;
            overlay.color = this.lerpColor(sunsetColor, nightColor, t);
            overlay.alpha = sunsetAlpha + t * (nightAlpha - sunsetAlpha);
            adjustment.brightness = 1 - t * 0.3;
          } else {
            // Night
            overlay.color = nightColor;
            overlay.alpha = nightAlpha;
            adjustment.brightness = 0.7;
          }
          return true;

        case 'shockwave':
          const elapsed = this.time - anim.startTime;
          if (elapsed > anim.duration) {
            return false; // Remove animation
          }
          anim.filter.radius = (elapsed / anim.duration) * anim.maxRadius;
          return true;

        default:
          return true;
      }
    });
  }

  // ============================================
  // HELPERS
  // ============================================

  hslToHex(h, s, l) {
    s /= 100;
    l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = n => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color);
    };
    return (f(0) << 16) + (f(8) << 8) + f(4);
  }

  lerpColor(color1, color2, t) {
    const r1 = (color1 >> 16) & 0xff;
    const g1 = (color1 >> 8) & 0xff;
    const b1 = color1 & 0xff;
    
    const r2 = (color2 >> 16) & 0xff;
    const g2 = (color2 >> 8) & 0xff;
    const b2 = color2 & 0xff;
    
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    
    return (r << 16) + (g << 8) + b;
  }

  /**
   * Remove all filters from a container
   */
  clearFilters(container) {
    container.filters = [];
  }

  /**
   * Get a named filter
   */
  getFilter(name) {
    return this.filters.get(name);
  }

  /**
   * Toggle filter enabled state
   */
  toggleEnabled() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  /**
   * Clear all animations
   */
  clearAnimations() {
    this.animations = [];
  }

  /**
   * Destroy and cleanup
   */
  destroy() {
    this.animations = [];
    this.filters.forEach(f => f.destroy?.());
    this.filters.clear();
  }
}

export default FilterManager;
