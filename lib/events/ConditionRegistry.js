/**
 * ConditionRegistry - Defines all available condition types
 */
export const ConditionRegistry = {
  // ============================================
  // ALWAYS CONDITIONS
  // ============================================
  always: {
    name: 'Always',
    description: 'Always true (runs every frame)',
    category: 'Basic',
    icon: '✓',
    params: [],
    evaluate: (params, context) => {
      return true;
    }
  },

  once: {
    name: 'Once',
    description: 'True only once when the event starts',
    category: 'Basic',
    icon: '1️⃣',
    params: [],
    evaluate: (params, context) => {
      // Implementation handled by Event.triggerOnce
      return true;
    }
  },

  // ============================================
  // COLLISION CONDITIONS
  // ============================================
  collision: {
    name: 'Collision',
    description: 'Object A collides with Object B',
    category: 'Collision',
    icon: '💥',
    params: [
      {
        name: 'objectA',
        type: 'object',
        label: 'Object A',
        required: true
      },
      {
        name: 'objectB',
        type: 'object',
        label: 'Object B',
        required: true
      }
    ],
    evaluate: (params, context) => {
      const { objectA, objectB } = params;
      const { gameState, collisionSystem } = context;

      if (!gameState || !collisionSystem) return false;

      // Get all objects of type A and B
      const objectsA = gameState.getObjectsByType(objectA);
      const objectsB = gameState.getObjectsByType(objectB);

      // Check if any A collides with any B
      for (const objA of objectsA) {
        for (const objB of objectsB) {
          if (objA.id !== objB.id && collisionSystem.isColliding(objA, objB)) {
            // Store collision pair in context for actions
            context.collisionPair = { objectA: objA, objectB: objB };
            return true;
          }
        }
      }

      return false;
    }
  },

  objectAtPosition: {
    name: 'Object at position',
    description: 'Object is at a specific position',
    category: 'Collision',
    icon: '📍',
    params: [
      {
        name: 'object',
        type: 'object',
        label: 'Object',
        required: true
      },
      {
        name: 'x',
        type: 'number',
        label: 'X position',
        required: true
      },
      {
        name: 'y',
        type: 'number',
        label: 'Y position',
        required: true
      },
      {
        name: 'tolerance',
        type: 'number',
        label: 'Tolerance',
        default: 10
      }
    ],
    evaluate: (params, context) => {
      const { object, x, y, tolerance = 10 } = params;
      const { gameState } = context;

      if (!gameState) return false;

      const objects = gameState.getObjectsByType(object);
      return objects.some(obj => {
        const dx = Math.abs(obj.x - x);
        const dy = Math.abs(obj.y - y);
        return dx <= tolerance && dy <= tolerance;
      });
    }
  },

  // ============================================
  // VARIABLE CONDITIONS
  // ============================================
  compareVariable: {
    name: 'Compare variable',
    description: 'Compare a variable to a value',
    category: 'Variables',
    icon: '🔢',
    params: [
      {
        name: 'variable',
        type: 'variable',
        label: 'Variable',
        required: true
      },
      {
        name: 'comparison',
        type: 'select',
        label: 'Comparison',
        options: [
          { value: '=', label: 'Equal to (=)' },
          { value: '!=', label: 'Not equal to (≠)' },
          { value: '>', label: 'Greater than (>)' },
          { value: '<', label: 'Less than (<)' },
          { value: '>=', label: 'Greater or equal (≥)' },
          { value: '<=', label: 'Less or equal (≤)' }
        ],
        default: '='
      },
      {
        name: 'value',
        type: 'number',
        label: 'Value',
        required: true
      }
    ],
    evaluate: (params, context) => {
      const { variable, comparison, value } = params;
      const { gameState } = context;

      if (!gameState) return false;

      const varValue = gameState.getVariable(variable);

      switch (comparison) {
        case '=': return varValue === value;
        case '!=': return varValue !== value;
        case '>': return varValue > value;
        case '<': return varValue < value;
        case '>=': return varValue >= value;
        case '<=': return varValue <= value;
        default: return false;
      }
    }
  },

  compareVariables: {
    name: 'Compare two variables',
    description: 'Compare two variables',
    category: 'Variables',
    icon: '🔢',
    params: [
      {
        name: 'variable1',
        type: 'variable',
        label: 'First variable',
        required: true
      },
      {
        name: 'comparison',
        type: 'select',
        label: 'Comparison',
        options: [
          { value: '=', label: 'Equal to (=)' },
          { value: '!=', label: 'Not equal to (≠)' },
          { value: '>', label: 'Greater than (>)' },
          { value: '<', label: 'Less than (<)' },
          { value: '>=', label: 'Greater or equal (≥)' },
          { value: '<=', label: 'Less or equal (≤)' }
        ],
        default: '='
      },
      {
        name: 'variable2',
        type: 'variable',
        label: 'Second variable',
        required: true
      }
    ],
    evaluate: (params, context) => {
      const { variable1, comparison, variable2 } = params;
      const { gameState } = context;

      if (!gameState) return false;

      const val1 = gameState.getVariable(variable1);
      const val2 = gameState.getVariable(variable2);

      switch (comparison) {
        case '=': return val1 === val2;
        case '!=': return val1 !== val2;
        case '>': return val1 > val2;
        case '<': return val1 < val2;
        case '>=': return val1 >= val2;
        case '<=': return val1 <= val2;
        default: return false;
      }
    }
  },

  variableIsTrue: {
    name: 'Variable is true',
    description: 'Boolean variable is true',
    category: 'Variables',
    icon: '✅',
    params: [
      {
        name: 'variable',
        type: 'variable',
        label: 'Variable',
        required: true
      }
    ],
    evaluate: (params, context) => {
      const { variable } = params;
      const { gameState } = context;
      if (!gameState) return false;
      return !!gameState.getVariable(variable);
    }
  },

  // ============================================
  // INPUT CONDITIONS
  // ============================================
  keyPressed: {
    name: 'Key is pressed',
    description: 'A keyboard key is currently pressed',
    category: 'Input',
    icon: '⌨️',
    params: [
      {
        name: 'key',
        type: 'key',
        label: 'Key',
        required: true
      }
    ],
    evaluate: (params, context) => {
      const { key } = params;
      const { inputSystem } = context;
      if (!inputSystem) return false;
      return inputSystem.isKeyDown(key);
    }
  },

  keyReleased: {
    name: 'Key was released',
    description: 'A keyboard key was just released this frame',
    category: 'Input',
    icon: '⌨️',
    params: [
      {
        name: 'key',
        type: 'key',
        label: 'Key',
        required: true
      }
    ],
    evaluate: (params, context) => {
      const { key } = params;
      const { inputSystem } = context;
      if (!inputSystem) return false;
      return inputSystem.wasKeyReleased(key);
    }
  },

  keyJustPressed: {
    name: 'Key just pressed',
    description: 'A key was just pressed this frame',
    category: 'Input',
    icon: '⌨️',
    params: [
      {
        name: 'key',
        type: 'key',
        label: 'Key',
        required: true
      }
    ],
    evaluate: (params, context) => {
      const { key } = params;
      const { inputSystem } = context;
      if (!inputSystem) return false;
      return inputSystem.wasKeyJustPressed(key);
    }
  },

  mouseClicked: {
    name: 'Mouse clicked',
    description: 'Mouse button was clicked',
    category: 'Input',
    icon: '🖱️',
    params: [
      {
        name: 'button',
        type: 'select',
        label: 'Button',
        options: [
          { value: 'left', label: 'Left' },
          { value: 'right', label: 'Right' },
          { value: 'middle', label: 'Middle' }
        ],
        default: 'left'
      }
    ],
    evaluate: (params, context) => {
      const { button } = params;
      const { inputSystem } = context;
      if (!inputSystem) return false;
      return inputSystem.wasMouseClicked(button);
    }
  },

  // ============================================
  // OBJECT CONDITIONS
  // ============================================
  objectExists: {
    name: 'Object exists',
    description: 'At least one instance of object exists',
    category: 'Objects',
    icon: '📦',
    params: [
      {
        name: 'object',
        type: 'object',
        label: 'Object type',
        required: true
      }
    ],
    evaluate: (params, context) => {
      const { object } = params;
      const { gameState } = context;
      if (!gameState) return false;
      return gameState.getObjectsByType(object).length > 0;
    }
  },

  objectCount: {
    name: 'Number of objects',
    description: 'Count of object instances matches condition',
    category: 'Objects',
    icon: '🔢',
    params: [
      {
        name: 'object',
        type: 'object',
        label: 'Object type',
        required: true
      },
      {
        name: 'comparison',
        type: 'select',
        label: 'Comparison',
        options: [
          { value: '=', label: 'Equal to (=)' },
          { value: '>', label: 'Greater than (>)' },
          { value: '<', label: 'Less than (<)' },
          { value: '>=', label: 'Greater or equal (≥)' },
          { value: '<=', label: 'Less or equal (≤)' }
        ],
        default: '='
      },
      {
        name: 'count',
        type: 'number',
        label: 'Count',
        required: true
      }
    ],
    evaluate: (params, context) => {
      const { object, comparison, count } = params;
      const { gameState } = context;

      if (!gameState) return false;

      const actualCount = gameState.getObjectsByType(object).length;

      switch (comparison) {
        case '=': return actualCount === count;
        case '>': return actualCount > count;
        case '<': return actualCount < count;
        case '>=': return actualCount >= count;
        case '<=': return actualCount <= count;
        default: return false;
      }
    }
  },

  objectVisible: {
    name: 'Object is visible',
    description: 'Object is currently visible',
    category: 'Objects',
    icon: '👁️',
    params: [
      {
        name: 'object',
        type: 'object',
        label: 'Object type',
        required: true
      }
    ],
    evaluate: (params, context) => {
      const { object } = params;
      const { gameState } = context;
      if (!gameState) return false;
      const objects = gameState.getObjectsByType(object);
      return objects.some(obj => obj.visible !== false);
    }
  },

  // ============================================
  // TIME CONDITIONS
  // ============================================
  timerElapsed: {
    name: 'Timer has elapsed',
    description: 'A certain amount of time has passed',
    category: 'Time',
    icon: '⏱️',
    params: [
      {
        name: 'timerName',
        type: 'string',
        label: 'Timer name',
        required: true
      },
      {
        name: 'duration',
        type: 'number',
        label: 'Duration (seconds)',
        required: true
      }
    ],
    evaluate: (params, context) => {
      const { timerName, duration } = params;
      const { gameState } = context;

      if (!gameState) return false;

      const timer = gameState.getTimer(timerName);
      if (!timer) return false;

      return timer.elapsed >= duration * 1000; // Convert to ms
    }
  },

  everyXSeconds: {
    name: 'Every X seconds',
    description: 'Triggers periodically',
    category: 'Time',
    icon: '🔄',
    params: [
      {
        name: 'interval',
        type: 'number',
        label: 'Interval (seconds)',
        required: true,
        default: 1
      }
    ],
    evaluate: (params, context) => {
      const { interval } = params;
      const { gameState, frameTime } = context;
      
      if (!gameState || !interval) return false;
      
      // Use modulo to check if we're at an interval boundary
      const currentTime = gameState.elapsedTime || 0;
      const intervalMs = interval * 1000;
      const lastCheck = gameState._lastIntervalCheck || 0;
      
      if (currentTime - lastCheck >= intervalMs) {
        gameState._lastIntervalCheck = currentTime;
        return true;
      }
      return false;
    }
  },

  // ============================================
  // SCENE CONDITIONS
  // ============================================
  sceneStarted: {
    name: 'Scene just started',
    description: 'The scene was just loaded',
    category: 'Scene',
    icon: '🎬',
    params: [],
    evaluate: (params, context) => {
      const { gameState } = context;
      if (!gameState) return false;
      return gameState.isSceneStart === true;
    }
  },

  // ============================================
  // PHYSICS CONDITIONS
  // ============================================
  objectIsGrounded: {
    name: 'Object is grounded',
    description: 'Object is touching the ground',
    category: 'Physics',
    icon: '🏃',
    params: [
      {
        name: 'object',
        type: 'object',
        label: 'Object type',
        required: true
      }
    ],
    evaluate: (params, context) => {
      const { object } = params;
      const { gameState, physicsSystem } = context;
      if (!gameState || !physicsSystem) return false;
      const objects = gameState.getObjectsByType(object);
      return objects.some(obj => physicsSystem.isGrounded(obj.id));
    }
  },

  objectIsMoving: {
    name: 'Object is moving',
    description: 'Object has velocity',
    category: 'Physics',
    icon: '➡️',
    params: [
      {
        name: 'object',
        type: 'object',
        label: 'Object type',
        required: true
      },
      {
        name: 'minSpeed',
        type: 'number',
        label: 'Minimum speed',
        default: 0.1
      }
    ],
    evaluate: (params, context) => {
      const { object, minSpeed = 0.1 } = params;
      const { gameState, physicsSystem } = context;
      if (!gameState || !physicsSystem) return false;
      const objects = gameState.getObjectsByType(object);
      return objects.some(obj => {
        const velocity = physicsSystem.getVelocity(obj.id);
        if (!velocity) return false;
        const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
        return speed >= minSpeed;
      });
    }
  },

  // ============================================
  // ANIMATION CONDITIONS
  // ============================================
  animationFinished: {
    name: 'Animation finished',
    description: 'Current animation has completed',
    category: 'Animation',
    icon: '🎞️',
    params: [
      {
        name: 'object',
        type: 'object',
        label: 'Object type',
        required: true
      },
      {
        name: 'animation',
        type: 'string',
        label: 'Animation name (optional)',
        required: false
      }
    ],
    evaluate: (params, context) => {
      const { object, animation } = params;
      const { gameState, animationSystem } = context;
      if (!gameState || !animationSystem) return false;
      const objects = gameState.getObjectsByType(object);
      return objects.some(obj => {
        if (animation) {
          return animationSystem.isAnimationFinished(obj.id, animation);
        }
        return animationSystem.isCurrentAnimationFinished(obj.id);
      });
    }
  },

  // ============================================
  // SCENE CONDITIONS
  // ============================================
  sceneStart: {
    name: 'Scene starts',
    description: 'True when the scene first loads',
    category: 'Scenes',
    icon: '🎬',
    params: [],
    evaluate: (params, context) => {
      const { gameState } = context;
      return gameState?.isSceneStart === true;
    }
  },

  currentScene: {
    name: 'Current scene is',
    description: 'Check if current scene matches',
    category: 'Scenes',
    icon: '🎭',
    params: [
      {
        name: 'sceneName',
        type: 'string',
        label: 'Scene name',
        required: true
      }
    ],
    evaluate: (params, context) => {
      const { sceneName } = params;
      const { sceneManager } = context;

      if (sceneManager?.getCurrentScene) {
        const current = sceneManager.getCurrentScene();
        return current?.name === sceneName;
      }
      return false;
    }
  },

  globalVariableEquals: {
    name: 'Global variable equals',
    description: 'Check if a global variable has a specific value',
    category: 'Scenes',
    icon: '🌐',
    params: [
      {
        name: 'variableName',
        type: 'string',
        label: 'Variable name',
        required: true
      },
      {
        name: 'value',
        type: 'any',
        label: 'Value',
        required: true
      }
    ],
    evaluate: (params, context) => {
      const { variableName, value } = params;
      const { globalVariables } = context;

      if (globalVariables?.get) {
        return globalVariables.get(variableName) === value;
      }
      return false;
    }
  },

  globalVariableGreaterThan: {
    name: 'Global variable greater than',
    description: 'Check if a global variable is greater than a value',
    category: 'Scenes',
    icon: '📈',
    params: [
      {
        name: 'variableName',
        type: 'string',
        label: 'Variable name',
        required: true
      },
      {
        name: 'value',
        type: 'number',
        label: 'Value',
        required: true
      }
    ],
    evaluate: (params, context) => {
      const { variableName, value } = params;
      const { globalVariables } = context;

      if (globalVariables?.get) {
        return globalVariables.get(variableName, 0) > value;
      }
      return false;
    }
  },

  // ============================================
  // CUSTOM LOGIC
  // ============================================
  customScript: {
    name: 'Custom JavaScript',
    description: 'Run custom JavaScript code (advanced)',
    category: 'Advanced',
    icon: '💻',
    params: [
      {
        name: 'code',
        type: 'code',
        label: 'JavaScript code',
        required: true,
        placeholder: 'return gameState.score > 100;'
      }
    ],
    evaluate: (params, context) => {
      const { code } = params;
      const { gameState } = context;

      try {
        // Create function from code
        const fn = new Function('gameState', 'context', code);
        return !!fn(gameState, context);
      } catch (err) {
        console.error('[EventSystem] Custom condition error:', err);
        return false;
      }
    }
  }
};

/**
 * Get conditions organized by category
 */
export const getConditionsByCategory = () => {
  const categories = {};
  
  Object.entries(ConditionRegistry).forEach(([key, condition]) => {
    const category = condition.category || 'Other';
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push({ key, ...condition });
  });
  
  return categories;
};

/**
 * Get all category names
 */
export const getConditionCategories = () => {
  return [...new Set(Object.values(ConditionRegistry).map(c => c.category))];
};
