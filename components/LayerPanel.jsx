'use client';

import React, { useState } from 'react';

/**
 * Layer Panel Component
 * UI for managing layers in the game builder
 */
function LayerPanel({ layerSystem, onChange, onClose }) {
  const [layers, setLayers] = useState(layerSystem.layers);
  const [activeLayer, setActiveLayer] = useState(layerSystem.activeLayer);
  
  function refreshLayers() {
    setLayers([...layerSystem.layers]);
    setActiveLayer(layerSystem.activeLayer);
    if (onChange) onChange(layerSystem);
  }
  
  function handleAddLayer() {
    const name = prompt('Layer name:');
    if (name) {
      layerSystem.addLayer(name);
      refreshLayers();
    }
  }
  
  function handleToggleVisibility(layerId, e) {
    e.stopPropagation();
    layerSystem.toggleVisibility(layerId);
    refreshLayers();
  }
  
  function handleToggleLock(layerId, e) {
    e.stopPropagation();
    layerSystem.toggleLock(layerId);
    refreshLayers();
  }
  
  function handleSetOpacity(layerId, opacity, e) {
    e.stopPropagation();
    layerSystem.setOpacity(layerId, opacity);
    refreshLayers();
  }
  
  function handleSelectLayer(layerId) {
    layerSystem.setActiveLayer(layerId);
    setActiveLayer(layerId);
    if (onChange) onChange(layerSystem);
  }
  
  function handleDeleteLayer(layerId, e) {
    e.stopPropagation();
    if (layerSystem.layers.length <= 1) {
      alert('Cannot delete the last layer!');
      return;
    }
    
    const layer = layerSystem.getLayer(layerId);
    if (layer.objects.length > 0) {
      if (!confirm(`Delete layer "${layer.name}" with ${layer.objects.length} objects?`)) {
        return;
      }
    }
    
    layerSystem.removeLayer(layerId);
    refreshLayers();
  }
  
  function handleRenameLayer(layerId, e) {
    e.stopPropagation();
    const layer = layerSystem.getLayer(layerId);
    const newName = prompt('New layer name:', layer.name);
    if (newName && newName !== layer.name) {
      layerSystem.renameLayer(layerId, newName);
      refreshLayers();
    }
  }
  
  function handleMoveLayerUp(layerId, e) {
    e.stopPropagation();
    const index = layers.findIndex(l => l.id === layerId);
    if (index < layers.length - 1) {
      layerSystem.moveLayer(layerId, index + 1);
      refreshLayers();
    }
  }
  
  function handleMoveLayerDown(layerId, e) {
    e.stopPropagation();
    const index = layers.findIndex(l => l.id === layerId);
    if (index > 0) {
      layerSystem.moveLayer(layerId, index - 1);
      refreshLayers();
    }
  }
  
  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg min-w-[280px]">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-bold">🎨 Layers</h3>
        <div className="flex gap-2">
          <button
            onClick={handleAddLayer}
            className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded transition-colors font-semibold"
            title="Add new layer"
          >
            + Add
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      
      <div className="space-y-1 max-h-96 overflow-y-auto">
        {/* Display layers in reverse order (top to bottom visually) */}
        {[...layers].reverse().map((layer, reverseIndex) => {
          const isActive = activeLayer === layer.id;
          const originalIndex = layers.length - 1 - reverseIndex;
          
          return (
            <div
              key={layer.id}
              className={`p-3 rounded cursor-pointer transition-all ${
                isActive 
                  ? 'bg-blue-600 ring-2 ring-blue-400' 
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
              onClick={() => handleSelectLayer(layer.id)}
            >
              {/* Layer header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-sm font-semibold truncate">
                    {layer.name}
                  </span>
                  {layer.objects.length > 0 && (
                    <span className="text-xs bg-gray-900 px-1.5 py-0.5 rounded">
                      {layer.objects.length}
                    </span>
                  )}
                </div>
                
                {/* Layer controls */}
                <div className="flex gap-1">
                  <button
                    onClick={(e) => handleToggleVisibility(layer.id, e)}
                    className="text-sm px-1 hover:scale-110 transition-transform"
                    title={layer.visible ? 'Hide layer' : 'Show layer'}
                  >
                    {layer.visible ? '👁️' : '🚫'}
                  </button>
                  
                  <button
                    onClick={(e) => handleToggleLock(layer.id, e)}
                    className="text-sm px-1 hover:scale-110 transition-transform"
                    title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                  >
                    {layer.locked ? '🔒' : '🔓'}
                  </button>
                </div>
              </div>
              
              {/* Opacity slider */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-300">Opacity:</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={layer.opacity}
                  onChange={(e) => handleSetOpacity(layer.id, Number(e.target.value), e)}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 accent-blue-600"
                />
                <span className="text-xs text-gray-300 w-8 text-right">
                  {Math.round(layer.opacity * 100)}%
                </span>
              </div>
              
              {/* Layer actions */}
              <div className="flex gap-1 text-xs">
                <button
                  onClick={(e) => handleMoveLayerUp(layer.id, e)}
                  disabled={originalIndex === layers.length - 1}
                  className={`flex-1 px-2 py-1 rounded transition-colors ${
                    originalIndex === layers.length - 1
                      ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                      : 'bg-gray-900 hover:bg-gray-800 text-gray-300'
                  }`}
                  title="Move layer up"
                >
                  ⬆️ Up
                </button>
                
                <button
                  onClick={(e) => handleMoveLayerDown(layer.id, e)}
                  disabled={originalIndex === 0}
                  className={`flex-1 px-2 py-1 rounded transition-colors ${
                    originalIndex === 0
                      ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                      : 'bg-gray-900 hover:bg-gray-800 text-gray-300'
                  }`}
                  title="Move layer down"
                >
                  ⬇️ Down
                </button>
                
                <button
                  onClick={(e) => handleRenameLayer(layer.id, e)}
                  className="flex-1 px-2 py-1 bg-gray-900 hover:bg-gray-800 rounded transition-colors text-gray-300"
                  title="Rename layer"
                >
                  ✏️ Rename
                </button>
                
                <button
                  onClick={(e) => handleDeleteLayer(layer.id, e)}
                  disabled={layers.length <= 1}
                  className={`flex-1 px-2 py-1 rounded transition-colors ${
                    layers.length <= 1
                      ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                  title="Delete layer"
                >
                  🗑️
                </button>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Info section */}
      <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-400 space-y-1">
        <p>💡 Click a layer to make it active</p>
        <p>💡 Objects will be added to the active layer</p>
        <p>💡 Locked layers cannot be edited</p>
        <p>💡 Layers are drawn from bottom to top</p>
      </div>
    </div>
  );
}

export default LayerPanel;
