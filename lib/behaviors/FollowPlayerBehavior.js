// lib/behaviors/FollowPlayerBehavior.js
// Chases the player position with a dead-zone

import Behavior from './Behavior';

/**
 * FollowPlayerBehavior makes an object move toward the player.
 * Includes a dead-zone (minDistance) to prevent jittering when close.
 */
class FollowPlayerBehavior extends Behavior {
  static get id() {
    return 'follow';
  }

  static get configSchema() {
    return [
      { key: 'speed', label: 'Speed', type: 'number', default: 80, min: 10, max: 300, step: 10 },
      { key: 'minDistance', label: 'Min Distance', type: 'number', default: 32, min: 0, max: 200, step: 8 },
      { key: 'xOnly', label: 'X-Only (Stay on Row)', type: 'boolean', default: false }
    ];
  }

  constructor(object, config = {}) {
    super(object, config);
    
    // Apply defaults from schema
    const defaults = {};
    FollowPlayerBehavior.configSchema.forEach(field => {
      defaults[field.key] = field.default;
    });
    this.config = { ...defaults, ...config };
  }

  update(deltaTime, keys, gameState) {
    if (!this.enabled) return;

    const { speed, minDistance, xOnly } = this.config;
    const dt = deltaTime;

    // Get player position from game state
    const playerPos = gameState?.playerPos;
    if (!playerPos) return; // No player to follow

    const playerX = playerPos.x;
    const playerY = playerPos.y;

    // Calculate distance to player
    const dx = playerX - this.object.x;
    const dy = xOnly ? 0 : (playerY - this.object.y);
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Don't move if within dead-zone
    if (distance <= minDistance) {
      return;
    }

    // Normalize direction and apply speed
    const normX = dx / distance;
    const normY = dy / distance;

    this.object.x += normX * speed * dt;
    
    if (!xOnly) {
      this.object.y += normY * speed * dt;
    }

    // Expose facing direction for sprite flipping
    this.object.facingRight = dx > 0;
  }

  onCollision(other, collisionData = {}) {
    // Optional: Stop chasing when hitting walls
    if (other.solid && other.type === 'wall') {
      // Could implement pathfinding here, or just stop
    }
  }
}

export default FollowPlayerBehavior;
