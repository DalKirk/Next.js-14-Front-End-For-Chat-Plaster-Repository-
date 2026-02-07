'use client';

import { useState, useCallback, useEffect } from 'react';
import { ProjectStorage } from '../../lib/persistence';
import { createProject, createScene, createSceneFromTemplate } from '../../lib/scenes';

/**
 * useFileOperations - Manages file operations (save, load, export, import)
 * 
 * @param {Object} project - Current project state
 * @param {Function} setProject - Project state setter
 * @param {Function} setCurrentSceneId - Scene ID state setter
 * @param {Function} addConsoleLog - Function to log to console
 * @returns {Object} File operation handlers and state
 */
export function useFileOperations(project, setProject, setCurrentSceneId, addConsoleLog) {
  // Slot picker modal state
  const [slotPickerOpen, setSlotPickerOpen] = useState(false);
  const [slotPickerMode, setSlotPickerMode] = useState('save'); // 'save' or 'load'
  
  // Template picker modal state
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [templatePickerMode, setTemplatePickerMode] = useState('scene'); // 'scene' or 'project'

  // ============================================
  // SAVE ON PAGE CLOSE - Only save when user leaves/refreshes
  // ============================================
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (project) {
        try {
          ProjectStorage.saveAutosave(project);
        } catch (e) {
          // Silently fail if project is too large
          console.warn('[useFileOperations] Could not save on close:', e.message);
        }
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [project]);

  // Create a new project (opens template picker)
  const handleNewProject = useCallback(() => {
    if (confirm('Create a new project? Any unsaved changes will be lost.')) {
      setTemplatePickerMode('project');
      setTemplatePickerOpen(true);
    }
  }, []);

  // Open template picker for new scene
  const handleNewScene = useCallback(() => {
    setTemplatePickerMode('scene');
    setTemplatePickerOpen(true);
  }, []);
  
  // Create scene from selected template (or create new project with scene)
  const handleCreateSceneFromTemplate = useCallback((templateId, sceneName) => {
    const newScene = createSceneFromTemplate(templateId, sceneName);
    
    if (templatePickerMode === 'project') {
      // Create new project with this scene as the first scene
      const newProject = createProject(sceneName || 'Untitled Project');
      newProject.scenes = [newScene];
      newProject.startSceneId = newScene.id;
      setProject(newProject);
      setCurrentSceneId(newScene.id);
      ProjectStorage.clearAutosave();
      addConsoleLog?.('success', `New project created: ${newProject.name}`);
    } else {
      // Add scene to existing project
      setProject(prev => ({
        ...prev,
        scenes: [...prev.scenes, newScene]
      }));
      setCurrentSceneId(newScene.id);
      addConsoleLog?.('success', `Created scene: ${newScene.name} (${templateId} template)`);
    }
    
    setTemplatePickerOpen(false);
  }, [templatePickerMode, setProject, setCurrentSceneId, addConsoleLog]);
  
  // Close template picker
  const closeTemplatePicker = useCallback(() => {
    setTemplatePickerOpen(false);
  }, []);

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

  // Quick save - opens slot picker (no autosave)
  const handleSave = useCallback(() => {
    setSlotPickerMode('save');
    setSlotPickerOpen(true);
  }, []);

  // Export project to JSON file
  const handleExportProject = useCallback(() => {
    ProjectStorage.exportProject(project);
    addConsoleLog?.('info', `Exported: ${project.name}.pluto`);
  }, [project, addConsoleLog]);

  // Import project from JSON file
  const handleImportProject = useCallback(() => {
    ProjectStorage.openImportDialog((importedProject) => {
      if (importedProject) {
        setProject(importedProject);
        if (importedProject.scenes.length > 0) {
          setCurrentSceneId(importedProject.startSceneId || importedProject.scenes[0].id);
        }
        addConsoleLog?.('success', `Imported project: ${importedProject.name}`);
      }
    });
  }, [setProject, setCurrentSceneId, addConsoleLog]);

  // Load a project (from slot or import)
  const handleLoadProject = useCallback((loadedProject) => {
    console.log('[useFileOperations] Loading project:', loadedProject.name);
    setProject(loadedProject);
    const startScene = loadedProject.scenes.find(s => s.id === loadedProject.startSceneId) 
      || loadedProject.scenes[0];
    if (startScene) {
      setCurrentSceneId(startScene.id);
    }
    addConsoleLog?.('info', `Loaded project: ${loadedProject.name}`);
  }, [setProject, setCurrentSceneId, addConsoleLog]);

  // Slot picker callback - slotIndex is 0-indexed from SlotPicker
  const handleSlotSelect = useCallback((slotIndex, slotData) => {
    const slotNumber = slotIndex + 1; // Convert to 1-indexed for storage API
    if (slotPickerMode === 'save') {
      ProjectStorage.saveSlot(slotNumber, project);
      addConsoleLog?.('success', `Saved to slot ${slotNumber}`);
    } else {
      // Load mode - slotData already loaded by SlotPicker
      if (slotData) {
        setProject(slotData);
        if (slotData.scenes.length > 0) {
          setCurrentSceneId(slotData.startSceneId || slotData.scenes[0].id);
        }
        addConsoleLog?.('success', `Loaded from slot ${slotNumber}: ${slotData.name}`);
      }
    }
    setSlotPickerOpen(false);
  }, [slotPickerMode, project, setProject, setCurrentSceneId, addConsoleLog]);

  // Close slot picker
  const closeSlotPicker = useCallback(() => {
    setSlotPickerOpen(false);
  }, []);

  // Clear all storage (for quota issues)
  const handleClearStorage = useCallback(() => {
    if (confirm('Clear all saved data? This will delete autosave and all save slots. Make sure to export your project first!')) {
      ProjectStorage.clearAllStorage();
      addConsoleLog?.('warning', 'All saved data cleared. Storage freed.');
    }
  }, [addConsoleLog]);

  // Get storage usage info
  const getStorageInfo = useCallback(() => {
    return ProjectStorage.getStorageUsage();
  }, []);

  return {
    // Slot picker state
    slotPickerOpen,
    slotPickerMode,
    closeSlotPicker,
    
    // Template picker state
    templatePickerOpen,
    templatePickerMode,
    closeTemplatePicker,
    handleCreateSceneFromTemplate,
    
    // Handlers
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
    getStorageInfo,
  };
}

export default useFileOperations;
