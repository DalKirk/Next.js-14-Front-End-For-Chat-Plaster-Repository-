# Brush Tool & Layer System Guide

Complete documentation for the Brush Tool and Layer System features.

---

## 🖌️ Brush Tool System

The Brush Tool provides advanced painting capabilities for tile-based level creation.

### Features

- **Variable Size**: 1-10 tiles (adjustable)
- **Multiple Shapes**: Square, Circle, Line
- **Four Modes**: Paint, Erase, Fill, Eyedropper
- **Visual Preview**: Real-time brush cursor
- **Smart Line Drawing**: Bresenham algorithm for smooth lines
- **Pattern Support**: Ready for future pattern brushes

### Basic Usage

```javascript
import BrushTool from '@/components/BrushTool';

// Create brush
const brush = new BrushTool();

// Configure brush
brush.setSize(3);           // 3x3 brush
brush.setShape('circle');   // Circular shape
brush.setMode('paint');     // Paint mode

// Apply brush
brush.apply(tileSystem, gridX, gridY, 'terrain', tileId);

// Draw preview
brush.drawPreview(ctx, gridX, gridY, tileSize, cameraX, cameraY);

// Reset (end stroke)
brush.reset();
```

### API Reference

#### Constructor
```javascript
new BrushTool()
```
Creates a new brush tool with default settings (size 1, square, paint mode).

#### Methods

##### `setSize(size)`
Set brush size (1-10 tiles).
```javascript
brush.setSize(5); // 5x5 brush
```

##### `setShape(shape)`
Set brush shape: `'square'`, `'circle'`, or `'line'`.
```javascript
brush.setShape('circle'); // Circular brush
```

##### `setMode(mode)`
Set brush mode: `'paint'`, `'erase'`, `'fill'`, or `'eyedropper'`.
```javascript
brush.setMode('erase'); // Erase mode
```

##### `getAffectedTiles(centerX, centerY)`
Get array of tiles affected by brush at position.
```javascript
const tiles = brush.getAffectedTiles(5, 5);
// Returns: [{x: 4, y: 4}, {x: 5, y: 4}, ...]
```

##### `apply(tileSystem, x, y, tilesetName, tileId)`
Apply brush to tile system.
```javascript
brush.apply(tileSystem, 10, 10, 'terrain', 3);
```

**Returns**: `Object|null` - Picked tile if eyedropper mode, otherwise null.

##### `drawPreview(ctx, x, y, tileSize, cameraX, cameraY)`
Draw brush preview on canvas.
```javascript
brush.drawPreview(ctx, gridX, gridY, 40, camera.x, camera.y);
```

##### `reset()`
Reset brush state (call when mouse up).
```javascript
brush.reset();
```

##### `getInfo()`
Get brush configuration.
```javascript
const info = brush.getInfo();
console.log(info); // {size: 3, shape: 'circle', mode: 'paint', dimensions: '3x3'}
```

### Brush Modes

#### Paint Mode
Paints tiles with selected tile.
```javascript
brush.setMode('paint');
brush.apply(tileSystem, x, y, 'terrain', tileId);
```

#### Erase Mode
Removes tiles.
```javascript
brush.setMode('erase');
brush.apply(tileSystem, x, y, null, null);
```

#### Fill Mode
Flood fills connected area.
```javascript
brush.setMode('fill');
brush.apply(tileSystem, x, y, 'terrain', tileId);
```

#### Eyedropper Mode
Picks tile from level.
```javascript
brush.setMode('eyedropper');
const pickedTile = brush.apply(tileSystem, x, y, null, null);
if (pickedTile) {
  console.log('Picked:', pickedTile.tilesetName, pickedTile.tileId);
}
```

### Brush Shapes

#### Square Brush
Rectangle covering size×size tiles.
```javascript
brush.setShape('square');
brush.setSize(3); // 3x3 square
```

#### Circle Brush
Circular area covering tiles within radius.
```javascript
brush.setShape('circle');
brush.setSize(5); // Circle with radius ~2.5
```

#### Line Brush
Draws line from last position to current.
```javascript
brush.setShape('line');
// Drag to draw smooth lines
```

### Integration Example

```javascript
// In GameBuilder
const brushRef = useRef(new BrushTool());
const [isDrawing, setIsDrawing] = useState(false);

function handleMouseDown(e) {
  setIsDrawing(true);
  handlePaint(e);
}

function handleMouseMove(e) {
  if (isDrawing) {
    handlePaint(e);
  }
}

function handleMouseUp() {
  setIsDrawing(false);
  brushRef.current.reset();
}

function handlePaint(e) {
  const {x, y} = getGridPosition(e);
  
  const pickedTile = brushRef.current.apply(
    tileSystem,
    x,
    y,
    selectedTileset,
    selectedTileId
  );
  
  // If eyedropper picked a tile
  if (pickedTile && brushRef.current.mode === 'eyedropper') {
    setSelectedTileset(pickedTile.tilesetName);
    setSelectedTileId(pickedTile.tileId);
    brushRef.current.setMode('paint'); // Switch back to paint
  }
}

// In draw loop
function drawGame() {
  // ... draw tiles, objects ...
  
  // Draw brush preview
  if (mouseGridPos) {
    brushRef.current.drawPreview(
      ctx,
      mouseGridPos.x,
      mouseGridPos.y,
      tileSize,
      camera.x,
      camera.y
    );
  }
}
```

### Keyboard Shortcuts

Add these shortcuts for quick brush control:

```javascript
useEffect(() => {
  function handleKeyPress(e) {
    const brush = brushRef.current;
    
    switch(e.key) {
      case 'b': brush.setMode('paint'); break;
      case 'e': brush.setMode('erase'); break;
      case 'f': brush.setMode('fill'); break;
      case 'i': brush.setMode('eyedropper'); break;
      case '[': brush.setSize(Math.max(1, brush.size - 1)); break;
      case ']': brush.setSize(Math.min(10, brush.size + 1)); break;
    }
  }
  
  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, []);
```

---

## 🎨 Layer System

The Layer System provides layer-based organization for game objects.

### Features

- **Multiple Layers**: Background, Main, Foreground, UI (+ custom)
- **Visibility Toggle**: Show/hide layers
- **Layer Locking**: Prevent editing
- **Opacity Control**: 0-100% transparency
- **Layer Reordering**: Change draw order
- **Object Assignment**: Objects belong to layers
- **Export/Import**: Save layer configuration

### Basic Usage

```javascript
import LayerSystem from '@/components/LayerSystem';

// Create layer system
const layers = new LayerSystem();

// Add custom layer
const layerId = layers.addLayer('Decorations');

// Add object to layer
layers.addObjectToLayer('main', myObject);

// Set active layer
layers.setActiveLayer('foreground');

// Draw all layers
layers.draw(ctx, camera.x, camera.y, drawObjectFunction);
```

### API Reference

#### Constructor
```javascript
new LayerSystem()
```
Creates layer system with 4 default layers: background, main, foreground, ui.

#### Layer Management

##### `addLayer(name, index = null)`
Add new layer.
```javascript
const layerId = layers.addLayer('Effects'); // Add to end
const id2 = layers.addLayer('Platforms', 1); // Insert at index 1
```
**Returns**: `string` - Layer ID

##### `removeLayer(layerId)`
Remove layer (must have >1 layer).
```javascript
const success = layers.removeLayer(layerId);
```
**Returns**: `boolean` - Success

##### `getLayer(layerId)`
Get layer object by ID.
```javascript
const layer = layers.getLayer('main');
console.log(layer.name, layer.visible, layer.opacity);
```
**Returns**: `Object|null` - Layer object

##### `getActiveLayer()`
Get currently active layer.
```javascript
const active = layers.getActiveLayer();
console.log('Active:', active.name);
```
**Returns**: `Object|null` - Active layer object

##### `setActiveLayer(layerId)`
Set active layer.
```javascript
layers.setActiveLayer('foreground');
```
**Returns**: `boolean` - Success

##### `moveLayer(layerId, newIndex)`
Change layer order.
```javascript
layers.moveLayer(layerId, 2); // Move to position 2
```

##### `renameLayer(layerId, newName)`
Rename layer.
```javascript
layers.renameLayer('main', 'Game Objects');
```
**Returns**: `boolean` - Success

#### Layer Properties

##### `toggleVisibility(layerId)`
Toggle layer visibility.
```javascript
const newState = layers.toggleVisibility('background');
console.log('Visible:', newState);
```
**Returns**: `boolean` - New visibility state

##### `toggleLock(layerId)`
Toggle layer lock.
```javascript
const locked = layers.toggleLock('ui');
console.log('Locked:', locked);
```
**Returns**: `boolean` - New lock state

##### `setOpacity(layerId, opacity)`
Set layer opacity (0.0 - 1.0).
```javascript
layers.setOpacity('background', 0.5); // 50% opacity
```

#### Object Management

##### `addObjectToLayer(layerId, object)`
Add object to layer (if not locked).
```javascript
const success = layers.addObjectToLayer('main', {
  type: 'platform',
  x: 100,
  y: 200
});
```
**Returns**: `boolean` - Success

##### `removeObjectFromLayer(layerId, object)`
Remove object from layer.
```javascript
layers.removeObjectFromLayer('main', myObject);
```
**Returns**: `boolean` - Success

##### `moveObjectToLayer(object, fromLayerId, toLayerId)`
Move object between layers.
```javascript
layers.moveObjectToLayer(myObject, 'main', 'foreground');
```
**Returns**: `boolean` - Success

##### `getLayerObjects(layerId)`
Get all objects in layer.
```javascript
const objects = layers.getLayerObjects('main');
console.log(`Main layer has ${objects.length} objects`);
```
**Returns**: `Array` - Array of objects

##### `getAllVisibleObjects()`
Get all visible objects across layers (bottom to top).
```javascript
const visibleObjects = layers.getAllVisibleObjects();
// Each object includes: {...object, layerId, layerOpacity}
```
**Returns**: `Array` - Array of objects with layer info

##### `clearLayer(layerId)`
Remove all objects from layer (if not locked).
```javascript
layers.clearLayer('foreground');
```
**Returns**: `boolean` - Success

#### Drawing

##### `draw(ctx, cameraX, cameraY, drawObjectFn)`
Draw all visible layers.
```javascript
layers.draw(ctx, camera.x, camera.y, (ctx, obj, camX, camY) => {
  // Draw object
  ctx.fillStyle = obj.color;
  ctx.fillRect(obj.x - camX, obj.y - camY, obj.width, obj.height);
});
```

**Parameters**:
- `ctx`: Canvas context
- `cameraX`: Camera X offset
- `cameraY`: Camera Y offset
- `drawObjectFn`: `(ctx, object, cameraX, cameraY) => void`

#### Serialization

##### `export()`
Export layer system to JSON.
```javascript
const data = layers.export();
localStorage.setItem('layers', JSON.stringify(data));
```
**Returns**: `Object` - Serialized layer system

##### `import(data)`
Import layer system from JSON.
```javascript
const data = JSON.parse(localStorage.getItem('layers'));
layers.import(data);
```

#### Utilities

##### `getLayerCount()`
Get number of layers.
```javascript
const count = layers.getLayerCount();
```
**Returns**: `number`

### Integration Example

```javascript
// In GameBuilder
const layerSystemRef = useRef(new LayerSystem());

// When creating object
function createObject(type, x, y) {
  const obj = { type, x, y, id: Date.now() };
  const activeLayer = layerSystemRef.current.getActiveLayer();
  
  if (activeLayer && !activeLayer.locked) {
    layerSystemRef.current.addObjectToLayer(activeLayer.id, obj);
  } else {
    alert('Cannot add to locked layer!');
  }
}

// Drawing
function drawGame() {
  // Draw background
  drawBackground();
  
  // Draw tiles
  tileSystem.draw(ctx, camera.x, camera.y, width, height);
  
  // Draw all layers with objects
  layerSystemRef.current.draw(ctx, camera.x, camera.y, (ctx, obj, camX, camY) => {
    // Custom drawing logic for each object type
    switch(obj.type) {
      case 'platform':
        ctx.fillStyle = '#8B7355';
        ctx.fillRect(obj.x - camX, obj.y - camY, obj.width, obj.height);
        break;
      case 'enemy':
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(obj.x - camX, obj.y - camY, 32, 32);
        break;
    }
  });
}

// Save/Load
function saveLevel() {
  return {
    tiles: tileSystem.export(),
    layers: layerSystemRef.current.export()
  };
}

function loadLevel(data) {
  tileSystem.import(data.tiles);
  layerSystemRef.current.import(data.layers);
}
```

### Layer Structure

```javascript
{
  id: 'main',              // Unique identifier
  name: 'Main',            // Display name
  visible: true,           // Visibility toggle
  locked: false,           // Lock toggle
  opacity: 1.0,            // Opacity (0.0 - 1.0)
  order: 1,                // Draw order (0 = bottom)
  objects: []              // Objects in layer
}
```

---

## 🎯 Usage Patterns

### Pattern: Brush-Based Tile Painting

```javascript
const brush = new BrushTool();
brush.setSize(3);
brush.setShape('circle');

function handleCanvasMouseMove(e) {
  if (isDrawing) {
    const {x, y} = getGridPos(e);
    brush.apply(tileSystem, x, y, tileset, tileId);
  }
}

function handleCanvasMouseUp() {
  brush.reset(); // Important! Resets line state
}
```

### Pattern: Layer-Based Organization

```javascript
const layers = new LayerSystem();

// Background decorations (low opacity, bottom layer)
layers.setOpacity('background', 0.3);
layers.addObjectToLayer('background', { type: 'cloud', x: 100, y: 50 });

// Main gameplay objects
layers.addObjectToLayer('main', { type: 'platform', x: 200, y: 300 });
layers.addObjectToLayer('main', { type: 'enemy', x: 300, y: 250 });

// Foreground effects (top layer)
layers.addObjectToLayer('foreground', { type: 'particle', x: 150, y: 150 });

// UI always on top
layers.addObjectToLayer('ui', { type: 'button', x: 50, y: 50 });
```

### Pattern: Mode Switching

```javascript
// Quick mode switch
function switchToErase() {
  brush.setMode('erase');
  brush.setSize(1); // Small eraser
}

function switchToPaint() {
  brush.setMode('paint');
  brush.setSize(3); // Medium brush
}

function switchToFill() {
  brush.setMode('fill');
  // Size doesn't matter for fill
}
```

---

## 📊 Performance

### Brush Tool
- **Affected Tiles Calculation**: O(size²) for square/circle, O(distance) for line
- **Line Drawing**: O(n) using Bresenham algorithm
- **Memory**: Minimal (stores only last position)

### Layer System
- **Drawing**: O(objects × layers) but only visible layers
- **Object Lookup**: O(1) with layer reference
- **Memory**: ~200 bytes per layer + objects

---

## 🎓 Tips & Tricks

### Brush Tool Tips
1. **Use Circle for Natural Look**: Circular brushes create more organic shapes
2. **Line Tool for Walls**: Perfect for drawing long straight walls
3. **Small Eraser**: Set size to 1 when erasing specific tiles
4. **Eyedropper Workflow**: Pick tile, switch to paint automatically
5. **Reset After Drawing**: Always call `brush.reset()` on mouse up

### Layer System Tips
1. **Use Descriptive Names**: Rename layers to match their purpose
2. **Lock Finished Layers**: Prevent accidental edits
3. **Background at 30-50% Opacity**: Creates depth
4. **Separate UI Layer**: Keep UI elements on top layer
5. **Few Large Layers > Many Small**: Better performance

---

## 🐛 Troubleshooting

### Brush not working
- Check if brush reference exists
- Call `brush.reset()` on mouse up
- Verify tileSystem is initialized
- Check if selectedTileset is set

### Layer objects not showing
- Verify layer is visible (not hidden)
- Check layer opacity > 0
- Ensure drawObjectFn is provided
- Confirm objects added to layer

### Performance issues
- Limit brush size to 1-5 for smooth drawing
- Reduce number of layers (4-6 optimal)
- Use layer visibility to hide unused layers
- Profile with browser dev tools

---

## 📚 See Also

- **TileSystem.js** - Core tile management
- **BrushControls.jsx** - UI for brush settings
- **LayerPanel.jsx** - UI for layer management
- **ADVANCED_FEATURES_GUIDE.md** - Complete feature documentation
