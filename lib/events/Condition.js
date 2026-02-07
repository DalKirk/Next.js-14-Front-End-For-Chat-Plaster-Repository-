/**
 * Condition - A single logical test
 * Returns true or false
 */
export class Condition {
  constructor(config = {}) {
    this.id = config.id || `cond_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.type = config.type || 'always'; // Type of condition
    this.params = config.params || {}; // Parameters specific to type
    this.inverted = config.inverted || false; // NOT operator
  }

  /**
   * Invert this condition (NOT)
   */
  invert() {
    this.inverted = !this.inverted;
    return this;
  }

  /**
   * Export to JSON
   */
  toJSON() {
    return {
      id: this.id,
      type: this.type,
      params: this.params,
      inverted: this.inverted
    };
  }

  /**
   * Import from JSON
   */
  static fromJSON(json) {
    return new Condition(json);
  }
}
