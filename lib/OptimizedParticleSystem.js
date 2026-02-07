'use client';

import * as PIXI from 'pixi.js';

/**
 * OptimizedParticleSystem - High-performance particle system using ParticleContainer
 * 
 * Uses PIXI.ParticleContainer for rendering 10,000+ particles at 60 FPS
 * 
 * Features:
 * - Object pooling for particles (no GC pressure)
 * - Shared texture for all particles
 * - Configurable emitters
 * - Multiple particle effects (burst, continuous, trail)
 */
export class OptimizedParticleSystem {
  constructor(app, maxParticles = 10000) {
    this.app = app;
    this.maxParticles = maxParticles;
    
    // Particle container with optimized properties
    this.container = new PIXI.ParticleContainer(maxParticles, {
      position: true,
      scale: true,
      rotation: true,
      alpha: true,
      tint: true
    });
    
    // Particle pool (reused objects)
    this.pool = [];
    this.activeParticles = [];
    
    // Shared textures
    this.textures = new Map();
    
    // Active emitters
    this.emitters = [];
    
    // Performance stats
    this.stats = {
      active: 0,
      pooled: 0,
      totalEmitted: 0
    };
    
    // Default enabled
    this.enabled = true;
    
    // Create default white pixel texture
    this.createDefaultTexture();
  }

  /**
   * Create a simple white pixel texture for tinting
   */
  createDefaultTexture() {
    const graphics = new PIXI.Graphics();
    graphics.circle(2, 2, 2);
    graphics.fill(0xffffff);
    
    const texture = this.app.renderer.generateTexture(graphics);
    graphics.destroy();
    
    this.textures.set('default', texture);
    this.textures.set('circle', texture);
  }

  /**
   * Create a custom texture for particles
   */
  createTexture(name, drawFn) {
    const graphics = new PIXI.Graphics();
    drawFn(graphics);
    
    const texture = this.app.renderer.generateTexture(graphics);
    graphics.destroy();
    
    this.textures.set(name, texture);
    return texture;
  }

  /**
   * Get a particle from the pool or create a new one
   */
  getParticle(textureName = 'default') {
    let particle;
    
    if (this.pool.length > 0) {
      particle = this.pool.pop();
      particle.texture = this.textures.get(textureName) || this.textures.get('default');
      particle.visible = true;
    } else {
      const texture = this.textures.get(textureName) || this.textures.get('default');
      particle = new PIXI.Sprite(texture);
      particle.anchor.set(0.5);
      this.container.addChild(particle);
    }
    
    // Reset particle properties
    particle.x = 0;
    particle.y = 0;
    particle.scale.set(1);
    particle.rotation = 0;
    particle.alpha = 1;
    particle.tint = 0xffffff;
    
    // Custom physics properties
    particle.vx = 0;
    particle.vy = 0;
    particle.gravity = 0;
    particle.drag = 1;
    particle.rotationSpeed = 0;
    particle.scaleDecay = 1;
    particle.alphaDecay = 0;
    
    // Lifetime
    particle.age = 0;
    particle.lifetime = 1000;
    
    this.activeParticles.push(particle);
    this.stats.active++;
    this.stats.totalEmitted++;
    
    return particle;
  }

  /**
   * Return a particle to the pool
   */
  returnParticle(particle) {
    particle.visible = false;
    this.pool.push(particle);
    this.stats.pooled++;
    this.stats.active--;
  }

  /**
   * Emit a burst of particles at a position
   */
  emit(x, y, config = {}) {
    if (!this.enabled) return;

    const defaults = {
      count: 10,
      color: 0xFFD700,
      size: 1,
      speed: 3,
      speedVariance: 1,
      lifetime: 800,
      lifetimeVariance: 200,
      gravity: 0.15,
      spread: Math.PI * 2,  // Full circle
      angle: 0,             // Direction angle
      drag: 0.98,
      alphaDecay: 0.02,
      scaleDecay: 0.98,
      rotationSpeed: 0,
      texture: 'default'
    };
    
    const settings = { ...defaults, ...config };

    for (let i = 0; i < settings.count; i++) {
      if (this.activeParticles.length >= this.maxParticles) break;
      
      const particle = this.getParticle(settings.texture);
      
      // Position
      particle.x = x + (Math.random() - 0.5) * 10;
      particle.y = y + (Math.random() - 0.5) * 10;
      
      // Velocity
      const angle = settings.angle + (Math.random() - 0.5) * settings.spread;
      const speed = settings.speed + (Math.random() - 0.5) * settings.speedVariance;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed;
      
      // Properties
      particle.scale.set(settings.size * (0.5 + Math.random() * 0.5));
      particle.tint = settings.color;
      particle.gravity = settings.gravity;
      particle.drag = settings.drag;
      particle.alphaDecay = settings.alphaDecay;
      particle.scaleDecay = settings.scaleDecay;
      particle.rotationSpeed = settings.rotationSpeed * (Math.random() - 0.5) * 2;
      particle.lifetime = settings.lifetime + (Math.random() - 0.5) * settings.lifetimeVariance;
      particle.age = 0;
    }
  }

  /**
   * Create predefined effects
   */
  effects = {
    // Coin collect sparkle
    coinCollect: (x, y) => {
      this.emit(x, y, {
        count: 15,
        color: 0xFFD700,
        size: 1.2,
        speed: 4,
        lifetime: 600,
        gravity: -0.1,
        spread: Math.PI * 2
      });
    },

    // Enemy death
    enemyDeath: (x, y, color = 0xFF0000) => {
      this.emit(x, y, {
        count: 25,
        color,
        size: 1.5,
        speed: 5,
        lifetime: 800,
        gravity: 0.2,
        spread: Math.PI * 2
      });
    },

    // Jump dust
    jumpDust: (x, y) => {
      this.emit(x, y, {
        count: 8,
        color: 0xBBBBBB,
        size: 0.8,
        speed: 2,
        lifetime: 400,
        gravity: -0.05,
        spread: Math.PI / 2,
        angle: -Math.PI / 2
      });
    },

    // Land dust
    landDust: (x, y) => {
      this.emit(x, y, {
        count: 6,
        color: 0x999999,
        size: 0.6,
        speed: 1.5,
        lifetime: 300,
        gravity: 0.05,
        spread: Math.PI,
        angle: -Math.PI / 2
      });
    },

    // Dash trail
    dashTrail: (x, y, direction) => {
      this.emit(x, y, {
        count: 3,
        color: 0x00FFFF,
        size: 0.8,
        speed: 0.5,
        lifetime: 200,
        gravity: 0,
        drag: 0.95,
        spread: Math.PI / 4,
        angle: direction > 0 ? Math.PI : 0
      });
    },

    // Fire
    fire: (x, y) => {
      this.emit(x, y, {
        count: 5,
        color: 0xFF4500,
        size: 1,
        speed: 2,
        lifetime: 500,
        gravity: -0.2,
        spread: Math.PI / 3,
        angle: -Math.PI / 2,
        scaleDecay: 0.95
      });
    },

    // Explosion
    explosion: (x, y) => {
      this.emit(x, y, {
        count: 40,
        color: 0xFF6600,
        size: 2,
        speed: 8,
        speedVariance: 3,
        lifetime: 600,
        gravity: 0.1,
        spread: Math.PI * 2
      });
      // Secondary ring
      this.emit(x, y, {
        count: 20,
        color: 0xFFCC00,
        size: 1.5,
        speed: 5,
        lifetime: 400,
        gravity: 0,
        spread: Math.PI * 2
      });
    },

    // Sparkle (continuous effect)
    sparkle: (x, y) => {
      this.emit(x, y, {
        count: 1,
        color: 0xFFFFFF,
        size: 0.5,
        speed: 1,
        lifetime: 600,
        gravity: -0.1,
        spread: Math.PI * 2
      });
    },

    // Rain
    rain: (x, y, width) => {
      for (let i = 0; i < 3; i++) {
        this.emit(x + Math.random() * width, y, {
          count: 1,
          color: 0x6699CC,
          size: 0.3,
          speed: 8,
          lifetime: 2000,
          gravity: 0.5,
          spread: 0,
          angle: Math.PI / 2 + 0.2,
          drag: 1
        });
      }
    },

    // Snow
    snow: (x, y, width) => {
      this.emit(x + Math.random() * width, y, {
        count: 1,
        color: 0xFFFFFF,
        size: 0.4,
        speed: 0.5,
        speedVariance: 0.3,
        lifetime: 4000,
        gravity: 0.02,
        spread: Math.PI / 4,
        angle: Math.PI / 2,
        rotationSpeed: 0.1
      });
    }
  };

  /**
   * Create a continuous emitter
   */
  createEmitter(config) {
    const emitter = {
      x: config.x || 0,
      y: config.y || 0,
      rate: config.rate || 10,           // Particles per second
      particleConfig: config.particle || {},
      enabled: true,
      elapsed: 0,
      interval: 1000 / (config.rate || 10)
    };
    
    this.emitters.push(emitter);
    return emitter;
  }

  /**
   * Remove an emitter
   */
  removeEmitter(emitter) {
    const index = this.emitters.indexOf(emitter);
    if (index > -1) {
      this.emitters.splice(index, 1);
    }
  }

  /**
   * Update all particles (call each frame)
   */
  update(delta) {
    if (!this.enabled) return;

    const dt = delta * 16; // Convert to ms

    // Update emitters
    this.emitters.forEach(emitter => {
      if (!emitter.enabled) return;
      
      emitter.elapsed += dt;
      while (emitter.elapsed >= emitter.interval) {
        emitter.elapsed -= emitter.interval;
        this.emit(emitter.x, emitter.y, emitter.particleConfig);
      }
    });

    // Update active particles
    this.activeParticles = this.activeParticles.filter(particle => {
      particle.age += dt;
      
      if (particle.age >= particle.lifetime) {
        this.returnParticle(particle);
        return false;
      }

      // Apply physics
      particle.vy += particle.gravity;
      particle.vx *= particle.drag;
      particle.vy *= particle.drag;
      
      particle.x += particle.vx;
      particle.y += particle.vy;
      
      particle.rotation += particle.rotationSpeed;
      
      // Apply decay
      const progress = particle.age / particle.lifetime;
      particle.alpha = Math.max(0, 1 - progress * particle.alphaDecay * 50);
      particle.scale.x *= particle.scaleDecay;
      particle.scale.y *= particle.scaleDecay;

      return true;
    });

    // Update stats
    this.stats.active = this.activeParticles.length;
    this.stats.pooled = this.pool.length;
  }

  /**
   * Clear all particles
   */
  clear() {
    this.activeParticles.forEach(p => {
      p.visible = false;
      this.pool.push(p);
    });
    this.activeParticles = [];
    this.emitters = [];
    this.stats.active = 0;
  }

  /**
   * Destroy the particle system
   */
  destroy() {
    this.clear();
    this.container.destroy({ children: true });
    this.textures.forEach(t => t.destroy(true));
    this.textures.clear();
  }

  /**
   * Get performance stats
   */
  getStats() {
    return { ...this.stats };
  }
}

export default OptimizedParticleSystem;
