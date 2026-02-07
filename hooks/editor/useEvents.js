'use client';

import { useState, useCallback } from 'react';

/**
 * useEvents - Manages event system state for the editor
 * 
 * @param {Function} addConsoleLog - Function to log to console
 * @returns {Object} Events state and actions
 */
export function useEvents(addConsoleLog) {
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

  // Add event
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
    addConsoleLog?.('info', `Created new event: ${newEvent.name}`);
  }, [events.length, addConsoleLog]);

  // Delete event
  const deleteEvent = useCallback((eventId) => {
    setEvents(prev => prev.filter(e => e.id !== eventId));
    if (selectedEventId === eventId) {
      setSelectedEventId(null);
    }
    addConsoleLog?.('info', `Deleted event`);
  }, [selectedEventId, addConsoleLog]);

  // Update event
  const updateEvent = useCallback((eventId, updates) => {
    setEvents(prev => prev.map(e => 
      e.id === eventId ? { ...e, ...updates } : e
    ));
  }, []);

  // Duplicate event
  const duplicateEvent = useCallback((eventId) => {
    const eventToCopy = events.find(e => e.id === eventId);
    if (!eventToCopy) return;
    
    const newEvent = {
      ...eventToCopy,
      id: `event-${Date.now()}`,
      name: `${eventToCopy.name} (Copy)`,
      createdAt: new Date().toISOString()
    };
    setEvents(prev => [...prev, newEvent]);
    setSelectedEventId(newEvent.id);
    addConsoleLog?.('info', `Duplicated event: ${newEvent.name}`);
  }, [events, addConsoleLog]);

  return {
    events,
    setEvents,
    selectedEventId,
    setSelectedEventId,
    addEvent,
    deleteEvent,
    updateEvent,
    duplicateEvent,
  };
}

export default useEvents;
