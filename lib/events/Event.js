/**
 * Event - Container for conditions and actions
 * Represents a single "When X happens, do Y" rule
 */
export class Event {
  constructor(config = {}) {
    this.id = config.id || `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.name = config.name || 'Untitled Event';
    this.enabled = config.enabled !== undefined ? config.enabled : true;
    this.conditions = config.conditions || [];
    this.actions = config.actions || [];
    this.subEvents = config.subEvents || []; // For nested logic
    this.comment = config.comment || ''; // User notes
    
    // Execution settings
    this.triggerOnce = config.triggerOnce || false; // Only trigger once per game
    this.hasTriggered = false;
    
    // Priority for execution order (lower = higher priority)
    this.priority = config.priority || 0;
    
    // Grouping/organization
    this.group = config.group || null; // For UI organization
    this.color = config.color || null; // For visual distinction
  }

  /**
   * Check if event should execute
   */
  shouldExecute() {
    if (!this.enabled) return false;
    if (this.triggerOnce && this.hasTriggered) return false;
    return true;
  }

  /**
   * Mark as triggered
   */
  markTriggered() {
    if (this.triggerOnce) {
      this.hasTriggered = true;
    }
  }

  /**
   * Reset trigger state
   */
  reset() {
    this.hasTriggered = false;
  }

  /**
   * Clone event
   */
  clone() {
    return new Event({
      name: `${this.name} (Copy)`,
      enabled: this.enabled,
      conditions: this.conditions.map(c => ({ ...c })),
      actions: this.actions.map(a => ({ ...a })),
      triggerOnce: this.triggerOnce,
      priority: this.priority,
      group: this.group,
      color: this.color,
      comment: this.comment
    });
  }

  /**
   * Export to JSON
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      enabled: this.enabled,
      conditions: this.conditions,
      actions: this.actions,
      subEvents: this.subEvents,
      triggerOnce: this.triggerOnce,
      priority: this.priority,
      group: this.group,
      color: this.color,
      comment: this.comment
    };
  }

  /**
   * Import from JSON
   */
  static fromJSON(json) {
    return new Event(json);
  }
}
