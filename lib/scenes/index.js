// lib/scenes/index.js
// Export all scene system components

export { 
  createProject,
  createScene,
  createParallaxLayer,
  createPlatform,
  createEntity,
  createDecoration,
  createAsset,
  cloneScene,
  findEntityById,
  getAssetById
} from './SceneData';

export {
  SCENE_TEMPLATES,
  TEMPLATE_CATEGORIES,
  createSceneFromTemplate,
  getTemplate,
  getTemplatesByCategory,
} from './SceneTemplates';

export { AssetManager } from './AssetManager';
export { LayerRenderer } from './LayerRenderer';
export { SceneManager } from './SceneManager';
