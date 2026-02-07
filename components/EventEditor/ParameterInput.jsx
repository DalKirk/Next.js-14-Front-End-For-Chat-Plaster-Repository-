'use client';

import React from 'react';

/**
 * ParameterInput - Smart parameter input for event editor
 * Renders appropriate input based on parameter type
 */
const ParameterInput = ({ param, value, onChange, gameState }) => {
  const renderInput = () => {
    switch (param.type) {
      case 'number':
        return (
          <input
            type="number"
            value={value ?? param.default ?? 0}
            onChange={(e) => onChange(Number(e.target.value))}
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white focus:border-purple-500 focus:outline-none"
            placeholder={param.placeholder}
            min={param.min}
            max={param.max}
            step={param.step}
          />
        );

      case 'text':
      case 'string':
        return (
          <input
            type="text"
            value={value ?? param.default ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white focus:border-purple-500 focus:outline-none"
            placeholder={param.placeholder}
          />
        );

      case 'boolean':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={value ?? param.default ?? false}
              onChange={(e) => onChange(e.target.checked)}
              className="accent-purple-600 w-4 h-4"
            />
            <span className="text-sm text-zinc-300">{value ? 'Yes' : 'No'}</span>
          </label>
        );

      case 'select':
        return (
          <select
            value={value ?? param.default ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white focus:border-purple-500 focus:outline-none"
          >
            <option value="">Select...</option>
            {param.options?.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'object':
        const objectTypes = gameState?.getObjectTypes?.() || ['Player', 'Enemy', 'Coin', 'Platform', 'Door', 'Key', 'Goal'];
        return (
          <select
            value={value ?? param.default ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white focus:border-purple-500 focus:outline-none"
          >
            <option value="">Select object...</option>
            {objectTypes.map(type => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        );

      case 'variable':
        const variables = gameState?.getVariableNames?.() || ['score', 'health', 'lives', 'hasKey', 'coins'];
        return (
          <select
            value={value ?? param.default ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white focus:border-purple-500 focus:outline-none"
          >
            <option value="">Select variable...</option>
            {variables.map(varName => (
              <option key={varName} value={varName}>
                {varName}
              </option>
            ))}
          </select>
        );

      case 'key':
        const keys = [
          { value: 'ArrowUp', label: '↑ Arrow Up' },
          { value: 'ArrowDown', label: '↓ Arrow Down' },
          { value: 'ArrowLeft', label: '← Arrow Left' },
          { value: 'ArrowRight', label: '→ Arrow Right' },
          { value: ' ', label: 'Space' },
          { value: 'Enter', label: 'Enter' },
          { value: 'Escape', label: 'Escape' },
          { value: 'w', label: 'W' },
          { value: 'a', label: 'A' },
          { value: 's', label: 'S' },
          { value: 'd', label: 'D' },
          { value: 'e', label: 'E' },
          { value: 'q', label: 'Q' },
          { value: 'Shift', label: 'Shift' },
          { value: 'Control', label: 'Control' },
        ];
        return (
          <select
            value={value ?? param.default ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white focus:border-purple-500 focus:outline-none"
          >
            <option value="">Select key...</option>
            {keys.map(key => (
              <option key={key.value} value={key.value}>
                {key.label}
              </option>
            ))}
          </select>
        );

      case 'sound':
        const sounds = gameState?.getSounds?.() || ['coin.mp3', 'jump.mp3', 'hit.mp3', 'victory.mp3', 'gameover.mp3'];
        return (
          <select
            value={value ?? param.default ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white focus:border-purple-500 focus:outline-none"
          >
            <option value="">Select sound...</option>
            {sounds.map(sound => (
              <option key={sound} value={sound}>
                {sound}
              </option>
            ))}
          </select>
        );

      case 'scene':
        const scenes = gameState?.getScenes?.() || ['Main', 'Level1', 'Level2', 'Victory', 'GameOver'];
        return (
          <select
            value={value ?? param.default ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white focus:border-purple-500 focus:outline-none"
          >
            <option value="">Select scene...</option>
            {scenes.map(scene => (
              <option key={scene} value={scene}>
                {scene}
              </option>
            ))}
          </select>
        );

      case 'color':
        return (
          <div className="flex gap-2 flex-1">
            <input
              type="color"
              value={value ?? param.default ?? '#FFFFFF'}
              onChange={(e) => onChange(e.target.value)}
              className="w-12 h-8 rounded cursor-pointer border border-zinc-700"
            />
            <input
              type="text"
              value={value ?? param.default ?? '#FFFFFF'}
              onChange={(e) => onChange(e.target.value)}
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white font-mono focus:border-purple-500 focus:outline-none"
              placeholder="#FFFFFF"
            />
          </div>
        );

      case 'slider':
        return (
          <div className="flex gap-2 flex-1 items-center">
            <input
              type="range"
              value={value ?? param.default ?? 0}
              onChange={(e) => onChange(Number(e.target.value))}
              className="flex-1 accent-purple-600"
              min={param.min ?? 0}
              max={param.max ?? 100}
              step={param.step ?? 1}
            />
            <span className="text-sm text-white w-12 text-right font-mono">
              {value ?? param.default ?? 0}
            </span>
          </div>
        );

      case 'code':
        return (
          <textarea
            value={value ?? param.default ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white font-mono focus:border-purple-500 focus:outline-none"
            placeholder={param.placeholder}
            rows={4}
          />
        );

      case 'objectPicker':
        return (
          <select
            value={value ?? param.default ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white focus:border-purple-500 focus:outline-none"
          >
            <option value="">Select...</option>
            {param.options?.map(opt => (
              <option key={opt} value={opt}>
                {opt === 'collision_other' ? 'The other object in collision' :
                 opt === 'collision_self' ? 'This object in collision' :
                 opt === 'picked_object' ? 'The picked object' :
                 opt === 'all_of_type' ? 'All objects of type...' : opt}
              </option>
            ))}
          </select>
        );

      case 'layer':
        const layers = ['background', 'collision', 'entities', 'foreground', 'ui'];
        return (
          <select
            value={value ?? param.default ?? 'entities'}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white focus:border-purple-500 focus:outline-none"
          >
            {layers.map(layer => (
              <option key={layer} value={layer}>
                {layer.charAt(0).toUpperCase() + layer.slice(1)}
              </option>
            ))}
          </select>
        );

      default:
        return (
          <input
            type="text"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white focus:border-purple-500 focus:outline-none"
          />
        );
    }
  };

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-zinc-400 min-w-24 flex-shrink-0">
        {param.label}:
      </label>
      {renderInput()}
      {param.required && !value && value !== 0 && (
        <span className="text-xs text-red-400 flex-shrink-0">*</span>
      )}
    </div>
  );
};

export default ParameterInput;
