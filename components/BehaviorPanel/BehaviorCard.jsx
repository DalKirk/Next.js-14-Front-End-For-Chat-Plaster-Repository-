// components/BehaviorPanel/BehaviorCard.jsx
// Single behavior card with expand, enable toggle, and remove

'use client';

import React, { useState } from 'react';
import { X, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import BehaviorConfigs from './BehaviorConfigs';

/**
 * BehaviorCard renders one attached behavior with:
 * - Icon and name
 * - Expand/collapse toggle
 * - Enable/disable toggle
 * - Remove button
 * - Config fields (when expanded)
 */
const BehaviorCard = ({ 
  entry, 
  config, 
  enabled, 
  assets = [],
  onConfigChange, 
  onToggleEnabled, 
  onRemove 
}) => {
  const [expanded, setExpanded] = useState(true);

  if (!entry) return null;

  return (
    <div
      className={`border rounded-lg overflow-hidden transition-colors ${
        enabled 
          ? 'border-zinc-700 bg-zinc-800' 
          : 'border-zinc-800 bg-zinc-900 opacity-60'
      }`}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Icon */}
        <span className="text-lg leading-none">{entry.icon}</span>

        {/* Name */}
        <span className="flex-1 text-sm font-semibold text-white">
          {entry.name}
        </span>

        {/* Expand/collapse toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
          title={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {/* Enable/disable toggle */}
        <button
          onClick={onToggleEnabled}
          className={`p-1 rounded transition ${
            enabled
              ? 'text-green-400 hover:bg-green-900/30'
              : 'text-zinc-600 hover:bg-zinc-700'
          }`}
          title={enabled ? 'Enabled — click to disable' : 'Disabled — click to enable'}
        >
          {enabled ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>

        {/* Remove button */}
        <button
          onClick={onRemove}
          className="p-1 rounded hover:bg-red-900/40 text-zinc-500 hover:text-red-400 transition"
          title="Remove behavior"
        >
          <X size={16} />
        </button>
      </div>

      {/* Config body (when expanded) */}
      {expanded && (
        <div className="border-t border-zinc-700 px-3 py-2.5">
          <BehaviorConfigs
            schema={entry.configSchema}
            config={config}
            assets={assets}
            onChange={onConfigChange}
          />
        </div>
      )}
    </div>
  );
};

export default BehaviorCard;
