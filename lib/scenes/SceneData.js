// lib/scenes/SceneData.js
// Factory functions for creating scene data structures

/**
 * Generate a unique ID
 */
const generateId = (prefix = 'id') => 
  `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// ─────────────────────────────────────────────────────────────────
// PROJECT
// ─────────────────────────────────────────────────────────────────

export function createProject(name = 'Untitled Project') {
  return {
    id: generateId('proj'),
    name,
    startSceneId: null,          // which scene loads first on play
    scenes: [],                  // array of Scene objects
    assets: [],                  // array of Asset objects (images, sounds, etc.)
    globalVariables: {},         // { variableName: defaultValue }
    settings: {
      gridSize: 48,
      canvasWidth: 800,
      canvasHeight: 600,
      backgroundColor: '#1a1a2e'
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

// ─────────────────────────────────────────────────────────────────
// SCENE
// ─────────────────────────────────────────────────────────────────

export function createScene(name = 'New Scene') {
  return {
    id: generateId('scene'),
    name,
    backgroundColor: '#1a1a2e',
    // Player start position (where the player spawns in this scene)
    playerStart: {
      x: 40,   // pixel coordinates
      y: 520,  // default near bottom-left
      enabled: true
    },
    layers: {
      parallax:    [],           // array of ParallaxLayer
      platforms:   [],           // array of Platform
      entities:    [],           // array of Entity (player, enemies, pickups, goals)
      decorations: []            // array of Decoration (non-interactive visuals)
    },
    camera: {
      followPlayer: true,
      smoothing: 0.08,           // lerp factor (lower = smoother)
      bounds: {
        minX: 0,
        maxX: 4000,
        minY: 0,
        maxY: 600
      }
    },
    transition: {
      type: 'fade',              // 'instant', 'fade', 'slide_left', 'slide_right'
      duration: 600              // milliseconds
    },
    events: [],                  // array of Event definitions for this scene
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

// ─────────────────────────────────────────────────────────────────
// PARALLAX LAYER
// ─────────────────────────────────────────────────────────────────

export function createParallaxLayer(name = 'Parallax Layer') {
  return {
    id: generateId('parallax'),
    name,
    visible: true,
    assetId: null,               // reference to an asset in project.assets
    scrollSpeedX: 0.3,           // 0 = static, 1 = moves with camera (no parallax)
    scrollSpeedY: 0,
    scaleX: 1,
    scaleY: 1,
    tintColor: '#ffffff',
    alpha: 1,
    repeatX: true,               // tile horizontally
    repeatY: false,              // tile vertically
    zOrder: 0                    // lower = further back
  };
}

// ─────────────────────────────────────────────────────────────────
// PLATFORM
// ─────────────────────────────────────────────────────────────────

export function createPlatform(gridX = 0, gridY = 0, width = 3, height = 1) {
  return {
    id: generateId('platform'),
    gridX,
    gridY,
    gridWidth: width,            // in grid cells
    gridHeight: height,
    assetId: null,               // if set, tiles this image across the platform
    fillColor: '#4a5568',        // solid color fallback
    borderColor: '#2d3748',
    oneWay: false,               // can jump up through from below
    visible: true,
    tintColor: '#ffffff'
  };
}

// ─────────────────────────────────────────────────────────────────
// ENTITY
// ─────────────────────────────────────────────────────────────────

export function createEntity(type = 'generic', gridX = 0, gridY = 0) {
  return {
    id: generateId('entity'),
    type,                        // 'player', 'enemy', 'pickup', 'goal', 'npc', 'hazard', etc.
    name: type.charAt(0).toUpperCase() + type.slice(1),
    gridX,
    gridY,
    
    // ── Visual ──
    assetId: null,               // reference to a sprite asset
    fallbackEmoji: getDefaultEmoji(type),
    scale: 1,
    rotation: 0,                 // degrees
    flipX: false,
    flipY: false,
    tintColor: '#ffffff',
    alpha: 1,
    visible: true,

    // ── Effects ──
    glowEnabled: false,
    glowColor: '#ffffff',
    glowDistance: 15,
    glowStrength: 2,
    glowPulse: false,

    shadowEnabled: false,
    shadowColor: '#000000',
    shadowAlpha: 0.5,
    shadowBlur: 4,
    shadowOffsetX: 3,
    shadowOffsetY: 3,

    outlineEnabled: false,
    outlineColor: '#000000',
    outlineWidth: 2,

    // ── Behaviors ──
    behaviors: [],               // array of { behaviorType, config }

    // ── Custom properties ──
    properties: {}               // arbitrary key-value pairs
  };
}

function getDefaultEmoji(type) {
  const emojiMap = {
    player: '🧍',
    enemy: '👾',
    pickup: '⭐',
    goal: '🚩',
    npc: '🧑',
    hazard: '⚠️',
    generic: '🔲'
  };
  return emojiMap[type] || '🔲';
}

// ─────────────────────────────────────────────────────────────────
// DECORATION
// ─────────────────────────────────────────────────────────────────

export function createDecoration(gridX = 0, gridY = 0) {
  return {
    id: generateId('deco'),
    name: 'Decoration',
    gridX,
    gridY,
    
    // ── Visual (same as Entity) ──
    assetId: null,
    fallbackEmoji: '🌿',
    scale: 1,
    rotation: 0,
    flipX: false,
    flipY: false,
    tintColor: '#ffffff',
    alpha: 1,
    visible: true,
    zOrder: 0,                   // negative = behind entities, positive = in front

    // ── Effects ──
    glowEnabled: false,
    glowColor: '#ffffff',
    glowDistance: 15,
    glowStrength: 2,
    glowPulse: false,

    shadowEnabled: false,
    shadowColor: '#000000',
    shadowAlpha: 0.5,
    shadowBlur: 4,
    shadowOffsetX: 3,
    shadowOffsetY: 3,

    outlineEnabled: false,
    outlineColor: '#000000',
    outlineWidth: 2
  };
}

// ─────────────────────────────────────────────────────────────────
// ASSET
// ─────────────────────────────────────────────────────────────────

export function createAsset(name, base64, width, height, category = 'misc') {
  return {
    id: generateId('asset'),
    name,
    category,                    // 'background', 'platform', 'sprite', 'pickup', 'icon', 'misc'
    base64,                      // data URL (data:image/png;base64,...)
    width,
    height,
    createdAt: Date.now()
  };
}

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

/**
 * Deep clone a scene (for duplication)
 */
export function cloneScene(scene, newName) {
  const cloned = JSON.parse(JSON.stringify(scene));
  cloned.id = generateId('scene');
  cloned.name = newName || `${scene.name} (Copy)`;
  cloned.createdAt = Date.now();
  cloned.updatedAt = Date.now();
  
  // Regenerate IDs for all nested objects
  const regenIds = (arr, prefix) => arr.forEach(item => {
    item.id = generateId(prefix);
  });
  
  regenIds(cloned.layers.parallax, 'parallax');
  regenIds(cloned.layers.platforms, 'platform');
  regenIds(cloned.layers.entities, 'entity');
  regenIds(cloned.layers.decorations, 'deco');
  
  return cloned;
}

/**
 * Find an entity by ID across all scenes
 */
export function findEntityById(project, entityId) {
  for (const scene of project.scenes) {
    const entity = scene.layers.entities.find(e => e.id === entityId);
    if (entity) return { scene, entity };
  }
  return null;
}

/**
 * Get asset by ID
 */
export function getAssetById(project, assetId) {
  return project.assets.find(a => a.id === assetId) || null;
}
