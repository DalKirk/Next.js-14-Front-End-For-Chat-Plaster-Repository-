/**
 * useAutoSave - React hook for automatic project saving
 * 
 * Watches project changes and debounces writes to localStorage.
 * Transparent to the user - they never need to "save".
 */

import { useEffect, useRef, useCallback } from 'react';
import { saveAutosave } from './ProjectStorage';

/**
 * Hook that automatically saves the project to localStorage
 * 
 * @param {Object} project - The project object to watch
 * @param {boolean} enabled - Whether autosave is enabled
 * @param {Object} options - Configuration options
 * @param {number} options.debounceMs - Debounce delay in milliseconds (default: 500)
 * @param {Function} options.onSave - Callback after successful save
 * @param {Function} options.onQuotaExceeded - Callback when storage quota is exceeded
 * @param {Function} options.onError - Callback for other errors
 */
export const useAutoSave = (
  project,
  enabled = true,
  options = {}
) => {
  const {
    debounceMs = 500,
    onSave,
    onQuotaExceeded,
    onError
  } = options;

  const timeoutRef = useRef(null);
  const lastSavedRef = useRef(null);
  const isFirstRender = useRef(true);

  // Serialize project for comparison (shallow)
  const getProjectHash = useCallback((proj) => {
    if (!proj) return null;
    return JSON.stringify({
      name: proj.name,
      scenes: proj.scenes?.length,
      assets: proj.assets?.length,
      updatedAt: proj.updatedAt,
      // Include scene IDs and entity counts for change detection
      sceneData: proj.scenes?.map(s => ({
        id: s.id,
        entities: s.layers?.entities?.length,
        platforms: s.layers?.platforms?.length,
        parallax: s.layers?.parallax?.length,
        updatedAt: s.updatedAt
      }))
    });
  }, []);

  // Perform the actual save
  const doSave = useCallback(() => {
    if (!project) return;

    const result = saveAutosave(project);
    
    if (result.success) {
      lastSavedRef.current = getProjectHash(project);
      onSave?.();
    } else if (result.error === 'quota_exceeded') {
      onQuotaExceeded?.();
    } else {
      onError?.(result.error);
    }
  }, [project, getProjectHash, onSave, onQuotaExceeded, onError]);

  // Main effect - watch for project changes
  useEffect(() => {
    if (!enabled) return;
    
    // Skip first render to avoid saving immediately on mount
    if (isFirstRender.current) {
      isFirstRender.current = false;
      // Initialize lastSavedRef with current project state
      lastSavedRef.current = getProjectHash(project);
      return;
    }

    // Check if project actually changed
    const currentHash = getProjectHash(project);
    if (currentHash === lastSavedRef.current) {
      return; // No changes, skip save
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Schedule new save after debounce period
    timeoutRef.current = setTimeout(() => {
      console.log('[AutoSave] Saving project changes...');
      doSave();
    }, debounceMs);

    // Cleanup on unmount or dependency change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [project, enabled, debounceMs, getProjectHash, doSave]);

  // Also save when component unmounts (in case there's a pending save)
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        // Do final save on unmount
        if (enabled && project) {
          doSave();
        }
      }
    };
  }, [enabled, project, doSave]);

  // Return a manual save function for immediate saves
  const saveNow = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    doSave();
  }, [doSave]);

  return { saveNow };
};

export default useAutoSave;
