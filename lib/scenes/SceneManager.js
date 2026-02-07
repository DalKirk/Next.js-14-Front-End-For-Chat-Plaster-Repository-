// lib/scenes/SceneManager.js
// Handles scene lifecycle, transitions, and global variables

import * as PIXI from 'pixi.js';

export class SceneManager {
  constructor(layerRenderer, project) {
    this.layerRenderer = layerRenderer;
    this.project = project;
    
    // Current loaded scene
    this.currentScene = null;
    this.currentSceneId = null;
    
    // Transition state
    this.isTransitioning = false;
    this.transitionOverlay = null;
    
    // Global variables persist across scene changes
    this.globalVariables = new Map();
    
    // Initialize global variables from project defaults
    if (project.globalVariables) {
      Object.entries(project.globalVariables).forEach(([key, value]) => {
        this.globalVariables.set(key, value);
      });
    }
    
    // Callback for when a scene finishes loading
    this.onSceneLoaded = null;
  }

  /**
   * Load the start scene (called on game start)
   */
  loadStartScene() {
    const startId = this.project.startSceneId;
    
    if (startId) {
      const scene = this.project.scenes.find(s => s.id === startId);
      if (scene) {
        this._loadSceneImmediate(scene);
        return;
      }
    }
    
    // Fallback to first scene
    if (this.project.scenes.length > 0) {
      this._loadSceneImmediate(this.project.scenes[0]);
    }
  }

  /**
   * Load a scene by ID
   * @param {string} sceneId - Scene ID to load
   */
  loadScene(sceneId) {
    const scene = this.project.scenes.find(s => s.id === sceneId);
    if (!scene) {
      console.warn('SceneManager: Scene not found:', sceneId);
      return;
    }
    
    this._loadWithTransition(scene);
  }

  /**
   * Load a scene by name
   * @param {string} sceneName - Scene name to load
   */
  loadSceneByName(sceneName) {
    const scene = this.project.scenes.find(s => s.name === sceneName);
    if (!scene) {
      console.warn('SceneManager: Scene not found by name:', sceneName);
      return;
    }
    
    this._loadWithTransition(scene);
  }

  /**
   * Load scene immediately (no transition)
   */
  _loadSceneImmediate(scene) {
    this.currentScene = scene;
    this.currentSceneId = scene.id;
    
    // Tell LayerRenderer to build the scene
    this.layerRenderer.loadScene(scene);
    
    // Notify callback
    if (this.onSceneLoaded) {
      this.onSceneLoaded(scene);
    }
  }

  /**
   * Load scene with transition effect
   */
  async _loadWithTransition(scene) {
    if (this.isTransitioning) return;
    
    const transition = scene.transition || { type: 'fade', duration: 600 };
    
    if (transition.type === 'instant') {
      this._loadSceneImmediate(scene);
      return;
    }
    
    this.isTransitioning = true;
    
    // Create overlay for transitions
    await this._executeTransition(transition, scene);
    
    this.isTransitioning = false;
  }

  /**
   * Execute a transition effect
   */
  async _executeTransition(transition, newScene) {
    const app = this.layerRenderer.app;
    const duration = transition.duration || 600;
    const halfDuration = duration / 2;
    
    // Create black overlay
    const overlay = new PIXI.Graphics();
    overlay.rect(0, 0, app.screen.width, app.screen.height);
    overlay.fill(0x000000);
    overlay.alpha = 0;
    app.stage.addChild(overlay);
    this.transitionOverlay = overlay;
    
    switch (transition.type) {
      case 'fade':
        // Fade to black
        await this._animateAlpha(overlay, 0, 1, halfDuration);
        
        // Load new scene while fully black
        this._loadSceneImmediate(newScene);
        
        // Fade in
        await this._animateAlpha(overlay, 1, 0, halfDuration);
        break;
        
      case 'slide_left':
        await this._slideTransition(overlay, newScene, 'left', duration);
        break;
        
      case 'slide_right':
        await this._slideTransition(overlay, newScene, 'right', duration);
        break;
        
      default:
        this._loadSceneImmediate(newScene);
    }
    
    // Clean up overlay
    app.stage.removeChild(overlay);
    overlay.destroy();
    this.transitionOverlay = null;
  }

  /**
   * Animate alpha property
   */
  _animateAlpha(obj, from, to, duration) {
    return new Promise(resolve => {
      obj.alpha = from;
      const startTime = Date.now();
      
      const tick = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease in-out
        const eased = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        
        obj.alpha = from + (to - from) * eased;
        
        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          resolve();
        }
      };
      
      tick();
    });
  }

  /**
   * Slide transition effect
   */
  async _slideTransition(overlay, newScene, direction, duration) {
    const app = this.layerRenderer.app;
    const width = app.screen.width;
    
    // Slide overlay in
    overlay.alpha = 1;
    overlay.x = direction === 'left' ? width : -width;
    
    await this._animatePosition(overlay, overlay.x, 0, duration / 2);
    
    // Load new scene
    this._loadSceneImmediate(newScene);
    
    // Slide overlay out
    const endX = direction === 'left' ? -width : width;
    await this._animatePosition(overlay, 0, endX, duration / 2);
  }

  /**
   * Animate X position
   */
  _animatePosition(obj, fromX, toX, duration) {
    return new Promise(resolve => {
      const startTime = Date.now();
      
      const tick = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease out
        const eased = 1 - Math.pow(1 - progress, 3);
        
        obj.x = fromX + (toX - fromX) * eased;
        
        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          resolve();
        }
      };
      
      tick();
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // GLOBAL VARIABLES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get a global variable
   * @param {string} name - Variable name
   * @param {*} defaultValue - Default if not set
   * @returns {*} Variable value
   */
  getGlobalVariable(name, defaultValue = 0) {
    return this.globalVariables.has(name) 
      ? this.globalVariables.get(name) 
      : defaultValue;
  }

  /**
   * Set a global variable
   * @param {string} name - Variable name
   * @param {*} value - Value to set
   */
  setGlobalVariable(name, value) {
    this.globalVariables.set(name, value);
  }

  /**
   * Add to a global variable
   * @param {string} name - Variable name
   * @param {number} amount - Amount to add
   */
  addToGlobalVariable(name, amount) {
    const current = this.getGlobalVariable(name, 0);
    this.setGlobalVariable(name, current + amount);
  }

  /**
   * Get all global variables as an object
   * @returns {Object}
   */
  getAllGlobalVariables() {
    const obj = {};
    this.globalVariables.forEach((value, key) => {
      obj[key] = value;
    });
    return obj;
  }

  /**
   * Reset global variables to project defaults
   */
  resetGlobalVariables() {
    this.globalVariables.clear();
    if (this.project.globalVariables) {
      Object.entries(this.project.globalVariables).forEach(([key, value]) => {
        this.globalVariables.set(key, value);
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SCENE QUERIES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get scene by ID
   */
  getSceneById(sceneId) {
    return this.project.scenes.find(s => s.id === sceneId) || null;
  }

  /**
   * Get scene by name
   */
  getSceneByName(sceneName) {
    return this.project.scenes.find(s => s.name === sceneName) || null;
  }

  /**
   * Get all scene names
   */
  getSceneNames() {
    return this.project.scenes.map(s => s.name);
  }

  /**
   * Check if currently transitioning
   */
  get transitioning() {
    return this.isTransitioning;
  }
}

export default SceneManager;
