// lib/behaviors/Behavior.js
// Base class for all behaviors in PlutoEditor

/**
 * Behavior is the abstract base class for all object behaviors.
 * Each behavior receives a reference to the object it's attached to,
 * plus a config object parsed from the editor's Inspector UI.
 */
class Behavior {
  /**
   * @param {Object} object - The game object this behavior is attached to
   * @param {Object} config - Configuration values from the Inspector
   */
  constructor(object, config = {}) {
    this.object = object;
    this.config = config;
    this.enabled = true;
  }

  /**
   * Called every frame while the game is running.
   * Override in subclasses to implement per-frame logic.
   * 
   * @param {number} deltaTime - Time since last frame in seconds
   * @param {Set} keys - Currently pressed keys (from keysHeld)
   * @param {Object} gameState - Full game state including playerPos, mouse, etc.
   */
  update(deltaTime, keys, gameState) {
    // Override in subclass
  }

  /**
   * Called when this object collides with another.
   * Override in subclasses to handle collision response.
   * 
   * @param {Object} other - The other object involved in the collision
   * @param {Object} collisionData - Additional collision info (side, overlap, etc.)
   */
  onCollision(other, collisionData = {}) {
    // Override in subclass
  }

  /**
   * Called when the behavior is removed or the object is destroyed.
   * Override to clean up any resources (timers, listeners, etc.)
   */
  destroy() {
    // Override in subclass if cleanup needed
  }

  /**
   * Serialize this behavior for saving.
   * Returns an object that can be stored in level data.
   * 
   * @returns {Object} Serialized behavior data
   */
  toJSON() {
    return {
      type: this.constructor.id || this.constructor.name,
      enabled: this.enabled,
      config: { ...this.config }
    };
  }

  /**
   * Static property that subclasses should override.
   * Used by the registry to identify behaviors.
   */
  static get id() {
    return 'behavior';
  }
}

export default Behavior;
