// lib/behaviors/DraggableBehavior.js
// Mouse drag with optional grid snapping

import Behavior from './Behavior';

/**
 * DraggableBehavior allows an object to be dragged with the mouse.
 * Optionally snaps to grid when released.
 */
class DraggableBehavior extends Behavior {
  static get id() {
    return 'draggable';
  }

  static get configSchema() {
    return [
      { key: 'snapToGrid', label: 'Snap to Grid', type: 'boolean', default: false },
      { key: 'gridSize', label: 'Grid Size', type: 'number', default: 32, min: 8, max: 128, step: 8 }
    ];
  }

  constructor(object, config = {}) {
    super(object, config);
    
    // Apply defaults from schema
    const defaults = {};
    DraggableBehavior.configSchema.forEach(field => {
      defaults[field.key] = field.default;
    });
    this.config = { ...defaults, ...config };

    // Drag state
    this.isDragging = false;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    this.wasMouseDown = false;
  }

  update(deltaTime, keys, gameState) {
    if (!this.enabled) return;

    // Get mouse state from game state
    const mouse = gameState?.mouse;
    if (!mouse) return;

    const { x: mouseX, y: mouseY, down: mouseDown } = mouse;

    // Get object bounds
    const objWidth = this.object.width ?? 32;
    const objHeight = this.object.height ?? 32;
    const objLeft = this.object.x;
    const objRight = this.object.x + objWidth;
    const objTop = this.object.y;
    const objBottom = this.object.y + objHeight;

    // Check if mouse is over this object
    const mouseOver = (
      mouseX >= objLeft &&
      mouseX <= objRight &&
      mouseY >= objTop &&
      mouseY <= objBottom
    );

    // Handle mouse down - start drag
    if (mouseDown && !this.wasMouseDown && mouseOver) {
      this.isDragging = true;
      this.dragOffsetX = mouseX - this.object.x;
      this.dragOffsetY = mouseY - this.object.y;
    }

    // Handle mouse up - end drag
    if (!mouseDown && this.wasMouseDown && this.isDragging) {
      this.isDragging = false;

      // Snap to grid if enabled
      if (this.config.snapToGrid) {
        const gridSize = this.config.gridSize || gameState?.gridSize || 32;
        this.object.x = Math.round(this.object.x / gridSize) * gridSize;
        this.object.y = Math.round(this.object.y / gridSize) * gridSize;
      }
    }

    // Update position while dragging
    if (this.isDragging) {
      this.object.x = mouseX - this.dragOffsetX;
      this.object.y = mouseY - this.dragOffsetY;
    }

    // Remember mouse state for next frame
    this.wasMouseDown = mouseDown;

    // Expose drag state to object for visual feedback
    this.object.isDragging = this.isDragging;
  }

  /**
   * Force end of drag (e.g., when behavior is disabled).
   */
  endDrag() {
    this.isDragging = false;
  }

  destroy() {
    this.endDrag();
  }
}

export default DraggableBehavior;
