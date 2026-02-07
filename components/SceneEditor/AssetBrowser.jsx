// components/SceneEditor/AssetBrowser.jsx
// Drag-drop image upload, category filtering, thumbnail grid

import React, { useState, useRef, useCallback } from 'react';
import { Upload, Trash2, FolderOpen, PlusCircle } from 'lucide-react';

const CATEGORIES = ['background', 'platform', 'sprite', 'pickup', 'icon', 'misc'];

const AssetBrowser = ({ assets, onAssetsChange, onAddToScene }) => {
  const [filterCat, setFilterCat] = useState('all');
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);
  
  // Debug log
  console.log('[AssetBrowser] Rendered with onAddToScene:', !!onAddToScene, 'assets:', assets?.length);

  // ── Upload logic ──
  const processFiles = useCallback(async (files) => {
    const newAssets = [];
    
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      
      const asset = await readFileAsAsset(file);
      if (asset) newAssets.push(asset);
    }
    
    if (newAssets.length) {
      onAssetsChange([...assets, ...newAssets]);
    }
  }, [assets, onAssetsChange]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    processFiles(Array.from(e.dataTransfer.files));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleFileInput = (e) => {
    processFiles(Array.from(e.target.files || []));
    e.target.value = ''; // reset so re-selecting same file works
  };

  // ── CRUD ──
  const deleteAsset = (id) => {
    onAssetsChange(assets.filter(a => a.id !== id));
  };

  const changeCategory = (id, cat) => {
    onAssetsChange(assets.map(a => a.id === id ? { ...a, category: cat } : a));
  };

  // ── Filter ──
  const visible = filterCat === 'all' 
    ? assets 
    : assets.filter(a => a.category === filterCat);

  return (
    <div className="space-y-3">
      {/* ── Drop zone ── */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
          dragging
            ? 'border-purple-500 bg-purple-950/30'
            : 'border-zinc-600 hover:border-zinc-500 hover:bg-zinc-800/40'
        }`}
      >
        <Upload size={22} className="text-zinc-500 mx-auto mb-2" />
        <p className="text-xs text-zinc-400 font-medium">
          Drop images here or click to upload
        </p>
        <p className="text-xs text-zinc-600 mt-0.5">PNG · JPG · WebP · GIF · SVG</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileInput}
          className="hidden"
        />
      </div>

      {/* ── Category filter bar ── */}
      <div className="flex flex-wrap gap-1.5">
        {['all', ...CATEGORIES].map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            className={`text-xs px-2.5 py-1 rounded-full transition-colors capitalize ${
              filterCat === cat
                ? 'bg-purple-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            {cat}
            {cat !== 'all' && (
              <span className="ml-1 text-zinc-500">
                ({assets.filter(a => a.category === cat).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Thumbnail grid ── */}
      {visible.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {visible.map(asset => (
            <div
              key={asset.id}
              draggable="true"
              onDragStart={(e) => {
                // Set the asset data as JSON for the drop target to read
                e.dataTransfer.setData('application/json', JSON.stringify(asset));
                e.dataTransfer.effectAllowed = 'copy';
                console.log('[AssetBrowser] Drag started:', asset.name);
              }}
              className="bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden
                         hover:border-zinc-600 transition-colors cursor-grab active:cursor-grabbing"
            >
              {/* Thumbnail */}
              <div className="aspect-square bg-zinc-900 flex items-center justify-center p-1.5">
                <img
                  src={asset.base64}
                  alt={asset.name}
                  className="max-w-full max-h-full object-contain"
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>

              {/* Info + controls */}
              <div className="p-2 space-y-1.5">
                <p className="text-xs text-white truncate font-medium" title={asset.name}>
                  {asset.name}
                </p>
                <p className="text-xs text-zinc-500">
                  {asset.width} × {asset.height}px
                </p>

                {/* Category selector */}
                <select
                  value={asset.category}
                  onChange={(e) => changeCategory(asset.id, e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-1.5 py-0.5
                             text-xs text-zinc-300 focus:outline-none focus:border-purple-500"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                {/* Delete */}
                <button
                  onClick={() => deleteAsset(asset.id)}
                  className="w-full flex items-center justify-center gap-1 text-xs
                             text-zinc-600 hover:text-red-400 transition-colors py-0.5"
                >
                  <Trash2 size={11} /> Delete
                </button>
                
                {/* Add to Scene */}
                {onAddToScene && (
                  <button
                    onClick={() => {
                      console.log('[AssetBrowser] Adding asset to scene:', asset);
                      onAddToScene(asset);
                    }}
                    className="w-full flex items-center justify-center gap-1 text-xs
                               bg-green-600 hover:bg-green-500 text-white rounded py-1 mt-1
                               transition-colors"
                  >
                    <PlusCircle size={11} /> Add to Scene
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-zinc-600 text-xs italic">
          <FolderOpen size={24} className="mx-auto mb-2 opacity-50" />
          {filterCat === 'all'
            ? 'No assets yet. Upload some images above.'
            : `No ${filterCat} assets. Change the filter or upload some.`}
        </div>
      )}

      {/* ── Stats ── */}
      {assets.length > 0 && (
        <div className="text-xs text-zinc-600 text-center pt-2 border-t border-zinc-800">
          {assets.length} asset{assets.length !== 1 ? 's' : ''} total
        </div>
      )}
    </div>
  );
};

// ─── Helper: File → asset definition ──────────────────────────────
function readFileAsAsset(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const base64 = e.target.result;
      const img = new Image();
      
      img.onload = () => {
        resolve({
          id: `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          category: 'misc',
          base64,
          width: img.width,
          height: img.height,
          createdAt: Date.now()
        });
      };
      
      img.onerror = () => resolve(null);
      img.src = base64;
    };
    
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

export default AssetBrowser;
