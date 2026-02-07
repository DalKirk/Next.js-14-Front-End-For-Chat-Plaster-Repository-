/**
 * Scene Templates - Pre-configured scene setups for different game types
 * 
 * Similar to Unreal Engine's project templates, but for 2D games
 */

import { createScene } from './SceneData';

// Template categories
export const TEMPLATE_CATEGORIES = {
  PLATFORMER: 'platformer',
  TOP_DOWN: 'top-down',
  SHOOTER: 'shooter',
  DIALOG: 'dialog',
};

/**
 * Scene template definitions
 */
export const SCENE_TEMPLATES = [
  {
    id: 'platformer',
    name: 'Platformer',
    description: 'Side-scrolling platformer with gravity, jumping, and platforms',
    icon: '🏃',
    category: TEMPLATE_CATEGORIES.PLATFORMER,
    preview: '/templates/platformer-preview.png',
    settings: {
      canvasWidth: 800,
      canvasHeight: 600,
      backgroundColor: '#1a1a2e',
      gravity: 980,
      cameraStyle: 'horizontal-follow',
    },
    defaultLayers: {
      parallax: [],
      platforms: [
        // Ground platform
        { id: 'ground', gridX: 0, gridY: 14, gridWidth: 25, gridHeight: 2, type: 'solid' },
        // Some starter platforms
        { id: 'plat-1', gridX: 3, gridY: 11, gridWidth: 4, gridHeight: 1, type: 'solid' },
        { id: 'plat-2', gridX: 10, gridY: 9, gridWidth: 4, gridHeight: 1, type: 'solid' },
        { id: 'plat-3', gridX: 17, gridY: 7, gridWidth: 4, gridHeight: 1, type: 'solid' },
      ],
      entities: [],
      decorations: [],
    },
    playerStart: { x: 80, y: 480, enabled: true },
    camera: {
      followPlayer: true,
      smoothing: 0.08,
      bounds: { minX: 0, maxX: 800, minY: 0, maxY: 600 }, // Fixed to canvas size
      style: 'horizontal',
    },
    physics: {
      gravity: { x: 0, y: 980 },
      airControl: 0.3,
      jumpForce: 450,
    },
  },
  
  {
    id: 'platformer-shooter',
    name: 'Platformer Shooter',
    description: 'Run-and-gun platformer with shooting mechanics',
    icon: '🔫',
    category: TEMPLATE_CATEGORIES.SHOOTER,
    preview: '/templates/platformer-shooter-preview.png',
    settings: {
      canvasWidth: 800,
      canvasHeight: 600,
      backgroundColor: '#0d1117',
      gravity: 980,
      cameraStyle: 'horizontal-follow',
    },
    defaultLayers: {
      parallax: [],
      platforms: [
        { id: 'ground', gridX: 0, gridY: 14, gridWidth: 25, gridHeight: 2, type: 'solid' },
        { id: 'cover-1', gridX: 5, gridY: 12, gridWidth: 2, gridHeight: 2, type: 'solid' },
        { id: 'cover-2', gridX: 12, gridY: 12, gridWidth: 2, gridHeight: 2, type: 'solid' },
        { id: 'plat-high', gridX: 8, gridY: 8, gridWidth: 5, gridHeight: 1, type: 'solid' },
      ],
      entities: [],
      decorations: [],
    },
    playerStart: { x: 80, y: 480, enabled: true },
    camera: {
      followPlayer: true,
      smoothing: 0.1,
      bounds: { minX: 0, maxX: 800, minY: 0, maxY: 600 }, // Fixed to canvas size
      style: 'horizontal',
    },
    physics: {
      gravity: { x: 0, y: 980 },
      airControl: 0.5,
      jumpForce: 400,
    },
    weapons: {
      defaultWeapon: 'pistol',
      aimStyle: 'mouse',
    },
  },
  
  {
    id: 'top-down',
    name: 'Top Down',
    description: 'Classic top-down view for RPGs and adventure games',
    icon: '🗺️',
    category: TEMPLATE_CATEGORIES.TOP_DOWN,
    preview: '/templates/top-down-preview.png',
    settings: {
      canvasWidth: 800,
      canvasHeight: 600,
      backgroundColor: '#2d5a27',
      gravity: 0,
      cameraStyle: 'follow-center',
    },
    defaultLayers: {
      parallax: [],
      platforms: [],
      entities: [],
      decorations: [],
      walls: [
        // Border walls
        { id: 'wall-top', gridX: 0, gridY: 0, gridWidth: 20, gridHeight: 1, type: 'wall' },
        { id: 'wall-bottom', gridX: 0, gridY: 14, gridWidth: 20, gridHeight: 1, type: 'wall' },
        { id: 'wall-left', gridX: 0, gridY: 0, gridWidth: 1, gridHeight: 15, type: 'wall' },
        { id: 'wall-right', gridX: 19, gridY: 0, gridWidth: 1, gridHeight: 15, type: 'wall' },
      ],
    },
    playerStart: { x: 400, y: 300, enabled: true },
    camera: {
      followPlayer: true,
      smoothing: 0.1,
      bounds: { minX: 0, maxX: 800, minY: 0, maxY: 600 }, // Fixed to canvas size
      style: 'center',
    },
    physics: {
      gravity: { x: 0, y: 0 },
      friction: 0.9,
      moveSpeed: 200,
    },
    movement: {
      style: '8-directional',
      speed: 200,
    },
  },
  
  {
    id: 'top-down-shooter',
    name: 'Top Down Shooter',
    description: 'Twin-stick shooter or arena combat game',
    icon: '🎯',
    category: TEMPLATE_CATEGORIES.SHOOTER,
    preview: '/templates/top-down-shooter-preview.png',
    settings: {
      canvasWidth: 800,
      canvasHeight: 600,
      backgroundColor: '#1a1a1a',
      gravity: 0,
      cameraStyle: 'follow-center',
    },
    defaultLayers: {
      parallax: [],
      platforms: [],
      entities: [],
      decorations: [],
      walls: [
        // Arena walls
        { id: 'wall-top', gridX: 0, gridY: 0, gridWidth: 20, gridHeight: 1, type: 'wall' },
        { id: 'wall-bottom', gridX: 0, gridY: 14, gridWidth: 20, gridHeight: 1, type: 'wall' },
        { id: 'wall-left', gridX: 0, gridY: 0, gridWidth: 1, gridHeight: 15, type: 'wall' },
        { id: 'wall-right', gridX: 19, gridY: 0, gridWidth: 1, gridHeight: 15, type: 'wall' },
        // Cover objects
        { id: 'cover-1', gridX: 5, gridY: 5, gridWidth: 2, gridHeight: 2, type: 'wall' },
        { id: 'cover-2', gridX: 13, gridY: 5, gridWidth: 2, gridHeight: 2, type: 'wall' },
        { id: 'cover-3', gridX: 9, gridY: 9, gridWidth: 2, gridHeight: 2, type: 'wall' },
      ],
    },
    playerStart: { x: 400, y: 300, enabled: true },
    camera: {
      followPlayer: true,
      smoothing: 0.15,
      bounds: { minX: 0, maxX: 800, minY: 0, maxY: 600 },
      style: 'center',
    },
    physics: {
      gravity: { x: 0, y: 0 },
      friction: 0.85,
      moveSpeed: 250,
    },
    weapons: {
      defaultWeapon: 'pistol',
      aimStyle: 'mouse',
    },
    movement: {
      style: '8-directional',
      speed: 250,
    },
  },
  
  {
    id: 'visual-novel',
    name: 'Visual Novel / Dialog',
    description: 'Story-driven game with character portraits and dialog boxes',
    icon: '💬',
    category: TEMPLATE_CATEGORIES.DIALOG,
    preview: '/templates/visual-novel-preview.png',
    settings: {
      canvasWidth: 800,
      canvasHeight: 600,
      backgroundColor: '#1e1e2e',
      gravity: 0,
      cameraStyle: 'static',
    },
    defaultLayers: {
      parallax: [],
      platforms: [],
      entities: [],
      decorations: [],
      ui: [
        // Dialog box area
        { id: 'dialog-box', type: 'ui-panel', x: 50, y: 400, width: 700, height: 180 },
        // Character portrait areas
        { id: 'portrait-left', type: 'portrait-slot', x: 50, y: 100, width: 250, height: 300, side: 'left' },
        { id: 'portrait-right', type: 'portrait-slot', x: 500, y: 100, width: 250, height: 300, side: 'right' },
      ],
    },
    playerStart: { x: 400, y: 300, enabled: false },
    camera: {
      followPlayer: false,
      smoothing: 0,
      bounds: { minX: 0, maxX: 800, minY: 0, maxY: 600 }, // Fixed to canvas size
      style: 'static',
    },
    dialog: {
      boxStyle: 'modern',
      typewriterSpeed: 30,
      showNameplate: true,
    },
  },
  
  {
    id: 'blank',
    name: 'Blank Scene',
    description: 'Empty scene - start from scratch',
    icon: '📄',
    category: null,
    preview: null,
    settings: {
      canvasWidth: 800,
      canvasHeight: 600,
      backgroundColor: '#1a1a2e',
      gravity: 0,
      cameraStyle: 'static',
    },
    defaultLayers: {
      parallax: [],
      platforms: [],
      entities: [],
      decorations: [],
    },
    playerStart: { x: 400, y: 300, enabled: true },
    camera: {
      followPlayer: true,
      smoothing: 0.1,
      bounds: { minX: 0, maxX: 800, minY: 0, maxY: 600 },
      style: 'center',
    },
  },
];

/**
 * Create a scene from a template
 * @param {string} templateId - The template to use
 * @param {string} sceneName - Name for the new scene
 * @returns {Object} The created scene
 */
export const createSceneFromTemplate = (templateId, sceneName = 'New Scene') => {
  const template = SCENE_TEMPLATES.find(t => t.id === templateId);
  
  if (!template) {
    console.warn(`[SceneTemplates] Template not found: ${templateId}, using blank`);
    return createScene(sceneName);
  }
  
  const baseScene = createScene(sceneName);
  
  // Apply template settings
  const scene = {
    ...baseScene,
    name: sceneName,
    backgroundColor: template.settings.backgroundColor,
    playerStart: { ...template.playerStart },
    camera: { ...template.camera },
    layers: {
      parallax: [...(template.defaultLayers.parallax || [])],
      platforms: (template.defaultLayers.platforms || []).map(p => ({
        ...p,
        id: `${p.id}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      })),
      entities: [...(template.defaultLayers.entities || [])],
      decorations: [...(template.defaultLayers.decorations || [])],
      walls: (template.defaultLayers.walls || []).map(w => ({
        ...w,
        id: `${w.id}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      })),
      ui: [...(template.defaultLayers.ui || [])],
    },
    // Template metadata
    templateId: template.id,
    templateSettings: {
      physics: template.physics,
      movement: template.movement,
      weapons: template.weapons,
      dialog: template.dialog,
    },
  };
  
  console.log(`[SceneTemplates] Created scene from template: ${template.name}`);
  return scene;
};

/**
 * Get template by ID
 */
export const getTemplate = (templateId) => {
  return SCENE_TEMPLATES.find(t => t.id === templateId);
};

/**
 * Get templates by category
 */
export const getTemplatesByCategory = (category) => {
  if (!category) return SCENE_TEMPLATES;
  return SCENE_TEMPLATES.filter(t => t.category === category);
};

export default {
  SCENE_TEMPLATES,
  TEMPLATE_CATEGORIES,
  createSceneFromTemplate,
  getTemplate,
  getTemplatesByCategory,
};
