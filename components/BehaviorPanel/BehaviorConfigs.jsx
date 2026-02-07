// components/BehaviorPanel/BehaviorConfigs.jsx
// Auto-generated config fields from behavior schema

'use client';

import React, { useState, useEffect } from 'react';
import SpriteEditor from '../SpriteEditor/SpriteEditor';

// Keyboard key options for the key picker
const KEY_OPTIONS = [
  { value: 'ArrowUp', label: '↑ Up' },
  { value: 'ArrowDown', label: '↓ Down' },
  { value: 'ArrowLeft', label: '← Left' },
  { value: 'ArrowRight', label: '→ Right' },
  { value: ' ', label: 'Space' },
  { value: 'Enter', label: 'Enter' },
  { value: 'Shift', label: 'Shift' },
  { value: 'Control', label: 'Ctrl' },
  { value: 'w', label: 'W' },
  { value: 'a', label: 'A' },
  { value: 's', label: 'S' },
  { value: 'd', label: 'D' },
  { value: 'e', label: 'E' },
  { value: 'q', label: 'Q' },
  { value: 'z', label: 'Z' },
  { value: 'x', label: 'X' },
  { value: 'c', label: 'C' },
];

/**
 * NumberInput - A controlled number input that allows proper backspace/typing
 */
const NumberInput = ({ value, min, max, step, onChange, className }) => {
  const [localValue, setLocalValue] = useState(String(value ?? ''));
  
  // Sync local value when external value changes
  useEffect(() => {
    setLocalValue(String(value ?? ''));
  }, [value]);
  
  const handleChange = (e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    
    // Only update parent if it's a valid number
    if (newValue !== '' && newValue !== '-') {
      const num = parseFloat(newValue);
      if (!isNaN(num)) {
        onChange(num);
      }
    }
  };
  
  const handleBlur = () => {
    // On blur, if empty or invalid, reset to the current value or default
    if (localValue === '' || localValue === '-' || isNaN(parseFloat(localValue))) {
      setLocalValue(String(value ?? 0));
    } else {
      // Clamp to min/max on blur
      let num = parseFloat(localValue);
      if (min !== undefined && num < min) num = min;
      if (max !== undefined && num > max) num = max;
      setLocalValue(String(num));
      onChange(num);
    }
  };
  
  return (
    <input
      type="text"
      inputMode="decimal"
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      className={className}
    />
  );
};

/**
 * BehaviorConfigs renders config fields based on a behavior's configSchema.
 * Supports number, key, boolean, asset, string, and animationEditor field types.
 */
const BehaviorConfigs = ({ schema, config, onChange, assets = [] }) => {
  if (!schema || schema.length === 0) {
    return (
      <div className="text-xs text-zinc-500 italic">
        No configurable options
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {schema.map(field => {
        // Special handling for spriteEditor - takes full width, no label row
        // This is a large multi-section component. It renders its own labels
        // internally. We skip the standard label + input row for this type.
        if (field.type === 'spriteEditor') {
          return (
            <div key={field.key}>
              <SpriteEditor
                config={config}
                assets={assets}
                onChange={onChange}
              />
            </div>
          );
        }

        // Regular fields with label on left
        return (
        <div key={field.key} className="flex items-center gap-2">
          {/* Label */}
          <label className="text-xs text-zinc-400 w-28 flex-shrink-0 text-right">
            {field.label}
          </label>

          {/* Number input */}
          {field.type === 'number' && (
            <NumberInput
              value={config[field.key] ?? field.default}
              min={field.min}
              max={field.max}
              step={field.step}
              onChange={(num) => onChange(field.key, num)}
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 text-sm text-white
                         focus:border-purple-500 focus:outline-none transition-colors"
            />
          )}

          {/* String input */}
          {field.type === 'string' && (
            <input
              type="text"
              value={config[field.key] ?? field.default}
              onChange={(e) => onChange(field.key, e.target.value)}
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 text-sm text-white
                         focus:border-purple-500 focus:outline-none transition-colors"
            />
          )}

          {/* Asset picker */}
          {field.type === 'asset' && (
            <select
              value={config[field.key] || ''}
              onChange={(e) => onChange(field.key, e.target.value || null)}
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 text-sm text-white
                         focus:border-purple-500 focus:outline-none transition-colors cursor-pointer"
            >
              <option value="">— None —</option>
              {assets
                .filter(a => a.category === 'sprite' || a.category === 'misc')
                .map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.width}×{a.height})
                  </option>
                ))}
            </select>
          )}

          {/* Key selector */}
          {field.type === 'key' && (
            <select
              value={config[field.key] ?? field.default}
              onChange={(e) => onChange(field.key, e.target.value)}
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 text-sm text-white
                         focus:border-purple-500 focus:outline-none transition-colors cursor-pointer"
            >
              {KEY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}

          {/* Boolean toggle */}
          {field.type === 'boolean' && (
            <div className="flex-1 flex">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div
                  onClick={() => onChange(field.key, !config[field.key])}
                  className={`w-9 h-5 rounded-full relative transition-colors cursor-pointer ${
                    config[field.key] ? 'bg-purple-600' : 'bg-zinc-600'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      config[field.key] ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </div>
                <span className="text-xs text-zinc-400">
                  {config[field.key] ? 'On' : 'Off'}
                </span>
              </label>
            </div>
          )}
        </div>
        );
      })}
    </div>
  );
};

export default BehaviorConfigs;
