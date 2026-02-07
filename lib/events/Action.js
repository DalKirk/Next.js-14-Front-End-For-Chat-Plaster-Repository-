/**
 * Action - Something that happens
 * Modifies game state
 */
export class Action {
  constructor(config = {}) {
    this.id = config.id || `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.type = config.type || 'doNothing'; // Type of action
    this.params = config.params || {}; // Parameters specific to type
    this.delay = config.delay || 0; // Delay in ms before executing
  }

  /**
   * Export to JSON
   */
  toJSON() {
    return {
      id: this.id,
      type: this.type,
      params: this.params,
      delay: this.delay
    };
  }

  /**
   * Import from JSON
   */
  static fromJSON(json) {
    return new Action(json);
  }
}
