'use client';

import React from 'react';
import { X, RotateCcw } from 'lucide-react';
import { ConditionRegistry } from '../../lib/events/ConditionRegistry';
import ParameterInput from './ParameterInput';

/**
 * ConditionBlock - Displays and edits a single condition
 */
const ConditionBlock = ({ condition, onUpdate, onDelete, gameState }) => {
  const conditionDef = ConditionRegistry[condition.type];

  if (!conditionDef) {
    return (
      <div className="bg-red-900/20 border-2 border-red-500/30 rounded p-3 text-red-400 text-sm">
        ⚠️ Unknown condition type: {condition.type}
      </div>
    );
  }

  const handleInvert = (e) => {
    e.stopPropagation();
    onUpdate({ inverted: !condition.inverted });
  };

  const handleParamChange = (paramName, value) => {
    onUpdate({
      params: {
        ...condition.params,
        [paramName]: value
      }
    });
  };

  return (
    <div className={`bg-blue-900/20 border-2 border-blue-500/30 rounded p-3 transition-opacity ${
      condition.inverted ? 'opacity-75' : ''
    }`}>
      <div className="flex items-start gap-2">
        {/* Icon */}
        <div className="text-2xl flex-shrink-0 mt-0.5">
          {conditionDef.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              {condition.inverted && (
                <span className="text-xs bg-red-600/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded font-semibold">
                  NOT
                </span>
              )}
              <span className="font-semibold text-blue-300">
                {conditionDef.name}
              </span>
              <span className="text-xs text-zinc-500 hidden sm:inline">
                [{conditionDef.category}]
              </span>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Invert */}
              <button
                onClick={handleInvert}
                className={`p-1.5 rounded hover:bg-blue-800/30 transition ${
                  condition.inverted ? 'text-red-400' : 'text-blue-400'
                }`}
                title="Invert (NOT)"
              >
                <RotateCcw size={14} />
              </button>

              {/* Delete */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="p-1.5 rounded hover:bg-red-800/30 text-red-400 transition"
                title="Delete condition"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-zinc-400 mb-3">
            {conditionDef.description}
          </p>

          {/* Parameters */}
          {conditionDef.params && conditionDef.params.length > 0 && (
            <div className="space-y-2">
              {conditionDef.params.map(param => {
                // Check if parameter should be shown (conditional rendering)
                if (param.condition && !param.condition(condition.params)) {
                  return null;
                }

                return (
                  <ParameterInput
                    key={param.name}
                    param={param}
                    value={condition.params?.[param.name]}
                    onChange={(value) => handleParamChange(param.name, value)}
                    gameState={gameState}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConditionBlock;
