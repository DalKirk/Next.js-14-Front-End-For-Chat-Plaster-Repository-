'use client';

import { useState, useCallback } from 'react';

/**
 * useGameState - Manages game runtime state
 * 
 * @param {Function} addConsoleLog - Function to log to console
 * @returns {Object} Game state and actions
 */
export function useGameState(addConsoleLog) {
  const [mode, setMode] = useState('edit'); // 'edit' or 'play'
  
  const [gameState, setGameState] = useState({
    score: 0,
    health: 3,
    isPlaying: false,
  });

  // Start/Stop game
  const togglePlay = useCallback(() => {
    if (mode === 'edit') {
      setMode('play');
      setGameState({ score: 0, health: 3, isPlaying: true });
      addConsoleLog?.('success', 'Game started');
    } else {
      setMode('edit');
      setGameState(prev => ({ ...prev, isPlaying: false }));
      addConsoleLog?.('info', 'Game stopped');
    }
  }, [mode, addConsoleLog]);

  // Update game state value
  const updateGameState = useCallback((key, value) => {
    setGameState(prev => ({ ...prev, [key]: value }));
  }, []);

  // Reset game state
  const resetGameState = useCallback(() => {
    setGameState({ score: 0, health: 3, isPlaying: false });
  }, []);

  return {
    mode,
    setMode,
    gameState,
    setGameState,
    togglePlay,
    updateGameState,
    resetGameState,
  };
}

export default useGameState;
