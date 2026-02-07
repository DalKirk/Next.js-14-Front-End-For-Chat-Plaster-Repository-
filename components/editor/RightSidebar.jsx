'use client';

import React, { useState } from 'react';
import { 
  X, ChevronDown, ChevronRight, 
  Move, RotateCw, Maximize2, Palette, 
  Zap, Settings2, Image, Box
} from 'lucide-react';
import BehaviorPanel from '../BehaviorPanel/BehaviorPanel';

/**
 * RightSidebar - Inspector/Properties panel for selected object
 */
const RightSidebar = ({
  selectedObject,
  onUpdateObject,
  onClose,
  gameState,
  assets = [],
}) => {
  const [expandedSections, setExpandedSections] = useState({
    transform: true,
    appearance: true,
    physics: true,
    behaviors: true,
    events: false,
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (!selectedObject) {
    return (
      <div className="h-full w-full min-w-0 overflow-hidden bg-zinc-800 border-l border-zinc-700 flex items-center justify-center">
        <div className="text-center text-zinc-500 p-4">
          <Box size={48} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">No object selected</p>
          <p className="text-xs mt-1">Select an object to view properties</p>
        </div>
      </div>
    );
  }

  const updateProperty = (key, value) => {
    if (onUpdateObject && selectedObject?.id) {
      onUpdateObject(selectedObject.id, { [key]: value });
    }
  };

  const updateNestedProperty = (parent, key, value) => {
    if (onUpdateObject && selectedObject?.id) {
      onUpdateObject(selectedObject.id, {
        [parent]: {
          ...selectedObject[parent],
          [key]: value
        }
      });
    }
  };

  return (
    <div className="h-full w-full min-w-0 overflow-hidden bg-zinc-800 border-l border-zinc-700 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-700 bg-zinc-850">
        <div className="flex items-center gap-2">
          <span className="text-lg">{selectedObject.icon}</span>
          <input
            type="text"
            value={selectedObject.name}
            onChange={(e) => updateProperty('name', e.target.value)}
            className="bg-transparent border-b border-transparent hover:border-zinc-600 focus:border-blue-500 focus:outline-none text-sm font-medium px-1"
          />
        </div>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-zinc-700 rounded transition"
        >
          <X size={14} />
        </button>
      </div>

      {/* Object Info */}
      <div className="px-3 py-2 border-b border-zinc-700 bg-zinc-850/50">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="px-2 py-0.5 bg-zinc-700 rounded">{selectedObject.type}</span>
          <span>ID: {selectedObject.id}</span>
        </div>
      </div>

      {/* Properties Sections */}
      <div className="flex-1 overflow-y-auto">
        {/* Transform Section */}
        <PropertySection
          title="Transform"
          icon={<Move size={14} />}
          expanded={expandedSections.transform}
          onToggle={() => toggleSection('transform')}
        >
          <PropertyRow label="Position X">
            <NumberInput
              value={selectedObject.x || 0}
              onChange={(v) => updateProperty('x', v)}
              step={1}
            />
          </PropertyRow>
          <PropertyRow label="Position Y">
            <NumberInput
              value={selectedObject.y || 0}
              onChange={(v) => updateProperty('y', v)}
              step={1}
            />
          </PropertyRow>
          <PropertyRow label="Width">
            <NumberInput
              value={selectedObject.width || 50}
              onChange={(v) => updateProperty('width', v)}
              min={1}
              step={1}
            />
          </PropertyRow>
          <PropertyRow label="Height">
            <NumberInput
              value={selectedObject.height || 50}
              onChange={(v) => updateProperty('height', v)}
              min={1}
              step={1}
            />
          </PropertyRow>
          <PropertyRow label="Rotation">
            <NumberInput
              value={selectedObject.rotation || 0}
              onChange={(v) => updateProperty('rotation', v)}
              min={0}
              max={360}
              step={1}
              suffix="°"
            />
          </PropertyRow>
          <PropertyRow label="Scale">
            <NumberInput
              value={selectedObject.scale || 1}
              onChange={(v) => updateProperty('scale', v)}
              min={0.1}
              max={10}
              step={0.1}
            />
          </PropertyRow>
        </PropertySection>

        {/* Appearance Section */}
        <PropertySection
          title="Appearance"
          icon={<Palette size={14} />}
          expanded={expandedSections.appearance}
          onToggle={() => toggleSection('appearance')}
        >
          <PropertyRow label="Layer Type">
            <select
              value={selectedObject.type || 'sprite'}
              onChange={(e) => updateProperty('type', e.target.value)}
              className="w-full bg-zinc-700 border border-zinc-600 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
            >
              <optgroup label="Background">
                <option value="background">Background (back)</option>
                <option value="floor">Floor/Ground</option>
              </optgroup>
              <optgroup label="Environment">
                <option value="platform">Platform</option>
                <option value="decoration">Decoration</option>
              </optgroup>
              <optgroup label="Objects">
                <option value="sprite">Sprite (default)</option>
                <option value="coin">Coin/Collectible</option>
                <option value="goal">Goal/Finish</option>
              </optgroup>
              <optgroup label="Characters">
                <option value="npc">NPC</option>
                <option value="enemy">Enemy</option>
                <option value="player">Player (front)</option>
              </optgroup>
            </select>
          </PropertyRow>
          <PropertyRow label="Visible">
            <Toggle
              value={selectedObject.visible !== false}
              onChange={(v) => updateProperty('visible', v)}
            />
          </PropertyRow>
          <PropertyRow label="Opacity">
            <NumberInput
              value={selectedObject.alpha || 1}
              onChange={(v) => updateProperty('alpha', v)}
              min={0}
              max={1}
              step={0.1}
            />
          </PropertyRow>
          <PropertyRow label="Tint">
            <ColorPicker
              value={selectedObject.tint || '#ffffff'}
              onChange={(v) => updateProperty('tint', v)}
            />
          </PropertyRow>
          <PropertyRow label="Z-Index">
            <NumberInput
              value={selectedObject.zIndex || 0}
              onChange={(v) => updateProperty('zIndex', v)}
              step={1}
            />
          </PropertyRow>
          {/* Sprite/Animation Assignment */}
          <PropertyRow label="Sprite">
            <select
              value={selectedObject.animationAssetId || ''}
              onChange={(e) => {
                const assetId = e.target.value;
                if (!assetId) {
                  // Clear animation
                  onUpdateObject(selectedObject.id, {
                    animationAssetId: null,
                    animationData: null,
                    thumbnail: null,
                  });
                } else {
                  // Find the animation asset and assign it
                  const asset = assets.find(a => a.id === assetId);
                  if (asset && asset.data) {
                    const spriteSheetSrc = asset.data.spriteSheet?.src;
                    onUpdateObject(selectedObject.id, {
                      animationAssetId: assetId,
                      animationData: asset.data,
                      thumbnail: spriteSheetSrc || asset.thumbnail,
                      width: asset.data.spriteSheet?.frameWidth || selectedObject.width,
                      height: asset.data.spriteSheet?.frameHeight || selectedObject.height,
                    });
                  }
                }
              }}
              className="w-full bg-zinc-700 border border-zinc-600 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="">None (use emoji)</option>
              {assets.filter(a => a.type === 'animation').map(asset => (
                <option key={asset.id} value={asset.id}>
                  {asset.name}
                </option>
              ))}
            </select>
          </PropertyRow>
          {selectedObject.thumbnail && (
            <PropertyRow label="Preview">
              <div className="flex items-center gap-2">
                <img 
                  src={selectedObject.thumbnail} 
                  alt="Sprite preview"
                  className="w-8 h-8 rounded object-cover border border-zinc-600"
                />
                <span className="text-xs text-zinc-400 truncate flex-1">
                  {assets.find(a => a.id === selectedObject.animationAssetId)?.name || 'Custom'}
                </span>
              </div>
            </PropertyRow>
          )}
        </PropertySection>

        {/* Physics Section */}
        <PropertySection
          title="Physics"
          icon={<Zap size={14} />}
          expanded={expandedSections.physics}
          onToggle={() => toggleSection('physics')}
        >
          <PropertyRow label="Enable Physics">
            <Toggle
              value={selectedObject.physics !== false}
              onChange={(v) => updateProperty('physics', v)}
            />
          </PropertyRow>
          {selectedObject.physics !== false && (
            <>
              <PropertyRow label="Static">
                <Toggle
                  value={selectedObject.isStatic || false}
                  onChange={(v) => updateProperty('isStatic', v)}
                />
              </PropertyRow>
              <PropertyRow label="Shape">
                <select
                  value={selectedObject.shape || 'rectangle'}
                  onChange={(e) => updateProperty('shape', e.target.value)}
                  className="w-full bg-zinc-700 border border-zinc-600 rounded px-2 py-1 text-xs"
                >
                  <option value="rectangle">Rectangle</option>
                  <option value="circle">Circle</option>
                </select>
              </PropertyRow>
              <PropertyRow label="Friction">
                <NumberInput
                  value={selectedObject.friction ?? 0.1}
                  onChange={(v) => updateProperty('friction', v)}
                  min={0}
                  max={1}
                  step={0.01}
                />
              </PropertyRow>
              <PropertyRow label="Restitution">
                <NumberInput
                  value={selectedObject.restitution ?? 0.3}
                  onChange={(v) => updateProperty('restitution', v)}
                  min={0}
                  max={1}
                  step={0.1}
                />
              </PropertyRow>
              <PropertyRow label="Density">
                <NumberInput
                  value={selectedObject.density ?? 0.001}
                  onChange={(v) => updateProperty('density', v)}
                  min={0.0001}
                  max={0.1}
                  step={0.0001}
                />
              </PropertyRow>
              <PropertyRow label="Is Sensor">
                <Toggle
                  value={selectedObject.isSensor || false}
                  onChange={(v) => updateProperty('isSensor', v)}
                />
              </PropertyRow>
            </>
          )}
        </PropertySection>

        {/* Behaviors Section */}
        <PropertySection
          title="Behaviors"
          icon={<Settings2 size={14} />}
          expanded={expandedSections.behaviors}
          onToggle={() => toggleSection('behaviors')}
        >
          <BehaviorPanel
            object={selectedObject}
            assets={gameState?.assets || []}
            onChange={(updatedObject) => {
              // Update the object with new behaviors array
              if (onUpdateObject && selectedObject?.id) {
                onUpdateObject(selectedObject.id, { behaviors: updatedObject.behaviors });
              }
            }}
          />
        </PropertySection>
      </div>

      {/* Footer Actions */}
      <div className="p-3 border-t border-zinc-700 space-y-2">
        <button className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition">
          Apply Changes
        </button>
      </div>
    </div>
  );
};

// Property Section Component
const PropertySection = ({ title, icon, expanded, onToggle, children }) => (
  <div className="border-b border-zinc-700">
    <div 
      onClick={onToggle}
      className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-zinc-750 transition"
    >
      {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      {icon}
      <span className="text-sm font-medium">{title}</span>
    </div>
    {expanded && (
      <div className="px-3 pb-3 space-y-2">
        {children}
      </div>
    )}
  </div>
);

// Property Row Component
const PropertyRow = ({ label, children }) => (
  <div className="flex items-center justify-between gap-2">
    <span className="text-xs text-zinc-400 flex-shrink-0">{label}</span>
    <div className="flex-1 max-w-[120px]">{children}</div>
  </div>
);

// Number Input Component
const NumberInput = ({ value, onChange, min, max, step = 1, suffix = '' }) => {
  const [localValue, setLocalValue] = React.useState(String(value));
  
  // Sync local value when prop changes (from external updates like dragging)
  React.useEffect(() => {
    setLocalValue(String(value));
  }, [value]);

  const handleChange = (e) => {
    const inputValue = e.target.value;
    setLocalValue(inputValue);
    
    // Only update parent if it's a valid number
    if (inputValue !== '' && inputValue !== '-') {
      let val = parseFloat(inputValue);
      if (!isNaN(val)) {
        if (min !== undefined) val = Math.max(min, val);
        if (max !== undefined) val = Math.min(max, val);
        onChange(val);
      }
    }
  };
  
  const handleBlur = () => {
    // On blur, if empty or invalid, reset to 0 or min value
    if (localValue === '' || localValue === '-' || isNaN(parseFloat(localValue))) {
      const resetValue = min !== undefined ? min : 0;
      setLocalValue(String(resetValue));
      onChange(resetValue);
    } else {
      // Ensure value is within bounds
      let val = parseFloat(localValue);
      if (min !== undefined) val = Math.max(min, val);
      if (max !== undefined) val = Math.min(max, val);
      setLocalValue(String(val));
    }
  };

  // Prevent scroll wheel from affecting canvas zoom when hovering over input
  const handleWheel = (e) => {
    e.stopPropagation();
  };

  // Prevent arrow keys from moving player when focused on input
  const handleKeyDown = (e) => {
    e.stopPropagation();
  };

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="decimal"
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onWheel={handleWheel}
        onKeyDown={handleKeyDown}
        className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-right focus:border-blue-500 focus:outline-none"
      />
      {suffix && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500 pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  );
};

// Toggle Component
const Toggle = ({ value, onChange }) => (
  <button
    onClick={() => onChange(!value)}
    className={`w-10 h-5 rounded-full transition-colors ${
      value ? 'bg-blue-600' : 'bg-zinc-700'
    }`}
  >
    <div 
      className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${
        value ? 'translate-x-5' : 'translate-x-0.5'
      }`}
    />
  </button>
);

// Color Picker Component
const ColorPicker = ({ value, onChange }) => (
  <div className="flex items-center gap-2">
    <input
      type="color"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-6 h-6 rounded border border-zinc-700 cursor-pointer"
    />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
    />
  </div>
);

export default RightSidebar;
