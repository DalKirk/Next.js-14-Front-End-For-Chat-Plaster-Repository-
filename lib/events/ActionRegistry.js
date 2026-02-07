/**
 * ActionRegistry - Defines all available action types
 */
export const ActionRegistry = {
  // ============================================
  // DO NOTHING
  // ============================================
  doNothing: {
    name: 'Do nothing',
    description: 'Placeholder action that does nothing',
    category: 'Basic',
    icon: '⏸️',
    params: [],
    execute: (params, context) => {
      // Does nothing
    }
  },

  // ============================================
  // OBJECT ACTIONS
  // ============================================
  createObject: {
    name: 'Create object',
    description: 'Create a new object instance',
    category: 'Objects',
    icon: '➕',
    params: [
      {
        name: 'objectType',
        type: 'object',
        label: 'Object type',
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
        name: 'layer',
        type: 'layer',
        label: 'Layer',
        default: 'entities'
      }
    ],
    execute: (params, context) => {
      const { objectType, x, y, layer = 'entities' } = params;
      const { gameState } = context;

      if (gameState?.createObject) {
        gameState.createObject(objectType, x, y, layer);
      }
    }
  },

  destroyObject: {
    name: 'Destroy object',
    description: 'Remove an object from the game',
    category: 'Objects',
    icon: '🗑️',
    params: [
      {
        name: 'object',
        type: 'objectPicker',
        label: 'Object',
        required: true,
        options: ['collision_other', 'collision_self', 'picked_object', 'all_of_type']
      },
      {
        name: 'objectType',
        type: 'object',
        label: 'Object type (if "all of type")',
        condition: (params) => params.object === 'all_of_type'
      }
    ],
    execute: (params, context) => {
      const { object, objectType } = params;
      const { gameState, collisionPair } = context;

      if (!gameState) return;

      if (object === 'collision_other' && collisionPair) {
        gameState.destroyObject(collisionPair.objectB.id);
      } else if (object === 'collision_self' && collisionPair) {
        gameState.destroyObject(collisionPair.objectA.id);
      } else if (object === 'all_of_type' && objectType) {
        gameState.destroyAllObjectsOfType(objectType);
      }
    }
  },

  hideObject: {
    name: 'Hide object',
    description: 'Make object invisible',
    category: 'Objects',
    icon: '👁️‍🗨️',
    params: [
      {
        name: 'object',
        type: 'objectPicker',
        label: 'Object',
        required: true,
        options: ['collision_other', 'collision_self', 'all_of_type']
      },
      {
        name: 'objectType',
        type: 'object',
        label: 'Object type',
        condition: (params) => params.object === 'all_of_type'
      }
    ],
    execute: (params, context) => {
      const { object, objectType } = params;
      const { gameState, collisionPair } = context;

      if (!gameState) return;

      if (object === 'collision_other' && collisionPair) {
        gameState.setObjectProperty(collisionPair.objectB.id, 'visible', false);
      } else if (object === 'collision_self' && collisionPair) {
        gameState.setObjectProperty(collisionPair.objectA.id, 'visible', false);
      } else if (object === 'all_of_type' && objectType) {
        gameState.setObjectTypeProperty(objectType, 'visible', false);
      }
    }
  },

  showObject: {
    name: 'Show object',
    description: 'Make object visible',
    category: 'Objects',
    icon: '👁️',
    params: [
      {
        name: 'object',
        type: 'objectPicker',
        label: 'Object',
        required: true,
        options: ['collision_other', 'collision_self', 'all_of_type']
      },
      {
        name: 'objectType',
        type: 'object',
        label: 'Object type',
        condition: (params) => params.object === 'all_of_type'
      }
    ],
    execute: (params, context) => {
      const { object, objectType } = params;
      const { gameState, collisionPair } = context;

      if (!gameState) return;

      if (object === 'collision_other' && collisionPair) {
        gameState.setObjectProperty(collisionPair.objectB.id, 'visible', true);
      } else if (object === 'collision_self' && collisionPair) {
        gameState.setObjectProperty(collisionPair.objectA.id, 'visible', true);
      } else if (object === 'all_of_type' && objectType) {
        gameState.setObjectTypeProperty(objectType, 'visible', true);
      }
    }
  },

  // ============================================
  // VARIABLE ACTIONS
  // ============================================
  setVariable: {
    name: 'Set variable',
    description: 'Set a variable to a value',
    category: 'Variables',
    icon: '=',
    params: [
      {
        name: 'variable',
        type: 'variable',
        label: 'Variable',
        required: true
      },
      {
        name: 'value',
        type: 'number',
        label: 'Value',
        required: true
      }
    ],
    execute: (params, context) => {
      const { variable, value } = params;
      const { gameState } = context;

      if (gameState?.setVariable) {
        gameState.setVariable(variable, value);
      }
    }
  },

  addToVariable: {
    name: 'Add to variable',
    description: 'Add a value to a variable',
    category: 'Variables',
    icon: '➕',
    params: [
      {
        name: 'variable',
        type: 'variable',
        label: 'Variable',
        required: true
      },
      {
        name: 'value',
        type: 'number',
        label: 'Value to add',
        required: true
      }
    ],
    execute: (params, context) => {
      const { variable, value } = params;
      const { gameState } = context;

      if (gameState?.addToVariable) {
        gameState.addToVariable(variable, value);
      }
    }
  },

  subtractFromVariable: {
    name: 'Subtract from variable',
    description: 'Subtract a value from a variable',
    category: 'Variables',
    icon: '➖',
    params: [
      {
        name: 'variable',
        type: 'variable',
        label: 'Variable',
        required: true
      },
      {
        name: 'value',
        type: 'number',
        label: 'Value to subtract',
        required: true
      }
    ],
    execute: (params, context) => {
      const { variable, value } = params;
      const { gameState } = context;

      if (gameState?.addToVariable) {
        gameState.addToVariable(variable, -value);
      }
    }
  },

  multiplyVariable: {
    name: 'Multiply variable',
    description: 'Multiply a variable by a value',
    category: 'Variables',
    icon: '✖️',
    params: [
      {
        name: 'variable',
        type: 'variable',
        label: 'Variable',
        required: true
      },
      {
        name: 'value',
        type: 'number',
        label: 'Multiplier',
        required: true
      }
    ],
    execute: (params, context) => {
      const { variable, value } = params;
      const { gameState } = context;

      if (gameState?.multiplyVariable) {
        gameState.multiplyVariable(variable, value);
      }
    }
  },

  toggleVariable: {
    name: 'Toggle boolean',
    description: 'Toggle a boolean variable',
    category: 'Variables',
    icon: '🔄',
    params: [
      {
        name: 'variable',
        type: 'variable',
        label: 'Variable',
        required: true
      }
    ],
    execute: (params, context) => {
      const { variable } = params;
      const { gameState } = context;

      if (gameState) {
        const current = gameState.getVariable(variable);
        gameState.setVariable(variable, !current);
      }
    }
  },

  // ============================================
  // MOVEMENT ACTIONS
  // ============================================
  moveObject: {
    name: 'Move object',
    description: 'Move an object to a position',
    category: 'Movement',
    icon: '🏃',
    params: [
      {
        name: 'object',
        type: 'objectPicker',
        label: 'Object',
        required: true,
        options: ['collision_other', 'collision_self', 'all_of_type']
      },
      {
        name: 'objectType',
        type: 'object',
        label: 'Object type',
        condition: (params) => params.object === 'all_of_type'
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
      }
    ],
    execute: (params, context) => {
      const { object, objectType, x, y } = params;
      const { gameState, collisionPair } = context;

      if (!gameState) return;

      let targetObj = null;
      if (object === 'collision_other' && collisionPair) {
        targetObj = collisionPair.objectB;
      } else if (object === 'collision_self' && collisionPair) {
        targetObj = collisionPair.objectA;
      }

      if (targetObj) {
        gameState.setObjectProperty(targetObj.id, 'x', x);
        gameState.setObjectProperty(targetObj.id, 'y', y);
      }
    }
  },

  setVelocity: {
    name: 'Set velocity',
    description: 'Set object velocity',
    category: 'Movement',
    icon: '💨',
    params: [
      {
        name: 'object',
        type: 'objectPicker',
        label: 'Object',
        required: true,
        options: ['collision_other', 'collision_self', 'all_of_type']
      },
      {
        name: 'objectType',
        type: 'object',
        label: 'Object type',
        condition: (params) => params.object === 'all_of_type'
      },
      {
        name: 'vx',
        type: 'number',
        label: 'X velocity',
        required: true
      },
      {
        name: 'vy',
        type: 'number',
        label: 'Y velocity',
        required: true
      }
    ],
    execute: (params, context) => {
      const { object, objectType, vx, vy } = params;
      const { gameState, physicsSystem, collisionPair } = context;

      if (!physicsSystem) return;

      let targetId = null;
      if (object === 'collision_other' && collisionPair) {
        targetId = collisionPair.objectB.id;
      } else if (object === 'collision_self' && collisionPair) {
        targetId = collisionPair.objectA.id;
      }

      if (targetId) {
        physicsSystem.setVelocity(targetId, vx, vy);
      }
    }
  },

  applyForce: {
    name: 'Apply force',
    description: 'Apply a force to object',
    category: 'Movement',
    icon: '💪',
    params: [
      {
        name: 'object',
        type: 'objectPicker',
        label: 'Object',
        required: true,
        options: ['collision_other', 'collision_self', 'all_of_type']
      },
      {
        name: 'fx',
        type: 'number',
        label: 'Force X',
        required: true
      },
      {
        name: 'fy',
        type: 'number',
        label: 'Force Y',
        required: true
      }
    ],
    execute: (params, context) => {
      const { object, fx, fy } = params;
      const { physicsSystem, collisionPair } = context;

      if (!physicsSystem) return;

      let targetId = null;
      if (object === 'collision_other' && collisionPair) {
        targetId = collisionPair.objectB.id;
      } else if (object === 'collision_self' && collisionPair) {
        targetId = collisionPair.objectA.id;
      }

      if (targetId) {
        physicsSystem.applyForce(targetId, fx, fy);
      }
    }
  },

  rotateObject: {
    name: 'Rotate object',
    description: 'Set object rotation',
    category: 'Movement',
    icon: '🔄',
    params: [
      {
        name: 'object',
        type: 'objectPicker',
        label: 'Object',
        required: true,
        options: ['collision_other', 'collision_self', 'all_of_type']
      },
      {
        name: 'angle',
        type: 'number',
        label: 'Angle (degrees)',
        required: true
      }
    ],
    execute: (params, context) => {
      const { object, angle } = params;
      const { gameState, collisionPair } = context;

      if (!gameState) return;

      let targetId = null;
      if (object === 'collision_other' && collisionPair) {
        targetId = collisionPair.objectB.id;
      } else if (object === 'collision_self' && collisionPair) {
        targetId = collisionPair.objectA.id;
      }

      if (targetId) {
        gameState.setObjectProperty(targetId, 'rotation', angle);
      }
    }
  },

  scaleObject: {
    name: 'Scale object',
    description: 'Set object scale',
    category: 'Movement',
    icon: '📐',
    params: [
      {
        name: 'object',
        type: 'objectPicker',
        label: 'Object',
        required: true,
        options: ['collision_other', 'collision_self', 'all_of_type']
      },
      {
        name: 'scale',
        type: 'number',
        label: 'Scale',
        required: true,
        default: 1
      }
    ],
    execute: (params, context) => {
      const { object, scale } = params;
      const { gameState, collisionPair } = context;

      if (!gameState) return;

      let targetId = null;
      if (object === 'collision_other' && collisionPair) {
        targetId = collisionPair.objectB.id;
      } else if (object === 'collision_self' && collisionPair) {
        targetId = collisionPair.objectA.id;
      }

      if (targetId) {
        gameState.setObjectProperty(targetId, 'scale', scale);
      }
    }
  },

  // ============================================
  // AUDIO ACTIONS
  // ============================================
  playSound: {
    name: 'Play sound',
    description: 'Play a sound effect',
    category: 'Audio',
    icon: '🔊',
    params: [
      {
        name: 'sound',
        type: 'sound',
        label: 'Sound',
        required: true
      },
      {
        name: 'volume',
        type: 'slider',
        label: 'Volume',
        min: 0,
        max: 1,
        step: 0.1,
        default: 1
      }
    ],
    execute: (params, context) => {
      const { sound, volume = 1 } = params;
      const { audioSystem } = context;

      if (audioSystem?.playSound) {
        audioSystem.playSound(sound, { volume });
      }
    }
  },

  playMusic: {
    name: 'Play music',
    description: 'Play background music',
    category: 'Audio',
    icon: '🎵',
    params: [
      {
        name: 'music',
        type: 'sound',
        label: 'Music',
        required: true
      },
      {
        name: 'loop',
        type: 'boolean',
        label: 'Loop',
        default: true
      },
      {
        name: 'volume',
        type: 'slider',
        label: 'Volume',
        min: 0,
        max: 1,
        step: 0.1,
        default: 0.5
      }
    ],
    execute: (params, context) => {
      const { music, loop = true, volume = 0.5 } = params;
      const { audioSystem } = context;

      if (audioSystem?.playMusic) {
        audioSystem.playMusic(music, { loop, volume });
      }
    }
  },

  stopMusic: {
    name: 'Stop music',
    description: 'Stop all background music',
    category: 'Audio',
    icon: '🔇',
    params: [],
    execute: (params, context) => {
      const { audioSystem } = context;
      if (audioSystem?.stopMusic) {
        audioSystem.stopMusic();
      }
    }
  },

  // ============================================
  // SCENE ACTIONS
  // ============================================
  changeScene: {
    name: 'Change scene',
    description: 'Load a different scene',
    category: 'Scene',
    icon: '🎬',
    params: [
      {
        name: 'sceneName',
        type: 'scene',
        label: 'Scene',
        required: true
      }
    ],
    execute: (params, context) => {
      const { sceneName } = params;
      const { sceneManager } = context;

      if (sceneManager?.loadScene) {
        sceneManager.loadScene(sceneName);
      }
    }
  },

  restartScene: {
    name: 'Restart scene',
    description: 'Reload the current scene',
    category: 'Scene',
    icon: '🔄',
    params: [],
    execute: (params, context) => {
      const { sceneManager } = context;
      if (sceneManager?.restartScene) {
        sceneManager.restartScene();
      }
    }
  },

  // ============================================
  // UI ACTIONS
  // ============================================
  showText: {
    name: 'Show text message',
    description: 'Display a text message on screen',
    category: 'UI',
    icon: '💬',
    params: [
      {
        name: 'text',
        type: 'text',
        label: 'Message',
        required: true
      },
      {
        name: 'duration',
        type: 'number',
        label: 'Duration (seconds)',
        default: 3
      }
    ],
    execute: (params, context) => {
      const { text, duration = 3 } = params;
      const { gameState } = context;

      if (gameState?.showMessage) {
        gameState.showMessage(text, duration * 1000);
      }
    }
  },

  // ============================================
  // CAMERA ACTIONS
  // ============================================
  shakeCamera: {
    name: 'Shake camera',
    description: 'Apply screen shake effect',
    category: 'Camera',
    icon: '📳',
    params: [
      {
        name: 'intensity',
        type: 'number',
        label: 'Intensity',
        default: 5
      },
      {
        name: 'duration',
        type: 'number',
        label: 'Duration (seconds)',
        default: 0.3
      }
    ],
    execute: (params, context) => {
      const { intensity = 5, duration = 0.3 } = params;
      const { cameraSystem } = context;

      if (cameraSystem?.shake) {
        cameraSystem.shake(intensity, duration * 1000);
      }
    }
  },

  panCamera: {
    name: 'Pan camera',
    description: 'Move camera to position',
    category: 'Camera',
    icon: '🎥',
    params: [
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
        name: 'duration',
        type: 'number',
        label: 'Duration (seconds)',
        default: 1
      }
    ],
    execute: (params, context) => {
      const { x, y, duration = 1 } = params;
      const { cameraSystem } = context;

      if (cameraSystem?.panTo) {
        cameraSystem.panTo(x, y, duration * 1000);
      }
    }
  },

  zoomCamera: {
    name: 'Zoom camera',
    description: 'Set camera zoom level',
    category: 'Camera',
    icon: '🔍',
    params: [
      {
        name: 'zoom',
        type: 'number',
        label: 'Zoom level',
        default: 1
      },
      {
        name: 'duration',
        type: 'number',
        label: 'Duration (seconds)',
        default: 0.5
      }
    ],
    execute: (params, context) => {
      const { zoom = 1, duration = 0.5 } = params;
      const { cameraSystem } = context;

      if (cameraSystem?.zoomTo) {
        cameraSystem.zoomTo(zoom, duration * 1000);
      }
    }
  },

  // ============================================
  // EFFECTS ACTIONS
  // ============================================
  createParticles: {
    name: 'Create particles',
    description: 'Emit particle effect',
    category: 'Effects',
    icon: '✨',
    params: [
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
        name: 'count',
        type: 'number',
        label: 'Particle count',
        default: 20
      },
      {
        name: 'color',
        type: 'color',
        label: 'Color',
        default: '#FFD700'
      }
    ],
    execute: (params, context) => {
      const { x, y, count = 20, color = '#FFD700' } = params;
      const { particleSystem } = context;

      if (particleSystem?.emit) {
        particleSystem.emit(x, y, { count, color });
      }
    }
  },

  flashScreen: {
    name: 'Flash screen',
    description: 'Brief screen flash effect',
    category: 'Effects',
    icon: '💥',
    params: [
      {
        name: 'color',
        type: 'color',
        label: 'Color',
        default: '#FFFFFF'
      },
      {
        name: 'duration',
        type: 'number',
        label: 'Duration (seconds)',
        default: 0.1
      }
    ],
    execute: (params, context) => {
      const { color = '#FFFFFF', duration = 0.1 } = params;
      const { effectsSystem } = context;

      if (effectsSystem?.flash) {
        effectsSystem.flash(color, duration * 1000);
      }
    }
  },

  // ============================================
  // TIMER ACTIONS
  // ============================================
  startTimer: {
    name: 'Start timer',
    description: 'Start a named timer',
    category: 'Time',
    icon: '⏱️',
    params: [
      {
        name: 'timerName',
        type: 'string',
        label: 'Timer name',
        required: true
      }
    ],
    execute: (params, context) => {
      const { timerName } = params;
      const { gameState } = context;

      if (gameState?.startTimer) {
        gameState.startTimer(timerName);
      }
    }
  },

  resetTimer: {
    name: 'Reset timer',
    description: 'Reset a timer to 0',
    category: 'Time',
    icon: '🔄',
    params: [
      {
        name: 'timerName',
        type: 'string',
        label: 'Timer name',
        required: true
      }
    ],
    execute: (params, context) => {
      const { timerName } = params;
      const { gameState } = context;

      if (gameState?.resetTimer) {
        gameState.resetTimer(timerName);
      }
    }
  },

  wait: {
    name: 'Wait',
    description: 'Wait before next action',
    category: 'Time',
    icon: '⏸️',
    params: [
      {
        name: 'duration',
        type: 'number',
        label: 'Duration (seconds)',
        required: true
      }
    ],
    execute: (params, context) => {
      // This is handled by Action.delay property
      // The EventEvaluator will process the delay
      return params.duration * 1000;
    }
  },

  // ============================================
  // DEBUG ACTIONS
  // ============================================
  logMessage: {
    name: 'Log message',
    description: 'Write to console log',
    category: 'Debug',
    icon: '📝',
    params: [
      {
        name: 'message',
        type: 'text',
        label: 'Message',
        required: true
      }
    ],
    execute: (params, context) => {
      const { message } = params;
      console.log('[EventSystem]', message);
      
      // Also add to game console if available
      const { gameState } = context;
      if (gameState?.addConsoleLog) {
        gameState.addConsoleLog('info', message);
      }
    }
  },

  // ============================================
  // SCENE ACTIONS
  // ============================================
  changeScene: {
    name: 'Change scene',
    description: 'Load a different scene',
    category: 'Scenes',
    icon: '🎬',
    params: [
      {
        name: 'sceneName',
        type: 'string',
        label: 'Scene name',
        required: true,
        placeholder: 'Level 2'
      }
    ],
    execute: (params, context) => {
      const { sceneName } = params;
      const { sceneManager } = context;

      if (sceneManager?.loadScene) {
        sceneManager.loadScene(sceneName);
      } else {
        console.warn('[EventSystem] SceneManager not available for changeScene action');
      }
    }
  },

  restartScene: {
    name: 'Restart scene',
    description: 'Reload the current scene',
    category: 'Scenes',
    icon: '🔄',
    params: [],
    execute: (params, context) => {
      const { sceneManager } = context;

      if (sceneManager?.getCurrentScene) {
        const currentScene = sceneManager.getCurrentScene();
        if (currentScene) {
          sceneManager.loadScene(currentScene.name);
        }
      }
    }
  },

  setGlobalVariable: {
    name: 'Set global variable',
    description: 'Set a variable that persists across scenes',
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
    execute: (params, context) => {
      const { variableName, value } = params;
      const { globalVariables } = context;

      if (globalVariables?.set) {
        globalVariables.set(variableName, value);
      }
    }
  },

  addToGlobalVariable: {
    name: 'Add to global variable',
    description: 'Add a value to a global variable',
    category: 'Scenes',
    icon: '➕',
    params: [
      {
        name: 'variableName',
        type: 'string',
        label: 'Variable name',
        required: true
      },
      {
        name: 'amount',
        type: 'number',
        label: 'Amount',
        required: true
      }
    ],
    execute: (params, context) => {
      const { variableName, amount } = params;
      const { globalVariables } = context;

      if (globalVariables?.add) {
        globalVariables.add(variableName, amount);
      }
    }
  },

  // ============================================
  // ADVANCED ACTIONS
  // ============================================
  customScript: {
    name: 'Run custom JavaScript',
    description: 'Execute custom code (advanced)',
    category: 'Advanced',
    icon: '💻',
    params: [
      {
        name: 'code',
        type: 'code',
        label: 'JavaScript code',
        required: true,
        placeholder: 'gameState.score += 100;'
      }
    ],
    execute: (params, context) => {
      const { code } = params;
      const { gameState } = context;

      try {
        const fn = new Function('gameState', 'context', code);
        fn(gameState, context);
      } catch (err) {
        console.error('[EventSystem] Custom action error:', err);
      }
    }
  }
};

/**
 * Get actions organized by category
 */
export const getActionsByCategory = () => {
  const categories = {};
  
  Object.entries(ActionRegistry).forEach(([key, action]) => {
    const category = action.category || 'Other';
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push({ key, ...action });
  });
  
  return categories;
};

/**
 * Get all category names
 */
export const getActionCategories = () => {
  return [...new Set(Object.values(ActionRegistry).map(a => a.category))];
};
