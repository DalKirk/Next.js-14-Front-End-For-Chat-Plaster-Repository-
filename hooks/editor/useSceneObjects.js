'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

const GRID_SIZE = 40; // Grid cell size in pixels

/**
 * useSceneObjects - Manages scene objects (entities) state
 * 
 * @param {Object} project - Current project state
 * @param {Function} setProject - Project state setter
 * @param {string} currentSceneId - Currently active scene ID
 * @param {Function} addConsoleLog - Function to log to console
 * @returns {Object} Scene objects state and actions
 */
export function useSceneObjects(project, setProject, currentSceneId, addConsoleLog) {
  const [selectedObject, setSelectedObject] = useState(null);
  const selectedObjectRef = useRef(null);
  
  // Keep ref in sync with state
  useEffect(() => {
    selectedObjectRef.current = selectedObject;
  }, [selectedObject]);

  // Derive scene objects from current scene in project
  const sceneObjects = useMemo(() => {
    const scene = project.scenes.find(s => s.id === currentSceneId);
    if (!scene) return [];
    
    // Convert entities from scene layers to SceneView format
    return (scene.layers?.entities || []).map(entity => ({
      id: entity.id,
      name: entity.name || entity.type,
      type: entity.type,
      icon: entity.fallbackEmoji || '❓',
      x: (entity.gridX || 0) * GRID_SIZE,
      y: (entity.gridY || 0) * GRID_SIZE,
      width: entity.width || 40,
      height: entity.height || 40,
      visible: entity.visible !== false,
      behaviors: entity.behaviors || [],
      variables: entity.variables || entity.properties || {},
      ...entity
    }));
  }, [project.scenes, currentSceneId]);

  // Function to update scene objects in project
  const setSceneObjects = useCallback((updater) => {
    setProject(prev => {
      const sceneIndex = prev.scenes.findIndex(s => s.id === currentSceneId);
      if (sceneIndex === -1) return prev;
      
      const scene = prev.scenes[sceneIndex];
      const currentEntities = scene.layers?.entities || [];
      
      // Convert entity format to sceneObjects format for the updater
      const sceneObjectsFormat = currentEntities.map(e => ({
        ...e,
        x: (e.gridX || 0) * GRID_SIZE,
        y: (e.gridY || 0) * GRID_SIZE,
        icon: e.fallbackEmoji || '❓',
        variables: e.variables || e.properties || {}
      }));
      
      const newSceneObjects = typeof updater === 'function' 
        ? updater(sceneObjectsFormat)
        : updater;
      
      // Convert back to entity format with grid coordinates
      const convertedEntities = newSceneObjects.map(obj => ({
        ...obj,
        gridX: Math.round((obj.x || 0) / GRID_SIZE),
        gridY: Math.round((obj.y || 0) / GRID_SIZE),
        fallbackEmoji: obj.icon,
        properties: obj.variables,
      }));
      
      const newScenes = [...prev.scenes];
      newScenes[sceneIndex] = {
        ...scene,
        layers: {
          ...scene.layers,
          entities: convertedEntities
        },
        updatedAt: Date.now()
      };
      
      return { ...prev, scenes: newScenes };
    });
  }, [currentSceneId, setProject]);

  // Add new object
  const addObject = useCallback((type) => {
    const icons = { player: '😊', enemy: '👾', coin: '🪙', platform: '🟫', goal: '🏁', npc: '🧑' };
    
    // Set default behaviors based on object type
    const defaultBehaviors = [];
    if (type === 'player') {
      defaultBehaviors.push({
        type: 'platform',
        config: {
          speed: 200,
          jumpStrength: 400,
          gravity: 800,
          leftKey: 'ArrowLeft',
          rightKey: 'ArrowRight',
          jumpKey: ' '
        }
      });
    }
    
    const newObj = {
      id: `${type}-${Date.now()}`,
      name: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      type,
      icon: icons[type] || '📦',
      x: 400,
      y: 300,
      width: 40,
      height: 40,
      visible: true,
      behaviors: defaultBehaviors,
      variables: {}
    };
    setSceneObjects(prev => [...prev, newObj]);
    setSelectedObject(newObj);
    addConsoleLog?.('info', `Created new ${type}: ${newObj.name}`);
    return newObj;
  }, [setSceneObjects, addConsoleLog]);

  // Delete object
  const deleteObject = useCallback((objId) => {
    setSceneObjects(prev => prev.filter(o => o.id !== objId));
    if (selectedObjectRef.current?.id === objId) {
      setSelectedObject(null);
    }
    addConsoleLog?.('info', `Deleted object: ${objId}`);
  }, [setSceneObjects, addConsoleLog]);

  // Update object
  const updateObject = useCallback((objId, updates) => {
    setSceneObjects(prev => prev.map(o => 
      o.id === objId ? { ...o, ...updates } : o
    ));
  }, [setSceneObjects]);

  // Keep selectedObject in sync with sceneObjects
  useEffect(() => {
    if (selectedObject) {
      const updatedObj = sceneObjects.find(o => o.id === selectedObject.id);
      if (updatedObj) {
        const hasChanges = Object.keys(updatedObj).some(key => 
          updatedObj[key] !== selectedObject[key]
        );
        if (hasChanges) {
          setSelectedObject(updatedObj);
        }
      }
    }
  }, [sceneObjects]); // Intentionally excluding selectedObject to prevent loops

  // Add object with specific sprite/animation
  const addObjectWithSprite = useCallback((type, animationAsset) => {
    if (!animationAsset || !animationAsset.data) {
      addConsoleLog?.('error', 'Invalid animation asset');
      return;
    }

    const icons = { player: '😊', enemy: '👾', coin: '🪙', platform: '🟫', goal: '🏁', npc: '🧑' };
    const spriteSheetSrc = animationAsset.data.spriteSheet?.src;
    
    const newObj = {
      id: `${type}-${Date.now()}`,
      name: `${animationAsset.name || 'Animated'} ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      type,
      icon: icons[type] || '🎬',
      thumbnail: spriteSheetSrc || animationAsset.thumbnail,
      animationAssetId: animationAsset.id,
      animationData: animationAsset.data,
      x: 400,
      y: 300,
      width: animationAsset.data.spriteSheet?.frameWidth || 40,
      height: animationAsset.data.spriteSheet?.frameHeight || 40,
      visible: true,
      behaviors: [],
      variables: {}
    };

    setSceneObjects(prev => [...prev, newObj]);
    setSelectedObject(newObj);
    addConsoleLog?.('success', `Added ${type} with sprite: ${newObj.name}`);
    return newObj;
  }, [setSceneObjects, addConsoleLog]);

  // Add animation to scene as animated player entity
  const addAnimationToScene = useCallback((animationAsset) => {
    if (!animationAsset || !animationAsset.data) {
      addConsoleLog?.('error', 'Invalid animation asset');
      return;
    }

    const spriteSheetSrc = animationAsset.data.spriteSheet?.src;
    
    const newPlayer = {
      id: `player-${Date.now()}`,
      name: animationAsset.name || 'Animated Player',
      type: 'player',
      icon: '🎬',
      thumbnail: spriteSheetSrc || animationAsset.thumbnail,
      animationAssetId: animationAsset.id,
      animationData: animationAsset.data,
      x: 100,
      y: 468,
      width: animationAsset.data.spriteSheet?.frameWidth || 40,
      height: animationAsset.data.spriteSheet?.frameHeight || 40,
      visible: true,
      behaviors: [
        // Add default platform movement behavior for player
        {
          type: 'platform',
          config: {
            speed: 200,
            jumpStrength: 400,
            gravity: 800,
            leftKey: 'ArrowLeft',
            rightKey: 'ArrowRight',
            jumpKey: ' '
          }
        },
        // Add animated sprite behavior if it has animation data
        {
          type: 'animatedSprite',
          config: {
            animationAssetId: animationAsset.id
          }
        }
      ],
      variables: {}
    };

    setSceneObjects(prev => [...prev, newPlayer]);
    setSelectedObject(newPlayer);
    addConsoleLog?.('success', `Added animated player: ${newPlayer.name}`);
    return newPlayer;
  }, [setSceneObjects, addConsoleLog]);

  return {
    sceneObjects,
    setSceneObjects,
    selectedObject,
    setSelectedObject,
    selectedObjectRef,
    addObject,
    deleteObject,
    updateObject,
    addObjectWithSprite,
    addAnimationToScene,
    GRID_SIZE,
  };
}

export default useSceneObjects;
