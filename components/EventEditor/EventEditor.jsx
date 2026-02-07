'use client';

import React, { useState, useMemo } from 'react';
import { Plus, Search, Filter, SortAsc, SortDesc, ChevronDown } from 'lucide-react';
import EventCard from './EventCard';
import AddConditionModal from './AddConditionModal';
import AddActionModal from './AddActionModal';
import { Event } from '../../lib/events';

/**
 * EventEditor - Main visual event editing interface
 * Similar to GDevelop/Construct event sheets
 */
const EventEditor = ({
  events = [],
  onEventsChange,
  gameState,
  selectedEventId,
  onSelectEvent
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEnabled, setFilterEnabled] = useState(null); // null = all, true = enabled only, false = disabled only
  const [sortOrder, setSortOrder] = useState('priority'); // 'priority', 'name', 'created'
  const [sortDirection, setSortDirection] = useState('desc');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  
  const [showConditionModal, setShowConditionModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [activeEventId, setActiveEventId] = useState(null);
  
  const [clipboard, setClipboard] = useState(null);

  // Generate unique ID
  const generateId = () => `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // Filter and sort events
  const filteredEvents = useMemo(() => {
    let result = [...events];

    // Apply search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(event => 
        event.name.toLowerCase().includes(q) ||
        (event.comment && event.comment.toLowerCase().includes(q)) ||
        event.conditions.some(c => c.type.toLowerCase().includes(q)) ||
        event.actions.some(a => a.type.toLowerCase().includes(q))
      );
    }

    // Apply enabled filter
    if (filterEnabled !== null) {
      result = result.filter(event => event.enabled === filterEnabled);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (sortOrder === 'priority') {
        comparison = (b.priority || 0) - (a.priority || 0);
      } else if (sortOrder === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortOrder === 'created') {
        comparison = new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
      return sortDirection === 'asc' ? -comparison : comparison;
    });

    return result;
  }, [events, searchQuery, filterEnabled, sortOrder, sortDirection]);

  // Event operations
  const handleAddEvent = () => {
    const newEvent = new Event({
      id: generateId(),
      name: `Event ${events.length + 1}`,
      enabled: true,
      priority: 0,
      conditions: [],
      actions: [],
      createdAt: new Date().toISOString()
    });
    
    onEventsChange([...events, newEvent]);
    onSelectEvent(newEvent.id);
  };

  const handleUpdateEvent = (eventId, updates) => {
    onEventsChange(events.map(e => 
      e.id === eventId ? { ...e, ...updates } : e
    ));
  };

  const handleDeleteEvent = (eventId) => {
    onEventsChange(events.filter(e => e.id !== eventId));
    if (selectedEventId === eventId) {
      onSelectEvent(null);
    }
  };

  const handleDuplicateEvent = (eventId) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    const newEvent = {
      ...JSON.parse(JSON.stringify(event)),
      id: generateId(),
      name: `${event.name} (Copy)`,
      createdAt: new Date().toISOString(),
      triggered: false
    };

    // Also regenerate IDs for conditions and actions
    newEvent.conditions = newEvent.conditions.map(c => ({
      ...c,
      id: generateId()
    }));
    newEvent.actions = newEvent.actions.map(a => ({
      ...a,
      id: generateId()
    }));

    const index = events.findIndex(e => e.id === eventId);
    const newEvents = [...events];
    newEvents.splice(index + 1, 0, newEvent);
    onEventsChange(newEvents);
  };

  const handleCopyEvent = (eventId) => {
    const event = events.find(e => e.id === eventId);
    if (event) {
      setClipboard(JSON.parse(JSON.stringify(event)));
    }
  };

  const handlePasteEvent = () => {
    if (!clipboard) return;
    
    const newEvent = {
      ...clipboard,
      id: generateId(),
      name: `${clipboard.name} (Pasted)`,
      createdAt: new Date().toISOString(),
      triggered: false,
      conditions: clipboard.conditions.map(c => ({ ...c, id: generateId() })),
      actions: clipboard.actions.map(a => ({ ...a, id: generateId() }))
    };

    onEventsChange([...events, newEvent]);
  };

  // Add condition/action modals
  const handleOpenConditionModal = (eventId) => {
    setActiveEventId(eventId);
    setShowConditionModal(true);
  };

  const handleOpenActionModal = (eventId) => {
    setActiveEventId(eventId);
    setShowActionModal(true);
  };

  const handleAddCondition = (conditionType, params = {}) => {
    if (!activeEventId) return;
    
    const newCondition = {
      id: generateId(),
      type: conditionType,
      params,
      inverted: false
    };

    handleUpdateEvent(activeEventId, {
      conditions: [...(events.find(e => e.id === activeEventId)?.conditions || []), newCondition]
    });
    
    setShowConditionModal(false);
    setActiveEventId(null);
  };

  const handleAddAction = (actionType, params = {}) => {
    if (!activeEventId) return;
    
    const newAction = {
      id: generateId(),
      type: actionType,
      params,
      delay: 0
    };

    handleUpdateEvent(activeEventId, {
      actions: [...(events.find(e => e.id === activeEventId)?.actions || []), newAction]
    });
    
    setShowActionModal(false);
    setActiveEventId(null);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900">
      {/* Toolbar */}
      <div className="p-3 border-b border-zinc-800 flex items-center gap-3 flex-shrink-0">
        {/* Add Event Button */}
        <button
          onClick={handleAddEvent}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-semibold transition"
        >
          <Plus size={18} />
          Add Event
        </button>

        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events, conditions, actions..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 pl-10 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Filter */}
        <div className="relative">
          <button
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition ${
              filterEnabled !== null
                ? 'border-purple-500 bg-purple-900/20 text-purple-400'
                : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            <Filter size={18} />
            <ChevronDown size={14} />
          </button>

          {showFilterMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowFilterMenu(false)} />
              <div className="absolute right-0 top-full mt-1 bg-zinc-800 border border-zinc-700 rounded shadow-xl z-50 min-w-40">
                <button
                  onClick={() => { setFilterEnabled(null); setShowFilterMenu(false); }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-zinc-700 ${filterEnabled === null ? 'text-purple-400' : 'text-zinc-300'}`}
                >
                  All Events
                </button>
                <button
                  onClick={() => { setFilterEnabled(true); setShowFilterMenu(false); }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-zinc-700 ${filterEnabled === true ? 'text-purple-400' : 'text-zinc-300'}`}
                >
                  Enabled Only
                </button>
                <button
                  onClick={() => { setFilterEnabled(false); setShowFilterMenu(false); }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-zinc-700 ${filterEnabled === false ? 'text-purple-400' : 'text-zinc-300'}`}
                >
                  Disabled Only
                </button>
              </div>
            </>
          )}
        </div>

        {/* Sort */}
        <button
          onClick={() => setSortDirection(d => d === 'asc' ? 'desc' : 'asc')}
          className="p-2 border border-zinc-700 bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition"
          title={sortDirection === 'asc' ? 'Sort Ascending' : 'Sort Descending'}
        >
          {sortDirection === 'asc' ? <SortAsc size={18} /> : <SortDesc size={18} />}
        </button>

        {/* Paste */}
        {clipboard && (
          <button
            onClick={handlePasteEvent}
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-400 hover:text-white transition text-sm"
          >
            📋 Paste Event
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="px-4 py-2 bg-zinc-800/50 border-b border-zinc-800 flex items-center gap-4 text-xs text-zinc-500">
        <span>Total: {events.length}</span>
        <span>Enabled: {events.filter(e => e.enabled).length}</span>
        <span>Showing: {filteredEvents.length}</span>
      </div>

      {/* Event List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-lg font-semibold mb-2">No Events Yet</p>
            <p className="text-sm mb-4">Events define the logic of your game</p>
            <button
              onClick={handleAddEvent}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition"
            >
              <Plus size={20} />
              Create Your First Event
            </button>
          </div>
        ) : (
          filteredEvents.map(event => (
            <EventCard
              key={event.id}
              event={event}
              isSelected={selectedEventId === event.id}
              onSelect={() => onSelectEvent(event.id)}
              onUpdate={(updates) => handleUpdateEvent(event.id, updates)}
              onDelete={() => handleDeleteEvent(event.id)}
              onDuplicate={() => handleDuplicateEvent(event.id)}
              onCopy={() => handleCopyEvent(event.id)}
              onAddCondition={() => handleOpenConditionModal(event.id)}
              onAddAction={() => handleOpenActionModal(event.id)}
              gameState={gameState}
            />
          ))
        )}
      </div>

      {/* Modals */}
      {showConditionModal && (
        <AddConditionModal
          onClose={() => { setShowConditionModal(false); setActiveEventId(null); }}
          onAdd={handleAddCondition}
        />
      )}

      {showActionModal && (
        <AddActionModal
          onClose={() => { setShowActionModal(false); setActiveEventId(null); }}
          onAdd={handleAddAction}
        />
      )}
    </div>
  );
};

export default EventEditor;
