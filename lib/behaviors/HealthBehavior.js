// lib/behaviors/HealthBehavior.js
// HP tracking, damage, healing, invincibility frames

import Behavior from './Behavior';

/**
 * HealthBehavior manages an object's health points with:
 * - Current and max HP
 * - Damage and healing methods
 * - Invincibility frames after taking damage
 * - Flash state for visual feedback
 */
class HealthBehavior extends Behavior {
  static get id() {
    return 'health';
  }

  static get configSchema() {
    return [
      { key: 'maxHealth', label: 'Max Health', type: 'number', default: 100, min: 1, max: 1000, step: 1 },
      { key: 'startHealth', label: 'Starting Health', type: 'number', default: 100, min: 1, max: 1000, step: 1 },
      { key: 'invincibilityDuration', label: 'Invincibility (ms)', type: 'number', default: 1000, min: 0, max: 5000, step: 100 },
      { key: 'flashOnDamage', label: 'Flash on Damage', type: 'boolean', default: true }
    ];
  }

  constructor(object, config = {}) {
    super(object, config);
    
    // Apply defaults from schema
    const defaults = {};
    HealthBehavior.configSchema.forEach(field => {
      defaults[field.key] = field.default;
    });
    this.config = { ...defaults, ...config };

    // Health state
    this.currentHealth = this.config.startHealth;
    this.maxHealth = this.config.maxHealth;
    
    // Invincibility state
    this.invincible = false;
    this.invincibilityTimer = 0;
    
    // Visual flash state
    this.isFlashing = false;
    this.flashTimer = 0;
    this.flashInterval = 100; // ms between flash toggles
    this.flashVisible = true;
  }

  update(deltaTime, keys, gameState) {
    if (!this.enabled) return;

    const dt = deltaTime * 1000; // Convert to milliseconds

    // Handle invincibility countdown
    if (this.invincible) {
      this.invincibilityTimer -= dt;
      
      if (this.invincibilityTimer <= 0) {
        this.invincible = false;
        this.isFlashing = false;
        this.flashVisible = true;
      } else if (this.config.flashOnDamage) {
        // Toggle flash visibility
        this.flashTimer += dt;
        if (this.flashTimer >= this.flashInterval) {
          this.flashTimer = 0;
          this.flashVisible = !this.flashVisible;
        }
      }
    }

    // Expose flash state to the object for rendering
    this.object.isFlashing = this.isFlashing;
    this.object.flashVisible = this.flashVisible;
  }

  /**
   * Apply damage to this object.
   * Damage is ignored during invincibility frames.
   * 
   * @param {number} amount - Damage to apply
   * @returns {boolean} True if damage was applied, false if blocked by invincibility
   */
  takeDamage(amount) {
    if (!this.enabled) return false;
    if (this.invincible) return false;
    if (this.isDead) return false;

    this.currentHealth -= amount;
    
    if (this.currentHealth < 0) {
      this.currentHealth = 0;
    }

    // Start invincibility frames
    if (this.config.invincibilityDuration > 0 && !this.isDead) {
      this.invincible = true;
      this.invincibilityTimer = this.config.invincibilityDuration;
      this.isFlashing = this.config.flashOnDamage;
      this.flashTimer = 0;
    }

    return true;
  }

  /**
   * Heal this object.
   * Cannot exceed max health.
   * 
   * @param {number} amount - Health to restore
   */
  heal(amount) {
    if (!this.enabled) return;
    if (this.isDead) return;

    this.currentHealth += amount;
    
    if (this.currentHealth > this.maxHealth) {
      this.currentHealth = this.maxHealth;
    }
  }

  /**
   * Reset health to full and clear invincibility.
   */
  reset() {
    this.currentHealth = this.config.startHealth;
    this.maxHealth = this.config.maxHealth;
    this.invincible = false;
    this.invincibilityTimer = 0;
    this.isFlashing = false;
    this.flashVisible = true;
  }

  /**
   * Check if this object is dead (health <= 0).
   */
  get isDead() {
    return this.currentHealth <= 0;
  }

  /**
   * Get health as a percentage (0-1).
   */
  get healthPercent() {
    return this.currentHealth / this.maxHealth;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      state: {
        currentHealth: this.currentHealth,
        invincible: this.invincible
      }
    };
  }
}

export default HealthBehavior;
