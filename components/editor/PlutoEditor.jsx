'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Panel, Group, Separator } from 'react-resizable-panels';

// Sub-components
import MenuBar from './MenuBar';
import ProjectMenu from './ProjectMenu';
import SlotPicker from './SlotPicker';
import SceneTemplatePicker from './SceneTemplatePicker';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import BottomPanel from './BottomPanel';
import SceneView from './SceneView';
import { SceneEditorPanel } from '../SceneEditor';

// Custom hooks
import {
  useConsole,
  useEvents,
  useSceneObjects,
  useFileOperations,
  useGameState,
  useProject,
  usePixiSystems,
} from '../../hooks/editor';

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
  // HOOKS - Organized by concern
  // ============================================
  
  // Console logging
  const { consoleLogs, addConsoleLog } = useConsole();
  
  // Project and scene management
  const {
    project,
    setProject,
    currentSceneId,
    setCurrentSceneId,
    currentScene,
    platforms,
    updatePlayerStart,
    addAssetToScene,
    addAsset,
  } = useProject();
  
  // Game state and mode
  const {
    mode,
    setMode,
    gameState,
    togglePlay,
  } = useGameState(addConsoleLog);
  
  // Scene objects (entities)
  const {
    sceneObjects,
    selectedObject,
    setSelectedObject,
    selectedObjectRef,
    addObject,
    deleteObject,
    updateObject,
    addObjectWithSprite,
    addAnimationToScene,
  } = useSceneObjects(project, setProject, currentSceneId, addConsoleLog);
  
  // File operations (save, load, export, import)
  const {
    slotPickerOpen,
    slotPickerMode,
    closeSlotPicker,
    templatePickerOpen,
    templatePickerMode,
    closeTemplatePicker,
    handleCreateSceneFromTemplate,
    handleNewProject,
    handleNewScene,
    handleOpenProject,
    handleSaveAs,
    handleSave,
    handleExportProject,
    handleImportProject,
    handleLoadProject,
    handleSlotSelect,
    handleClearStorage,
  } = useFileOperations(project, setProject, setCurrentSceneId, addConsoleLog);
  
  // Events system
  const {
    events,
    setEvents,
    selectedEventId,
    setSelectedEventId,
    addEvent,
    deleteEvent,
  } = useEvents(addConsoleLog);
  
  // PixiJS systems
  const {
    audioSystemRef,
    handlePixiReady,
    handleAudioSystemReady,
  } = usePixiSystems(addConsoleLog);

  // ============================================
  // LOCAL STATE
  // ============================================
  
  // UI state
  const [selectedTool, setSelectedTool] = useState('select');
  const [eventsExpanded, setEventsExpanded] = useState(false);
  const [scenesExpanded, setScenesExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('events');
  const [selectedLayer, setSelectedLayer] = useState('entities');
  
  // Layers
  const [layers, setLayers] = useState([
    { id: 'background', name: 'Background', visible: true, locked: false },
    { id: 'platforms', name: 'Platforms', visible: true, locked: false },
    { id: 'entities', name: 'Entities', visible: true, locked: false },
    { id: 'ui', name: 'UI', visible: true, locked: false },
  ]);

  // View settings
  const [viewSettings, setViewSettings] = useState({
    zoom: 100,
    showGrid: true,
    snapToGrid: true,
    gridSize: 40,
  });

  // ============================================
  // CALLBACKS
  // ============================================
  
  // Toggle layer visibility
  const toggleLayerVisibility = useCallback((layerId) => {
    setLayers(prev => prev.map(l =>
      l.id === layerId ? { ...l, visible: !l.visible } : l
    ));
  }, []);

  // Handle adding asset to scene (wrapper with logging)
  const handleAddAssetToScene = useCallback((asset) => {
    const entity = addAssetToScene(asset);
    if (entity) {
      addConsoleLog('info', `Added asset to scene: ${asset.name}`);
    }
  }, [addAssetToScene, addConsoleLog]);

  // Handle player start update (wrapper with logging)
  const handleUpdatePlayerStart = useCallback((newPlayerStart) => {
    updatePlayerStart(newPlayerStart);
    addConsoleLog('info', `Player start set to (${newPlayerStart.x}, ${newPlayerStart.y})`);
  }, [updatePlayerStart, addConsoleLog]);

  // Handle adding object with custom properties (for drag-drop)
  const handleAddObject = useCallback((objectData) => {
    if (!currentSceneId) {
      console.error('[PlutoEditor] No currentSceneId!');
      return;
    }
    
    const newEntity = {
      id: objectData.id,
      type: objectData.type,
      name: objectData.name,
      gridX: Math.round(objectData.x / 40), // Convert world coords to grid
      gridY: Math.round(objectData.y / 40),
      width: objectData.width,
      height: objectData.height,
      assetId: objectData.assetId,
      fallbackEmoji: objectData.icon || '🖼️',
      visible: objectData.visible !== false,
      scale: objectData.scale || 1,
      rotation: objectData.rotation || 0,
      alpha: objectData.alpha ?? 1,
      zIndex: objectData.zIndex ?? 10,
      physics: objectData.physics !== false,
      isStatic: objectData.isStatic ?? false,
      behaviors: objectData.behaviors || [],
      variables: objectData.variables || {}
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
    
    addConsoleLog('info', `Added object to scene: ${objectData.name} at (${objectData.x}, ${objectData.y})`);
  }, [currentSceneId, setProject, addConsoleLog]);

  // ============================================
  // EFFECTS
  // ============================================

  // Listen for sprite animations exported from Sprite Editor
  useEffect(() => {
    let bc;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel('gamebuilder-animations');
        bc.onmessage = (ev) => {
          try {
            const animData = ev.data;
            if (animData && animData.states) {
              console.log('[PlutoEditor] Received animation from Sprite Editor:', animData.name);
              
              let totalFrames = 0;
              const stateNames = Object.keys(animData.states);
              stateNames.forEach(stateName => {
                const state = animData.states[stateName];
                if (state.frames) totalFrames += state.frames.length;
              });
              
              const thumbnail = animData.spriteSheet?.src || null;
              
              const newAsset = {
                id: `anim-${Date.now()}`,
                name: animData.name || 'Imported Animation',
                type: 'animation',
                category: 'sprite',
                data: animData,
                thumbnail: thumbnail,
                spriteSheet: animData.spriteSheet,
                createdAt: Date.now()
              };
              
              addAsset(newAsset);
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

    // CustomEvent fallback
    const customHandler = (e) => {
      try {
        const animData = e?.detail;
        if (animData && animData.states) {
          let totalFrames = 0;
          const stateNames = Object.keys(animData.states);
          stateNames.forEach(stateName => {
            const state = animData.states[stateName];
            if (state.frames) totalFrames += state.frames.length;
          });
          
          const thumbnail = animData.spriteSheet?.src || null;
          
          const newAsset = {
            id: `anim-${Date.now()}`,
            name: animData.name || 'Imported Animation',
            type: 'animation',
            category: 'sprite',
            data: animData,
            thumbnail: thumbnail,
            spriteSheet: animData.spriteSheet,
            createdAt: Date.now()
          };
          
          addAsset(newAsset);
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

    return () => {
      if (bc) bc.close();
      if (typeof window !== 'undefined') {
        window.removeEventListener('gamebuilder:importAnimation', customHandler);
      }
    };
  }, [addAsset, addConsoleLog]);

  // ============================================
  // KEYBOARD SHORTCUTS
  // ============================================
  const handleSaveRef = useRef(handleSave);
  const addConsoleLogRef = useRef(addConsoleLog);
  const deleteObjectRef = useRef(deleteObject);
  const togglePlayRef = useRef(togglePlay);
  
  useEffect(() => {
    handleSaveRef.current = handleSave;
    addConsoleLogRef.current = addConsoleLog;
    deleteObjectRef.current = deleteObject;
    togglePlayRef.current = togglePlay;
  });
  
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleSaveRef.current?.();
      }
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        addConsoleLogRef.current?.('info', 'Undo');
      }
      if (e.key === 'Delete' && selectedObject) {
        deleteObjectRef.current?.(selectedObject.id);
      }
      if (e.key === 'Escape') {
        setSelectedObject(null);
      }
      if (e.key === ' ' && e.ctrlKey) {
        e.preventDefault();
        togglePlayRef.current?.();
      }
      if (e.key === 'v') setSelectedTool('select');
      if (e.key === 'b') setSelectedTool('draw');
      if (e.key === 'r') setSelectedTool('rect');
      if (e.key === 'h') setSelectedTool('pan');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedObject, setSelectedObject]);

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="h-screen flex flex-col bg-zinc-900 text-white overflow-hidden">
      {/* Project Menu */}
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
        onClearStorage={handleClearStorage}
        onOpenEvents={() => setEventsExpanded(!eventsExpanded)}
        eventsExpanded={eventsExpanded}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {scenesExpanded ? (
          <ScenesExpandedView
            project={project}
            onProjectChange={setProject}
            currentSceneId={currentSceneId}
            onSceneSelect={setCurrentSceneId}
            onClose={() => setScenesExpanded(false)}
            onAddAssetToScene={handleAddAssetToScene}
          />
        ) : eventsExpanded ? (
          <EventsExpandedView
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
            project={project}
            onProjectChange={setProject}
            currentSceneId={currentSceneId}
            onSceneSelect={setCurrentSceneId}
            onAddAssetToScene={handleAddAssetToScene}
            onClose={() => setEventsExpanded(false)}
          />
        ) : (
          <NormalEditorLayout
            // Left sidebar
            sceneObjects={sceneObjects}
            selectedObject={selectedObject}
            onSelectObject={setSelectedObject}
            onAddObject={handleAddObject}
            onAddObjectWithSprite={addObjectWithSprite}
            onDeleteObject={deleteObject}
            layers={layers}
            selectedLayer={selectedLayer}
            onSelectLayer={setSelectedLayer}
            onToggleLayerVisibility={toggleLayerVisibility}
            assets={project.assets}
            // Scene view
            mode={mode}
            selectedTool={selectedTool}
            onToolChange={setSelectedTool}
            viewSettings={viewSettings}
            onViewSettingsChange={setViewSettings}
            onUpdateObject={updateObject}
            platforms={platforms}
            events={events}
            onPixiReady={handlePixiReady}
            onAudioSystemReady={handleAudioSystemReady}
            gameState={gameState}
            project={project}
            currentSceneId={currentSceneId}
            currentScene={currentScene}
            playerStart={currentScene?.playerStart}
            onUpdatePlayerStart={handleUpdatePlayerStart}
            // Bottom panel
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onEventsChange={setEvents}
            selectedEventId={selectedEventId}
            onSelectEvent={setSelectedEventId}
            onAddEvent={addEvent}
            onDeleteEvent={deleteEvent}
            consoleLogs={consoleLogs}
            audioSystem={audioSystemRef}
            onExpandEvents={() => setEventsExpanded(true)}
            onExpandScenes={() => setScenesExpanded(true)}
            onProjectChange={setProject}
            onSceneSelect={setCurrentSceneId}
            onAddAssetToScene={handleAddAssetToScene}
            onAddAnimationToScene={addAnimationToScene}
          />
        )}
      </div>
      
      {/* Slot Picker Modal */}
      <SlotPicker
        isOpen={slotPickerOpen}
        onClose={closeSlotPicker}
        onSelect={handleSlotSelect}
        mode={slotPickerMode}
      />
      
      {/* Scene Template Picker Modal */}
      <SceneTemplatePicker
        isOpen={templatePickerOpen}
        onClose={closeTemplatePicker}
        onSelect={handleCreateSceneFromTemplate}
        mode={templatePickerMode}
      />
    </div>
  );
};

// ============================================
// SUB-COMPONENTS (extracted for readability)
// ============================================

/**
 * Full-screen scenes view
 */
const ScenesExpandedView = ({
  project,
  onProjectChange,
  currentSceneId,
  onSceneSelect,
  onClose,
  onAddAssetToScene,
}) => (
  <div className="h-full w-full flex flex-col bg-zinc-900">
    <div className="flex items-center justify-between px-4 py-3 bg-zinc-800 border-b border-zinc-700">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🎬</span>
        <h1 className="text-xl font-bold text-white">Scene Manager</h1>
        <span className="text-sm text-zinc-400">({project.scenes.length} scenes)</span>
      </div>
      <button
        onClick={onClose}
        className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition text-sm font-medium"
      >
        <span>🎮</span>
        Back to Editor
      </button>
    </div>
    <div className="flex-1 overflow-hidden p-4">
      <SceneEditorPanel
        project={project}
        onProjectChange={onProjectChange}
        currentSceneId={currentSceneId}
        onSceneSelect={onSceneSelect}
        isExpanded={true}
        onAddAssetToScene={onAddAssetToScene}
      />
    </div>
  </div>
);

/**
 * Full-screen events view
 */
const EventsExpandedView = ({
  events,
  onEventsChange,
  selectedEventId,
  onSelectEvent,
  onAddEvent,
  onDeleteEvent,
  consoleLogs,
  audioSystem,
  gameState,
  sceneObjects,
  project,
  onProjectChange,
  currentSceneId,
  onSceneSelect,
  onAddAssetToScene,
  onClose,
}) => (
  <div className="h-full w-full flex flex-col bg-zinc-900">
    <div className="flex items-center justify-between px-4 py-3 bg-zinc-800 border-b border-zinc-700">
      <div className="flex items-center gap-3">
        <span className="text-2xl">⚡</span>
        <h1 className="text-xl font-bold text-white">Event Editor</h1>
        <span className="text-sm text-zinc-400">({events.length} events)</span>
      </div>
      <button
        onClick={onClose}
        className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition text-sm font-medium"
      >
        <span>🎮</span>
        Back to Scene
      </button>
    </div>
    <div className="flex-1 overflow-hidden">
      <BottomPanel
        activeTab="events"
        onTabChange={() => {}}
        events={events}
        onEventsChange={onEventsChange}
        selectedEventId={selectedEventId}
        onSelectEvent={onSelectEvent}
        onAddEvent={onAddEvent}
        onDeleteEvent={onDeleteEvent}
        consoleLogs={consoleLogs}
        audioSystem={audioSystem}
        gameState={gameState}
        sceneObjects={sceneObjects}
        isExpanded={true}
        project={project}
        onProjectChange={onProjectChange}
        currentSceneId={currentSceneId}
        onSceneSelect={onSceneSelect}
        onAddAssetToScene={onAddAssetToScene}
      />
    </div>
  </div>
);

/**
 * Normal 4-panel editor layout
 */
const NormalEditorLayout = ({
  // Left sidebar props
  sceneObjects,
  selectedObject,
  onSelectObject,
  onAddObject,
  onAddObjectWithSprite,
  onDeleteObject,
  layers,
  selectedLayer,
  onSelectLayer,
  onToggleLayerVisibility,
  assets,
  // Scene view props
  mode,
  selectedTool,
  onToolChange,
  viewSettings,
  onViewSettingsChange,
  onUpdateObject,
  platforms,
  events,
  onPixiReady,
  onAudioSystemReady,
  gameState,
  project,
  currentSceneId,
  currentScene,
  playerStart,
  onUpdatePlayerStart,
  // Bottom panel props
  activeTab,
  onTabChange,
  onEventsChange,
  selectedEventId,
  onSelectEvent,
  onAddEvent,
  onDeleteEvent,
  consoleLogs,
  audioSystem,
  onExpandEvents,
  onExpandScenes,
  onProjectChange,
  onSceneSelect,
  onAddAssetToScene,
  onAddAnimationToScene,
}) => (
  <Group orientation="horizontal" className="h-full w-full">
    {/* Left Sidebar */}
    <Panel id="left" defaultSize={18}>
      <LeftSidebar
        objects={sceneObjects}
        selectedObject={selectedObject}
        onSelectObject={onSelectObject}
        onAddObject={onAddObject}
        onAddObjectWithSprite={onAddObjectWithSprite}
        onDeleteObject={onDeleteObject}
        layers={layers}
        selectedLayer={selectedLayer}
        onSelectLayer={onSelectLayer}
        onToggleLayerVisibility={onToggleLayerVisibility}
        assets={assets}
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
            onToolChange={onToolChange}
            viewSettings={viewSettings}
            onViewSettingsChange={onViewSettingsChange}
            sceneObjects={sceneObjects}
            selectedObject={selectedObject}
            onSelectObject={onSelectObject}
            onUpdateObject={onUpdateObject}
            onAddObject={onAddObject}
            platforms={platforms}
            layers={layers}
            events={events}
            onPixiReady={onPixiReady}
            onAudioSystemReady={onAudioSystemReady}
            gameState={gameState}
            project={project}
            currentSceneId={currentSceneId}
            currentSceneName={currentScene?.name}
            assets={assets}
            playerStart={playerStart}
            onUpdatePlayerStart={onUpdatePlayerStart}
          />
        </Panel>

        <Separator className="h-1.5 bg-zinc-700 hover:bg-blue-500 cursor-row-resize" />

        {/* Bottom Panel */}
        <Panel id="bottom" defaultSize={30}>
          <BottomPanel
            activeTab={activeTab}
            onTabChange={onTabChange}
            events={events}
            onEventsChange={onEventsChange}
            selectedEventId={selectedEventId}
            onSelectEvent={onSelectEvent}
            onAddEvent={onAddEvent}
            onDeleteEvent={onDeleteEvent}
            consoleLogs={consoleLogs}
            assets={assets}
            audioSystem={audioSystem}
            gameState={gameState}
            sceneObjects={sceneObjects}
            onExpandEvents={onExpandEvents}
            onExpandScenes={onExpandScenes}
            project={project}
            onProjectChange={onProjectChange}
            currentSceneId={currentSceneId}
            onSceneSelect={onSceneSelect}
            onAddAssetToScene={onAddAssetToScene}
            onAddAnimationToScene={onAddAnimationToScene}
          />
        </Panel>
      </Group>
    </Panel>

    <Separator className="w-1.5 bg-zinc-700 hover:bg-blue-500 cursor-col-resize" />

    {/* Right Sidebar - Inspector */}
    <Panel id="right" defaultSize={20}>
      <RightSidebar
        selectedObject={selectedObject}
        onUpdateObject={onUpdateObject}
        onDeleteObject={onDeleteObject}
        assets={assets}
      />
    </Panel>
  </Group>
);

export default PlutoEditor;
