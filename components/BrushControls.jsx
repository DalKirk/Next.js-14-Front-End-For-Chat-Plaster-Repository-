'use client';

import React from 'react';

/**
 * Brush Controls Component
 * UI for controlling brush tool settings
 */
function BrushControls({ brush, onChange }) {
  const brushInfo = brush.getInfo();
  
  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg space-y-4">
      <h3 className="text-lg font-bold mb-2">🖌️ Brush Tool</h3>
      
      {/* Brush Size */}
      <div>
        <label className="text-sm font-semibold block mb-1">
          Brush Size
        </label>
        <input
          type="range"
          min="1"
          max="10"
          value={brush.size}
          onChange={(e) => {
            brush.setSize(Number(e.target.value));
            onChange({ ...brush });
          }}
          className="w-full accent-blue-600"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>1x1</span>
          <span className="font-semibold text-white">{brushInfo.dimensions}</span>
          <span>10x10</span>
        </div>
      </div>
      
      {/* Brush Shape */}
      <div>
        <label className="text-sm font-semibold block mb-2">
          Shape
        </label>
        <select
          value={brush.shape}
          onChange={(e) => {
            brush.setShape(e.target.value);
            onChange({ ...brush });
          }}
          className="w-full bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="square">⬛ Square</option>
          <option value="circle">⚫ Circle</option>
          <option value="line">📏 Line</option>
        </select>
      </div>
      
      {/* Brush Mode */}
      <div>
        <label className="text-sm font-semibold block mb-2">
          Mode
        </label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'paint', label: '🎨 Paint', color: 'green' },
            { value: 'erase', label: '🧹 Erase', color: 'red' },
            { value: 'fill', label: '🪣 Fill', color: 'blue' },
            { value: 'eyedropper', label: '💧 Pick', color: 'yellow' }
          ].map(mode => (
            <button
              key={mode.value}
              onClick={() => {
                brush.setMode(mode.value);
                onChange({ ...brush });
              }}
              className={`px-3 py-2 text-sm rounded transition-all font-semibold ${
                brush.mode === mode.value
                  ? mode.color === 'green' ? 'bg-green-600 text-white ring-2 ring-green-400'
                  : mode.color === 'red' ? 'bg-red-600 text-white ring-2 ring-red-400'
                  : mode.color === 'blue' ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                  : 'bg-yellow-600 text-white ring-2 ring-yellow-400'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Mode Description */}
      <div className="bg-gray-900 p-3 rounded text-xs text-gray-400">
        <strong className="text-white">
          {brush.mode === 'paint' && '🎨 Paint Mode'}
          {brush.mode === 'erase' && '🧹 Erase Mode'}
          {brush.mode === 'fill' && '🪣 Fill Mode'}
          {brush.mode === 'eyedropper' && '💧 Eyedropper Mode'}
        </strong>
        <p className="mt-1">
          {brush.mode === 'paint' && 'Click and drag to paint tiles'}
          {brush.mode === 'erase' && 'Click and drag to erase tiles'}
          {brush.mode === 'fill' && 'Click to flood fill connected area'}
          {brush.mode === 'eyedropper' && 'Click to pick tile from level'}
        </p>
      </div>
      
      {/* Keyboard Shortcuts */}
      <div className="border-t border-gray-700 pt-3 text-xs text-gray-500">
        <p className="font-semibold text-gray-400 mb-2">Keyboard Shortcuts:</p>
        <div className="space-y-1">
          <p><kbd className="bg-gray-700 px-1 rounded">B</kbd> Paint mode</p>
          <p><kbd className="bg-gray-700 px-1 rounded">E</kbd> Erase mode</p>
          <p><kbd className="bg-gray-700 px-1 rounded">F</kbd> Fill mode</p>
          <p><kbd className="bg-gray-700 px-1 rounded">I</kbd> Eyedropper</p>
          <p><kbd className="bg-gray-700 px-1 rounded">[</kbd> / <kbd className="bg-gray-700 px-1 rounded">]</kbd> Brush size</p>
        </div>
      </div>
    </div>
  );
}

export default BrushControls;
