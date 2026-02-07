'use client';

import { useRef, useCallback } from 'react';
import { SpriteManager } from '../../lib/SpriteManager';
import { OptimizedParticleSystem } from '../../lib/OptimizedParticleSystem';
import { FilterManager } from '../../lib/FilterManager';

/**
 * usePixiSystems - Manages PixiJS-related system refs
 * 
 * @param {Function} addConsoleLog - Function to log to console
 * @returns {Object} PixiJS system refs and handlers
 */
export function usePixiSystems(addConsoleLog) {
  const pixiAppRef = useRef(null);
  const spriteManagerRef = useRef(null);
  const filterManagerRef = useRef(null);
  const particleSystemRef = useRef(null);
  const audioSystemRef = useRef(null);

  // Handle PixiJS ready
  const handlePixiReady = useCallback((app) => {
    pixiAppRef.current = app;
    spriteManagerRef.current = new SpriteManager(app);
    filterManagerRef.current = new FilterManager(app);
    particleSystemRef.current = new OptimizedParticleSystem(app, 5000);
    addConsoleLog?.('success', 'PixiJS renderer initialized');
  }, [addConsoleLog]);

  // Handle Audio System ready
  const handleAudioSystemReady = useCallback((audio) => {
    audioSystemRef.current = audio;
    addConsoleLog?.('success', 'Audio system initialized');
  }, [addConsoleLog]);

  return {
    pixiAppRef,
    spriteManagerRef,
    filterManagerRef,
    particleSystemRef,
    audioSystemRef,
    handlePixiReady,
    handleAudioSystemReady,
  };
}

export default usePixiSystems;
