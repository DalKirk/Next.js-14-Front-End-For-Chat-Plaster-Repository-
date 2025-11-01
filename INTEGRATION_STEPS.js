/**
 * INTEGRATION GUIDE: Adding Advanced Features to GameBuilder
 * 
 * This file shows how to integrate the three new systems:
 * 1. Sprite Editor
 * 2. Tile System
 * 3. Tile Palette
 */

// =============================================================================
// STEP 1: Add imports to GameBuilder.jsx
// =============================================================================

// Add these imports at the top of GameBuilder.jsx:
import TileSystem from './TileSystem';
import TilePalette from './TilePalette';
import SpriteEditor from './SpriteEditor';

// =============================================================================
// STEP 2: Add state for new features
// =============================================================================

// Add these state variables:
const [showTilePalette, setShowTilePalette] = useState(false);
const [showSpriteEditor, setShowSpriteEditor] = useState(false);
const [selectedTileset, setSelectedTileset] = useState(null);
const [selectedTileId, setSelectedTileId] = useState(0);
const [tileMode, setTileMode] = useState(false); // Toggle tile placement mode
const [currentSprite, setCurrentSprite] = useState(null);

// Add ref for tile system:
const tileSystemRef = useRef(null);

// =============================================================================
// STEP 3: Initialize tile system
// =============================================================================

// Add this useEffect to initialize the tile system:
useEffect(() => {
  // Create tile system with 40px grid
  const ts = new TileSystem(40);
  
  // Load placeholder tilesets (replace with real assets later)
  // For now, create simple placeholder tilesets
  const createPlaceholderTileset = (name, color) => {
    const canvas = document.createElement('canvas');
    canvas.width = 64; // 4 tiles x 16px
    canvas.height = 16; // 1 row
    const ctx = canvas.getContext('2d');
    
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = color;
      ctx.fillRect(i * 16, 0, 16, 16);
      ctx.strokeStyle = '#000';
      ctx.strokeRect(i * 16, 0, 16, 16);
      ctx.fillStyle = '#fff';
      ctx.font = '10px monospace';
      ctx.fillText(i, i * 16 + 4, 12);
    }
    
    return canvas.toDataURL();
  };
  
  ts.loadTileset('terrain', createPlaceholderTileset('terrain', '#8B7355'), 16, 16);
  ts.loadTileset('objects', createPlaceholderTileset('objects', '#4CAF50'), 16, 16);
  
  tileSystemRef.current = ts;
  
  console.log('Tile system initialized');
}, []);

// =============================================================================
// STEP 4: Add tile placement to canvas click handler
// =============================================================================

// Modify your canvas click handler to support tile placement:
function handleCanvasClick(e) {
  const rect = canvasRef.current.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;
  const worldX = clickX + cameraXRef.current;
  const worldY = clickY + cameraYRef.current;
  
  // If in tile mode, place tiles
  if (tileMode && selectedTileset && tileSystemRef.current) {
    const { x, y } = tileSystemRef.current.worldToGrid(worldX, worldY);
    
    if (e.shiftKey) {
      // Shift+Click = Remove tile
      tileSystemRef.current.removeTile(x, y);
    } else if (e.ctrlKey) {
      // Ctrl+Click = Flood fill
      tileSystemRef.current.floodFill(x, y, selectedTileset, selectedTileId, 500);
    } else {
      // Normal click = Place tile
      tileSystemRef.current.setTile(x, y, selectedTileset, selectedTileId);
    }
    return;
  }
  
  // Otherwise, handle normal game object selection/placement
  // ... existing click handler code ...
}

// =============================================================================
// STEP 5: Add tile rendering to draw function
// =============================================================================

// Add this to your drawGame function (before drawing game objects):
function drawGame(timestamp) {
  // ... existing camera and clear code ...
  
  // Draw background
  // ... existing background code ...
  
  // Draw tiles (if tile system exists)
  if (tileSystemRef.current) {
    tileSystemRef.current.draw(
      ctx,
      cameraXRef.current,
      cameraYRef.current,
      ctx.canvas.width,
      ctx.canvas.height
    );
  }
  
  // Draw game objects
  // ... rest of existing draw code ...
}

// =============================================================================
// STEP 6: Add toolbar buttons
// =============================================================================

// Add these buttons to your toolbar JSX:

{/* Tile System Button */}
<button
  onClick={() => {
    setShowTilePalette(!showTilePalette);
    setTileMode(true);
  }}
  className={`px-3 py-2 rounded transition-colors ${
    tileMode ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-700 hover:bg-gray-600'
  }`}
  title="Tile Placement (T)"
>
  🧱 Tiles
</button>

{/* Sprite Editor Button */}
<button
  onClick={() => setShowSpriteEditor(!showSpriteEditor)}
  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
  title="Sprite Editor"
>
  ✨ Sprites
</button>

// =============================================================================
// STEP 7: Add modal/panel components
// =============================================================================

// Add these components at the end of your JSX (before the closing div):

{/* Tile Palette Panel */}
{showTilePalette && (
  <div className="fixed top-20 right-4 z-50">
    <TilePalette
      tileSystem={tileSystemRef.current}
      onTileSelect={(tileset, tileId) => {
        setSelectedTileset(tileset);
        setSelectedTileId(tileId);
        setTileMode(true);
        console.log(`Selected tile: ${tileset} #${tileId}`);
      }}
      onClose={() => setShowTilePalette(false)}
    />
  </div>
)}

{/* Sprite Editor Modal */}
{showSpriteEditor && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="max-w-4xl w-full mx-4">
      <SpriteEditor
        sprite={currentSprite}
        onSave={(animation) => {
          console.log('Animation created:', animation);
          // TODO: Add animation to sprite library
          alert(`Animation "${animation.name}" created with ${animation.frames.length} frames!`);
        }}
        onClose={() => setShowSpriteEditor(false)}
      />
    </div>
  </div>
)}

// =============================================================================
// STEP 8: Add keyboard shortcuts (optional)
// =============================================================================

// Add this useEffect for keyboard shortcuts:
useEffect(() => {
  function handleKeyPress(e) {
    // T = Toggle tile mode
    if (e.key === 't' || e.key === 'T') {
      setTileMode(prev => !prev);
      if (!tileMode) {
        setShowTilePalette(true);
      }
    }
    
    // S = Open sprite editor
    if (e.key === 's' || e.key === 'S') {
      if (!showSpriteEditor) {
        setShowSpriteEditor(true);
      }
    }
    
    // Escape = Close panels
    if (e.key === 'Escape') {
      setShowTilePalette(false);
      setShowSpriteEditor(false);
      setTileMode(false);
    }
  }
  
  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, [tileMode, showSpriteEditor]);

// =============================================================================
// STEP 9: Add save/load integration
// =============================================================================

// Modify your save function to include tiles:
function saveLevel() {
  const levelData = {
    name: 'My Level',
    config: config,
    platforms: platforms,
    gameObjects: gameObjects,
    tiles: tileSystemRef.current ? tileSystemRef.current.export() : null
  };
  
  localStorage.setItem('currentLevel', JSON.stringify(levelData));
  alert('Level saved!');
}

// Modify your load function to restore tiles:
function loadLevel() {
  const levelData = JSON.parse(localStorage.getItem('currentLevel'));
  if (!levelData) {
    alert('No saved level found');
    return;
  }
  
  // Load existing data
  setConfig(levelData.config);
  setPlatforms(levelData.platforms);
  setGameObjects(levelData.gameObjects);
  
  // Load tiles
  if (levelData.tiles && tileSystemRef.current) {
    tileSystemRef.current.import(levelData.tiles);
  }
  
  alert('Level loaded!');
}

// =============================================================================
// STEP 10: Add visual feedback for tile mode
// =============================================================================

// Add this to your canvas rendering to show grid in tile mode:
function drawGame(timestamp) {
  // ... existing code ...
  
  // Draw tile grid when in tile mode
  if (tileMode && tileSystemRef.current) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    
    const tileSize = tileSystemRef.current.tileSize;
    const startX = Math.floor(cameraXRef.current / tileSize) * tileSize;
    const startY = Math.floor(cameraYRef.current / tileSize) * tileSize;
    const endX = startX + ctx.canvas.width + tileSize;
    const endY = startY + ctx.canvas.height + tileSize;
    
    // Draw vertical lines
    for (let x = startX; x < endX; x += tileSize) {
      ctx.beginPath();
      ctx.moveTo(x - cameraXRef.current, 0);
      ctx.lineTo(x - cameraXRef.current, ctx.canvas.height);
      ctx.stroke();
    }
    
    // Draw horizontal lines
    for (let y = startY; y < endY; y += tileSize) {
      ctx.beginPath();
      ctx.moveTo(0, y - cameraYRef.current);
      ctx.lineTo(ctx.canvas.width, y - cameraYRef.current);
      ctx.stroke();
    }
    
    ctx.restore();
  }
  
  // ... rest of draw code ...
}

// =============================================================================
// USAGE TIPS
// =============================================================================

/**
 * Tile System Controls:
 * - Click "🧱 Tiles" button to open tile palette
 * - Click tiles in palette to select
 * - Click canvas to place selected tile
 * - Shift+Click to remove tile
 * - Ctrl+Click for flood fill
 * - Press T to toggle tile mode
 * 
 * Sprite Editor:
 * - Click "✨ Sprites" button to open sprite editor
 * - Select a sprite first (add sprite selection UI)
 * - Click frames to select/deselect
 * - Adjust speed slider
 * - Click "Create Animation" when ready
 * 
 * Integration Notes:
 * - Tiles are saved with level data
 * - Use placeholder tilesets until you have real assets
 * - Grid size is 40px by default (matches platform size)
 * - Tile rendering is optimized (only draws visible tiles)
 */

// =============================================================================
// CREATING REAL TILESETS
// =============================================================================

/**
 * To use real tileset images instead of placeholders:
 * 
 * 1. Create tileset image (e.g., terrain.png)
 *    - Tiles arranged in a grid
 *    - All tiles same size (e.g., 16x16)
 *    - No gaps between tiles
 * 
 * 2. Place in public/assets/tilesets/ folder
 * 
 * 3. Load tileset:
 *    ts.loadTileset('terrain', '/assets/tilesets/terrain.png', 16, 16);
 * 
 * 4. That's it! Tile palette will show all tiles
 * 
 * Recommended tileset sizes:
 * - Small: 128x128 (64 tiles)
 * - Medium: 256x256 (256 tiles)
 * - Large: 512x512 (1024 tiles)
 */

export default {
  // This is just a guide file, no exports needed
};
