// lib/behaviors/TopDownMovementBehavior.js
// 8-direction movement for top-down games (RPG, Zelda-style)

import Behavior from './Behavior';

/**
 * TopDownMovementBehavior provides smooth 8-direction movement.
 * Includes diagonal normalization so diagonal movement isn't faster.
 */
class TopDownMovementBehavior extends Behavior {
  static get id() {
    return 'topdown';
  }

  static get configSchema() {
    return [
      { key: 'speed', label: 'Speed', type: 'number', default: 200, min: 50, max: 600, step: 10 },
      { key: 'upKey', label: 'Up Key', type: 'key', default: 'ArrowUp' },
      { key: 'downKey', label: 'Down Key', type: 'key', default: 'ArrowDown' },
      { key: 'leftKey', label: 'Left Key', type: 'key', default: 'ArrowLeft' },
      { key: 'rightKey', label: 'Right Key', type: 'key', default: 'ArrowRight' }
    ];
  }

  constructor(object, config = {}) {
    super(object, config);
    
    // Apply defaults from schema
    const defaults = {};
    TopDownMovementBehavior.configSchema.forEach(field => {
      defaults[field.key] = field.default;
    });
    this.config = { ...defaults, ...config };
  }

  update(deltaTime, keys, gameState) {
    if (!this.enabled) return;

    const { speed, upKey, downKey, leftKey, rightKey } = this.config;
    const dt = deltaTime;

    // Determine direction from input
    let dx = 0;
    let dy = 0;

    if (keys.has(leftKey)) dx -= 1;
    if (keys.has(rightKey)) dx += 1;
    if (keys.has(upKey)) dy -= 1;
    if (keys.has(downKey)) dy += 1;

    // Normalize diagonal movement (sqrt(2) ≈ 1.414)
    if (dx !== 0 && dy !== 0) {
      const normalize = 1 / Math.SQRT2; // ~0.7071
      dx *= normalize;
      dy *= normalize;
    }

    // Apply movement
    this.object.x += dx * speed * dt;
    this.object.y += dy * speed * dt;

    // Note: No bounds restrictions - player can move freely in the scene
    // Bounds can be controlled by the game state or level design
  }

  onCollision(other, collisionData = {}) {
    // For solid objects, push back
    if (other.solid) {
      const side = collisionData.side;
      const overlap = collisionData.overlap ?? 1;

      switch (side) {
        case 'left':
          this.object.x += overlap;
          break;
        case 'right':
          this.object.x -= overlap;
          break;
        case 'top':
          this.object.y += overlap;
          break;
        case 'bottom':
          this.object.y -= overlap;
          break;
      }
    }
  }
}

export default TopDownMovementBehavior;
