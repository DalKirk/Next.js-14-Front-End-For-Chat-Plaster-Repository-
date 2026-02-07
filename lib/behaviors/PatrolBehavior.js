// lib/behaviors/PatrolBehavior.js
// Back-and-forth patrol movement along X or Y axis

import Behavior from './Behavior';

/**
 * PatrolBehavior makes an object move back and forth within a range.
 * Can patrol horizontally (default) or vertically.
 */
class PatrolBehavior extends Behavior {
  static get id() {
    return 'patrol';
  }

  static get configSchema() {
    return [
      { key: 'speed', label: 'Speed', type: 'number', default: 100, min: 10, max: 400, step: 10 },
      { key: 'range', label: 'Range (px)', type: 'number', default: 150, min: 32, max: 500, step: 16 },
      { key: 'vertical', label: 'Vertical Patrol', type: 'boolean', default: false },
      { key: 'pauseAtEnds', label: 'Pause at Ends (ms)', type: 'number', default: 0, min: 0, max: 2000, step: 100 }
    ];
  }

  constructor(object, config = {}) {
    super(object, config);
    
    // Apply defaults from schema
    const defaults = {};
    PatrolBehavior.configSchema.forEach(field => {
      defaults[field.key] = field.default;
    });
    this.config = { ...defaults, ...config };

    // Store spawn position as patrol center
    this.spawnX = object.x;
    this.spawnY = object.y;

    // Movement direction: 1 = positive (right/down), -1 = negative (left/up)
    this.direction = 1;

    // Pause state
    this.paused = false;
    this.pauseTimer = 0;
  }

  update(deltaTime, keys, gameState) {
    if (!this.enabled) return;

    const { speed, range, vertical, pauseAtEnds } = this.config;
    const dt = deltaTime;

    // Handle pause at ends
    if (this.paused) {
      this.pauseTimer -= dt * 1000;
      if (this.pauseTimer <= 0) {
        this.paused = false;
      }
      return; // Don't move while paused
    }

    // Calculate movement
    const movement = speed * this.direction * dt;

    if (vertical) {
      // Vertical patrol
      this.object.y += movement;

      // Check boundaries
      const minY = this.spawnY - range / 2;
      const maxY = this.spawnY + range / 2;

      if (this.object.y <= minY) {
        this.object.y = minY;
        this.direction = 1;
        this.startPause(pauseAtEnds);
      } else if (this.object.y >= maxY) {
        this.object.y = maxY;
        this.direction = -1;
        this.startPause(pauseAtEnds);
      }
    } else {
      // Horizontal patrol
      this.object.x += movement;

      // Check boundaries
      const minX = this.spawnX - range / 2;
      const maxX = this.spawnX + range / 2;

      if (this.object.x <= minX) {
        this.object.x = minX;
        this.direction = 1;
        this.startPause(pauseAtEnds);
      } else if (this.object.x >= maxX) {
        this.object.x = maxX;
        this.direction = -1;
        this.startPause(pauseAtEnds);
      }
    }

    // Expose direction for sprite flipping
    this.object.facingRight = this.direction > 0;
  }

  /**
   * Start the pause timer at patrol endpoints.
   * @param {number} duration - Pause duration in milliseconds
   */
  startPause(duration) {
    if (duration > 0) {
      this.paused = true;
      this.pauseTimer = duration;
    }
  }

  /**
   * Reset patrol to spawn position.
   */
  reset() {
    this.object.x = this.spawnX;
    this.object.y = this.spawnY;
    this.direction = 1;
    this.paused = false;
    this.pauseTimer = 0;
  }

  /**
   * Update spawn position (call when object is moved in edit mode).
   */
  updateSpawnPosition() {
    this.spawnX = this.object.x;
    this.spawnY = this.object.y;
  }
}

export default PatrolBehavior;
