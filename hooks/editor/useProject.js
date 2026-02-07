'use client';

import { useState, useCallback, useMemo } from 'react';
import { createProject, createScene, createEntity, createPlatform } from '../../lib/scenes';
import { ProjectStorage } from '../../lib/persistence';

/**
 * Helper to create a default project with sample content
 */
const createDefaultProject = () => {
  const proj = createProject('My Game');
  const initialScene = createScene('Level 1');
  initialScene.layers.entities = [
    { ...createEntity('player', 1, 13), id: 'player-1', name: 'Player', fallbackEmoji: '😊' },
    { ...createEntity('enemy', 6, 13), id: 'enemy-1', name: 'Enemy 1', fallbackEmoji: '👾' },
    { ...createEntity('enemy', 12, 13), id: 'enemy-2', name: 'Enemy 2', fallbackEmoji: '👾' },
    { ...createEntity('pickup', 4, 8), id: 'coin-1', name: 'Coin 1', fallbackEmoji: '🪙' },
    { ...createEntity('pickup', 8, 7), id: 'coin-2', name: 'Coin 2', fallbackEmoji: '🪙' },
    { ...createEntity('pickup', 14, 6), id: 'coin-3', name: 'Coin 3', fallbackEmoji: '🪙' },
    { ...createEntity('goal', 19, 13), id: 'goal-1', name: 'Goal', fallbackEmoji: '🏁' },
  ];
  initialScene.layers.platforms = [
    createPlatform(0, 14, 20, 1),
    createPlatform(3, 11, 3, 1),
    createPlatform(8, 9, 4, 1),
    createPlatform(14, 11, 3, 1),
  ];
  proj.scenes = [initialScene];
  proj.startSceneId = initialScene.id;
  return proj;
};

/**
 * useProject - Manages project state and scene navigation
 * 
 * @returns {Object} Project state and actions
 */
export function useProject() {
  // Project state - try to load from autosave first
  const [project, setProject] = useState(() => {
    const autosaved = ProjectStorage.loadAutosave();
    if (autosaved) {
      console.log('[useProject] Restored project from autosave:', autosaved.name);
      return autosaved;
    }
    return createDefaultProject();
  });
  
  const [currentSceneId, setCurrentSceneId] = useState(() => project.scenes[0]?.id || null);

  // Current scene helper
  const currentScene = useMemo(() => {
    return project.scenes.find(s => s.id === currentSceneId);
  }, [project.scenes, currentSceneId]);

  // Derive platforms from current scene
  const platforms = useMemo(() => {
    if (!currentScene) return [];
    return (currentScene.layers?.platforms || []).map(p => ({
      x: p.gridX,
      y: p.gridY,
      width: p.gridWidth,
      height: p.gridHeight,
      ...p
    }));
  }, [currentScene]);

  // Update player start position for current scene
  const updatePlayerStart = useCallback((newPlayerStart) => {
    setProject(prev => {
      const sceneIndex = prev.scenes.findIndex(s => s.id === currentSceneId);
      if (sceneIndex === -1) return prev;
      
      const newScenes = [...prev.scenes];
      newScenes[sceneIndex] = {
        ...newScenes[sceneIndex],
        playerStart: {
          ...newScenes[sceneIndex].playerStart,
          ...newPlayerStart
        },
        updatedAt: Date.now()
      };
      
      return { ...prev, scenes: newScenes };
    });
  }, [currentSceneId]);

  // Add an asset to the current scene as an entity
  const addAssetToScene = useCallback((asset) => {
    if (!currentSceneId) {
      console.error('[useProject] No currentSceneId!');
      return;
    }
    
    const maxSize = 200;
    let width = asset.width || 40;
    let height = asset.height || 40;
    
    if (width > maxSize || height > maxSize) {
      const scale = maxSize / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }
    
    const newEntity = {
      id: `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: asset.category === 'sprite' ? 'sprite' : asset.category,
      name: asset.name,
      gridX: 5,
      gridY: 10,
      width: width,
      height: height,
      assetId: asset.id,
      fallbackEmoji: '🖼️',
      visible: true,
      scale: 1,
      rotation: 0,
      alpha: 1,
      behaviors: [],
      variables: {}
    };
    
    setProject(prev => {
      const sceneIndex = prev.scenes.findIndex(s => s.id === currentSceneId);
      if (sceneIndex === -1) return prev;
      
      const scene = prev.scenes[sceneIndex];
      const newScenes = [...prev.scenes];
      newScenes[sceneIndex] = {
        ...scene,
        layers: {
          ...scene.layers,
          entities: [...(scene.layers?.entities || []), newEntity]
        },
        updatedAt: Date.now()
      };
      
      return { ...prev, scenes: newScenes };
    });
    
    return newEntity;
  }, [currentSceneId]);

  // Add asset to project's assets array
  const addAsset = useCallback((asset) => {
    setProject(prev => ({
      ...prev,
      assets: [...(prev.assets || []), asset]
    }));
  }, []);

  return {
    project,
    setProject,
    currentSceneId,
    setCurrentSceneId,
    currentScene,
    platforms,
    updatePlayerStart,
    addAssetToScene,
    addAsset,
    createDefaultProject,
  };
}

export default useProject;
