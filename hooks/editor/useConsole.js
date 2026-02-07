'use client';

import { useState, useCallback } from 'react';

/**
 * useConsole - Manages console log state for the editor
 * 
 * @param {Array} initialLogs - Initial console log entries
 * @returns {Object} Console state and actions
 */
export function useConsole(initialLogs = []) {
  const [consoleLogs, setConsoleLogs] = useState(() => {
    if (initialLogs.length > 0) return initialLogs;
    return [
      { type: 'info', message: 'Pluto Engine initialized', time: new Date() },
      { type: 'success', message: 'Scene loaded', time: new Date() },
    ];
  });

  // Add a log entry
  const addConsoleLog = useCallback((type, message) => {
    setConsoleLogs(prev => [...prev, { type, message, time: new Date() }]);
  }, []);

  // Clear all logs
  const clearConsoleLogs = useCallback(() => {
    setConsoleLogs([]);
  }, []);

  // Remove a specific log by index
  const removeLog = useCallback((index) => {
    setConsoleLogs(prev => prev.filter((_, i) => i !== index));
  }, []);

  return {
    consoleLogs,
    addConsoleLog,
    clearConsoleLogs,
    removeLog,
  };
}

export default useConsole;
