// @ts-nocheck
/**
 * Brush Tool System
 * 
 * Provides advanced painting tools for tile-based level creation:
 * - Variable brush sizes (1-10 tiles)
 * - Multiple shapes (square, circle, line)
 * - Different modes (paint, erase, fill, eyedropper)
 * - Pattern support
 * - Visual preview
 * - Bresenham line algorithm for smooth lines
 */

export default class BrushTool {
  constructor() {
    this.size = 1;
    this.shape = 'square';
    this.mode = 'paint';
    this.pattern = null;
    this.lastPosition = null;
  }
  
  /**
   * Get all tiles affected by brush at position
   * @param {number} centerX - Grid X coordinate
   * @param {number} centerY - Grid Y coordinate
   * @returns {Array} Array of {x, y} tile positions
   */
  getAffectedTiles(centerX, centerY) {
    const tiles = [];
    const radius = Math.floor(this.size / 2);
    
    switch(this.shape) {
      case 'square':
        // Square brush - all tiles in rectangle
        for (let y = -radius; y <= radius; y++) {
          for (let x = -radius; x <= radius; x++) {
            tiles.push({ x: centerX + x, y: centerY + y });
          }
        }
        break;
        
      case 'circle':
        // Circular brush - tiles within radius
        for (let y = -radius; y <= radius; y++) {
          for (let x = -radius; x <= radius; x++) {
            if (x * x + y * y <= radius * radius) {
              tiles.push({ x: centerX + x, y: centerY + y });
            }
          }
        }
        break;
        
      case 'line':
        // Line from last position to current
        if (this.lastPosition) {
          const lineTiles = this.bresenhamLine(
            this.lastPosition.x,
            this.lastPosition.y,
            centerX,
            centerY
          );
          this.lastPosition = { x: centerX, y: centerY };
          return lineTiles;
        }
        tiles.push({ x: centerX, y: centerY });
        break;
    }
    
    this.lastPosition = { x: centerX, y: centerY };
    return tiles;
  }
  
  /**
   * Bresenham line algorithm for smooth line drawing
   * @param {number} x0 - Start X
   * @param {number} y0 - Start Y
   * @param {number} x1 - End X
   * @param {number} y1 - End Y
   * @returns {Array} Array of {x, y} positions along line
   */
  bresenhamLine(x0, y0, x1, y1) {
    const tiles = [];
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    
    while (true) {
      tiles.push({ x: x0, y: y0 });
      
      if (x0 === x1 && y0 === y1) break;
      
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
    
    return tiles;
  }
  
  /**
   * Apply brush to tile system
   * @param {TileSystem} tileSystem - Tile system to modify
   * @param {number} x - Grid X coordinate
   * @param {number} y - Grid Y coordinate
   * @param {string} tilesetName - Tileset name
   * @param {number} tileId - Tile ID
   * @returns {Object|null} Picked tile for eyedropper mode
   */
  apply(tileSystem, x, y, tilesetName, tileId) {
    const affected = this.getAffectedTiles(x, y);
    
    affected.forEach(tile => {
      switch(this.mode) {
        case 'paint':
          tileSystem.setTile(tile.x, tile.y, tilesetName, tileId);
          break;
          
        case 'erase':
          tileSystem.removeTile(tile.x, tile.y);
          break;
          
        case 'fill':
          // Only flood fill once (on first tile)
          if (tile === affected[0]) {
            tileSystem.floodFill(tile.x, tile.y, tilesetName, tileId, 500);
          }
          break;
          
        case 'eyedropper':
          // Pick tile from first position
          if (tile === affected[0]) {
            const pickedTile = tileSystem.getTile(tile.x, tile.y);
            return pickedTile; // Return for selection
          }
          break;
      }
    });
    
    return null;
  }
  
  /**
   * Draw brush preview on canvas
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} x - Grid X coordinate
   * @param {number} y - Grid Y coordinate
   * @param {number} tileSize - Size of tiles in pixels
   * @param {number} cameraX - Camera X offset
   * @param {number} cameraY - Camera Y offset
   */
  drawPreview(ctx, x, y, tileSize, cameraX, cameraY) {
    const affected = this.getAffectedTiles(x, y);
    
    ctx.save();
    
    // Different colors for different modes
    switch(this.mode) {
      case 'paint':
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
        ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
        break;
      case 'erase':
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
        break;
      case 'fill':
        ctx.strokeStyle = 'rgba(0, 150, 255, 0.8)';
        ctx.fillStyle = 'rgba(0, 150, 255, 0.1)';
        break;
      case 'eyedropper':
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
        ctx.fillStyle = 'rgba(255, 255, 0, 0.1)';
        break;
    }
    
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    
    affected.forEach(tile => {
      const screenX = tile.x * tileSize - cameraX;
      const screenY = tile.y * tileSize - cameraY;
      
      ctx.fillRect(screenX, screenY, tileSize, tileSize);
      ctx.strokeRect(screenX, screenY, tileSize, tileSize);
    });
    
    ctx.restore();
  }
  
  /**
   * Reset brush state (e.g., when releasing mouse)
   */
  reset() {
    this.lastPosition = null;
  }
  
  /**
   * Set brush size
   * @param {number} size - Size in tiles (1-10)
   */
  setSize(size) {
    this.size = Math.max(1, Math.min(10, size));
  }
  
  /**
   * Set brush shape
   * @param {string} shape - 'square', 'circle', or 'line'
   */
  setShape(shape) {
    if (['square', 'circle', 'line'].includes(shape)) {
      this.shape = shape;
      this.reset();
    }
  }
  
  /**
   * Set brush mode
   * @param {string} mode - 'paint', 'erase', 'fill', or 'eyedropper'
   */
  setMode(mode) {
    if (['paint', 'erase', 'fill', 'eyedropper'].includes(mode)) {
      this.mode = mode;
      this.reset();
    }
  }
  
  /**
   * Get brush info for display
   * @returns {Object} Brush configuration
   */
  getInfo() {
    return {
      size: this.size,
      shape: this.shape,
      mode: this.mode,
      dimensions: `${this.size}x${this.size}`
    };
  }
}

export default BrushTool;
