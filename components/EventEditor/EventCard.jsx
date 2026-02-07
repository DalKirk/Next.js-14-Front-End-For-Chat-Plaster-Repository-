'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Copy, Trash2, MoreVertical, PlayCircle, PauseCircle, Plus } from 'lucide-react';
import ConditionBlock from './ConditionBlock';
import ActionBlock from './ActionBlock';

/**
 * EventCard - Individual event display with conditions and actions
 */
const EventCard = ({
  event,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onDuplicate,
  onCopy,
  onAddCondition,
  onAddAction,
  gameState
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

  const handleToggleEnabled = (e) => {
    e.stopPropagation();
    onUpdate({ enabled: !event.enabled });
  };

  const handleUpdateCondition = (conditionId, updates) => {
    onUpdate({
      conditions: event.conditions.map(c =>
        c.id === conditionId ? { ...c, ...updates } : c
      )
    });
  };

  const handleDeleteCondition = (conditionId) => {
    onUpdate({
      conditions: event.conditions.filter(c => c.id !== conditionId)
    });
  };

  const handleUpdateAction = (actionId, updates) => {
    onUpdate({
      actions: event.actions.map(a =>
        a.id === actionId ? { ...a, ...updates } : a
      )
    });
  };

  const handleDeleteAction = (actionId) => {
    onUpdate({
      actions: event.actions.filter(a => a.id !== actionId)
    });
  };

  return (
    <div
      className={`border-2 rounded-lg transition-all ${
        isSelected
          ? 'border-purple-500 bg-purple-900/20'
          : event.enabled
          ? 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
          : 'border-zinc-800 bg-zinc-900 opacity-60'
      }`}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Expand/Collapse */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="text-zinc-400 hover:text-white transition flex-shrink-0"
          >
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>

          {/* Event Name */}
          <input
            type="text"
            value={event.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 min-w-0 bg-transparent border-none text-white font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-purple-500 rounded px-2 py-1"
            placeholder="Event Name"
          />

          {/* Badges */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {event.priority !== 0 && (
              <span className="text-xs bg-blue-600/20 text-blue-400 border border-blue-500/30 px-2 py-1 rounded">
                P:{event.priority}
              </span>
            )}

            {event.triggerOnce && (
              <span className="text-xs bg-orange-600/20 text-orange-400 border border-orange-500/30 px-2 py-1 rounded">
                Once
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Enable/Disable */}
          <button
            onClick={handleToggleEnabled}
            className={`p-2 rounded transition ${
              event.enabled
                ? 'text-green-400 hover:bg-green-900/20'
                : 'text-zinc-500 hover:bg-zinc-700'
            }`}
            title={event.enabled ? 'Enabled (click to disable)' : 'Disabled (click to enable)'}
          >
            {event.enabled ? <PlayCircle size={20} /> : <PauseCircle size={20} />}
          </button>

          {/* More Menu */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-2 rounded hover:bg-zinc-700 transition text-zinc-400"
            >
              <MoreVertical size={20} />
            </button>

            {showMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                  }}
                />
                <div className="absolute right-0 top-full mt-1 bg-zinc-800 border border-zinc-700 rounded shadow-xl z-50 min-w-40">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicate();
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-700 flex items-center gap-2 text-zinc-300"
                  >
                    <Copy size={14} />
                    Duplicate
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCopy();
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-700 flex items-center gap-2 text-zinc-300"
                  >
                    📋 Copy
                  </button>
                  <div className="border-t border-zinc-700 my-1" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-700 text-red-400 flex items-center gap-2"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4">
          {/* Conditions */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-blue-400 flex items-center gap-2">
                📋 When (Conditions)
              </h3>
            </div>

            {event.conditions.length === 0 ? (
              <div className="text-sm text-zinc-500 italic bg-zinc-900/50 border border-zinc-700 border-dashed rounded p-3 text-center">
                No conditions (always true)
              </div>
            ) : (
              <div className="space-y-2">
                {event.conditions.map((condition, index) => (
                  <div key={condition.id}>
                    {index > 0 && (
                      <div className="text-xs text-zinc-500 text-center my-1 font-semibold">AND</div>
                    )}
                    <ConditionBlock
                      condition={condition}
                      onUpdate={(updates) => handleUpdateCondition(condition.id, updates)}
                      onDelete={() => handleDeleteCondition(condition.id)}
                      gameState={gameState}
                    />
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddCondition();
              }}
              className="mt-2 text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition"
            >
              <Plus size={14} /> Add Condition
            </button>
          </div>

          {/* Actions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-green-400 flex items-center gap-2">
                ⚡ Do (Actions)
              </h3>
            </div>

            {event.actions.length === 0 ? (
              <div className="text-sm text-zinc-500 italic bg-zinc-900/50 border border-zinc-700 border-dashed rounded p-3 text-center">
                No actions (nothing happens)
              </div>
            ) : (
              <div className="space-y-2">
                {event.actions.map((action, index) => (
                  <div key={action.id}>
                    {index > 0 && (
                      <div className="text-xs text-zinc-500 text-center my-1 font-semibold">THEN</div>
                    )}
                    <ActionBlock
                      action={action}
                      onUpdate={(updates) => handleUpdateAction(action.id, updates)}
                      onDelete={() => handleDeleteAction(action.id)}
                      gameState={gameState}
                    />
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddAction();
              }}
              className="mt-2 text-xs text-green-400 hover:text-green-300 flex items-center gap-1 transition"
            >
              <Plus size={14} /> Add Action
            </button>
          </div>

          {/* Event Settings */}
          <div className="mt-4 pt-4 border-t border-zinc-700 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={event.triggerOnce || false}
                onChange={(e) => {
                  e.stopPropagation();
                  onUpdate({ triggerOnce: e.target.checked });
                }}
                onClick={(e) => e.stopPropagation()}
                className="accent-purple-600"
              />
              <span className="text-zinc-300">Trigger only once</span>
            </label>

            <div className="flex items-center gap-2">
              <label className="text-sm text-zinc-400">Priority:</label>
              <input
                type="number"
                value={event.priority || 0}
                onChange={(e) => onUpdate({ priority: Number(e.target.value) })}
                onClick={(e) => e.stopPropagation()}
                className="w-16 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Comment */}
          <div className="mt-3">
            <input
              type="text"
              value={event.comment || ''}
              onChange={(e) => onUpdate({ comment: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              placeholder="Add comment..."
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-400 italic focus:outline-none focus:border-zinc-600"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default EventCard;
