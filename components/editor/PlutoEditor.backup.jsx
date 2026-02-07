'use client';

import React, { useState, useRef, useCallback, useEffect, useReducer } from 'react';
import { Panel, Group, Separator } from 'react-resizable-panels';
import * as PIXI from 'pixi.js';
import { GlowFilter } from 'pixi-filters';

// Sub-components
import MenuBar from './MenuBar';
import ProjectMenu from './ProjectMenu';
import SlotPicker from './SlotPicker';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import BottomPanel from './BottomPanel';
import SceneView from './SceneView';
import { SceneEditorPanel } from '../SceneEditor';

// Scene Manager
import { createProject, createScene, createEntity, createPlatform } from '../../lib/scenes';

// Persistence
import { ProjectStorage, useAutoSave } from '../../lib/persistence';

// Utilities
import { SpriteManager } from '../../lib/SpriteManager';
import { OptimizedParticleSystem } from '../../lib/OptimizedParticleSystem';
import { FilterManager } from '../../lib/FilterManager';

/**
 * PlutoEditor - Professional Game Engine UI
 * 
 * Features:
 * - 4-panel resizable layout (Unity-style)
 * - Scene hierarchy on left
 * - Inspector on right
 * - Assets/Events/Console on bottom
 * - PixiJS WebGL canvas in center
 */
const PlutoEditor = () => {
  // ============================================
  // STATE
  // ============================================
  
  // Editor mode
  const [mode, setMode] = useState('edit'); // 'edit' or 'play'
  const [selectedTool, setSelectedTool] = useState('select');
  
  // Events expanded view mode
  const [eventsExpanded, setEventsExpanded] = useState(false);
  
  // Scenes expanded view mode
  const [scenesExpanded, setScenesExpanded] = useState(false);
  
  // Selection
  const [selectedObject, setSelectedObject] = useState(null);
  const [selectedLayer, setSelectedLayer] = useState('entities');
  const selectedObjectRef = useRef(null);
  
  // Keep ref in sync with state
  useEffect(() => {
    selectedObjectRef.current = selectedObject;
  }, [selectedObject]);
  
  // Bottom panel
  const [activeTab, setActiveTab] = useState('events');
  
  // Force update helper (for triggering re-renders after ref mutations)
  const [, forceUpdate] = useReducer(x => x + 1, 0);
  
  // Helper to create default project
  const createDefaultProject = () => {
    const proj = createProject('My Game');
    // Create initial scene
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
  
  // Project state - try to load from autosave first
  const [project, setProject] = useState(() => {
    // Try to load from autosave
    const autosaved = ProjectStorage.loadAutosave();
    if (autosaved) {
      console.log('[PlutoEditor] Restored project from autosave:', autosaved.name);
      return autosaved;
    }
    // Otherwise create default project
    return createDefaultProject();
  });
  const [currentSceneId, setCurrentSceneId] = useState(() => project.scenes[0]?.id || null);
  
  // Autosave hook - automatically saves project changes to localStorage
  const [autosaveEnabled, setAutosaveEnabled] = useState(true);
  const { saveNow } = useAutoSave(project, autosaveEnabled, {
    debounceMs: 500,
    onSave: () => {
      console.log('[PlutoEditor] Autosave complete');
    },
    onQuotaExceeded: () => {
      console.warn('[PlutoEditor] localStorage quota exceeded - use Export to save');
      addConsoleLog('warning', 'Auto-save disabled: storage full. Use Export to save your project.');
      setAutosaveEnabled(false);
    },
    onError: (error) => {
      console.error('[PlutoEditor] Autosave error:', error);
    }
  });
  
  // Slot picker modal state
  const [slotPickerOpen, setSlotPickerOpen] = useState(false);
  const [slotPickerMode, setSlotPickerMode] = useState('save'); // 'save' or 'load'
  
  // ============================================
  // FILE OPERATION HANDLERS
  // ============================================
  
  // Create a new empty project
  const handleNewProject = useCallback(() => {
    if (confirm('Create a new project? Any unsaved changes will be lost.')) {
      const newProject = createProject('Untitled Project');
      const initialScene = createScene('Scene 1');
      newProject.scenes = [initialScene];
      newProject.startSceneId = initialScene.id;
      setProject(newProject);
      setCurrentSceneId(initialScene.id);
      addConsoleLog('info', 'New project created');
    }
  }, []);
  
  // Create a new scene in current project
  const handleNewScene = useCallback(() => {
    const sceneCount = project.scenes.length + 1;
    const newScene = createScene(`Scene ${sceneCount}`);
    setProject(prev => ({
      ...prev,
      scenes: [...prev.scenes, newScene]
    }));
    setCurrentSceneId(newScene.id);
    addConsoleLog('info', `Created new scene: ${newScene.name}`);
  }, [project.scenes.length]);
  
  // Open project from a save slot
  const handleOpenProject = useCallback(() => {
    setSlotPickerMode('load');
    setSlotPickerOpen(true);
  }, []);
  
  // Save to a slot (Save As)
  const handleSaveAs = useCallback(() => {
    setSlotPickerMode('save');
    setSlotPickerOpen(true);
  }, []);
  
  // Quick save (autosave + feedback)
  const handleSave = useCallback(() => {
    if (saveNow) {
      saveNow();
      addConsoleLog('info', 'Project saved');
    }
  }, [saveNow]);
  
  // Export project to JSON file
  const handleExportProject = useCallback(() => {
    ProjectStorage.exportProject(project);
    addConsoleLog('info', `Exported: ${project.name}.pluto`);
  }, [project]);
  
  // Import project from JSON file
  const handleImportProject = useCallback(() => {
    ProjectStorage.openImportDialog((importedProject) => {
      if (importedProject) {
        setProject(importedProject);
        if (importedProject.scenes.length > 0) {
          setCurrentSceneId(importedProject.startSceneId || importedProject.scenes[0].id);
        }
        addConsoleLog('success', `Imported project: ${importedProject.name}`);
      }
    });
  }, []);
  
  // Slot picker callback
  const handleSlotSelect = useCallback((slotIndex, slotData) => {
    if (slotPickerMode === 'save') {
      ProjectStorage.saveSlot(slotIndex, project);
      addConsoleLog('success', `Saved to slot ${slotIndex + 1}`);
    } else {
      // Load mode
      if (slotData) {
        setProject(slotData);
        if (slotData.scenes.length > 0) {
          setCurrentSceneId(slotData.startSceneId || slotData.scenes[0].id);
        }
        addConsoleLog('success', `Loaded from slot ${slotIndex + 1}: ${slotData.name}`);
      }
    }
    setSlotPickerOpen(false);
  }, [slotPickerMode, project]);
  
  // Derive scene objects from current scene in project (unified with Scene Manager)
  const currentScene = project.scenes.find(s => s.id === currentSceneId);
  const GRID_SIZE = 40; // Grid cell size in pixels
  const sceneObjects = React.useMemo(() => {
    // Find scene from project state to ensure we have latest data
    const scene = project.scenes.find(s => s.id === currentSceneId);
    console.log('[PlutoEditor] Deriving sceneObjects for scene:', currentSceneId, scene?.name, 'from', project.scenes.length, 'scenes');
    if (!scene) {
      console.log('[PlutoEditor] No current scene found!');
      return [];
    }
    // Combine entities from scene layers, converting to SceneView format
    const entities = (scene.layers?.entities || []).map(entity => ({
      id: entity.id,
      name: entity.name || entity.type,
      type: entity.type,
      icon: entity.fallbackEmoji || '❓',
      x: (entity.gridX || 0) * GRID_SIZE, // Convert grid to pixels
      y: (entity.gridY || 0) * GRID_SIZE,
      width: entity.width || 40,
      height: entity.height || 40,
      visible: entity.visible !== false,
      behaviors: entity.behaviors || [],
      variables: entity.variables || entity.properties || {},
      ...entity // Include any other properties
    }));
    console.log('[PlutoEditor] Scene entities:', entities.length, entities.map(e => e.name));
    return entities;
  }, [project.scenes, currentSceneId, GRID_SIZE]);
  
  // Function to update scene objects in project
  const setSceneObjects = React.useCallback((updater) => {
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
  }, [currentSceneId, GRID_SIZE]);

  // Add an asset to the current scene as an entity
  const handleAddAssetToScene = React.useCallback((asset) => {
    console.log('[PlutoEditor] handleAddAssetToScene called with:', asset);
    console.log('[PlutoEditor] currentSceneId:', currentSceneId);
    
    if (!currentSceneId) {
      console.error('[PlutoEditor] No currentSceneId!');
      return;
    }
    
    // Create a new entity from the asset
    // Limit size to max 200px, scale down proportionally for large images
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
      gridX: 5, // Default position in center-ish
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
    
    console.log('[PlutoEditor] Creating new entity:', newEntity);
    
    setProject(prev => {
      console.log('[PlutoEditor] Updating project, scenes:', prev.scenes.length);
      const sceneIndex = prev.scenes.findIndex(s => s.id === currentSceneId);
      console.log('[PlutoEditor] Scene index:', sceneIndex);
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
      
      console.log('[PlutoEditor] New entities count:', newScenes[sceneIndex].layers.entities.length);
      return { ...prev, scenes: newScenes };
    });
    
    console.log('[PlutoEditor] Added asset to scene:', asset.name, newEntity.id);
  }, [currentSceneId]);

  // Layers (for layer panel UI)
  const [layers, setLayers] = useState([
    { id: 'background', name: 'Background', visible: true, locked: false },
    { id: 'platforms', name: 'Platforms', visible: true, locked: false },
    { id: 'entities', name: 'Entities', visible: true, locked: false },
    { id: 'ui', name: 'UI', visible: true, locked: false },
  ]);

  // Derive platforms from current scene in project
  const platforms = React.useMemo(() => {
    if (!currentScene) return [];
    return (currentScene.layers?.platforms || []).map(p => ({
      x: p.gridX,
      y: p.gridY,
      width: p.gridWidth,
      height: p.gridHeight,
      ...p
    }));
  }, [currentScene]);

  // Events (using new Event System format)
  const [events, setEvents] = useState([
    {
      id: 'event-1',
      name: 'Collect Coin',
      enabled: true,
      priority: 0,
      triggerOnce: false,
      conditions: [
        { id: 'cond-1', type: 'collision', params: { objectA: 'player-1', objectB: 'coin', objectBType: 'type' }, inverted: false }
      ],
      actions: [
        { id: 'act-1', type: 'addToVariable', params: { variable: 'score', value: 10 }, delay: 0 },
        { id: 'act-2', type: 'playSound', params: { soundId: 'coin' }, delay: 0 },
        { id: 'act-3', type: 'destroyObject', params: { target: 'other' }, delay: 0 }
      ],
      comment: 'Player collects coins for points'
    },
    {
      id: 'event-2',
      name: 'Enemy Hit',
      enabled: true,
      priority: 0,
      triggerOnce: false,
      conditions: [
        { id: 'cond-2', type: 'collision', params: { objectA: 'player-1', objectB: 'enemy', objectBType: 'type' }, inverted: false }
      ],
      actions: [
        { id: 'act-4', type: 'subtractFromVariable', params: { variable: 'health', value: 1 }, delay: 0 },
        { id: 'act-5', type: 'playSound', params: { soundId: 'hit' }, delay: 0 }
      ],
      comment: 'Player takes damage from enemies'
    },
    {
      id: 'event-3',
      name: 'Reach Goal',
      enabled: true,
      priority: 10,
      triggerOnce: true,
      conditions: [
        { id: 'cond-3', type: 'collision', params: { objectA: 'player-1', objectB: 'goal-1' }, inverted: false }
      ],
      actions: [
        { id: 'act-6', type: 'showText', params: { text: 'You Win!', duration: 3 }, delay: 0 },
        { id: 'act-7', type: 'playSound', params: { soundId: 'victory' }, delay: 0 },
        { id: 'act-8', type: 'pauseGame', params: {}, delay: 0.5 }
      ],
      comment: 'Win condition when reaching the goal'
    }
  ]);
  
  // Selected event for editing
  const [selectedEventId, setSelectedEventId] = useState(null);

  // Console logs
  const [consoleLogs, setConsoleLogs] = useState([
    { type: 'info', message: 'Pluto Engine initialized', time: new Date() },
    { type: 'success', message: 'Scene loaded: Main', time: new Date() },
  ]);

  // Game state
  const [gameState, setGameState] = useState({
    score: 0,
    health: 3,
    isPlaying: false,
  });

  // View settings
  const [viewSettings, setViewSettings] = useState({
    zoom: 100,
    showGrid: true,
    snapToGrid: true,
    gridSize: 40,
  });

  // ============================================
  // REFS
  // ============================================
  const pixiAppRef = useRef(null);
  const spriteManagerRef = useRef(null);
  const filterManagerRef = useRef(null);
  const particleSystemRef = useRef(null);
  const audioSystemRef = useRef(null);

  // ============================================
  // EFFECTS
  // ============================================

  // Keep selectedObject in sync with sceneObjects (for when objects are updated externally)
  useEffect(() => {
    if (selectedObject) {
      const updatedObj = sceneObjects.find(o => o.id === selectedObject.id);
      if (updatedObj) {
        // Only update if values actually changed
        const hasChanges = Object.keys(updatedObj).some(key => 
          updatedObj[key] !== selectedObject[key]
        );
        if (hasChanges) {
          setSelectedObject(updatedObj);
        }
      }
    }
  }, [sceneObjects]); // Intentionally excluding selectedObject to prevent loops

  // ============================================
  // CALLBACKS
  // ============================================

  // Add console log (defined first since other callbacks use it)
  const addConsoleLog = useCallback((type, message) => {
    setConsoleLogs(prev => [...prev, { type, message, time: new Date() }]);
  }, []);

  // Listen for sprite animations exported from Sprite Editor
  useEffect(() => {
    // BroadcastChannel listener for cross-tab exports
    let bc;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel('gamebuilder-animations');
        bc.onmessage = (ev) => {
          try {
            const animData = ev.data;
            if (animData && animData.states) {
              console.log('[PlutoEditor] Received animation from Sprite Editor:', animData.name, animData);
              
              // Get total frame count across all states
              let totalFrames = 0;
              const stateNames = Object.keys(animData.states);
              stateNames.forEach(stateName => {
                const state = animData.states[stateName];
                if (state.frames) totalFrames += state.frames.length;
              });
              
              // Use spriteSheet.src as thumbnail if available (new format uses frame indices)
              const thumbnail = animData.spriteSheet?.src || null;
              
              // Store animation asset with full data intact
              setProject(prev => {
                const newAsset = {
                  id: `anim-${Date.now()}`,
                  name: animData.name || 'Imported Animation',
                  type: 'animation',
                  category: 'sprite',
                  data: animData, // Keep full animation data with all frames
                  thumbnail: thumbnail, // Sprite sheet image for preview
                  spriteSheet: animData.spriteSheet, // Store sprite sheet info
                  createdAt: Date.now()
                };
                
                return {
                  ...prev,
                  assets: [...(prev.assets || []), newAsset]
                };
              });
              
              addConsoleLog('success', `Animation imported: ${animData.name || 'Untitled'} (${totalFrames} frames, ${stateNames.length} states)`);
            }
          } catch (err) {
            console.error('[PlutoEditor] Error handling animation:', err);
            addConsoleLog('error', `Import failed: ${err.message}`);
          }
        };
      } catch (err) {
        console.warn('[PlutoEditor] BroadcastChannel initialization failed:', err);
      }
    }

    // CustomEvent fallback for same-page SPA export
    const customHandler = (e) => {
      try {
        const animData = e?.detail;
        if (animData && animData.states) {
          console.log('[PlutoEditor] Received animation via CustomEvent:', animData.name, animData);
          
          // Get total frame count
          let totalFrames = 0;
          const stateNames = Object.keys(animData.states);
          stateNames.forEach(stateName => {
            const state = animData.states[stateName];
            if (state.frames) totalFrames += state.frames.length;
          });
          
          // Use spriteSheet.src as thumbnail if available (new format uses frame indices)
          const thumbnail = animData.spriteSheet?.src || null;
          
          setProject(prev => {
            const newAsset = {
              id: `anim-${Date.now()}`,
              name: animData.name || 'Imported Animation',
              type: 'animation',
              category: 'sprite',
              data: animData,
              thumbnail: thumbnail, // Sprite sheet image for preview
              spriteSheet: animData.spriteSheet, // Store sprite sheet info
              createdAt: Date.now()
            };
            
            return {
              ...prev,
              assets: [...(prev.assets || []), newAsset]
            };
          });
          
          addConsoleLog('success', `Animation imported: ${animData.name || 'Untitled'} (${totalFrames} frames, ${stateNames.length} states)`);
        }
      } catch (err) {
        console.error('[PlutoEditor] Error handling animation:', err);
        addConsoleLog('error', `Import failed: ${err.message}`);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('gamebuilder:importAnimation', customHandler);
    }

    // Cleanup
    return () => {
      if (bc) bc.close();
      if (typeof window !== 'undefined') {
        window.removeEventListener('gamebuilder:importAnimation', customHandler);
      }
    };
  }, [addConsoleLog]);

  // Add new object
  const addObject = useCallback((type) => {
    const icons = { player: '😊', enemy: '👾', coin: '🪙', platform: '🟫', goal: '🏁', npc: '🧑' };
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
      behaviors: [],
      variables: {}
    };
    setSceneObjects(prev => [...prev, newObj]);
    setSelectedObject(newObj);
    addConsoleLog('info', `Created new ${type}: ${newObj.name}`);
  }, [setSceneObjects, addConsoleLog]);

  // Delete object
  const deleteObject = useCallback((objId) => {
    setSceneObjects(prev => prev.filter(o => o.id !== objId));
    if (selectedObjectRef.current?.id === objId) {
      setSelectedObject(null);
    }
    addConsoleLog('info', `Deleted object: ${objId}`);
  }, [setSceneObjects, addConsoleLog]);

  // Update object
  const updateObject = useCallback((objId, updates) => {
    setSceneObjects(prev => prev.map(o => 
      o.id === objId ? { ...o, ...updates } : o
    ));
    // Don't update selectedObject here - let it sync from sceneObjects naturally
    // This prevents infinite loops during drag operations
  }, [setSceneObjects]);

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
    addConsoleLog('info', `Player start set to (${newPlayerStart.x}, ${newPlayerStart.y})`);
  }, [currentSceneId, addConsoleLog]);

  // Toggle layer visibility
  const toggleLayerVisibility = useCallback((layerId) => {
    setLayers(prev => prev.map(l =>
      l.id === layerId ? { ...l, visible: !l.visible } : l
    ));
  }, []);

  // Load a project (from slot or import)
  const handleLoadProject = useCallback((loadedProject) => {
    console.log('[PlutoEditor] Loading project:', loadedProject.name);
    setProject(loadedProject);
    // Set current scene to the first scene or the start scene
    const startScene = loadedProject.scenes.find(s => s.id === loadedProject.startSceneId) 
      || loadedProject.scenes[0];
    if (startScene) {
      setCurrentSceneId(startScene.id);
    }
    setSelectedObject(null);
    addConsoleLog('info', `Loaded project: ${loadedProject.name}`);
  }, [addConsoleLog]);

  // Add event (new format)
  const addEvent = useCallback(() => {
    const newEvent = {
      id: `event-${Date.now()}`,
      name: `Event ${events.length + 1}`,
      enabled: true,
      priority: 0,
      triggerOnce: false,
      conditions: [],
      actions: [],
      comment: '',
      createdAt: new Date().toISOString()
    };
    setEvents(prev => [...prev, newEvent]);
    setSelectedEventId(newEvent.id);
    addConsoleLog('info', `Created new event: ${newEvent.name}`);
  }, [events.length, addConsoleLog]);

  // Delete event
  const deleteEvent = useCallback((eventId) => {
    setEvents(prev => prev.filter(e => e.id !== eventId));
    if (selectedEventId === eventId) {
      setSelectedEventId(null);
    }
    addConsoleLog('info', `Deleted event`);
  }, [selectedEventId, addConsoleLog]);

  // Start/Stop game
  const togglePlay = useCallback(() => {
    if (mode === 'edit') {
      setMode('play');
      setGameState({ score: 0, health: 3, isPlaying: true });
      addConsoleLog('success', 'Game started');
    } else {
      setMode('edit');
      setGameState(prev => ({ ...prev, isPlaying: false }));
      addConsoleLog('info', 'Game stopped');
    }
  }, [mode]);

  // Handle PixiJS ready
  const handlePixiReady = useCallback((app) => {
    pixiAppRef.current = app;
    spriteManagerRef.current = new SpriteManager(app);
    filterManagerRef.current = new FilterManager(app);
    particleSystemRef.current = new OptimizedParticleSystem(app, 5000);
    addConsoleLog('success', 'PixiJS renderer initialized');
  }, []);

  // Handle Audio System ready
  const handleAudioSystemReady = useCallback((audio) => {
    audioSystemRef.current = audio;
    addConsoleLog('success', 'Audio system initialized');
  }, []);

  // Add animation to scene as animated player entity
  const handleAddAnimationToScene = useCallback((animationAsset) => {
    if (!animationAsset || !animationAsset.data) {
      addConsoleLog('error', 'Invalid animation asset');
      return;
    }

    // Get first frame from first state for visual display
    const states = animationAsset.data.states || {};
    const firstState = states[Object.keys(states)[0]];
    const firstFrame = firstState?.frames?.[0];

    // Get the sprite sheet source as thumbnail for the icon
    const spriteSheetSrc = animationAsset.data.spriteSheet?.src;
    
    // Create animated player entity
    const newPlayer = {
      id: `player-${Date.now()}`,
      name: animationAsset.name || 'Animated Player',
      type: 'player',
      icon: '🎬', // Fallback emoji icon for sidebar
      thumbnail: spriteSheetSrc || animationAsset.thumbnail, // Sprite sheet for visual preview
      animationAssetId: animationAsset.id, // Store reference to animation asset
      animationData: animationAsset.data, // Store full animation data
      x: 100, // Start near left for side-scrolling games
      y: 468, // On ground (floorY=500 minus player height ~32)
      width: animationAsset.data.spriteSheet?.frameWidth || 40,
      height: animationAsset.data.spriteSheet?.frameHeight || 40,
      visible: true,
      behaviors: [], // User can add PlatformCharacter behavior
      variables: {}
    };

    // Add to scene objects
    setSceneObjects(prev => [...prev, newPlayer]);
    setSelectedObject(newPlayer);
    addConsoleLog('success', `Added animated player: ${newPlayer.name}`);
  }, [setSceneObjects, addConsoleLog]);

  // Add object with specific sprite/animation
  const handleAddObjectWithSprite = useCallback((type, animationAsset) => {
    if (!animationAsset || !animationAsset.data) {
      addConsoleLog('error', 'Invalid animation asset');
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
    addConsoleLog('success', `Added ${type} with sprite: ${newObj.name}`);
  }, [setSceneObjects, addConsoleLog]);

  // ============================================
  // KEYBOARD SHORTCUTS
  // ============================================
  // Use refs for callbacks to avoid dependency array size changes
  const saveNowRef = useRef(saveNow);
  const addConsoleLogRef = useRef(addConsoleLog);
  const deleteObjectRef = useRef(deleteObject);
  const togglePlayRef = useRef(togglePlay);
  
  // Keep refs updated
  useEffect(() => {
    saveNowRef.current = saveNow;
    addConsoleLogRef.current = addConsoleLog;
    deleteObjectRef.current = deleteObject;
    togglePlayRef.current = togglePlay;
  });
  
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Prevent shortcuts when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      // Ctrl+S - Save
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveNowRef.current?.();
        addConsoleLogRef.current?.('info', 'Project saved');
      }
      // Ctrl+Z - Undo
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        addConsoleLogRef.current?.('info', 'Undo');
      }
      // Delete - Delete selected
      if (e.key === 'Delete' && selectedObject) {
        deleteObjectRef.current?.(selectedObject.id);
      }
      // Escape - Deselect
      if (e.key === 'Escape') {
        setSelectedObject(null);
      }
      // Space - Toggle play (when not in input)
      if (e.key === ' ' && e.ctrlKey) {
        e.preventDefault();
        togglePlayRef.current?.();
      }
      // Tool shortcuts
      if (e.key === 'v') setSelectedTool('select');
      if (e.key === 'b') setSelectedTool('draw');
      if (e.key === 'r') setSelectedTool('rect');
      if (e.key === 'h') setSelectedTool('pan');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedObject]); // Only selectedObject as dependency

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="h-screen flex flex-col bg-zinc-900 text-white overflow-hidden">
      {/* Project Menu - Save/Load/Export/Import */}
      <ProjectMenu
        project={project}
        onLoadProject={handleLoadProject}
        onNewProject={handleNewProject}
        onProjectChange={setProject}
        disabled={mode === 'play'}
      />
      
      {/* Menu Bar */}
      <MenuBar 
        mode={mode}
        onModeChange={setMode}
        onTogglePlay={togglePlay}
        onAddObject={addObject}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
        onNewScene={handleNewScene}
        onNewProject={handleNewProject}
        onOpenProject={handleOpenProject}
        onImportProject={handleImportProject}
        onExportProject={handleExportProject}
        onOpenEvents={() => setEventsExpanded(!eventsExpanded)}
        eventsExpanded={eventsExpanded}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {scenesExpanded ? (
          /* Full-Screen Scenes Mode */
          <div className="h-full w-full flex flex-col bg-zinc-900">
            {/* Scenes Mode Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-800 border-b border-zinc-700">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎬</span>
                <h1 className="text-xl font-bold text-white">Scene Manager</h1>
                <span className="text-sm text-zinc-400">({project.scenes.length} scenes)</span>
              </div>
              <button
                onClick={() => setScenesExpanded(false)}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition text-sm font-medium"
              >
                <span>🎮</span>
                Back to Editor
              </button>
            </div>
            {/* Full Scene Editor */}
            <div className="flex-1 overflow-hidden p-4">
              <SceneEditorPanel
                project={project}
                onProjectChange={setProject}
                currentSceneId={currentSceneId}
                onSceneSelect={setCurrentSceneId}
                isExpanded={true}
                onAddAssetToScene={handleAddAssetToScene}
              />
            </div>
          </div>
        ) : eventsExpanded ? (
          /* Full-Screen Events Mode */
          <div className="h-full w-full flex flex-col bg-zinc-900">
            {/* Events Mode Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-800 border-b border-zinc-700">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚡</span>
                <h1 className="text-xl font-bold text-white">Event Editor</h1>
                <span className="text-sm text-zinc-400">({events.length} events)</span>
              </div>
              <button
                onClick={() => setEventsExpanded(false)}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition text-sm font-medium"
              >
                <span>🎮</span>
                Back to Scene
              </button>
            </div>
            {/* Full Events Editor */}
            <div className="flex-1 overflow-hidden">
              <BottomPanel
                activeTab="events"
                onTabChange={() => {}}
                events={events}
                onEventsChange={setEvents}
                selectedEventId={selectedEventId}
                onSelectEvent={setSelectedEventId}
                onAddEvent={addEvent}
                onDeleteEvent={deleteEvent}
                consoleLogs={consoleLogs}
                audioSystem={audioSystemRef}
                gameState={gameState}
                sceneObjects={sceneObjects}
                isExpanded={true}
                project={project}
                onProjectChange={setProject}
                currentSceneId={currentSceneId}
                onSceneSelect={setCurrentSceneId}
                onAddAssetToScene={handleAddAssetToScene}
              />
            </div>
          </div>
        ) : (
          /* Normal Editor Layout */
          <Group orientation="horizontal" className="h-full w-full">
            {/* Left Sidebar */}
            <Panel id="left" defaultSize={18}>
              <LeftSidebar
                objects={sceneObjects}
                selectedObject={selectedObject}
                onSelectObject={setSelectedObject}
                onAddObject={addObject}
                onAddObjectWithSprite={handleAddObjectWithSprite}
                onDeleteObject={deleteObject}
                layers={layers}
                selectedLayer={selectedLayer}
                onSelectLayer={setSelectedLayer}
                onToggleLayerVisibility={toggleLayerVisibility}
                assets={project.assets}
              />
            </Panel>

            <Separator className="w-1.5 bg-zinc-700 hover:bg-blue-500 cursor-col-resize" />

            {/* Center - Scene View + Bottom Panel */}
            <Panel id="center" defaultSize={62}>
              <Group orientation="vertical" className="h-full w-full">
                {/* Scene View */}
                <Panel id="scene" defaultSize={70}>
                  <SceneView
                    mode={mode}
                    selectedTool={selectedTool}
                    onToolChange={setSelectedTool}
                    viewSettings={viewSettings}
                    onViewSettingsChange={setViewSettings}
                    sceneObjects={sceneObjects}
                    selectedObject={selectedObject}
                    onSelectObject={setSelectedObject}
                    onUpdateObject={updateObject}
                    platforms={platforms}
                    layers={layers}
                    events={events}
                    onPixiReady={handlePixiReady}
                    onAudioSystemReady={handleAudioSystemReady}
                    gameState={gameState}
                    project={project}
                    currentSceneId={currentSceneId}
                    currentSceneName={currentScene?.name}
                    assets={project.assets}
                    playerStart={currentScene?.playerStart}
                    onUpdatePlayerStart={updatePlayerStart}
                  />
                </Panel>

                <Separator className="h-1.5 bg-zinc-700 hover:bg-blue-500 cursor-row-resize" />

                {/* Bottom Panel */}
                <Panel id="bottom" defaultSize={30}>
                  <BottomPanel
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    events={events}
                    onEventsChange={setEvents}
                    selectedEventId={selectedEventId}
                    onSelectEvent={setSelectedEventId}
                    onAddEvent={addEvent}
                    onDeleteEvent={deleteEvent}
                    consoleLogs={consoleLogs}
                    assets={project.assets}
                    audioSystem={audioSystemRef}
                    gameState={gameState}
                    sceneObjects={sceneObjects}
                    onExpandEvents={() => setEventsExpanded(true)}
                    onExpandScenes={() => setScenesExpanded(true)}
                    project={project}
                    onProjectChange={setProject}
                    currentSceneId={currentSceneId}
                    onSceneSelect={setCurrentSceneId}
                    onAddAssetToScene={handleAddAssetToScene}
                    onAddAnimationToScene={handleAddAnimationToScene}
                  />
                </Panel>
              </Group>
            </Panel>

            <Separator className="w-1.5 bg-zinc-700 hover:bg-blue-500 cursor-col-resize" />

            {/* Right Sidebar - Inspector */}
            <Panel id="right" defaultSize={20}>
              <RightSidebar
                selectedObject={selectedObject}
                onUpdateObject={updateObject}
                onDeleteObject={deleteObject}
                assets={project.assets}
              />
            </Panel>
          </Group>
        )}
      </div>
      
      {/* Slot Picker Modal */}
      <SlotPicker
        isOpen={slotPickerOpen}
        onClose={() => setSlotPickerOpen(false)}
        onSelect={handleSlotSelect}
        mode={slotPickerMode}
      />
    </div>
  );
};

export default PlutoEditor;
