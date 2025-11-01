'use client';

import React, { useState, useEffect, useRef } from 'react';

/**
 * Tile Palette Component
 * Visual interface for selecting and placing tiles
 */
function TilePalette({ tileSystem, onTileSelect, onClose }) {
  const [selectedTileset, setSelectedTileset] = useState(null);
  const [selectedTileId, setSelectedTileId] = useState(0);
  const [tilesetList, setTilesetList] = useState([]);
  const [tiles, setTiles] = useState([]);
  const canvasRef = useRef(null);
  
  // Load available tilesets
  useEffect(() => {
    if (!tileSystem) return;
    
    const tilesets = Array.from(tileSystem.tilesets.values());
    setTilesetList(tilesets);
    
    if (tilesets.length > 0 && !selectedTileset) {
      setSelectedTileset(tilesets[0].name);
    }
  }, [tileSystem, selectedTileset]);
  
  // Load tiles from selected tileset
  useEffect(() => {
    if (!selectedTileset || !tileSystem) return;
    
    const tileset = tileSystem.tilesets.get(selectedTileset);
    if (!tileset) return;
    
    setTiles(tileset.tiles);
  }, [selectedTileset, tileSystem]);
  
  // Notify parent of selection
  useEffect(() => {
    if (onTileSelect && selectedTileset !== null && selectedTileId !== null) {
      onTileSelect(selectedTileset, selectedTileId);
    }
  }, [selectedTileset, selectedTileId, onTileSelect]);
  
  // Draw tileset preview
  useEffect(() => {
    if (!canvasRef.current || !selectedTileset || !tileSystem) return;
    
    const tileset = tileSystem.tilesets.get(selectedTileset);
    if (!tileset || !tileset.image.complete) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Calculate grid dimensions
    const cols = Math.floor(tileset.image.width / tileset.tileWidth);
    const tileDisplaySize = 48; // Display size for each tile
    
    canvas.width = cols * tileDisplaySize;
    canvas.height = Math.ceil(tileset.tiles.length / cols) * tileDisplaySize;
    
    // Clear canvas
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid and tiles
    tileset.tiles.forEach((tile, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = col * tileDisplaySize;
      const y = row * tileDisplaySize;
      
      // Draw tile
      ctx.drawImage(
        tileset.image,
        tile.col * tileset.tileWidth,
        tile.row * tileset.tileHeight,
        tileset.tileWidth,
        tileset.tileHeight,
        x,
        y,
        tileDisplaySize,
        tileDisplaySize
      );
      
      // Draw selection highlight
      if (tile.id === selectedTileId) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 1.5, y + 1.5, tileDisplaySize - 3, tileDisplaySize - 3);
      }
      
      // Draw grid lines
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, tileDisplaySize, tileDisplaySize);
    });
  }, [selectedTileset, selectedTileId, tileSystem]);
  
  function handleCanvasClick(e) {
    if (!canvasRef.current || !selectedTileset || !tileSystem) return;
    
    const tileset = tileSystem.tilesets.get(selectedTileset);
    if (!tileset) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const tileDisplaySize = 48;
    const cols = Math.floor(tileset.image.width / tileset.tileWidth);
    
    const col = Math.floor(x / tileDisplaySize);
    const row = Math.floor(y / tileDisplaySize);
    const tileId = row * cols + col;
    
    if (tileId >= 0 && tileId < tileset.tiles.length) {
      setSelectedTileId(tileId);
    }
  }
  
  if (!tileSystem) {
    return (
      <div className="bg-gray-800 p-4 rounded-lg text-center">
        <p className="text-gray-400">No tile system available</p>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg max-w-xl">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">Tile Palette</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          >
            Close
          </button>
        )}
      </div>
      
      {/* Tileset Selector */}
      <div className="mb-4">
        <label className="block text-sm font-semibold mb-2">Tileset</label>
        <select
          value={selectedTileset || ''}
          onChange={(e) => setSelectedTileset(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {tilesetList.length === 0 ? (
            <option>No tilesets loaded</option>
          ) : (
            tilesetList.map(tileset => (
              <option key={tileset.name} value={tileset.name}>
                {tileset.name}
              </option>
            ))
          )}
        </select>
      </div>
      
      {/* Tile Grid */}
      <div className="mb-4">
        <label className="block text-sm font-semibold mb-2">
          Select Tile (ID: {selectedTileId})
        </label>
        <div className="bg-gray-900 border border-gray-600 rounded overflow-auto max-h-96">
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="cursor-pointer"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>
      </div>
      
      {/* Info */}
      <div className="text-xs text-gray-400 space-y-1">
        <p>💡 Click a tile to select it</p>
        <p>💡 Selected tile will be used when placing in the level</p>
        {tiles.length > 0 && (
          <p>📊 {tiles.length} tiles available in this tileset</p>
        )}
      </div>
    </div>
  );
}

export default TilePalette;
