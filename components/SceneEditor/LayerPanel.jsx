// components/SceneEditor/LayerPanel.jsx
// Background color, parallax layer stack, scene transitions, camera settings

import React, { useState } from 'react';
import { Plus, Eye, EyeOff, Trash2, Layers, ChevronDown, Sparkles } from 'lucide-react';
import { createParallaxLayer } from '../../lib/scenes/SceneData';

// Parallax presets - common layer configurations
const PARALLAX_PRESETS = {
  forest: {
    name: 'Forest (5 layers)',
    description: 'Sky, distant trees, mid trees, near trees, ground',
    layers: [
      { name: 'Sky', scrollSpeedX: 0.05, scrollSpeedY: 0, zOrder: 0, scaleX: 1.5, scaleY: 1.5, repeatX: true, repeatY: false },
      { name: 'Distant Trees', scrollSpeedX: 0.15, scrollSpeedY: 0, zOrder: 1, scaleX: 1, scaleY: 1, repeatX: true, repeatY: false },
      { name: 'Mid Trees', scrollSpeedX: 0.35, scrollSpeedY: 0, zOrder: 2, scaleX: 1, scaleY: 1, repeatX: true, repeatY: false },
      { name: 'Near Trees', scrollSpeedX: 0.55, scrollSpeedY: 0, zOrder: 3, scaleX: 1, scaleY: 1, repeatX: true, repeatY: false },
      { name: 'Ground', scrollSpeedX: 0.85, scrollSpeedY: 0, zOrder: 4, scaleX: 1, scaleY: 1, repeatX: true, repeatY: false },
    ]
  },
  mountains: {
    name: 'Mountains (4 layers)',
    description: 'Sky, far mountains, near mountains, ground',
    layers: [
      { name: 'Sky Gradient', scrollSpeedX: 0, scrollSpeedY: 0, zOrder: 0, scaleX: 2, scaleY: 2, repeatX: true, repeatY: false },
      { name: 'Far Mountains', scrollSpeedX: 0.1, scrollSpeedY: 0, zOrder: 1, scaleX: 1, scaleY: 1, repeatX: true, repeatY: false },
      { name: 'Near Mountains', scrollSpeedX: 0.3, scrollSpeedY: 0, zOrder: 2, scaleX: 1, scaleY: 1, repeatX: true, repeatY: false },
      { name: 'Ground', scrollSpeedX: 0.8, scrollSpeedY: 0, zOrder: 3, scaleX: 1, scaleY: 1, repeatX: true, repeatY: false },
    ]
  },
  city: {
    name: 'City Night (6 layers)',
    description: 'Destroyed city with moon - includes bundled images!',
    bundled: true, // This preset has bundled images
    layers: [
      { name: 'Sky', scrollSpeedX: 0.02, scrollSpeedY: 0, zOrder: 0, scaleX: 1, scaleY: 1, repeatX: true, repeatY: false, baseY: -418, bundledImage: '/parallax/city/1-sky.png' },
      { name: 'Distant Silhouettes', scrollSpeedX: 0.1, scrollSpeedY: 0, zOrder: 1, scaleX: 1, scaleY: 1, repeatX: true, repeatY: false, baseY: -418, bundledImage: '/parallax/city/2-silhouettes.png' },
      { name: 'Hills', scrollSpeedX: 0.25, scrollSpeedY: 0, zOrder: 2, scaleX: 1, scaleY: 1, repeatX: true, repeatY: false, baseY: -418, bundledImage: '/parallax/city/3-hills.png' },
      { name: 'Buildings', scrollSpeedX: 0.45, scrollSpeedY: 0, zOrder: 3, scaleX: 1, scaleY: 1, repeatX: true, repeatY: false, baseY: -418, bundledImage: '/parallax/city/4-buildings.png' },
      { name: 'Rubble', scrollSpeedX: 0.65, scrollSpeedY: 0, zOrder: 4, scaleX: 1, scaleY: 1, repeatX: true, repeatY: false, baseY: -418, bundledImage: '/parallax/city/5-rubble.png' },
      { name: 'Street', scrollSpeedX: 0.85, scrollSpeedY: 0, zOrder: 5, scaleX: 1, scaleY: 1, repeatX: true, repeatY: false, baseY: -418, bundledImage: '/parallax/city/6-street.png' },
    ]
  },
  underwater: {
    name: 'Underwater (5 layers)',
    description: 'Light rays, bubbles, far coral, mid seaweed, near rocks',
    layers: [
      { name: 'Light Rays', scrollSpeedX: 0.02, scrollSpeedY: 0.1, zOrder: 0, scaleX: 2, scaleY: 2, repeatX: true, repeatY: true },
      { name: 'Bubbles', scrollSpeedX: 0.1, scrollSpeedY: -0.15, zOrder: 1, scaleX: 1, scaleY: 1, repeatX: true, repeatY: true },
      { name: 'Far Coral', scrollSpeedX: 0.2, scrollSpeedY: 0, zOrder: 2, scaleX: 1, scaleY: 1, repeatX: true, repeatY: false },
      { name: 'Mid Seaweed', scrollSpeedX: 0.45, scrollSpeedY: 0, zOrder: 3, scaleX: 1, scaleY: 1, repeatX: true, repeatY: false },
      { name: 'Near Rocks', scrollSpeedX: 0.7, scrollSpeedY: 0, zOrder: 4, scaleX: 1, scaleY: 1, repeatX: true, repeatY: false },
    ]
  },
  space: {
    name: 'Space (4 layers)',
    description: 'Stars, nebula, planets, asteroids',
    layers: [
      { name: 'Distant Stars', scrollSpeedX: 0.02, scrollSpeedY: 0.02, zOrder: 0, scaleX: 3, scaleY: 3, repeatX: true, repeatY: true },
      { name: 'Nebula', scrollSpeedX: 0.08, scrollSpeedY: 0.05, zOrder: 1, scaleX: 1.5, scaleY: 1.5, repeatX: true, repeatY: true },
      { name: 'Planets', scrollSpeedX: 0.15, scrollSpeedY: 0.1, zOrder: 2, scaleX: 1, scaleY: 1, repeatX: false, repeatY: false },
      { name: 'Asteroids', scrollSpeedX: 0.4, scrollSpeedY: 0.3, zOrder: 3, scaleX: 1, scaleY: 1, repeatX: true, repeatY: true },
    ]
  },
  simple: {
    name: 'Simple (3 layers)',
    description: 'Background, midground, foreground',
    layers: [
      { name: 'Background', scrollSpeedX: 0.1, scrollSpeedY: 0, zOrder: 0, scaleX: 1, scaleY: 1, repeatX: true, repeatY: false },
      { name: 'Midground', scrollSpeedX: 0.4, scrollSpeedY: 0, zOrder: 1, scaleX: 1, scaleY: 1, repeatX: true, repeatY: false },
      { name: 'Foreground', scrollSpeedX: 0.8, scrollSpeedY: 0, zOrder: 2, scaleX: 1, scaleY: 1, repeatX: true, repeatY: false },
    ]
  }
};

const LayerPanel = ({ scene, assets, onChange, onAssetsChange }) => {
  const [showPresets, setShowPresets] = useState(false);
  const [loadingPreset, setLoadingPreset] = useState(false);

  // Ensure scene has layers structure
  const parallaxLayers = scene?.layers?.parallax || [];

  const updateLayers = (key, newArray) => {
    onChange({ 
      ...scene, 
      layers: { 
        ...(scene.layers || {}), 
        [key]: newArray 
      } 
    });
  };

  const addParallax = () => {
    updateLayers('parallax', [...parallaxLayers, createParallaxLayer()]);
  };

  // Load bundled images for a preset - just reference URLs, don't convert to base64
  const loadBundledImages = async (preset) => {
    if (!preset.bundled) return {};
    
    const assetMap = {}; // layerName -> assetId
    
    // For bundled presets, we don't need to create assets
    // The SceneView will load directly from bundledImage URL
    // Just return empty map - layers will use bundledImage fallback
    
    console.log('[LayerPanel] Using bundled image URLs directly (no base64 conversion)');
    return assetMap;
  };

  const addPreset = async (presetKey) => {
    const preset = PARALLAX_PRESETS[presetKey];
    if (!preset) return;
    
    setLoadingPreset(true);
    setShowPresets(false);
    
    // Load bundled images if available
    let assetMap = {};
    if (preset.bundled) {
      assetMap = await loadBundledImages(preset);
    }
    
    const newLayers = preset.layers.map((layerConfig, index) => ({
      ...createParallaxLayer(layerConfig.name),
      ...layerConfig,
      zOrder: parallaxLayers.length + index,
      assetId: assetMap[layerConfig.name] || null, // Auto-assign bundled asset
    }));
    
    updateLayers('parallax', [...parallaxLayers, ...newLayers]);
    setLoadingPreset(false);
  };

  const clearAllParallax = () => {
    if (window.confirm('Remove all parallax layers?')) {
      updateLayers('parallax', []);
    }
  };

  const removeParallax = (id) => {
    updateLayers('parallax', parallaxLayers.filter(l => l.id !== id));
  };

  const updateParallax = (id, updates) => {
    updateLayers('parallax', parallaxLayers.map(l =>
      l.id === id ? { ...l, ...updates } : l
    ));
  };

  // Assets that make sense as backgrounds - also include any image type
  const bgAssets = (assets || []).filter(a =>
    a.category === 'background' || a.category === 'misc' || a.type === 'image' || a.base64
  );

  return (
    <div className="space-y-4">

      {/* ── Background Color ── */}
      <Section title="Background">
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={scene.backgroundColor || '#1a1a2e'}
            onChange={(e) => onChange({ ...scene, backgroundColor: e.target.value })}
            className="w-8 h-7 rounded cursor-pointer border border-zinc-600 bg-transparent"
          />
          <input
            type="text"
            value={scene.backgroundColor || '#1a1a2e'}
            onChange={(e) => onChange({ ...scene, backgroundColor: e.target.value })}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1
                       text-xs text-white font-mono focus:outline-none focus:border-purple-500"
          />
        </div>
      </Section>

      {/* ── Loading Indicator ── */}
      {loadingPreset && (
        <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-3 text-center">
          <div className="animate-spin w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full mx-auto mb-2"></div>
          <div className="text-xs text-purple-300">Loading preset images...</div>
        </div>
      )}

      {/* ── Parallax Layers ── */}
      <Section
        title={`Parallax Backgrounds (${parallaxLayers.length})`}
        action={
          <div className="flex items-center gap-1">
            {parallaxLayers.length > 0 && (
              <button
                onClick={clearAllParallax}
                className="text-xs text-red-400 hover:text-red-300 px-1 transition-colors"
                title="Clear all"
              >
                Clear
              </button>
            )}
            <div className="relative">
              <button
                onClick={() => setShowPresets(!showPresets)}
                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
                disabled={loadingPreset}
              >
                <Sparkles size={12} /> Presets <ChevronDown size={10} />
              </button>
              
              {showPresets && (
                <div className="absolute right-0 top-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 py-1 min-w-56">
                  <div className="px-3 py-1.5 text-xs text-zinc-500 border-b border-zinc-700">Quick Add Presets</div>
                  {Object.entries(PARALLAX_PRESETS).map(([key, preset]) => (
                    <button
                      key={key}
                      onClick={() => addPreset(key)}
                      className="w-full px-3 py-2 text-left hover:bg-zinc-800 transition-colors"
                    >
                      <div className="text-xs text-zinc-200 flex items-center gap-1">
                        {preset.name}
                        {preset.bundled && <span className="text-yellow-400" title="Includes images">★</span>}
                      </div>
                      <div className="text-[10px] text-zinc-500">{preset.description}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={addParallax}
              className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
            >
              <Plus size={12} /> Add
            </button>
          </div>
        }
      >
        {parallaxLayers.length === 0 ? (
          <div className="text-center py-4">
            <Layers size={32} className="mx-auto mb-2 text-zinc-600" />
            <p className="text-xs text-zinc-500 mb-3">
              No parallax layers yet.
            </p>
            <p className="text-[10px] text-zinc-600 mb-3">
              Add layers to create depth. Use presets for quick setup!
            </p>
            <div className="flex flex-wrap justify-center gap-1">
              {Object.entries(PARALLAX_PRESETS).slice(0, 3).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => addPreset(key)}
                  className="px-2 py-1 text-[10px] bg-purple-600/20 text-purple-400 rounded hover:bg-purple-600/30 transition-colors"
                >
                  {preset.name.split(' (')[0]}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {parallaxLayers.map((layer) => (
              <ParallaxLayerCard
                key={layer.id}
                layer={layer}
                bgAssets={bgAssets}
                onChange={(updates) => updateParallax(layer.id, updates)}
                onDelete={() => removeParallax(layer.id)}
              />
            ))}
          </div>
        )}
      </Section>

      {/* ── Scene Transition ── */}
      <Section title="Transition (when entering this scene)">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="text-xs text-zinc-500 block mb-1">Type</label>
            <select
              value={scene.transition?.type || 'fade'}
              onChange={(e) => onChange({ ...scene, transition: { ...scene.transition, type: e.target.value } })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5
                         text-xs text-white focus:outline-none focus:border-purple-500"
            >
              <option value="instant">Instant</option>
              <option value="fade">Fade</option>
              <option value="slide_left">Slide Left</option>
              <option value="slide_right">Slide Right</option>
            </select>
          </div>
          <div className="w-24">
            <label className="text-xs text-zinc-500 block mb-1">Duration</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={scene.transition?.duration || 600}
                onChange={(e) => onChange({ ...scene, transition: { ...scene.transition, duration: Number(e.target.value) } })}
                min="0" max="3000" step="100"
                className="w-16 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5
                           text-xs text-white focus:outline-none focus:border-purple-500"
              />
              <span className="text-xs text-zinc-600">ms</span>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Camera Settings ── */}
      <Section title="Camera">
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={scene.camera?.followPlayer !== false}
              onChange={(e) => onChange({ ...scene, camera: { ...scene.camera, followPlayer: e.target.checked } })}
              className="accent-purple-500"
            />
            <span className="text-xs text-zinc-300">Follow player</span>
          </label>

          {scene.camera?.followPlayer !== false && (
            <div className="ml-5">
              <label className="text-xs text-zinc-500 block mb-1">Smoothing</label>
              <input
                type="range"
                min="0.01" max="0.5" step="0.01"
                value={scene.camera?.smoothing || 0.08}
                onChange={(e) => onChange({ ...scene, camera: { ...scene.camera, smoothing: Number(e.target.value) } })}
                className="w-full accent-purple-500"
              />
              <div className="flex justify-between text-xs text-zinc-600 mt-0.5">
                <span>Very smooth</span>
                <span>{scene.camera?.smoothing || 0.08}</span>
                <span>Snappy</span>
              </div>
            </div>
          )}

          {/* Camera Bounds */}
          <div className="mt-3">
            <label className="text-xs text-zinc-500 block mb-2">Camera Bounds</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-zinc-600">Min X</label>
                <input
                  type="number"
                  value={scene.camera?.bounds?.minX || 0}
                  onChange={(e) => onChange({ 
                    ...scene, 
                    camera: { 
                      ...scene.camera, 
                      bounds: { ...scene.camera?.bounds, minX: Number(e.target.value) } 
                    } 
                  })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1
                             text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-600">Max X</label>
                <input
                  type="number"
                  value={scene.camera?.bounds?.maxX || 4000}
                  onChange={(e) => onChange({ 
                    ...scene, 
                    camera: { 
                      ...scene.camera, 
                      bounds: { ...scene.camera?.bounds, maxX: Number(e.target.value) } 
                    } 
                  })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1
                             text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-600">Min Y</label>
                <input
                  type="number"
                  value={scene.camera?.bounds?.minY || 0}
                  onChange={(e) => onChange({ 
                    ...scene, 
                    camera: { 
                      ...scene.camera, 
                      bounds: { ...scene.camera?.bounds, minY: Number(e.target.value) } 
                    } 
                  })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1
                             text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-600">Max Y</label>
                <input
                  type="number"
                  value={scene.camera?.bounds?.maxY || 600}
                  onChange={(e) => onChange({ 
                    ...scene, 
                    camera: { 
                      ...scene.camera, 
                      bounds: { ...scene.camera?.bounds, maxY: Number(e.target.value) } 
                    } 
                  })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1
                             text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
};

// ─── Parallax Layer Card ─────────────────────────────────────────
const ParallaxLayerCard = ({ layer, bgAssets, onChange, onDelete }) => {
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 mb-2 space-y-3">
      {/* Header: name + visibility + delete */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={layer.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="flex-1 bg-transparent text-xs font-semibold text-zinc-200
                     focus:outline-none focus:ring-1 focus:ring-purple-500 rounded px-1"
        />
        <button
          onClick={() => onChange({ visible: !layer.visible })}
          className={`transition-colors ${layer.visible ? 'text-green-400' : 'text-zinc-600'}`}
        >
          {layer.visible ? <Eye size={15} /> : <EyeOff size={15} />}
        </button>
        <button onClick={onDelete} className="text-zinc-500 hover:text-red-400 transition-colors">
          <Trash2 size={15} />
        </button>
      </div>

      {/* Image picker */}
      <Row label="Image">
        <select
          value={layer.assetId || ''}
          onChange={(e) => onChange({ assetId: e.target.value || null })}
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1
                     text-xs text-white focus:outline-none focus:border-purple-500"
        >
          <option value="">— None —</option>
          {bgAssets.map(a => (
            <option key={a.id} value={a.id}>{a.name} ({a.width}×{a.height})</option>
          ))}
        </select>
      </Row>

      {/* Scroll speeds */}
      <div className="grid grid-cols-2 gap-3">
        <SliderField
          label="Scroll X"
          value={layer.scrollSpeedX}
          min={0} max={1} step={0.05}
          hint={layer.scrollSpeedX === 0 ? 'Static' : layer.scrollSpeedX === 1 ? 'No parallax' : `${layer.scrollSpeedX}×`}
          onChange={(v) => onChange({ scrollSpeedX: v })}
        />
        <SliderField
          label="Scroll Y"
          value={layer.scrollSpeedY}
          min={0} max={1} step={0.05}
          hint={`${layer.scrollSpeedY}`}
          onChange={(v) => onChange({ scrollSpeedY: v })}
        />
      </div>

      {/* Scale, tint, alpha */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-xs text-zinc-500 block mb-1">Scale</label>
          <input
            type="number" min="0.1" max="5" step="0.1"
            value={layer.scaleX}
            onChange={(e) => { const v = Number(e.target.value); onChange({ scaleX: v, scaleY: v }); }}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1
                       text-xs text-white focus:outline-none focus:border-purple-500"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-500 block mb-1">Tint</label>
          <input
            type="color"
            value={layer.tintColor || '#ffffff'}
            onChange={(e) => onChange({ tintColor: e.target.value })}
            className="w-full h-7 rounded cursor-pointer border border-zinc-600 bg-transparent"
          />
        </div>
        <SliderField
          label="Alpha"
          value={layer.alpha}
          min={0} max={1} step={0.05}
          hint={`${layer.alpha}`}
          onChange={(v) => onChange({ alpha: v })}
        />
      </div>

      {/* Repeat toggles */}
      <div className="flex gap-4">
        <CheckboxField
          label="Repeat X"
          checked={layer.repeatX}
          onChange={(v) => onChange({ repeatX: v })}
        />
        <CheckboxField
          label="Repeat Y"
          checked={layer.repeatY}
          onChange={(v) => onChange({ repeatY: v })}
        />
      </div>

      {/* Z-order and Y Position */}
      <div className="grid grid-cols-2 gap-2">
        <Row label="Z-Order">
          <input
            type="number" min="-10" max="10" step="1"
            value={layer.zOrder || 0}
            onChange={(e) => onChange({ zOrder: Number(e.target.value) })}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1
                       text-xs text-white focus:outline-none focus:border-purple-500"
          />
        </Row>
        <Row label="Y Position">
          <input
            type="number" min="-500" max="500" step="10"
            value={layer.baseY || 0}
            onChange={(e) => onChange({ baseY: Number(e.target.value) })}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1
                       text-xs text-white focus:outline-none focus:border-purple-500"
          />
        </Row>
      </div>
      <div className="text-xs text-zinc-600">Lower Z = further back. Y adjusts vertical position.</div>
    </div>
  );
};

// ─── Reusable micro-components ───────────────────────────────────

const Section = ({ title, action, children }) => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{title}</span>
      {action}
    </div>
    {children}
  </div>
);

const Row = ({ label, children }) => (
  <div className="flex items-center gap-2">
    <label className="text-xs text-zinc-500 w-14 flex-shrink-0 text-right">{label}</label>
    {children}
  </div>
);

const SliderField = ({ label, value, min, max, step, hint, onChange }) => (
  <div>
    <label className="text-xs text-zinc-500 block mb-1">{label}</label>
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full accent-purple-500"
    />
    {hint && <span className="text-xs text-zinc-600">{hint}</span>}
  </div>
);

const CheckboxField = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-1.5 cursor-pointer">
    <input 
      type="checkbox" 
      checked={checked} 
      onChange={(e) => onChange(e.target.checked)} 
      className="accent-purple-500" 
    />
    <span className="text-xs text-zinc-400">{label}</span>
  </label>
);

export default LayerPanel;
