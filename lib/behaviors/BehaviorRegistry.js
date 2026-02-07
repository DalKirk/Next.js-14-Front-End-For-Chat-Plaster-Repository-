// lib/behaviors/BehaviorRegistry.js
// Single source of truth for all behavior types

import Behavior from './Behavior';
import PlatformCharacterBehavior from './PlatformCharacterBehavior';
import TopDownMovementBehavior from './TopDownMovementBehavior';
import HealthBehavior from './HealthBehavior';
import PatrolBehavior from './PatrolBehavior';
import FollowPlayerBehavior from './FollowPlayerBehavior';
import DraggableBehavior from './DraggableBehavior';
import { AnimatedSpriteBehavior } from '../sprites/AnimatedSpriteBehavior';

/**
 * BehaviorRegistry is the single source of truth for all behavior types.
 * - The UI reads it to populate the behavior picker
 * - The BehaviorManager reads it to instantiate behaviors
 * - Adding a new behavior = one class file + one entry here
 */
const BehaviorRegistry = {
  // All registered behaviors
  _entries: new Map(),

  // Category order for UI display
  categories: ['Movement', 'Combat', 'AI', 'Interaction'],

  /**
   * Register a behavior class.
   * @param {Object} entry - Behavior entry
   * @param {string} entry.id - Unique identifier
   * @param {string} entry.name - Display name
   * @param {string} entry.description - Short description
   * @param {string} entry.category - Category for grouping in picker
   * @param {string} entry.icon - Emoji icon for UI
   * @param {Function} entry.behaviorClass - The behavior class constructor
   * @param {Array} entry.configSchema - Config field definitions
   */
  register(entry) {
    this._entries.set(entry.id, entry);
  },

  /**
   * Get a behavior entry by ID.
   * @param {string} id - Behavior ID
   * @returns {Object|undefined} Behavior entry or undefined
   */
  get(id) {
    return this._entries.get(id);
  },

  /**
   * Get all behavior entries.
   * @returns {Array} All registered behavior entries
   */
  get all() {
    return Array.from(this._entries.values());
  },

  /**
   * Get behaviors by category.
   * @param {string} category - Category name
   * @returns {Array} Behaviors in that category
   */
  getByCategory(category) {
    return this.all.filter(entry => entry.category === category);
  },

  /**
   * Create a new behavior instance.
   * @param {string} id - Behavior ID
   * @param {Object} object - Game object to attach to
   * @param {Object} config - Configuration values
   * @returns {Behavior|null} New behavior instance or null if not found
   */
  create(id, object, config = {}) {
    const entry = this._entries.get(id);
    if (!entry) {
      console.warn(`BehaviorRegistry: Unknown behavior type "${id}"`);
      return null;
    }
    return new entry.behaviorClass(object, config);
  },

  /**
   * Get default config for a behavior type.
   * @param {string} id - Behavior ID
   * @returns {Object} Default configuration values
   */
  getDefaultConfig(id) {
    const entry = this._entries.get(id);
    if (!entry) return {};

    const defaults = {};
    entry.configSchema.forEach(field => {
      defaults[field.key] = field.default;
    });
    return defaults;
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// REGISTER ALL BEHAVIORS
// ═══════════════════════════════════════════════════════════════════════════

// Movement Behaviors
BehaviorRegistry.register({
  id: 'platform',
  name: 'Platform Character',
  description: 'Side-scrolling movement with gravity and jumping',
  category: 'Movement',
  icon: '🎮',
  behaviorClass: PlatformCharacterBehavior,
  configSchema: PlatformCharacterBehavior.configSchema
});

BehaviorRegistry.register({
  id: 'topdown',
  name: 'Top-Down Movement',
  description: '8-direction movement for top-down games',
  category: 'Movement',
  icon: '🕹️',
  behaviorClass: TopDownMovementBehavior,
  configSchema: TopDownMovementBehavior.configSchema
});

// Combat Behaviors
BehaviorRegistry.register({
  id: 'health',
  name: 'Health',
  description: 'HP, damage, healing, and invincibility frames',
  category: 'Combat',
  icon: '❤️',
  behaviorClass: HealthBehavior,
  configSchema: HealthBehavior.configSchema
});

// AI Behaviors
BehaviorRegistry.register({
  id: 'patrol',
  name: 'Patrol',
  description: 'Move back and forth within a range',
  category: 'AI',
  icon: '🔄',
  behaviorClass: PatrolBehavior,
  configSchema: PatrolBehavior.configSchema
});

BehaviorRegistry.register({
  id: 'follow',
  name: 'Follow Player',
  description: 'Chase the player position',
  category: 'AI',
  icon: '👁️',
  behaviorClass: FollowPlayerBehavior,
  configSchema: FollowPlayerBehavior.configSchema
});

// Interaction Behaviors
BehaviorRegistry.register({
  id: 'draggable',
  name: 'Draggable',
  description: 'Allow mouse dragging with optional grid snap',
  category: 'Interaction',
  icon: '✋',
  behaviorClass: DraggableBehavior,
  configSchema: DraggableBehavior.configSchema
});

// Visual Behaviors
BehaviorRegistry.register({
  id: 'animatedSprite',
  name: 'Animated Sprite',
  description: 'Plays a sprite sheet animation. Works on any entity.',
  category: 'Visual',
  icon: '🎬',
  behaviorClass: AnimatedSpriteBehavior,
  configSchema: AnimatedSpriteBehavior.configSchema
});

export default BehaviorRegistry;
