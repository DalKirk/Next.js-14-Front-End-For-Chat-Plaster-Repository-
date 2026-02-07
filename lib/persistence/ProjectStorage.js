/**
 * ProjectStorage - Core storage engine for Pluto Editor persistence
 * 
 * Provides three layers of persistence:
 * 1. Auto-save: Transparent, debounced writes to localStorage
 * 2. Manual slots: 5 save slots for user-controlled saves
 * 3. Export/Import: Download/upload JSON files
 */

const STORAGE_PREFIX = 'pluto';
const AUTOSAVE_KEY = `${STORAGE_PREFIX}.autosave.project`;
const SLOT_KEY_PREFIX = `${STORAGE_PREFIX}.slot`;
const MAX_SLOTS = 5;

/**
 * Check if localStorage is available
 */
const isStorageAvailable = () => {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Safely parse JSON with error handling
 */
const safeJSONParse = (str, fallback = null) => {
  try {
    return JSON.parse(str);
  } catch (e) {
    console.error('[ProjectStorage] JSON parse error:', e);
    return fallback;
  }
};

/**
 * Calculate approximate size of data in bytes
 */
const getDataSize = (data) => {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  return new Blob([str]).size;
};

/**
 * Format bytes to human readable string
 */
const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ─────────────────────────────────────────────────────────────────
// AUTOSAVE
// ─────────────────────────────────────────────────────────────────

/**
 * Save project to autosave slot
 * @param {Object} project - The project object to save
 * @returns {{ success: boolean, error?: string }}
 */
export const saveAutosave = (project) => {
  if (!isStorageAvailable()) {
    return { success: false, error: 'localStorage not available' };
  }

  try {
    // Strip large embedded data that can be regenerated (like thumbnails from base64)
    const leanProject = stripLargeData(project, false);
    
    const serialized = JSON.stringify({
      ...leanProject,
      savedAt: Date.now(),
      version: '1.0.0'
    });
    
    // Check size before attempting save (localStorage limit is ~5MB)
    const size = getDataSize(serialized);
    if (size > 4 * 1024 * 1024) {
      console.warn('[ProjectStorage] Data too large, using aggressive stripping:', formatBytes(size));
      return saveAutosaveAggressive(project);
    }
    
    localStorage.setItem(AUTOSAVE_KEY, serialized);
    console.log('[ProjectStorage] Autosave complete:', formatBytes(size));
    return { success: true };
  } catch (e) {
    // Handle RangeError from huge strings
    if (e.name === 'RangeError' || e.message?.includes('Invalid string length')) {
      console.error('[ProjectStorage] Project too large to save. Use Export instead.');
      return { success: false, error: 'project_too_large' };
    }
    if (e.name === 'QuotaExceededError') {
      console.warn('[ProjectStorage] Quota exceeded, attempting aggressive cleanup...');
      return saveAutosaveAggressive(project);
    }
    console.error('[ProjectStorage] Autosave failed:', e);
    return { success: false, error: e.message };
  }
};

/**
 * Save with aggressive data stripping - fallback when normal save fails
 */
const saveAutosaveAggressive = (project) => {
  try {
    // Clear existing autosave first
    localStorage.removeItem(AUTOSAVE_KEY);
    
    // Try with aggressive stripping
    const leanProject = stripLargeData(project, true);
    const serialized = JSON.stringify({
      ...leanProject,
      savedAt: Date.now(),
      version: '1.0.0',
      strippedAggressively: true
    });
    
    const size = getDataSize(serialized);
    
    // If still too large, save only essential metadata
    if (size > 4 * 1024 * 1024) {
      console.warn('[ProjectStorage] Still too large after aggressive strip:', formatBytes(size));
      return saveAutosaveMinimal(project);
    }
    
    localStorage.setItem(AUTOSAVE_KEY, serialized);
    console.log('[ProjectStorage] Autosave succeeded (aggressive mode):', formatBytes(size));
    return { success: true, warning: 'Some data was stripped to fit storage limits' };
  } catch (retryError) {
    console.warn('[ProjectStorage] Aggressive save failed, trying minimal...');
    return saveAutosaveMinimal(project);
  }
};

/**
 * Save only essential project metadata as last resort
 */
const saveAutosaveMinimal = (project) => {
  try {
    const minimal = {
      name: project?.name || 'Untitled Project',
      scenes: (project?.scenes || []).map(scene => ({
        id: scene.id,
        name: scene.name,
        settings: scene.settings,
        // Keep layer structure but strip all item content
        layers: scene.layers ? {
          background: { items: [] },
          entities: [],
          ui: scene.layers.ui || {}
        } : null
      })),
      currentSceneId: project?.currentSceneId,
      savedAt: Date.now(),
      version: '1.0.0',
      minimalSave: true
    };
    
    const serialized = JSON.stringify(minimal);
    localStorage.setItem(AUTOSAVE_KEY, serialized);
    console.log('[ProjectStorage] Autosave (minimal mode):', formatBytes(getDataSize(serialized)));
    return { success: true, warning: 'Only metadata saved - assets stripped due to storage limits' };
  } catch (e) {
    console.error('[ProjectStorage] Even minimal save failed:', e);
    return { success: false, error: 'storage_full' };
  }
};

/**
 * Strip only non-essential large data from project
 * Keeps scene content intact (backgrounds, sprites, entities, parallax)
 * Only removes: asset thumbnails, temporary data
 * 
 * @param {Object} project - The project to strip
 * @param {boolean} aggressive - If true, strip more aggressively
 * @returns {Object} Stripped project
 */
const stripLargeData = (project, aggressive = false) => {
  if (!project) return project;
  
  // Deep clone scenes to preserve all layer data
  const stripped = {
    ...project,
    scenes: project.scenes ? project.scenes.map(scene => ({
      ...scene,
      layers: scene.layers ? {
        background: scene.layers.background ? { ...scene.layers.background } : { items: [] },
        entities: scene.layers.entities ? [...scene.layers.entities] : [],
        platforms: scene.layers.platforms ? [...scene.layers.platforms] : [],
        parallax: scene.layers.parallax ? [...scene.layers.parallax] : [],
        ui: scene.layers.ui ? { ...scene.layers.ui } : {}
      } : null,
      settings: scene.settings ? { ...scene.settings } : null
    })) : [],
    assets: project.assets ? [...project.assets] : []
  };
  
  // Strip ONLY asset thumbnails (not the actual asset data!)
  if (stripped.assets && Array.isArray(stripped.assets)) {
    stripped.assets = stripped.assets.map(asset => {
      const newAsset = { ...asset };
      
      // Remove thumbnail only (not the actual image src!)
      if (newAsset.thumbnail) {
        delete newAsset.thumbnail;
      }
      
      // In aggressive mode, remove non-essential metadata
      if (aggressive) {
        delete newAsset.metadata;
        delete newAsset.previewUrl;
      }
      
      return newAsset;
    });
  }
  
  // In aggressive mode ONLY, strip scene content
  if (aggressive && stripped.scenes) {
    stripped.scenes = stripped.scenes.map(scene => ({
      id: scene.id,
      name: scene.name,
      settings: scene.settings,
      layers: {
        background: { items: [] },
        entities: [],
        platforms: scene.layers?.platforms || [],
        parallax: [], // Strip parallax in aggressive mode
        ui: scene.layers?.ui || {}
      }
    }));
  }
  
  return stripped;
};

/**
 * Load project from autosave
 * @returns {Object|null} The saved project or null if none exists
 */
export const loadAutosave = () => {
  if (!isStorageAvailable()) return null;
  
  try {
    const data = localStorage.getItem(AUTOSAVE_KEY);
    if (!data) return null;
    
    // Skip if data is suspiciously large (likely corrupted)
    if (data.length > 10 * 1024 * 1024) {
      console.warn('[ProjectStorage] Autosave data too large, clearing corrupted data');
      localStorage.removeItem(AUTOSAVE_KEY);
      return null;
    }
    
    const project = safeJSONParse(data);
    if (project) {
      console.log('[ProjectStorage] Autosave loaded:', project.name, 'saved at', new Date(project.savedAt).toLocaleString());
    }
    return project;
  } catch (e) {
    console.error('[ProjectStorage] Failed to load autosave:', e);
    // Clear corrupted data
    try {
      localStorage.removeItem(AUTOSAVE_KEY);
    } catch {}
    return null;
  }
};

/**
 * Check if autosave exists
 * @returns {boolean}
 */
export const hasAutosave = () => {
  if (!isStorageAvailable()) return false;
  return localStorage.getItem(AUTOSAVE_KEY) !== null;
};

/**
 * Clear autosave data
 */
export const clearAutosave = () => {
  if (!isStorageAvailable()) return;
  localStorage.removeItem(AUTOSAVE_KEY);
  console.log('[ProjectStorage] Autosave cleared');
};

/**
 * Get autosave info without loading full project
 * @returns {{ name: string, savedAt: number, size: number }|null}
 */
export const getAutosaveInfo = () => {
  if (!isStorageAvailable()) return null;
  
  const data = localStorage.getItem(AUTOSAVE_KEY);
  if (!data) return null;
  
  const project = safeJSONParse(data);
  if (!project) return null;
  
  return {
    name: project.name || 'Untitled',
    savedAt: project.savedAt || 0,
    size: getDataSize(data)
  };
};

// ─────────────────────────────────────────────────────────────────
// SAVE SLOTS
// ─────────────────────────────────────────────────────────────────

/**
 * Get key for a specific slot
 * @param {number} slotNumber - Slot number (1-5)
 */
const getSlotKey = (slotNumber) => `${SLOT_KEY_PREFIX}.${slotNumber}`;

/**
 * Save project to a specific slot
 * @param {Object} project - The project to save
 * @param {number} slotNumber - Slot number (1-5)
 * @returns {{ success: boolean, error?: string }}
 */
export const saveSlot = (project, slotNumber) => {
  if (!isStorageAvailable()) {
    return { success: false, error: 'localStorage not available' };
  }
  
  if (slotNumber < 1 || slotNumber > MAX_SLOTS) {
    return { success: false, error: `Invalid slot number: ${slotNumber}` };
  }

  try {
    // Strip large data first to avoid massive serialization
    const leanProject = stripLargeData(project, false);
    
    const serialized = JSON.stringify({
      ...leanProject,
      savedAt: Date.now(),
      version: '1.0.0'
    });
    
    const size = getDataSize(serialized);
    
    // Check size before save
    if (size > 4 * 1024 * 1024) {
      console.warn(`[ProjectStorage] Slot ${slotNumber} data too large (${formatBytes(size)}), stripping aggressively...`);
      const aggressiveLean = stripLargeData(project, true);
      const aggressiveSerialized = JSON.stringify({
        ...aggressiveLean,
        savedAt: Date.now(),
        version: '1.0.0',
        strippedAggressively: true
      });
      localStorage.setItem(getSlotKey(slotNumber), aggressiveSerialized);
      console.log(`[ProjectStorage] Saved to slot ${slotNumber} (stripped):`, formatBytes(getDataSize(aggressiveSerialized)));
      return { success: true, warning: 'Large data was stripped to fit' };
    }
    
    localStorage.setItem(getSlotKey(slotNumber), serialized);
    console.log(`[ProjectStorage] Saved to slot ${slotNumber}:`, formatBytes(size));
    return { success: true };
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      return { success: false, error: 'quota_exceeded' };
    }
    if (e.message?.includes('Invalid string length')) {
      console.error('[ProjectStorage] Project too large to serialize');
      return { success: false, error: 'Project data too large to save. Try removing some assets.' };
    }
    return { success: false, error: e.message };
  }
};

/**
 * Load project from a specific slot
 * @param {number} slotNumber - Slot number (1-5)
 * @returns {Object|null}
 */
export const loadSlot = (slotNumber) => {
  if (!isStorageAvailable()) return null;
  
  if (slotNumber < 1 || slotNumber > MAX_SLOTS) {
    console.error(`[ProjectStorage] Invalid slot number: ${slotNumber}`);
    return null;
  }
  
  const data = localStorage.getItem(getSlotKey(slotNumber));
  if (!data) return null;
  
  const project = safeJSONParse(data);
  if (project) {
    console.log(`[ProjectStorage] Loaded from slot ${slotNumber}:`, project.name);
  }
  return project;
};

/**
 * Delete a specific slot
 * @param {number} slotNumber - Slot number (1-5)
 */
export const deleteSlot = (slotNumber) => {
  if (!isStorageAvailable()) return;
  
  if (slotNumber < 1 || slotNumber > MAX_SLOTS) return;
  
  localStorage.removeItem(getSlotKey(slotNumber));
  console.log(`[ProjectStorage] Deleted slot ${slotNumber}`);
};

/**
 * Get info for all slots
 * @returns {Array<{ slot: number, name: string, savedAt: number, size: number }|null>}
 */
export const getAllSlotsInfo = () => {
  if (!isStorageAvailable()) return Array(MAX_SLOTS).fill(null);
  
  const slots = [];
  for (let i = 1; i <= MAX_SLOTS; i++) {
    const data = localStorage.getItem(getSlotKey(i));
    if (!data) {
      slots.push(null);
      continue;
    }
    
    const project = safeJSONParse(data);
    if (!project) {
      slots.push(null);
      continue;
    }
    
    slots.push({
      slot: i,
      name: project.name || 'Untitled',
      savedAt: project.savedAt || 0,
      size: getDataSize(data)
    });
  }
  return slots;
};

// ─────────────────────────────────────────────────────────────────
// EXPORT/IMPORT
// ─────────────────────────────────────────────────────────────────

/**
 * Export project as downloadable JSON file
 * @param {Object} project - The project to export
 * @param {string} filename - Optional custom filename
 */
export const exportProject = (project, filename) => {
  const data = JSON.stringify({
    ...project,
    exportedAt: Date.now(),
    version: '1.0.0'
  }, null, 2);
  
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `${project.name || 'project'}.pluto.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  console.log('[ProjectStorage] Exported project:', formatBytes(getDataSize(data)));
};

/**
 * Import project from JSON file contents
 * @param {string} fileContents - The JSON string from file
 * @returns {{ success: boolean, project?: Object, error?: string }}
 */
export const importProject = (fileContents) => {
  const project = safeJSONParse(fileContents);
  
  if (!project) {
    return { success: false, error: 'Invalid JSON file' };
  }
  
  // Basic validation
  if (!project.scenes || !Array.isArray(project.scenes)) {
    return { success: false, error: 'Invalid project structure: missing scenes array' };
  }
  
  // Mark as imported
  project.importedAt = Date.now();
  
  console.log('[ProjectStorage] Imported project:', project.name);
  return { success: true, project };
};

/**
 * Create file input and handle import
 * @param {Function} onImport - Callback with imported project
 * @param {Function} onError - Callback for errors
 */
export const openImportDialog = (onImport, onError) => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,.pluto.json';
  
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = importProject(event.target.result);
      if (result.success) {
        onImport(result.project);
      } else {
        onError?.(result.error);
      }
    };
    reader.onerror = () => {
      onError?.('Failed to read file');
    };
    reader.readAsText(file);
  };
  
  input.click();
};

// ─────────────────────────────────────────────────────────────────
// STORAGE INFO
// ─────────────────────────────────────────────────────────────────

/**
 * Get total storage usage for Pluto
 * @returns {{ used: number, available: number, percentage: number }}
 */
export const getStorageUsage = () => {
  if (!isStorageAvailable()) {
    return { used: 0, available: 0, percentage: 0 };
  }
  
  let used = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith(STORAGE_PREFIX)) {
      used += getDataSize(localStorage.getItem(key));
    }
  }
  
  // Estimate available (browsers typically allow ~5-10MB)
  const estimated = 5 * 1024 * 1024; // 5MB estimate
  
  return {
    used,
    usedFormatted: formatBytes(used),
    available: estimated,
    availableFormatted: formatBytes(estimated),
    percentage: Math.round((used / estimated) * 100)
  };
};

/**
 * Clear all Pluto storage data
 */
export const clearAllStorage = () => {
  if (!isStorageAvailable()) return;
  
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith(STORAGE_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
  console.log('[ProjectStorage] Cleared all storage:', keysToRemove.length, 'items');
};

// Default export as object for convenience
const ProjectStorage = {
  // Autosave
  saveAutosave,
  loadAutosave,
  hasAutosave,
  clearAutosave,
  getAutosaveInfo,
  
  // Slots
  saveSlot,
  loadSlot,
  deleteSlot,
  getAllSlotsInfo,
  MAX_SLOTS,
  
  // Export/Import
  exportProject,
  importProject,
  openImportDialog,
  
  // Storage info
  getStorageUsage,
  clearAllStorage
};

export default ProjectStorage;
