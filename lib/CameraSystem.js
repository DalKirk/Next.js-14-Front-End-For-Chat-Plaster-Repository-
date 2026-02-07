/**
 * CameraSystem - Smooth camera controls for PixiJS v8
 * 
 * Features:
 * - Smooth follow with configurable smoothing
 * - Bounds clamping
 * - Zoom controls
 * - Screen shake
 * - Dead zone for player movement
 * - Look-ahead panning (shifts camera in direction of movement)
 * - Vertical offset (positions player lower for more upward visibility)
 * - Speed-based adjustments
 */

export class CameraSystem {
  constructor(app, options = {}) {
    this.app = app;
    
    // Camera position
    this.x = 0;
    this.y = 0;
    this.targetX = 0;
    this.targetY = 0;
    
    // Zoom
    this.zoom = options.zoom || 1;
    this.minZoom = options.minZoom || 0.25;
    this.maxZoom = options.maxZoom || 4;
    this.targetZoom = this.zoom;
    this.zoomSmoothing = options.zoomSmoothing || 0.1;
    
    // Smoothing
    this.smoothing = options.smoothing || 0.1;
    this.followEnabled = options.followEnabled !== false;
    
    // Bounds (world limits)
    this.bounds = options.bounds || {
      minX: 0,
      maxX: 2000,
      minY: 0,
      maxY: 600
    };
    
    // Dead zone (player can move without camera following)
    this.deadZone = options.deadZone || {
      x: 100,
      y: 50
    };
    
    // 2D Platformer camera features
    this.lookAhead = options.lookAhead !== false; // Enable look-ahead by default
    this.lookAheadDistance = options.lookAheadDistance || 150; // How far ahead to look
    this.lookAheadSmoothing = options.lookAheadSmoothing || 0.05; // Slower smoothing for look-ahead
    this.currentLookAhead = 0; // Current look-ahead offset
    
    this.verticalOffset = options.verticalOffset || -100; // Negative = player is lower, more upward view
    this.verticalOffsetSmoothing = options.verticalOffsetSmoothing || 0.08;
    this.currentVerticalOffset = 0;
    
    // Track player velocity for look-ahead and speed-based features
    this.lastTargetX = 0;
    this.lastTargetY = 0;
    this.targetVelocityX = 0;
    this.targetVelocityY = 0;
    
    // Screen shake
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.shakeTime = 0;
    this.shakeOffset = { x: 0, y: 0 };
    
    // Container to move (usually the game world container)
    this.worldContainer = null;
    
    // Viewport dimensions
    this.viewportWidth = app?.screen?.width || 800;
    this.viewportHeight = app?.screen?.height || 600;
    
    // Mode (edit or play) - bounds only apply in play mode
    this.mode = 'edit';
  }

  /**
   * Set the world container that the camera will move
   */
  setWorldContainer(container) {
    this.worldContainer = container;
  }

  /**
   * Update viewport size (call on window resize)
   */
  updateViewport(width, height) {
    this.viewportWidth = width;
    this.viewportHeight = height;
  }

  /**
   * Set camera bounds
   */
  setBounds(minX, maxX, minY, maxY) {
    this.bounds = { minX, maxX, minY, maxY };
  }

  /**
   * Center camera on a position
   */
  centerOn(x, y, instant = false) {
    this.targetX = x - this.viewportWidth / 2 / this.zoom;
    this.targetY = y - this.viewportHeight / 2 / this.zoom;
    
    if (instant) {
      this.x = this.targetX;
      this.y = this.targetY;
    }
  }

  /**
   * Follow a target (sprite or object with x, y)
   * Enhanced with look-ahead and vertical offset for 2D platformers
   */
  follow(target, instant = false) {
    if (!target || !this.followEnabled) return;
    
    const targetX = target.x || 0;
    const targetY = target.y || 0;
    
    // Calculate target velocity (for look-ahead)
    const deltaTime = 16.67; // Assume ~60fps
    this.targetVelocityX = (targetX - this.lastTargetX) / deltaTime * 1000;
    this.targetVelocityY = (targetY - this.lastTargetY) / deltaTime * 1000;
    this.lastTargetX = targetX;
    this.lastTargetY = targetY;
    
    // Calculate look-ahead offset based on movement direction
    let lookAheadTarget = 0;
    if (this.lookAhead && Math.abs(this.targetVelocityX) > 50) { // Only look ahead if moving fast enough
      // Look in direction of movement
      const direction = Math.sign(this.targetVelocityX);
      lookAheadTarget = direction * this.lookAheadDistance;
    }
    
    // Smoothly interpolate look-ahead offset
    this.currentLookAhead += (lookAheadTarget - this.currentLookAhead) * this.lookAheadSmoothing;
    
    // Calculate vertical offset target (player lower on screen for upward visibility)
    let verticalOffsetTarget = this.verticalOffset;
    
    // Smoothly interpolate vertical offset
    this.currentVerticalOffset += (verticalOffsetTarget - this.currentVerticalOffset) * this.verticalOffsetSmoothing;
    
    // Calculate the camera's desired position with offsets
    // Horizontal: center + look-ahead
    const desiredX = targetX - this.viewportWidth / 2 / this.zoom + this.currentLookAhead;
    
    // Vertical: center + vertical offset (negative = player lower, more view above)
    const desiredY = targetY - this.viewportHeight / 2 / this.zoom + this.currentVerticalOffset;
    
    // Apply dead zone
    const dx = desiredX - this.targetX;
    const dy = desiredY - this.targetY;
    
    if (Math.abs(dx) > this.deadZone.x) {
      this.targetX = desiredX - Math.sign(dx) * this.deadZone.x;
    }
    if (Math.abs(dy) > this.deadZone.y) {
      this.targetY = desiredY - Math.sign(dy) * this.deadZone.y;
    }
    
    if (instant) {
      this.x = this.targetX;
      this.y = this.targetY;
    }
  }

  /**
   * Pan camera by delta
   */
  pan(dx, dy) {
    this.targetX += dx / this.zoom;
    this.targetY += dy / this.zoom;
  }

  /**
   * Set zoom level
   */
  setZoom(level, instant = false) {
    this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, level));
    if (instant) {
      this.zoom = this.targetZoom;
    }
  }

  /**
   * Zoom in
   */
  zoomIn(amount = 0.25) {
    this.setZoom(this.targetZoom + amount);
  }

  /**
   * Zoom out
   */
  zoomOut(amount = 0.25) {
    this.setZoom(this.targetZoom - amount);
  }

  /**
   * Reset zoom to 1
   */
  resetZoom() {
    this.setZoom(1);
  }

  /**
   * Trigger screen shake
   */
  shake(intensity = 10, duration = 500) {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
    this.shakeTime = 0;
  }

  /**
   * Update screen shake
   */
  updateShake(deltaMs) {
    if (this.shakeDuration <= 0) {
      this.shakeOffset = { x: 0, y: 0 };
      return;
    }
    
    this.shakeTime += deltaMs;
    
    if (this.shakeTime >= this.shakeDuration) {
      this.shakeDuration = 0;
      this.shakeOffset = { x: 0, y: 0 };
      return;
    }
    
    // Decay the intensity over time
    const progress = this.shakeTime / this.shakeDuration;
    const currentIntensity = this.shakeIntensity * (1 - progress);
    
    // Random shake offset
    this.shakeOffset = {
      x: (Math.random() - 0.5) * 2 * currentIntensity,
      y: (Math.random() - 0.5) * 2 * currentIntensity
    };
  }

  /**
   * Clamp position to bounds (only in play mode)
   */
  clampToBounds() {
    // Only apply bounds in play mode - allow free panning in edit mode
    if (this.mode !== 'play') return;
    
    // Calculate the visible area at current zoom
    const viewWidth = this.viewportWidth / this.zoom;
    const viewHeight = this.viewportHeight / this.zoom;
    
    // Clamp X
    const maxCameraX = this.bounds.maxX - viewWidth;
    const minCameraX = this.bounds.minX;
    this.x = Math.max(minCameraX, Math.min(this.x, maxCameraX));
    this.targetX = Math.max(minCameraX, Math.min(this.targetX, maxCameraX));
    
    // Clamp Y
    const maxCameraY = this.bounds.maxY - viewHeight;
    const minCameraY = this.bounds.minY;
    this.y = Math.max(minCameraY, Math.min(this.y, maxCameraY));
    this.targetY = Math.max(minCameraY, Math.min(this.targetY, maxCameraY));
  }

  /**
   * Update camera (call every frame)
   * @param {number} delta - Delta time in ms
   */
  update(delta = 16.67) {
    // Smooth camera position
    this.x += (this.targetX - this.x) * this.smoothing;
    this.y += (this.targetY - this.y) * this.smoothing;
    
    // Smooth zoom
    this.zoom += (this.targetZoom - this.zoom) * this.zoomSmoothing;
    
    // Clamp to bounds
    this.clampToBounds();
    
    // Update shake
    this.updateShake(delta);
    
    // Apply to world container
    if (this.worldContainer) {
      this.worldContainer.x = -this.x * this.zoom + this.shakeOffset.x;
      this.worldContainer.y = -this.y * this.zoom + this.shakeOffset.y;
      this.worldContainer.scale.set(this.zoom);
    }
  }

  /**
   * Convert screen coordinates to world coordinates
   */
  screenToWorld(screenX, screenY) {
    return {
      x: screenX / this.zoom + this.x,
      y: screenY / this.zoom + this.y
    };
  }

  /**
   * Convert world coordinates to screen coordinates
   */
  worldToScreen(worldX, worldY) {
    return {
      x: (worldX - this.x) * this.zoom,
      y: (worldY - this.y) * this.zoom
    };
  }

  /**
   * Set mode (edit or play)
   */
  setMode(mode) {
    this.mode = mode;
  }

  /**
   * Get current camera state
   */
  getState() {
    return {
      x: this.x,
      y: this.y,
      zoom: this.zoom,
      viewportWidth: this.viewportWidth,
      viewportHeight: this.viewportHeight
    };
  }

  /**
   * Set camera state (for saving/loading)
   */
  setState(state) {
    if (state.x !== undefined) this.x = this.targetX = state.x;
    if (state.y !== undefined) this.y = this.targetY = state.y;
    if (state.zoom !== undefined) this.zoom = this.targetZoom = state.zoom;
  }

  /**
   * Destroy the camera system
   */
  destroy() {
    this.worldContainer = null;
    this.app = null;
  }
}

/**
 * React hook for camera system
 */
export const useCameraSystem = (app, options = {}) => {
  const cameraRef = { current: null };
  
  const initCamera = () => {
    if (!app) return null;
    cameraRef.current = new CameraSystem(app, options);
    return cameraRef.current;
  };
  
  const getCamera = () => cameraRef.current;
  
  const destroyCamera = () => {
    if (cameraRef.current) {
      cameraRef.current.destroy();
      cameraRef.current = null;
    }
  };
  
  return {
    initCamera,
    getCamera,
    destroyCamera,
    cameraRef
  };
};

export default CameraSystem;
