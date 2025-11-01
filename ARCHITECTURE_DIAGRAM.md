# Advanced Features Architecture

## System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                      BERRY GAME BUILDER                           │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                     GameBuilder.jsx                          │ │
│  │                   (Main Component)                           │ │
│  │                                                              │ │
│  │  State:                                                      │ │
│  │  - platforms[]                                               │ │
│  │  - gameObjects[]                                             │ │
│  │  - config                                                    │ │
│  │  - tileSystem (new)                                          │ │
│  │  - selectedTile (new)                                        │ │
│  │  - currentSprite (new)                                       │ │
│  └───────┬──────────────────────────────────┬─────────┬─────────┘ │
│          │                                  │         │           │
│          │                                  │         │           │
│  ┌───────▼──────────┐           ┌──────────▼────┐   │           │
│  │  Canvas Renderer │           │   Toolbar     │   │           │
│  │                  │           │               │   │           │
│  │  - Draw tiles    │◄──────────┤  🧱 Tiles    │   │           │
│  │  - Draw objects  │           │  ✨ Sprites   │   │           │
│  │  - Draw UI       │           │  🎮 Objects   │   │           │
│  │  - Camera        │           └───────────────┘   │           │
│  └──────────────────┘                               │           │
│                                                      │           │
└──────────────────────────────────────────────────────┼───────────┘
                                                       │
                    ┌──────────────────────────────────┼────────────────┐
                    │                                  │                │
         ┌──────────▼─────────┐          ┌────────────▼──────────┐     │
         │   TileSystem.js    │          │  SpriteEditor.jsx     │     │
         │                    │          │                       │     │
         │  Data:             │          │  Features:            │     │
         │  - tiles Map       │          │  - Frame extraction   │     │
         │  - tilesets Map    │          │  - Animation preview  │     │
         │                    │          │  - Frame selection    │     │
         │  Methods:          │          │  - Speed control      │     │
         │  - setTile()       │          │  - Export animations  │     │
         │  - getTile()       │          │                       │     │
         │  - draw()          │          │  Input: Sprite sheet  │     │
         │  - floodFill()     │          │  Output: Animation    │     │
         │  - autoTile()      │          │          definition   │     │
         │  - export()        │          │                       │     │
         │  - import()        │          └───────────────────────┘     │
         │                    │                                        │
         └────────┬───────────┘                                        │
                  │                                                    │
         ┌────────▼─────────┐                                          │
         │ TilePalette.jsx  │                                          │
         │                  │                                          │
         │  Features:       │                                          │
         │  - Tileset list  │                                          │
         │  - Tile grid     │                                          │
         │  - Click select  │                                          │
         │  - Visual preview│                                          │
         │                  │                                          │
         │  Callback:       │                                          │
         │  onTileSelect()  │                                          │
         └──────────────────┘                                          │
                                                                       │
                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Tile System Flow
```
User Action                TilePalette              TileSystem              Canvas
    │                          │                        │                    │
    ├─ Click "Tiles" ─────────►│                        │                    │
    │                          │                        │                    │
    │                          ├─ Display tilesets ────►│                    │
    │                          │   getTilesets()        │                    │
    │                          │                        │                    │
    ├─ Select tile ───────────►│                        │                    │
    │                          │                        │                    │
    │                          ├─ onTileSelect() ──────►│                    │
    │                          │   (tileset, tileId)    │                    │
    │                          │                        │                    │
    ├─ Click canvas ───────────┼───────────────────────►│                    │
    │                          │         setTile()      │                    │
    │                          │                        │                    │
    │                          │                        ├─ Draw tiles ──────►│
    │                          │                        │   (each frame)     │
    │                          │                        │                    │
    ├─ Save level ─────────────┼───────────────────────►│                    │
    │                          │         export()       │                    │
    │                          │         returns JSON   │                    │
    │                          │                        │                    │
    └─ Load level ─────────────┼───────────────────────►│                    │
                               │         import(JSON)   │                    │
                               │                        │                    │
```

### Sprite Editor Flow
```
User Action           SpriteEditor            Animation System         Sprites
    │                     │                        │                     │
    ├─ Open editor ──────►│                        │                     │
    │                     │                        │                     │
    │                     ├─ Load sprite sheet ───►│                     │
    │                     │   Extract frames       │                     │
    │                     │                        │                     │
    ├─ Select frames ────►│                        │                     │
    │                     │   (click timeline)     │                     │
    │                     │                        │                     │
    ├─ Preview ──────────►│                        │                     │
    │                     ├─ Animate frames ──────►│                     │
    │                     │   (play/pause)         │                     │
    │                     │                        │                     │
    ├─ Adjust speed ─────►│                        │                     │
    │                     │   (slider)             │                     │
    │                     │                        │                     │
    ├─ Create animation ──►│                        │                     │
    │                     │                        │                     │
    │                     ├─ onSave() ─────────────┼────────────────────►│
    │                     │   {                    │    Store animation  │
    │                     │     name,              │    definition       │
    │                     │     frames: [0,1,2],   │                     │
    │                     │     speed: 100,        │                     │
    │                     │     loop: true         │                     │
    │                     │   }                    │                     │
    │                     │                        │                     │
```

## Component Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│                                                              │
│  ┌────────────────┐         ┌──────────────────────────┐    │
│  │  GameBuilder   │◄────────┤  /game-builder/page.tsx  │    │
│  │  (Main Game)   │         └──────────────────────────┘    │
│  └───┬────────────┘                                          │
│      │                                                       │
│      │ uses                                                  │
│      │                                                       │
│      ├──────────┬─────────────┬────────────────┐            │
│      │          │             │                │            │
└──────┼──────────┼─────────────┼────────────────┼────────────┘
       │          │             │                │
       │          │             │                │
┌──────▼──────────▼─────────────▼────────────────▼────────────┐
│              Component Library                               │
│                                                              │
│  ┌─────────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │  TileSystem.js  │  │ TilePalette  │  │ SpriteEditor   │ │
│  │  (Core Logic)   │  │ (UI Helper)  │  │ (UI Editor)    │ │
│  │                 │  │              │  │                │ │
│  │  - setTile()    │  │  Renders:    │  │  Renders:      │ │
│  │  - getTile()    │  │  - Dropdown  │  │  - Canvas      │ │
│  │  - draw()       │  │  - Grid      │  │  - Timeline    │ │
│  │  - floodFill()  │  │  - Preview   │  │  - Controls    │ │
│  │  - export()     │  │              │  │                │ │
│  │                 │  │  Uses:       │  │  Produces:     │ │
│  │  Data:          │  │  TileSystem  │  │  Animations    │ │
│  │  Map<key,tile>  │  │              │  │                │ │
│  └─────────────────┘  └──────────────┘  └────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Integration Points

### GameBuilder Integration
```javascript
GameBuilder.jsx
├── State
│   ├── tileSystemRef = useRef(new TileSystem(40))
│   ├── selectedTileset = useState(null)
│   ├── selectedTileId = useState(0)
│   ├── showTilePalette = useState(false)
│   └── showSpriteEditor = useState(false)
│
├── Event Handlers
│   ├── handleCanvasClick()
│   │   ├── If tileMode: place/remove tiles
│   │   └── Else: normal object placement
│   │
│   ├── handleTileSelect()
│   │   └── Update selectedTileset + selectedTileId
│   │
│   └── handleAnimationSave()
│       └── Store animation in sprite library
│
├── Rendering (drawGame)
│   ├── Draw parallax background
│   ├── Draw tiles (tileSystem.draw())  ← NEW
│   ├── Draw game objects
│   ├── Draw player
│   └── Draw UI
│
└── Save/Load
    ├── saveLevel()
    │   └── Include tiles: tileSystem.export()
    │
    └── loadLevel()
        └── Restore tiles: tileSystem.import(data)
```

## Memory Layout

### TileSystem Data Structure
```
TileSystem {
  tileSize: 40,
  
  tiles: Map {
    "0,0" → { x: 0, y: 0, tilesetName: "terrain", tileId: 5 },
    "1,0" → { x: 1, y: 0, tilesetName: "terrain", tileId: 6 },
    "0,1" → { x: 0, y: 1, tilesetName: "objects", tileId: 2 },
    ...
  },
  
  tilesets: Map {
    "terrain" → {
      name: "terrain",
      image: HTMLImageElement,
      tileWidth: 16,
      tileHeight: 16,
      tiles: [
        { id: 0, col: 0, row: 0, collision: false },
        { id: 1, col: 1, row: 0, collision: false },
        ...
      ]
    },
    "objects" → { ... }
  }
}
```

### SpriteEditor Frame Data
```
SpriteEditor {
  sprite: {
    src: "data:image/png;base64,...",
    frameWidth: 32,
    frameHeight: 32
  },
  
  frames: [
    { id: 0, dataUrl: "data:image/png;...", selected: false },
    { id: 1, dataUrl: "data:image/png;...", selected: true },
    { id: 2, dataUrl: "data:image/png;...", selected: true },
    { id: 3, dataUrl: "data:image/png;...", selected: false }
  ],
  
  animation: {
    name: "walk",
    frames: [1, 2],
    speed: 100,
    loop: true
  }
}
```

## Performance Characteristics

### Tile System
```
Operation           Complexity    Notes
─────────────────────────────────────────────────────────
setTile()           O(1)          Map insert
getTile()           O(1)          Map lookup
removeTile()        O(1)          Map delete
draw()              O(visible)    Only draws on-screen tiles
floodFill()         O(n)          Limited by maxTiles parameter
export()            O(tiles)      Serialize all tiles
import()            O(tiles)      Deserialize all tiles

Memory: ~100 bytes per tile
Capacity: 10,000+ tiles (optimized)
```

### Sprite Editor
```
Operation           Complexity    Notes
─────────────────────────────────────────────────────────
Load sprite         O(frames)     Extract frames
Select frame        O(1)          Toggle selection
Create animation    O(selected)   Filter selected frames
Preview             O(1)          Per frame draw

Memory: ~5KB per frame (Data URL)
Recommended: 4-32 frames
```

## File Organization

```
video-chat-frontend/
├── components/
│   ├── TileSystem.js           ← Core tile logic
│   ├── TilePalette.jsx         ← Tile selection UI
│   ├── SpriteEditor.jsx        ← Sprite animation UI
│   ├── GameBuilder.jsx         ← Main game (integrates all)
│   └── ...
│
├── app/
│   ├── game-builder/
│   │   └── page.tsx            ← Game builder route
│   └── advanced-features-demo/
│       └── page.tsx            ← Demo page
│
├── ADVANCED_FEATURES_GUIDE.md  ← API documentation
├── ADVANCED_FEATURES_SUMMARY.md ← Implementation summary
├── INTEGRATION_STEPS.js        ← Integration guide
└── ...
```

## Usage Example

### Complete Integration Flow
```javascript
// 1. Initialize
const tileSystem = new TileSystem(40);
tileSystem.loadTileset('terrain', '/assets/terrain.png', 16, 16);

// 2. User selects tile from palette
function handleTileSelect(tileset, tileId) {
  setSelectedTileset(tileset);
  setSelectedTileId(tileId);
}

// 3. User clicks canvas to place tile
function handleCanvasClick(e) {
  const worldPos = getWorldPosition(e);
  const gridPos = tileSystem.worldToGrid(worldPos.x, worldPos.y);
  tileSystem.setTile(gridPos.x, gridPos.y, selectedTileset, selectedTileId);
}

// 4. Render in game loop
function drawGame() {
  // Draw tiles first (background)
  tileSystem.draw(ctx, camera.x, camera.y, width, height);
  
  // Draw game objects on top
  drawGameObjects();
}

// 5. Save level
function saveLevel() {
  const data = {
    tiles: tileSystem.export(),
    objects: gameObjects
  };
  localStorage.setItem('level', JSON.stringify(data));
}
```

---

This architecture provides a clean separation of concerns, efficient performance, and easy integration with the existing game builder system.
