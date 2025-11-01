# 🚀 Quick Reference: Advanced Features

## TileSystem Quick Reference

### Setup
```javascript
import TileSystem from '@/components/TileSystem';
const ts = new TileSystem(40); // 40px tiles
ts.loadTileset('terrain', '/assets/terrain.png', 16, 16);
```

### Basic Operations
```javascript
// Place tile
ts.setTile(5, 10, 'terrain', 3);

// Get tile
const tile = ts.getTile(5, 10);

// Remove tile
ts.removeTile(5, 10);

// Clear all
ts.clear();
```

### Coordinate Conversion
```javascript
// World → Grid
const {x, y} = ts.worldToGrid(320, 240);

// Grid → World
const {x, y} = ts.gridToWorld(8, 6);
```

### Drawing
```javascript
// In game loop
ts.draw(ctx, cameraX, cameraY, canvasWidth, canvasHeight);
```

### Tools
```javascript
// Flood fill (max 500 tiles)
ts.floodFill(5, 5, 'terrain', 3, 500);

// Auto-tile
ts.autoTile(5, 5, 'terrain');

// Fill rectangle
ts.fillRect(0, 0, 10, 10, 'terrain', 1);

// Clear rectangle
ts.clearRect(0, 0, 10, 10);
```

### Queries
```javascript
// Count tiles
const count = ts.getTileCount();

// Get bounds
const bounds = ts.getBounds(); // {minX, minY, maxX, maxY}

// Get tiles in area
const tiles = ts.getTilesInRect(0, 0, 10, 10);
```

### Save/Load
```javascript
// Export
const data = ts.export();
localStorage.setItem('map', JSON.stringify(data));

// Import
const data = JSON.parse(localStorage.getItem('map'));
ts.import(data);
```

---

## TilePalette Quick Reference

### Setup
```jsx
import TilePalette from '@/components/TilePalette';

<TilePalette
  tileSystem={tileSystem}
  onTileSelect={(tileset, tileId) => {
    console.log('Selected:', tileset, tileId);
  }}
  onClose={() => setShowPalette(false)}
/>
```

### Props
- `tileSystem`: TileSystem instance
- `onTileSelect`: (tileset, tileId) => void
- `onClose`: () => void (optional)

---

## SpriteEditor Quick Reference

### Setup
```jsx
import SpriteEditor from '@/components/SpriteEditor';

const sprite = {
  src: '/assets/character.png',
  frameWidth: 32,
  frameHeight: 32
};

<SpriteEditor
  sprite={sprite}
  onSave={(animation) => {
    console.log('Created:', animation);
    // animation = { name, frames[], speed, loop }
  }}
  onClose={() => setShowEditor(false)}
/>
```

### Props
- `sprite`: {src, frameWidth, frameHeight}
- `onSave`: (animation) => void
- `onClose`: () => void

### Controls
- **Play/Pause**: Start/stop preview
- **Prev/Next**: Navigate frames
- **Speed Slider**: 50-500ms
- **Click Frame**: Select/deselect
- **Select All**: Select all frames
- **Clear**: Deselect all
- **Create Animation**: Export selected frames

---

## Integration Checklist

### GameBuilder.jsx Changes

```javascript
// 1. Imports
import TileSystem from './TileSystem';
import TilePalette from './TilePalette';
import SpriteEditor from './SpriteEditor';

// 2. State
const [showTilePalette, setShowTilePalette] = useState(false);
const [showSpriteEditor, setShowSpriteEditor] = useState(false);
const [selectedTileset, setSelectedTileset] = useState(null);
const [selectedTileId, setSelectedTileId] = useState(0);
const [tileMode, setTileMode] = useState(false);
const tileSystemRef = useRef(new TileSystem(40));

// 3. Initialize (useEffect)
useEffect(() => {
  const ts = tileSystemRef.current;
  ts.loadTileset('terrain', placeholderImage, 16, 16);
}, []);

// 4. Click Handler
function handleCanvasClick(e) {
  if (tileMode && selectedTileset) {
    const {x, y} = tileSystemRef.current.worldToGrid(worldX, worldY);
    if (e.shiftKey) {
      tileSystemRef.current.removeTile(x, y);
    } else if (e.ctrlKey) {
      tileSystemRef.current.floodFill(x, y, selectedTileset, selectedTileId);
    } else {
      tileSystemRef.current.setTile(x, y, selectedTileset, selectedTileId);
    }
    return;
  }
  // ... normal click handling
}

// 5. Draw Function
function drawGame() {
  // ... clear, background
  
  if (tileSystemRef.current) {
    tileSystemRef.current.draw(ctx, cameraX, cameraY, width, height);
  }
  
  // ... objects, player, UI
}

// 6. Save/Load
function saveLevel() {
  return {
    tiles: tileSystemRef.current.export(),
    // ... other data
  };
}

function loadLevel(data) {
  if (data.tiles) {
    tileSystemRef.current.import(data.tiles);
  }
  // ... load other data
}

// 7. JSX
<div>
  {/* Toolbar */}
  <button onClick={() => setShowTilePalette(!showTilePalette)}>
    🧱 Tiles
  </button>
  <button onClick={() => setShowSpriteEditor(!showSpriteEditor)}>
    ✨ Sprites
  </button>
  
  {/* Modals */}
  {showTilePalette && (
    <TilePalette
      tileSystem={tileSystemRef.current}
      onTileSelect={(t, id) => {
        setSelectedTileset(t);
        setSelectedTileId(id);
      }}
      onClose={() => setShowTilePalette(false)}
    />
  )}
  
  {showSpriteEditor && (
    <SpriteEditor
      sprite={currentSprite}
      onSave={(anim) => console.log(anim)}
      onClose={() => setShowSpriteEditor(false)}
    />
  )}
</div>
```

---

## Keyboard Shortcuts

### Tile Mode
- **T**: Toggle tile mode
- **Click**: Place tile
- **Shift+Click**: Remove tile
- **Ctrl+Click**: Flood fill
- **Esc**: Exit tile mode

### Sprite Editor
- **S**: Open sprite editor (add this)
- **Space**: Play/pause preview
- **Left/Right**: Previous/next frame
- **Esc**: Close editor

---

## Common Patterns

### Creating Placeholder Tileset
```javascript
function createPlaceholderTileset(name, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = color;
    ctx.fillRect(i * 16, 0, 16, 16);
    ctx.strokeRect(i * 16, 0, 16, 16);
  }
  
  return canvas.toDataURL();
}

ts.loadTileset('terrain', createPlaceholderTileset('terrain', '#8B7355'), 16, 16);
```

### Drawing Grid Overlay
```javascript
function drawGrid(ctx, tileSize, cameraX, cameraY) {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  
  for (let x = 0; x < canvas.width; x += tileSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  
  for (let y = 0; y < canvas.height; y += tileSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}
```

### Multi-Tool Canvas Click
```javascript
function handleCanvasClick(e) {
  const worldPos = getWorldPosition(e);
  
  if (tileMode) {
    handleTilePlacement(worldPos, e);
  } else if (objectMode) {
    handleObjectPlacement(worldPos, e);
  } else {
    handleSelection(worldPos, e);
  }
}
```

---

## Performance Tips

### TileSystem
✅ **DO**: Let viewport culling work (automatic)
✅ **DO**: Use flood fill with maxTiles limit
✅ **DO**: Keep tileset images reasonable size
❌ **DON'T**: Place tiles in tight loop without batching
❌ **DON'T**: Call draw() for every tile individually

### SpriteEditor
✅ **DO**: Load sprite sheets horizontally
✅ **DO**: Keep frame count 4-32
✅ **DO**: Use reasonable frame sizes (16x16 to 128x128)
❌ **DON'T**: Load hundreds of frames at once
❌ **DON'T**: Create massive sprite sheets

### General
✅ **DO**: Use refs for systems (avoid re-renders)
✅ **DO**: Batch operations when possible
✅ **DO**: Profile with browser dev tools
❌ **DON'T**: Create new TileSystem every render
❌ **DON'T**: Render all UI panels at once

---

## Troubleshooting

### Tiles Not Showing
1. Check tileset loaded: `ts.tilesets.has('terrain')`
2. Check tiles placed: `ts.getTileCount()`
3. Check camera position
4. Check canvas context valid
5. Verify draw() called each frame

### Sprite Editor Not Loading Frames
1. Check sprite.src valid
2. Check frameWidth/frameHeight correct
3. Listen for image load errors
4. Verify sprite sheet is horizontal
5. Check console for errors

### Tile Palette Empty
1. Check TileSystem passed correctly
2. Check tilesets loaded (image.complete)
3. Verify tileset.tiles array populated
4. Check console for errors

### Performance Issues
1. Check tile count: `ts.getTileCount()`
2. Limit flood fill with maxTiles
3. Reduce tileset resolution if needed
4. Profile with browser dev tools
5. Check for memory leaks (listeners)

---

## API Summary

### TileSystem
```javascript
// Constructor
new TileSystem(tileSize)

// Tileset Management
.loadTileset(name, src, tileWidth, tileHeight)
.tilesets // Map of tilesets

// Tile Operations
.setTile(x, y, tileset, id)
.getTile(x, y)
.removeTile(x, y)
.clear()

// Coordinates
.worldToGrid(x, y)
.gridToWorld(x, y)

// Drawing
.draw(ctx, cameraX, cameraY, width, height)

// Tools
.floodFill(x, y, tileset, id, max)
.autoTile(x, y, tileset)
.fillRect(x1, y1, x2, y2, tileset, id)
.clearRect(x1, y1, x2, y2)

// Queries
.getTilesInRect(x1, y1, x2, y2)
.getTileCount()
.getBounds()

// Serialization
.export()
.import(data)
```

### TilePalette Props
```javascript
{
  tileSystem: TileSystem,
  onTileSelect: (tileset, tileId) => void,
  onClose?: () => void
}
```

### SpriteEditor Props
```javascript
{
  sprite: {
    src: string,
    frameWidth: number,
    frameHeight: number
  },
  onSave: (animation) => void,
  onClose?: () => void
}
```

---

## Links

📚 **Full Documentation**: `ADVANCED_FEATURES_GUIDE.md`
🔧 **Integration Guide**: `INTEGRATION_STEPS.js`
📊 **Architecture**: `ARCHITECTURE_DIAGRAM.md`
📝 **Summary**: `ADVANCED_FEATURES_SUMMARY.md`
🎮 **Demo**: `/advanced-features-demo`

---

**Quick Start**: Read this → Try demo → Integrate → Customize → Ship! 🚀
