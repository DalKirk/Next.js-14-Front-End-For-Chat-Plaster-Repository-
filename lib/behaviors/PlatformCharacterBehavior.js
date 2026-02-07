// lib/behaviors/PlatformCharacterBehavior.js
// Side-scrolling platformer movement with gravity and jumping

import Behavior from './Behavior';

/**
 * PlatformCharacterBehavior provides gravity-based movement with horizontal
 * movement and jumping. Designed for side-scrolling platformer characters.
 */
class PlatformCharacterBehavior extends Behavior {
  static get id() {
    return 'platform';
  }

  static get configSchema() {
    return [
      { key: 'speed', label: 'Speed', type: 'number', default: 200, min: 50, max: 800, step: 10 },
      { key: 'jumpStrength', label: 'Jump Strength', type: 'number', default: 400, min: 100, max: 1000, step: 25 },
      { key: 'gravity', label: 'Gravity', type: 'number', default: 800, min: 100, max: 2000, step: 50 },
      { key: 'leftKey', label: 'Left Key', type: 'key', default: 'ArrowLeft' },
      { key: 'rightKey', label: 'Right Key', type: 'key', default: 'ArrowRight' },
      { key: 'jumpKey', label: 'Jump Key', type: 'key', default: ' ' } // space
    ];
  }

  constructor(object, config = {}) {
    super(object, config);
    
    // Apply defaults from schema
    const defaults = {};
    PlatformCharacterBehavior.configSchema.forEach(field => {
      defaults[field.key] = field.default;
    });
    this.config = { ...defaults, ...config };

    // Physics state
    this.velocityX = 0;
    this.velocityY = 0;
    this.grounded = false;
    this.jumpHeld = false; // Prevents continuous jumping while holding jump key
  }

  update(deltaTime, keys, gameState) {
    if (!this.enabled) return;

    const { speed, jumpStrength, gravity, leftKey, rightKey, jumpKey } = this.config;
    const dt = deltaTime;

    // Horizontal movement
    this.velocityX = 0;
    if (keys.has(leftKey)) {
      this.velocityX = -speed;
    }
    if (keys.has(rightKey)) {
      this.velocityX = speed;
    }

    // Jumping (only when grounded and jump key just pressed)
    const jumpPressed = keys.has(jumpKey);
    if (jumpPressed && this.grounded && !this.jumpHeld) {
      this.velocityY = -jumpStrength;
      this.grounded = false;
      this.jumpHeld = true;
    }
    if (!jumpPressed) {
      this.jumpHeld = false;
    }

    // Apply gravity
    this.velocityY += gravity * dt;

    // Cap fall speed
    const maxFallSpeed = 1000;
    if (this.velocityY > maxFallSpeed) {
      this.velocityY = maxFallSpeed;
    }

    // Move object
    this.object.x += this.velocityX * dt;
    this.object.y += this.velocityY * dt;

    // Simple ground collision with floor (assumes floor at a certain Y)
    // In a full implementation, this would use collision detection
    const floorY = gameState?.floorY ?? 500;
    const objectHeight = this.object.height ?? 32;
    
    if (this.object.y + objectHeight >= floorY) {
      this.object.y = floorY - objectHeight;
      this.velocityY = 0;
      this.grounded = true;
    }

    // Note: No bounds restrictions - player can move freely in the scene
    // Bounds are controlled by the game state or level design
  }
  onCollision(other, collisionData = {}) {
    // Handle platform collisions
    if (other.type === 'platform' || other.type === 'ground') {
      const side = collisionData.side || 'bottom';
      
      if (side === 'top') {
        // Landed on top of platform
        this.object.y = other.y - (this.object.height ?? 32);
        this.velocityY = 0;
        this.grounded = true;
      } else if (side === 'bottom') {
        // Hit head on platform above
        this.velocityY = 0;
      } else if (side === 'left' || side === 'right') {
        // Side collision - stop horizontal movement
        this.velocityX = 0;
      }
    }
  }

  /**
   * Reset velocity state (useful when re-entering play mode)
   */
  reset() {
    this.velocityX = 0;
    this.velocityY = 0;
    this.grounded = false;
    this.jumpHeld = false;
  }
}

export default PlatformCharacterBehavior;
