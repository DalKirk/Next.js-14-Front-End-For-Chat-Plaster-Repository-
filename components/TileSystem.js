/**
 * Tile-Based Platform System
 * 
 * Provides efficient level building with:
 * - Grid-based tile placement
 * - Multiple tileset support
 * - Optimized rendering (only draws visible tiles)
 * - Flood fill tool
 * - Auto-tiling system
 * - Import/Export functionality
 */

class TileSystem {
  constructor(tileSize = 40) {
    this.tileSize = tileSize;
    this.tiles = new Map(); // key: "x,y", value: tile object
    this.tilesets = new Map();
  }
  
  /**
   * Load a tileset image
   * @param {string} name - Tileset identifier
   * @param {string} imageSrc - Path to tileset image
   * @param {number} tileWidth - Width of each tile in pixels
   * @param {number} tileHeight - Height of each tile in pixels
   */
  loadTileset(name, imageSrc, tileWidth, tileHeight) {
    const tileset = {
      name,
      image: new Image(),
      tileWidth,
      tileHeight,
      tiles: []
    };
    
    tileset.image.src = imageSrc;
    tileset.image.onload = () => {
      // Calculate tile count
      const cols = Math.floor(tileset.image.width / tileWidth);
      const rows = Math.floor(tileset.image.height / tileHeight);
      
      // Create tile definitions
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          tileset.tiles.push({
            id: row * cols + col,
            col,
            row,
            collision: false, // Can be set per tile
            properties: {}
          });
        }
      }
      
      console.log(`Tileset "${name}" loaded: ${cols}x${rows} = ${tileset.tiles.length} tiles`);
    };
    
    tileset.image.onerror = () => {
      console.error(`Failed to load tileset: ${imageSrc}`);
    };
    
    this.tilesets.set(name, tileset);
  }
  
  /**
   * Place tile at grid position
   * @param {number} x - Grid X coordinate
   * @param {number} y - Grid Y coordinate
   * @param {string} tilesetName - Name of tileset to use
   * @param {number} tileId - ID of tile in tileset
   */
  setTile(x, y, tilesetName, tileId) {
    const key = `${x},${y}`;
    this.tiles.set(key, {
      x,
      y,
      tilesetName,
      tileId
    });
  }
  
  /**
   * Get tile at grid position
   * @param {number} x - Grid X coordinate
   * @param {number} y - Grid Y coordinate
   * @returns {Object|undefined} Tile object or undefined
   */
  getTile(x, y) {
    return this.tiles.get(`${x},${y}`);
  }
  
  /**
   * Remove tile at position
   * @param {number} x - Grid X coordinate
   * @param {number} y - Grid Y coordinate
   */
  removeTile(x, y) {
    this.tiles.delete(`${x},${y}`);
  }
  
  /**
   * Convert world coordinates to grid coordinates
   * @param {number} worldX - World X coordinate
   * @param {number} worldY - World Y coordinate
   * @returns {Object} Grid coordinates {x, y}
   */
  worldToGrid(worldX, worldY) {
    return {
      x: Math.floor(worldX / this.tileSize),
      y: Math.floor(worldY / this.tileSize)
    };
  }
  
  /**
   * Convert grid coordinates to world coordinates
   * @param {number} gridX - Grid X coordinate
   * @param {number} gridY - Grid Y coordinate
   * @returns {Object} World coordinates {x, y}
   */
  gridToWorld(gridX, gridY) {
    return {
      x: gridX * this.tileSize,
      y: gridY * this.tileSize
    };
  }
  
  /**
   * Draw all visible tiles
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} cameraX - Camera X position
   * @param {number} cameraY - Camera Y position
   * @param {number} viewWidth - Viewport width
   * @param {number} viewHeight - Viewport height
   */
  draw(ctx, cameraX, cameraY, viewWidth, viewHeight) {
    // Calculate visible tile range
    const startCol = Math.floor(cameraX / this.tileSize);
    const endCol = Math.ceil((cameraX + viewWidth) / this.tileSize);
    const startRow = Math.floor(cameraY / this.tileSize);
    const endRow = Math.ceil((cameraY + viewHeight) / this.tileSize);
    
    // Only draw visible tiles
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const tile = this.getTile(col, row);
        if (!tile) continue;
        
        const tileset = this.tilesets.get(tile.tilesetName);
        if (!tileset || !tileset.image.complete) continue;
        
        const tileInfo = tileset.tiles[tile.tileId];
        if (!tileInfo) continue;
        
        // Draw tile
        ctx.drawImage(
          tileset.image,
          tileInfo.col * tileset.tileWidth,
          tileInfo.row * tileset.tileHeight,
          tileset.tileWidth,
          tileset.tileHeight,
          col * this.tileSize - cameraX,
          row * this.tileSize - cameraY,
          this.tileSize,
          this.tileSize
        );
      }
    }
  }
  
  /**
   * Flood fill tool - fills connected tiles
   * @param {number} startX - Starting grid X
   * @param {number} startY - Starting grid Y
   * @param {string} tilesetName - Tileset to use
   * @param {number} tileId - Tile ID to place
   * @param {number} maxTiles - Maximum tiles to fill (prevents infinite loops)
   */
  floodFill(startX, startY, tilesetName, tileId, maxTiles = 1000) {
    const startTile = this.getTile(startX, startY);
    const targetTilesetName = startTile ? startTile.tilesetName : null;
    const targetTileId = startTile ? startTile.tileId : null;
    
    // Don't fill if same tile
    if (targetTilesetName === tilesetName && targetTileId === tileId) return;
    
    const stack = [[startX, startY]];
    const visited = new Set();
    let fillCount = 0;
    
    while (stack.length > 0 && fillCount < maxTiles) {
      const [x, y] = stack.pop();
      const key = `${x},${y}`;
      
      if (visited.has(key)) continue;
      visited.add(key);
      
      const currentTile = this.getTile(x, y);
      const currentTilesetName = currentTile ? currentTile.tilesetName : null;
      const currentTileId = currentTile ? currentTile.tileId : null;
      
      // Only fill if matches target
      if (currentTilesetName !== targetTilesetName || currentTileId !== targetTileId) continue;
      
      this.setTile(x, y, tilesetName, tileId);
      fillCount++;
      
      // Add neighbors
      stack.push([x + 1, y]);
      stack.push([x - 1, y]);
      stack.push([x, y + 1]);
      stack.push([x, y - 1]);
    }
    
    console.log(`Flood filled ${fillCount} tiles`);
  }
  
  /**
   * Auto-tile: Automatically select tile based on neighbors
   * @param {number} x - Grid X coordinate
   * @param {number} y - Grid Y coordinate
   * @param {string} tilesetName - Tileset to use
   */
  autoTile(x, y, tilesetName) {
    // Check all 8 neighbors
    const neighbors = {
      n: this.getTile(x, y - 1),
      ne: this.getTile(x + 1, y - 1),
      e: this.getTile(x + 1, y),
      se: this.getTile(x + 1, y + 1),
      s: this.getTile(x, y + 1),
      sw: this.getTile(x - 1, y + 1),
      w: this.getTile(x - 1, y),
      nw: this.getTile(x - 1, y - 1)
    };
    
    // Count matching neighbors (same tileset)
    const hasN = neighbors.n && neighbors.n.tilesetName === tilesetName;
    const hasE = neighbors.e && neighbors.e.tilesetName === tilesetName;
    const hasS = neighbors.s && neighbors.s.tilesetName === tilesetName;
    const hasW = neighbors.w && neighbors.w.tilesetName === tilesetName;
    
    // Determine tile variant based on neighbors
    // Using a 47-tile blob tileset pattern
    let tileId = 0;
    
    if (!hasN && !hasE && !hasS && !hasW) {
      tileId = 0; // Isolated
    } else if (hasN && hasE && hasS && hasW) {
      tileId = 4; // Center/full
    } else if (!hasN && hasE && hasS && hasW) {
      tileId = 1; // Top edge
    } else if (hasN && !hasE && hasS && hasW) {
      tileId = 5; // Right edge
    } else if (hasN && hasE && !hasS && hasW) {
      tileId = 9; // Bottom edge
    } else if (hasN && hasE && hasS && !hasW) {
      tileId = 3; // Left edge
    } else if (!hasN && !hasE && hasS && hasW) {
      tileId = 2; // Top-right corner (outer)
    } else if (!hasN && hasE && !hasS && hasW) {
      tileId = 8; // Top-bottom
    } else if (!hasN && hasE && hasS && !hasW) {
      tileId = 0; // Top-left corner (outer)
    } else if (hasN && !hasE && !hasS && hasW) {
      tileId = 10; // Bottom-right corner (outer)
    } else if (hasN && hasE && !hasS && !hasW) {
      tileId = 6; // Bottom-left corner (outer)
    } else if (hasN && !hasE && hasS && !hasW) {
      tileId = 7; // Left-right
    }
    
    this.setTile(x, y, tilesetName, tileId);
  }
  
  /**
   * Fill rectangle with tiles
   * @param {number} x1 - Start grid X
   * @param {number} y1 - Start grid Y
   * @param {number} x2 - End grid X
   * @param {number} y2 - End grid Y
   * @param {string} tilesetName - Tileset to use
   * @param {number} tileId - Tile ID
   */
  fillRect(x1, y1, x2, y2, tilesetName, tileId) {
    const startX = Math.min(x1, x2);
    const endX = Math.max(x1, x2);
    const startY = Math.min(y1, y2);
    const endY = Math.max(y1, y2);
    
    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        this.setTile(x, y, tilesetName, tileId);
      }
    }
  }
  
  /**
   * Clear rectangle of tiles
   * @param {number} x1 - Start grid X
   * @param {number} y1 - Start grid Y
   * @param {number} x2 - End grid X
   * @param {number} y2 - End grid Y
   */
  clearRect(x1, y1, x2, y2) {
    const startX = Math.min(x1, x2);
    const endX = Math.max(x1, x2);
    const startY = Math.min(y1, y2);
    const endY = Math.max(y1, y2);
    
    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        this.removeTile(x, y);
      }
    }
  }
  
  /**
   * Get all tiles in a rectangle
   * @param {number} x1 - Start grid X
   * @param {number} y1 - Start grid Y
   * @param {number} x2 - End grid X
   * @param {number} y2 - End grid Y
   * @returns {Array} Array of tiles
   */
  getTilesInRect(x1, y1, x2, y2) {
    const tiles = [];
    const startX = Math.min(x1, x2);
    const endX = Math.max(x1, x2);
    const startY = Math.min(y1, y2);
    const endY = Math.max(y1, y2);
    
    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        const tile = this.getTile(x, y);
        if (tile) tiles.push(tile);
      }
    }
    
    return tiles;
  }
  
  /**
   * Export tile map to JSON
   * @returns {Object} Serialized tile map
   */
  export() {
    return {
      tileSize: this.tileSize,
      tiles: Array.from(this.tiles.values()),
      tilesetNames: Array.from(this.tilesets.keys())
    };
  }
  
  /**
   * Import tile map from JSON
   * @param {Object} data - Serialized tile map
   */
  import(data) {
    this.tileSize = data.tileSize;
    this.tiles.clear();
    
    data.tiles.forEach(tile => {
      this.setTile(tile.x, tile.y, tile.tilesetName, tile.tileId);
    });
    
    console.log(`Imported ${data.tiles.length} tiles`);
  }
  
  /**
   * Clear all tiles
   */
  clear() {
    this.tiles.clear();
  }
  
  /**
   * Get total tile count
   * @returns {number} Number of placed tiles
   */
  getTileCount() {
    return this.tiles.size;
  }
  
  /**
   * Get bounds of all placed tiles
   * @returns {Object|null} Bounds {minX, minY, maxX, maxY} or null if empty
   */
  getBounds() {
    if (this.tiles.size === 0) return null;
    
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    for (const tile of this.tiles.values()) {
      minX = Math.min(minX, tile.x);
      minY = Math.min(minY, tile.y);
      maxX = Math.max(maxX, tile.x);
      maxY = Math.max(maxY, tile.y);
    }
    
    return { minX, minY, maxX, maxY };
  }
}

export default TileSystem;
