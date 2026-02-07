'use client';

import React from 'react';
import { X, Clock } from 'lucide-react';
import { ActionRegistry } from '../../lib/events/ActionRegistry';
import ParameterInput from './ParameterInput';

/**
 * ActionBlock - Displays and edits a single action
 */
const ActionBlock = ({ action, onUpdate, onDelete, gameState }) => {
  const actionDef = ActionRegistry[action.type];

  if (!actionDef) {
    return (
      <div className="bg-red-900/20 border-2 border-red-500/30 rounded p-3 text-red-400 text-sm">
        ⚠️ Unknown action type: {action.type}
      </div>
    );
  }

  const handleParamChange = (paramName, value) => {
    onUpdate({
      params: {
        ...action.params,
        [paramName]: value
      }
    });
  };

  return (
    <div className="bg-green-900/20 border-2 border-green-500/30 rounded p-3">
      <div className="flex items-start gap-2">
        {/* Icon */}
        <div className="text-2xl flex-shrink-0 mt-0.5">
          {actionDef.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-green-300">
                {actionDef.name}
              </span>
              {action.delay > 0 && (
                <span className="text-xs bg-orange-600/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded flex items-center gap-1">
                  <Clock size={12} />
                  {action.delay}ms
                </span>
              )}
              <span className="text-xs text-zinc-500 hidden sm:inline">
                [{actionDef.category}]
              </span>
            </div>

            {/* Delete */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1.5 rounded hover:bg-red-800/30 text-red-400 transition flex-shrink-0"
              title="Delete action"
            >
              <X size={14} />
            </button>
          </div>

          {/* Description */}
          <p className="text-xs text-zinc-400 mb-3">
            {actionDef.description}
          </p>

          {/* Parameters */}
          {actionDef.params && actionDef.params.length > 0 && (
            <div className="space-y-2">
              {actionDef.params.map(param => {
                // Check if parameter should be shown (conditional rendering)
                if (param.condition && !param.condition(action.params)) {
                  return null;
                }

                return (
                  <ParameterInput
                    key={param.name}
                    param={param}
                    value={action.params?.[param.name]}
                    onChange={(value) => handleParamChange(param.name, value)}
                    gameState={gameState}
                  />
                );
              })}
            </div>
          )}

          {/* Delay Setting */}
          <div className="mt-3 pt-3 border-t border-green-500/20">
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-400">Delay:</label>
              <input
                type="number"
                value={action.delay || 0}
                onChange={(e) => onUpdate({ delay: Number(e.target.value) })}
                className="w-24 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-white focus:border-purple-500 focus:outline-none"
                min="0"
                step="100"
              />
              <span className="text-xs text-zinc-500">ms</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActionBlock;
