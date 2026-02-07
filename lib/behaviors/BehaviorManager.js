// lib/behaviors/BehaviorManager.js
// Runtime manager for all live behavior instances

import BehaviorRegistry from './BehaviorRegistry';

/**
 * BehaviorManager owns all live behavior instances.
 * - attach/detach behaviors on objects
 * - update() dispatches to all enabled behaviors
 * - getBehavior() lets events reach specific behaviors
 */
class BehaviorManager {
  constructor() {
    // Map: objectId -> Map<behaviorId, Behavior instance>
    this._instances = new Map();
  }

  /**
   * Attach a behavior to an object.
   * @param {Object} object - Game object with an id property
   * @param {string} behaviorId - Behavior type ID from registry
   * @param {Object} config - Configuration values
   * @returns {Behavior|null} The attached behavior instance
   */
  attach(object, behaviorId, config = {}) {
    if (!object?.id) {
      console.warn('BehaviorManager.attach: object must have an id');
      return null;
    }

    const behavior = BehaviorRegistry.create(behaviorId, object, config);
    if (!behavior) return null;

    // Get or create the map for this object
    if (!this._instances.has(object.id)) {
      this._instances.set(object.id, new Map());
    }

    const objectBehaviors = this._instances.get(object.id);
    
    // Detach existing behavior of same type if present
    if (objectBehaviors.has(behaviorId)) {
      const existing = objectBehaviors.get(behaviorId);
      existing.destroy();
    }

    objectBehaviors.set(behaviorId, behavior);
    return behavior;
  }

  /**
   * Detach a behavior from an object.
   * @param {string} objectId - Object ID
   * @param {string} behaviorId - Behavior type ID
   */
  detach(objectId, behaviorId) {
    const objectBehaviors = this._instances.get(objectId);
    if (!objectBehaviors) return;

    const behavior = objectBehaviors.get(behaviorId);
    if (behavior) {
      behavior.destroy();
      objectBehaviors.delete(behaviorId);
    }

    // Clean up empty maps
    if (objectBehaviors.size === 0) {
      this._instances.delete(objectId);
    }
  }

  /**
   * Detach all behaviors from an object.
   * @param {string} objectId - Object ID
   */
  detachAll(objectId) {
    const objectBehaviors = this._instances.get(objectId);
    if (!objectBehaviors) return;

    for (const behavior of objectBehaviors.values()) {
      behavior.destroy();
    }
    
    this._instances.delete(objectId);
  }

  /**
   * Get a specific behavior from an object.
   * Used by the event system to call behavior methods.
   * @param {string} objectId - Object ID
   * @param {string} behaviorId - Behavior type ID
   * @returns {Behavior|null} The behavior instance or null
   */
  getBehavior(objectId, behaviorId) {
    const objectBehaviors = this._instances.get(objectId);
    if (!objectBehaviors) return null;
    return objectBehaviors.get(behaviorId) || null;
  }

  /**
   * Get all behaviors for an object.
   * @param {string} objectId - Object ID
   * @returns {Map} Map of behaviorId -> Behavior instance
   */
  getBehaviors(objectId) {
    return this._instances.get(objectId) || new Map();
  }

  /**
   * Check if an object has a specific behavior.
   * @param {string} objectId - Object ID
   * @param {string} behaviorId - Behavior type ID
   * @returns {boolean}
   */
  hasBehavior(objectId, behaviorId) {
    const objectBehaviors = this._instances.get(objectId);
    if (!objectBehaviors) return false;
    return objectBehaviors.has(behaviorId);
  }

  /**
   * Rebuild behaviors for an object from save data.
   * Used when loading a level or entering play mode.
   * @param {Object} object - Game object with id
   * @param {Array} behaviorsData - Array of { type, enabled, config }
   */
  rebuildForObject(object, behaviorsData = []) {
    // Clear existing behaviors
    this.detachAll(object.id);

    // Attach behaviors from data
    for (const data of behaviorsData) {
      const behavior = this.attach(object, data.type, data.config || {});
      if (behavior) {
        behavior.enabled = data.enabled !== false; // default to enabled
      }
    }
  }

  /**
   * Update all behaviors. Call once per frame.
   * @param {number} deltaTime - Time since last frame in seconds
   * @param {Set} keys - Currently pressed keys
   * @param {Object} gameState - Full game state
   */
  update(deltaTime, keys, gameState) {
    for (const [objectId, objectBehaviors] of this._instances) {
      for (const [behaviorId, behavior] of objectBehaviors) {
        if (behavior.enabled) {
          try {
            behavior.update(deltaTime, keys, gameState);
          } catch (error) {
            console.error(`Error updating behavior ${behaviorId} on ${objectId}:`, error);
          }
        }
      }
    }
  }

  /**
   * Notify behaviors of a collision.
   * @param {string} objectId - Object that collided
   * @param {Object} other - The other object
   * @param {Object} collisionData - Collision details
   */
  notifyCollision(objectId, other, collisionData = {}) {
    const objectBehaviors = this._instances.get(objectId);
    if (!objectBehaviors) return;

    for (const behavior of objectBehaviors.values()) {
      if (behavior.enabled) {
        try {
          behavior.onCollision(other, collisionData);
        } catch (error) {
          console.error(`Error in collision handler for ${objectId}:`, error);
        }
      }
    }
  }

  /**
   * Reset all behaviors (for play mode restart).
   */
  resetAll() {
    for (const objectBehaviors of this._instances.values()) {
      for (const behavior of objectBehaviors.values()) {
        if (typeof behavior.reset === 'function') {
          behavior.reset();
        }
      }
    }
  }

  /**
   * Clear all behaviors (for cleanup or mode switch).
   */
  clear() {
    for (const objectBehaviors of this._instances.values()) {
      for (const behavior of objectBehaviors.values()) {
        behavior.destroy();
      }
    }
    this._instances.clear();
  }

  /**
   * Serialize all behaviors for saving.
   * @returns {Object} Map of objectId -> array of behavior data
   */
  toJSON() {
    const result = {};
    
    for (const [objectId, objectBehaviors] of this._instances) {
      result[objectId] = [];
      for (const behavior of objectBehaviors.values()) {
        result[objectId].push(behavior.toJSON());
      }
    }
    
    return result;
  }
}

export default BehaviorManager;
