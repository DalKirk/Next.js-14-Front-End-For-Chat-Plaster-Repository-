import { ConditionRegistry } from './ConditionRegistry';
import { ActionRegistry } from './ActionRegistry';

/**
 * EventEvaluator - Processes events and executes actions
 * Called each frame during play mode
 */
export class EventEvaluator {
  constructor(gameState) {
    this.gameState = gameState;
    this.delayedActions = []; // Actions waiting to execute
    this.debugMode = false;
  }

  /**
   * Enable/disable debug logging
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
  }

  /**
   * Process all events (called every frame)
   * @param {Array} events - Array of Event objects
   * @param {Object} context - Execution context (gameState, systems, etc.)
   */
  processEvents(events, context) {
    if (!events || events.length === 0) return;

    // Sort events by priority (lower = first)
    const sortedEvents = [...events].sort((a, b) => (a.priority || 0) - (b.priority || 0));

    for (const event of sortedEvents) {
      this.processEvent(event, context);
    }

    // Process delayed actions
    this.processDelayedActions(context);
  }

  /**
   * Process a single event
   */
  processEvent(event, context) {
    // Check if event should execute
    if (!this.shouldExecute(event)) return;

    // Build evaluation context
    const evalContext = {
      ...context,
      gameState: this.gameState || context.gameState,
      event,
      collisionPair: null
    };

    // Evaluate all conditions
    if (this.evaluateConditions(event.conditions, evalContext)) {
      if (this.debugMode) {
        console.log(`[EventEvaluator] Event triggered: "${event.name}"`);
      }

      // Execute all actions
      this.executeActions(event.actions, evalContext);

      // Mark event as triggered if needed
      if (event.triggerOnce) {
        event.hasTriggered = true;
      }

      // Process sub-events
      if (event.subEvents && event.subEvents.length > 0) {
        this.processEvents(event.subEvents, evalContext);
      }
    }
  }

  /**
   * Check if event should execute
   */
  shouldExecute(event) {
    if (!event.enabled) return false;
    if (event.triggerOnce && event.hasTriggered) return false;
    return true;
  }

  /**
   * Evaluate all conditions (AND logic)
   * @returns {boolean} True if all conditions pass
   */
  evaluateConditions(conditions, context) {
    if (!conditions || conditions.length === 0) return true; // No conditions = always true

    return conditions.every(condition => {
      const result = this.evaluateCondition(condition, context);
      return condition.inverted ? !result : result;
    });
  }

  /**
   * Evaluate single condition
   */
  evaluateCondition(condition, context) {
    const conditionDef = ConditionRegistry[condition.type];

    if (!conditionDef) {
      console.warn(`[EventEvaluator] Unknown condition type: ${condition.type}`);
      return false;
    }

    try {
      const result = conditionDef.evaluate(condition.params || {}, context);
      
      if (this.debugMode) {
        console.log(`[EventEvaluator] Condition "${conditionDef.name}":`, result);
      }
      
      return result;
    } catch (err) {
      console.error(`[EventEvaluator] Error evaluating condition ${condition.type}:`, err);
      return false;
    }
  }

  /**
   * Execute all actions
   */
  executeActions(actions, context) {
    if (!actions || actions.length === 0) return;

    for (const action of actions) {
      const delay = action.delay || 0;

      if (delay > 0) {
        // Schedule for later
        this.delayedActions.push({
          action,
          context: { ...context }, // Clone context to preserve state
          executeAt: Date.now() + delay
        });
        
        if (this.debugMode) {
          console.log(`[EventEvaluator] Action "${action.type}" delayed by ${delay}ms`);
        }
      } else {
        // Execute immediately
        this.executeAction(action, context);
      }
    }
  }

  /**
   * Execute single action
   */
  executeAction(action, context) {
    const actionDef = ActionRegistry[action.type];

    if (!actionDef) {
      console.warn(`[EventEvaluator] Unknown action type: ${action.type}`);
      return;
    }

    try {
      if (this.debugMode) {
        console.log(`[EventEvaluator] Executing action: "${actionDef.name}"`, action.params);
      }
      
      actionDef.execute(action.params || {}, context);
    } catch (err) {
      console.error(`[EventEvaluator] Error executing action ${action.type}:`, err);
    }
  }

  /**
   * Process delayed actions
   */
  processDelayedActions(context) {
    const now = Date.now();
    const remaining = [];

    for (const delayed of this.delayedActions) {
      if (now >= delayed.executeAt) {
        // Execute now
        this.executeAction(delayed.action, delayed.context);
      } else {
        // Keep waiting
        remaining.push(delayed);
      }
    }

    this.delayedActions = remaining;
  }

  /**
   * Get number of pending delayed actions
   */
  getPendingActionCount() {
    return this.delayedActions.length;
  }

  /**
   * Reset evaluator state (call when restarting game/scene)
   */
  reset() {
    this.delayedActions = [];
  }

  /**
   * Reset all events (clear trigger states)
   */
  resetEvents(events) {
    if (!events) return;
    
    for (const event of events) {
      event.hasTriggered = false;
      
      if (event.subEvents) {
        this.resetEvents(event.subEvents);
      }
    }
  }

  /**
   * Update game state reference
   */
  setGameState(gameState) {
    this.gameState = gameState;
  }
}
