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

interface Tile {
  x: number;
  y: number;
  tilesetName: string;
  tileId: number;
}

interface TileDefinition {
  id: number;
  col: number;
  row: number;
  collision: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  properties: Record<string, any>;
}

interface Tileset {
  name: string;
  image: HTMLImageElement;
  tileWidth: number;
  tileHeight: number;
  tiles: TileDefinition[];
}

export default class TileSystem {
  tileSize: number;
  tiles: Map<string, Tile>;
  tilesets: Map<string, Tileset>;

  constructor(tileSize: number = 40) {
    this.tileSize = tileSize;
    this.tiles = new Map();
    this.tilesets = new Map();
  }
  
  loadTileset(name: string, imageSrc: string, tileWidth: number, tileHeight: number): void {
    const tileset: Tileset = {
      name,
      image: new Image(),
      tileWidth,
      tileHeight,
      tiles: []
    };
    
    tileset.image.src = imageSrc;
    tileset.image.onload = () => {
      const cols = Math.floor(tileset.image.width / tileWidth);
      const rows = Math.floor(tileset.image.height / tileHeight);
      
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          tileset.tiles.push({
            id: row * cols + col,
            col,
            row,
            collision: false,
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
  
  setTile(x: number, y: number, tilesetName: string, tileId: number): void {
    const key = `${x},${y}`;
    this.tiles.set(key, { x, y, tilesetName, tileId });
  }
  
  getTile(x: number, y: number): Tile | undefined {
    return this.tiles.get(`${x},${y}`);
  }
  
  removeTile(x: number, y: number): void {
    this.tiles.delete(`${x},${y}`);
  }
  
  clearAll(): void {
    this.tiles.clear();
  }
  
  worldToGrid(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: Math.floor(worldX / this.tileSize),
      y: Math.floor(worldY / this.tileSize)
    };
  }
  
  gridToWorld(gridX: number, gridY: number): { x: number; y: number } {
    return {
      x: gridX * this.tileSize,
      y: gridY * this.tileSize
    };
  }
  
  draw(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, viewWidth: number, viewHeight: number): void {
    const startCol = Math.floor(cameraX / this.tileSize);
    const endCol = Math.ceil((cameraX + viewWidth) / this.tileSize);
    const startRow = Math.floor(cameraY / this.tileSize);
    const endRow = Math.ceil((cameraY + viewHeight) / this.tileSize);
    
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const tile = this.getTile(col, row);
        if (!tile) continue;
        
        const tileset = this.tilesets.get(tile.tilesetName);
        if (!tileset || !tileset.image.complete) continue;
        
        const tileInfo = tileset.tiles[tile.tileId];
        if (!tileInfo) continue;
        
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
  
  floodFill(startX: number, startY: number, tilesetName: string, tileId: number, maxTiles: number = 1000): void {
    const startTile = this.getTile(startX, startY);
    const targetTilesetName = startTile ? startTile.tilesetName : null;
    const targetTileId = startTile ? startTile.tileId : null;
    
    if (targetTilesetName === tilesetName && targetTileId === tileId) return;
    
    const stack: [number, number][] = [[startX, startY]];
    const visited = new Set<string>();
    let fillCount = 0;
    
    while (stack.length > 0 && fillCount < maxTiles) {
      const pos = stack.pop();
      if (!pos) break;
      const [x, y] = pos;
      const key = `${x},${y}`;
      
      if (visited.has(key)) continue;
      visited.add(key);
      
      const currentTile = this.getTile(x, y);
      const currentTilesetName = currentTile ? currentTile.tilesetName : null;
      const currentTileId = currentTile ? currentTile.tileId : null;
      
      if (currentTilesetName !== targetTilesetName || currentTileId !== targetTileId) continue;
      
      this.setTile(x, y, tilesetName, tileId);
      fillCount++;
      
      stack.push([x + 1, y]);
      stack.push([x - 1, y]);
      stack.push([x, y + 1]);
      stack.push([x, y - 1]);
    }
    
    console.log(`Flood filled ${fillCount} tiles`);
  }
  
  autoTile(x: number, y: number, tilesetName: string): void {
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
    
    const hasN = neighbors.n && neighbors.n.tilesetName === tilesetName;
    const hasE = neighbors.e && neighbors.e.tilesetName === tilesetName;
    const hasS = neighbors.s && neighbors.s.tilesetName === tilesetName;
    const hasW = neighbors.w && neighbors.w.tilesetName === tilesetName;
    
    let tileId = 0;
    
    if (!hasN && !hasE && !hasS && !hasW) {
      tileId = 0;
    } else if (hasN && hasE && hasS && hasW) {
      tileId = 4;
    } else if (!hasN && hasE && hasS && hasW) {
      tileId = 1;
    } else if (hasN && !hasE && hasS && hasW) {
      tileId = 5;
    } else if (hasN && hasE && !hasS && hasW) {
      tileId = 9;
    } else if (hasN && hasE && hasS && !hasW) {
      tileId = 3;
    } else if (!hasN && !hasE && hasS && hasW) {
      tileId = 2;
    } else if (!hasN && hasE && !hasS && hasW) {
      tileId = 8;
    } else if (!hasN && hasE && hasS && !hasW) {
      tileId = 0;
    } else if (hasN && !hasE && !hasS && hasW) {
      tileId = 10;
    } else if (hasN && hasE && !hasS && !hasW) {
      tileId = 6;
    } else if (hasN && !hasE && hasS && !hasW) {
      tileId = 7;
    }
    
    this.setTile(x, y, tilesetName, tileId);
  }
  
  fillRect(x1: number, y1: number, x2: number, y2: number, tilesetName: string, tileId: number): void {
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
  
  clearRect(x1: number, y1: number, x2: number, y2: number): void {
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
  
  getTilesInRect(x1: number, y1: number, x2: number, y2: number): Tile[] {
    const tiles: Tile[] = [];
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
  
  export(): { tileSize: number; tiles: Tile[]; tilesetNames: string[] } {
    return {
      tileSize: this.tileSize,
      tiles: Array.from(this.tiles.values()),
      tilesetNames: Array.from(this.tilesets.keys())
    };
  }
  
  import(data: { tileSize: number; tiles: Tile[] }): void {
    this.tileSize = data.tileSize;
    this.tiles.clear();
    
    data.tiles.forEach(tile => {
      this.setTile(tile.x, tile.y, tile.tilesetName, tile.tileId);
    });
    
    console.log(`Imported ${data.tiles.length} tiles`);
  }
  
  clear(): void {
    this.tiles.clear();
  }
  
  getTileCount(): number {
    return this.tiles.size;
  }
  
  getBounds(): { minX: number; minY: number; maxX: number; maxY: number } | null {
    if (this.tiles.size === 0) return null;
    
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    const tileArray = Array.from(this.tiles.values());
    for (const tile of tileArray) {
      minX = Math.min(minX, tile.x);
      minY = Math.min(minY, tile.y);
      maxX = Math.max(maxX, tile.x);
      maxY = Math.max(maxY, tile.y);
    }
    
    return { minX, minY, maxX, maxY };
  }
}
