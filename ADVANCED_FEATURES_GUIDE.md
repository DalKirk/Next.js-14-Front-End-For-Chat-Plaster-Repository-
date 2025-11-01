# Advanced Game Builder Features

This document describes the three advanced features added to the Berry Game Builder:
1. **Sprite Editor** - Customize sprite animations
2. **Tile System** - Efficient tile-based level building  
3. **Tile Palette** - Visual tile selection interface

---

## 1. Sprite Editor

The Sprite Editor allows users to create custom animations from sprite sheets.

### Features

- **Frame Extraction**: Automatically splits sprite sheets into individual frames
- **Animation Preview**: Real-time preview with play/pause controls
- **Frame Selection**: Click frames to select/deselect for animations
- **Speed Control**: Adjust animation speed (50-500ms per frame)
- **Batch Selection**: Select all or clear selection with one click
- **Visual Feedback**: Selected frames highlighted in blue, current frame in yellow

### Usage

```jsx
import SpriteEditor from '@/components/SpriteEditor';

function MyComponent() {
  const sprite = {
    src: '/assets/sprites/character.png',
    frameWidth: 32,
    frameHeight: 32
  };
  
  function handleSave(animation) {
    console.log('Created animation:', animation);
    // animation = {
    //   name: 'walk',
    //   frames: [0, 1, 2, 3],
    //   speed: 100,
    //   loop: true
    // }
  }
  
  return (
    <SpriteEditor 
      sprite={sprite}
      onSave={handleSave}
      onClose={() => console.log('closed')}
    />
  );
}
```

### Workflow

1. **Load Sprite**: Pass sprite object with src, frameWidth, frameHeight
2. **Preview**: Use play/pause and frame navigation controls
3. **Select Frames**: Click frames in timeline to select them
4. **Adjust Speed**: Use slider to set animation timing
5. **Create**: Click "Create Animation" and enter a name
6. **Save**: Animation definition is passed to onSave callback

### Tips

- Hold Shift while clicking to select range of frames (future enhancement)
- Use "Select All" for full animation loops
- Test different speeds to find the perfect timing
- Pixelated rendering preserves crisp pixel art

---

## 2. Tile System

The Tile System provides efficient grid-based level building with multiple tileset support.

### Features

- **Grid-Based Placement**: Tiles snap to grid automatically
- **Multiple Tilesets**: Load and use multiple tileset images
- **Optimized Rendering**: Only draws visible tiles (culling)
- **Flood Fill**: Fill connected areas with one click
- **Auto-Tiling**: Intelligently connects tiles based on neighbors
- **Rectangle Tools**: Fill or clear rectangular areas
- **Import/Export**: Save and load tile maps as JSON

### Basic Usage

```javascript
import TileSystem from '@/components/TileSystem';

// Create tile system with 40px tiles
const tileSystem = new TileSystem(40);

// Load tilesets
tileSystem.loadTileset('terrain', '/assets/tilesets/terrain.png', 16, 16);
tileSystem.loadTileset('objects', '/assets/tilesets/objects.png', 16, 16);

// Place tiles
tileSystem.setTile(0, 0, 'terrain', 5);  // Place tile ID 5 at (0,0)
tileSystem.setTile(1, 0, 'terrain', 6);  // Place tile ID 6 at (1,0)

// Draw in game loop
function draw(ctx, camera) {
  tileSystem.draw(ctx, camera.x, camera.y, canvas.width, canvas.height);
}
```

### Advanced Features

#### Coordinate Conversion

```javascript
// World to grid
const grid = tileSystem.worldToGrid(320, 240);
console.log(grid);  // { x: 8, y: 6 }

// Grid to world
const world = tileSystem.gridToWorld(8, 6);
console.log(world);  // { x: 320, y: 240 }
```

#### Flood Fill

```javascript
// Fill connected area with tile ID 3 from tileset 'terrain'
tileSystem.floodFill(5, 5, 'terrain', 3);
```

#### Auto-Tiling

```javascript
// Automatically select correct tile variant based on neighbors
tileSystem.autoTile(10, 10, 'terrain');
```

#### Rectangle Tools

```javascript
// Fill rectangle
tileSystem.fillRect(0, 0, 10, 5, 'terrain', 1);

// Clear rectangle
tileSystem.clearRect(0, 0, 10, 5);

// Get tiles in rectangle
const tiles = tileSystem.getTilesInRect(0, 0, 10, 5);
```

#### Import/Export

```javascript
// Export to JSON
const mapData = tileSystem.export();
localStorage.setItem('levelMap', JSON.stringify(mapData));

// Import from JSON
const mapData = JSON.parse(localStorage.getItem('levelMap'));
tileSystem.import(mapData);
```

### API Reference

#### Constructor
- `new TileSystem(tileSize)` - Create tile system with specified grid size

#### Tileset Methods
- `loadTileset(name, imageSrc, tileWidth, tileHeight)` - Load a tileset image
- `tilesets` - Map of loaded tilesets

#### Tile Manipulation
- `setTile(x, y, tilesetName, tileId)` - Place tile at grid position
- `getTile(x, y)` - Get tile at grid position
- `removeTile(x, y)` - Remove tile at grid position
- `clear()` - Remove all tiles

#### Coordinate Conversion
- `worldToGrid(worldX, worldY)` - Convert world coords to grid coords
- `gridToWorld(gridX, gridY)` - Convert grid coords to world coords

#### Drawing
- `draw(ctx, cameraX, cameraY, viewWidth, viewHeight)` - Draw visible tiles

#### Tools
- `floodFill(startX, startY, tilesetName, tileId, maxTiles)` - Flood fill tool
- `autoTile(x, y, tilesetName, rules)` - Auto-tile based on neighbors
- `fillRect(x1, y1, x2, y2, tilesetName, tileId)` - Fill rectangle with tiles
- `clearRect(x1, y1, x2, y2)` - Clear rectangle of tiles

#### Queries
- `getTilesInRect(x1, y1, x2, y2)` - Get all tiles in rectangle
- `getTileCount()` - Get total number of placed tiles
- `getBounds()` - Get bounds of all placed tiles

#### Serialization
- `export()` - Export tile map to JSON
- `import(data)` - Import tile map from JSON

---

## 3. Tile Palette

The Tile Palette provides a visual interface for selecting tiles from loaded tilesets.

### Features

- **Visual Tileset Browser**: See all tiles in a grid
- **Click to Select**: Click any tile to select it
- **Multiple Tilesets**: Switch between different tilesets
- **Selection Highlight**: Selected tile highlighted in blue
- **Scrollable**: Handles large tilesets with scroll

### Usage

```jsx
import TilePalette from '@/components/TilePalette';
import TileSystem from '@/components/TileSystem';

function MyComponent() {
  const tileSystem = new TileSystem(40);
  
  // Load some tilesets
  tileSystem.loadTileset('terrain', '/assets/tilesets/terrain.png', 16, 16);
  
  function handleTileSelect(tilesetName, tileId) {
    console.log('Selected:', tilesetName, tileId);
    // Use this for placing tiles
  }
  
  return (
    <TilePalette
      tileSystem={tileSystem}
      onTileSelect={handleTileSelect}
      onClose={() => console.log('closed')}
    />
  );
}
```

---

## Integration Example

Here's how to integrate all three systems into GameBuilder:

```jsx
import { useState, useRef } from 'react';
import TileSystem from '@/components/TileSystem';
import TilePalette from '@/components/TilePalette';
import SpriteEditor from '@/components/SpriteEditor';

function GameBuilder() {
  const [showTilePalette, setShowTilePalette] = useState(false);
  const [showSpriteEditor, setShowSpriteEditor] = useState(false);
  const [selectedTileset, setSelectedTileset] = useState(null);
  const [selectedTileId, setSelectedTileId] = useState(0);
  
  const tileSystemRef = useRef(new TileSystem(40));
  
  // Initialize tilesets
  useEffect(() => {
    const ts = tileSystemRef.current;
    ts.loadTileset('terrain', '/assets/tilesets/terrain.png', 16, 16);
    ts.loadTileset('objects', '/assets/tilesets/objects.png', 16, 16);
  }, []);
  
  // Handle canvas click for tile placement
  function handleCanvasClick(e) {
    if (!selectedTileset) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const worldX = e.clientX - rect.left + cameraX;
    const worldY = e.clientY - rect.top + cameraY;
    
    const { x, y } = tileSystemRef.current.worldToGrid(worldX, worldY);
    tileSystemRef.current.setTile(x, y, selectedTileset, selectedTileId);
  }
  
  // Draw game
  function draw(ctx) {
    // Draw tiles
    tileSystemRef.current.draw(
      ctx,
      cameraX,
      cameraY,
      ctx.canvas.width,
      ctx.canvas.height
    );
    
    // Draw other game objects...
  }
  
  return (
    <div>
      {/* Toolbar */}
      <div className="toolbar">
        <button onClick={() => setShowTilePalette(true)}>
          🎨 Tiles
        </button>
        <button onClick={() => setShowSpriteEditor(true)}>
          ✨ Sprites
        </button>
      </div>
      
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        width={800}
        height={600}
      />
      
      {/* Tile Palette Modal */}
      {showTilePalette && (
        <div className="modal">
          <TilePalette
            tileSystem={tileSystemRef.current}
            onTileSelect={(tileset, tileId) => {
              setSelectedTileset(tileset);
              setSelectedTileId(tileId);
            }}
            onClose={() => setShowTilePalette(false)}
          />
        </div>
      )}
      
      {/* Sprite Editor Modal */}
      {showSpriteEditor && (
        <div className="modal">
          <SpriteEditor
            sprite={currentSprite}
            onSave={(animation) => {
              console.log('Animation created:', animation);
            }}
            onClose={() => setShowSpriteEditor(false)}
          />
        </div>
      )}
    </div>
  );
}
```

---

## Performance Tips

### Tile System

1. **Culling**: The system only draws visible tiles - no action needed
2. **Tileset Size**: Keep tilesets reasonably sized (< 2048x2048)
3. **Tile Count**: System can handle 10,000+ tiles efficiently
4. **Flood Fill**: Use maxTiles parameter to prevent lag on huge fills

### Sprite Editor

1. **Frame Count**: Works well with 4-32 frames per animation
2. **Canvas Size**: Keep sprite dimensions reasonable (16x16 to 128x128)
3. **Memory**: Frames are stored as Data URLs - avoid loading too many sprites at once

---

## Future Enhancements

### Planned Features

1. **Sprite Editor**
   - Range selection with Shift+Click
   - Frame duplication and reordering
   - Onion skinning
   - Export as sprite sheet

2. **Tile System**
   - Collision layer editing
   - Tile rotation and flipping
   - Custom auto-tile rules editor
   - Layer system (background, foreground, collision)

3. **Tile Palette**
   - Tile search and filter
   - Recently used tiles
   - Custom tile collections
   - Thumbnail size adjustment

---

## Troubleshooting

### Tiles Not Showing

1. Check tileset loaded: `tileSystem.tilesets.has('terrain')`
2. Verify tile placement: `tileSystem.getTile(0, 0)`
3. Check camera position matches world coords
4. Ensure canvas context is valid

### Sprite Editor Issues

1. Check sprite sheet loads: Listen for image onload
2. Verify frameWidth/frameHeight correct
3. Check console for errors
4. Ensure sprite sheet is horizontal strip

### Performance Issues

1. Use tile culling (automatic)
2. Limit flood fill with maxTiles
3. Reduce tileset resolution if needed
4. Profile with browser dev tools

---

## Examples

### Create Platform Level

```javascript
const ts = new TileSystem(40);
ts.loadTileset('terrain', '/assets/terrain.png', 16, 16);

// Create ground platform
for (let x = 0; x < 20; x++) {
  ts.setTile(x, 10, 'terrain', 1);
}

// Create floating platform
for (let x = 5; x < 10; x++) {
  ts.setTile(x, 7, 'terrain', 1);
}
```

### Export Level

```javascript
const levelData = {
  name: 'Level 1',
  tiles: tileSystem.export(),
  entities: gameObjects.map(obj => ({
    type: obj.type,
    x: obj.x,
    y: obj.y
  }))
};

localStorage.setItem('level1', JSON.stringify(levelData));
```

### Load Level

```javascript
const levelData = JSON.parse(localStorage.getItem('level1'));
tileSystem.import(levelData.tiles);

levelData.entities.forEach(entity => {
  createGameObject(entity.type, entity.x, entity.y);
});
```

---

## Credits

- **Sprite Editor**: Frame-based animation system with visual timeline
- **Tile System**: Efficient grid-based level building with culling
- **Tile Palette**: Visual tileset browser and selector

All systems are designed to work together seamlessly in the Berry Game Builder.
