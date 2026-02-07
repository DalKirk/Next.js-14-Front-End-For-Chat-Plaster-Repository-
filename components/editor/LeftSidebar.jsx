'use client';

import React, { useState } from 'react';
import { 
  Plus, Trash2, Eye, EyeOff, Lock, Unlock, 
  ChevronDown, ChevronRight, Layers, Box,
  Search, MoreVertical
} from 'lucide-react';

/**
 * LeftSidebar - Scene hierarchy and layers panel
 */
const LeftSidebar = ({
  objects,
  selectedObject,
  onSelectObject,
  onAddObject,
  onAddObjectWithSprite,
  onDeleteObject,
  layers,
  selectedLayer,
  onSelectLayer,
  onToggleLayerVisibility,
  assets = [],
}) => {
  const [objectsExpanded, setObjectsExpanded] = useState(true);
  const [layersExpanded, setLayersExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [selectedTypeForSprite, setSelectedTypeForSprite] = useState(null);

  // Get animation assets
  const animationAssets = assets.filter(a => a.type === 'animation');

  // Filter objects by search
  const filteredObjects = objects.filter(obj => 
    obj.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    obj.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group objects by type
  const groupedObjects = filteredObjects.reduce((acc, obj) => {
    if (!acc[obj.type]) acc[obj.type] = [];
    acc[obj.type].push(obj);
    return acc;
  }, {});

  const objectTypes = [
    { type: 'player', label: 'Players', icon: '😊' },
    { type: 'enemy', label: 'Enemies', icon: '👾' },
    { type: 'coin', label: 'Coins', icon: '🪙' },
    { type: 'platform', label: 'Platforms', icon: '🟫' },
    { type: 'goal', label: 'Goals', icon: '🏁' },
    { type: 'npc', label: 'NPCs', icon: '🧑' },
  ];

  return (
    <div className="h-full w-full min-w-0 overflow-hidden bg-zinc-800 flex flex-col border-r border-zinc-700">
      {/* Scene Objects Section */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div 
          className="flex items-center justify-between px-3 py-2 border-b border-zinc-700 cursor-pointer hover:bg-zinc-750"
          onClick={() => setObjectsExpanded(!objectsExpanded)}
        >
          <div className="flex items-center gap-2">
            {objectsExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <Box size={14} className="text-zinc-400" />
            <span className="text-sm font-medium">Scene Objects</span>
            <span className="text-xs text-zinc-500">({objects.length})</span>
          </div>
          <div className="relative">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowAddMenu(!showAddMenu);
              }}
              className="p-1 hover:bg-zinc-600 rounded transition"
              title="Add Object"
            >
              <Plus size={14} />
            </button>
            
            {showAddMenu && (
              <div className="absolute right-0 top-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 py-1 min-w-48">
                {!selectedTypeForSprite ? (
                  // Step 1: Choose object type
                  <>
                    <div className="px-3 py-1 text-xs text-zinc-500 border-b border-zinc-700">Choose Type</div>
                    {objectTypes.map(({ type, label, icon }) => (
                      <button
                        key={type}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (animationAssets.length > 0) {
                            setSelectedTypeForSprite(type);
                          } else {
                            onAddObject(type);
                            setShowAddMenu(false);
                          }
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-700 flex items-center gap-2"
                      >
                        <span>{icon}</span>
                        <span>Add {label.slice(0, -1)}</span>
                        {animationAssets.length > 0 && (
                          <ChevronRight size={12} className="ml-auto text-zinc-500" />
                        )}
                      </button>
                    ))}
                  </>
                ) : (
                  // Step 2: Choose sprite or default
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTypeForSprite(null);
                      }}
                      className="w-full px-3 py-1.5 text-left text-xs text-zinc-400 hover:bg-zinc-700 flex items-center gap-1 border-b border-zinc-700"
                    >
                      <ChevronRight size={10} className="rotate-180" />
                      Back
                    </button>
                    <div className="px-3 py-1 text-xs text-zinc-500">Choose Sprite for {selectedTypeForSprite}</div>
                    
                    {/* Default (no sprite) option */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddObject(selectedTypeForSprite);
                        setSelectedTypeForSprite(null);
                        setShowAddMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-700 flex items-center gap-2"
                    >
                      <span>{objectTypes.find(t => t.type === selectedTypeForSprite)?.icon || '📦'}</span>
                      <span>Default (emoji)</span>
                    </button>
                    
                    {/* Available sprites */}
                    {animationAssets.map(asset => (
                      <button
                        key={asset.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddObjectWithSprite(selectedTypeForSprite, asset);
                          setSelectedTypeForSprite(null);
                          setShowAddMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-700 flex items-center gap-2"
                      >
                        {asset.thumbnail ? (
                          <img src={asset.thumbnail} alt={asset.name} className="w-5 h-5 rounded object-cover" />
                        ) : (
                          <span>🎬</span>
                        )}
                        <span className="truncate">{asset.name}</span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {objectsExpanded && (
          <>
            {/* Search */}
            <div className="px-2 py-2 border-b border-zinc-700">
              <div className="relative">
                <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search objects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 pl-7 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Object List */}
            <div className="flex-1 overflow-y-auto p-2">
              {objectTypes.map(({ type, label, icon }) => {
                const typeObjects = groupedObjects[type] || [];
                if (typeObjects.length === 0) return null;

                return (
                  <ObjectGroup
                    key={type}
                    label={label}
                    icon={icon}
                    objects={typeObjects}
                    selectedObject={selectedObject}
                    onSelectObject={onSelectObject}
                    onDeleteObject={onDeleteObject}
                  />
                );
              })}

              {filteredObjects.length === 0 && (
                <div className="text-center text-zinc-500 py-8 text-sm">
                  {searchQuery ? 'No objects found' : 'No objects in scene'}
                </div>
              )}
            </div>

            {/* Add Button */}
            <div className="p-2 border-t border-zinc-700">
              <button 
                onClick={() => setShowAddMenu(true)}
                className="w-full px-3 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                Add Object
              </button>
            </div>
          </>
        )}
      </div>

      {/* Layers Section */}
      <div className="border-t border-zinc-700">
        <div 
          className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-zinc-750"
          onClick={() => setLayersExpanded(!layersExpanded)}
        >
          <div className="flex items-center gap-2">
            {layersExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <Layers size={14} className="text-zinc-400" />
            <span className="text-sm font-medium">Layers</span>
          </div>
        </div>

        {layersExpanded && (
          <div className="p-2 space-y-1">
            {layers.map(layer => (
              <div
                key={layer.id}
                onClick={() => onSelectLayer(layer.id)}
                className={`flex items-center justify-between p-2 rounded cursor-pointer transition ${
                  selectedLayer === layer.id 
                    ? 'bg-blue-600/20 border border-blue-500/30' 
                    : 'hover:bg-zinc-700'
                }`}
              >
                <span className="text-sm">{layer.name}</span>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleLayerVisibility(layer.id);
                    }}
                    className="p-1 hover:bg-zinc-600 rounded transition"
                  >
                    {layer.visible ? (
                      <Eye size={14} className="text-zinc-400" />
                    ) : (
                      <EyeOff size={14} className="text-zinc-600" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Object Group Component
const ObjectGroup = ({ label, icon, objects, selectedObject, onSelectObject, onDeleteObject }) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="mb-2">
      <div 
        className="flex items-center gap-1 px-1 py-1 text-xs text-zinc-400 cursor-pointer hover:text-zinc-300"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span>{icon}</span>
        <span>{label}</span>
        <span className="text-zinc-600">({objects.length})</span>
      </div>

      {expanded && (
        <div className="space-y-0.5 ml-2">
          {objects.map(obj => (
            <ObjectItem
              key={obj.id}
              object={obj}
              isSelected={selectedObject?.id === obj.id}
              onSelect={() => onSelectObject(obj)}
              onDelete={() => onDeleteObject(obj.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Object Item Component
const ObjectItem = ({ object, isSelected, onSelect, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      onClick={onSelect}
      className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer group transition ${
        isSelected
          ? 'bg-blue-600 text-white'
          : 'hover:bg-zinc-700'
      }`}
    >
      <div className="flex items-center gap-2 overflow-hidden">
        {object.thumbnail ? (
          <img 
            src={object.thumbnail} 
            alt={object.name}
            className="w-6 h-6 rounded object-cover flex-shrink-0"
          />
        ) : (
          <span className="text-base flex-shrink-0">{object.icon || '📦'}</span>
        )}
        <span className="text-sm truncate">{object.name}</span>
        {!object.visible && (
          <EyeOff size={12} className="text-zinc-500 flex-shrink-0" />
        )}
      </div>

      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className={`p-1 rounded opacity-0 group-hover:opacity-100 transition ${
            isSelected ? 'hover:bg-blue-500' : 'hover:bg-zinc-600'
          }`}
        >
          <MoreVertical size={12} />
        </button>

        {showMenu && (
          <div className="absolute right-0 top-full mt-1 bg-zinc-800 border border-zinc-700 rounded shadow-xl z-50 py-1 min-w-32">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
                setShowMenu(false);
              }}
              className="w-full px-3 py-1.5 text-left text-sm text-red-400 hover:bg-zinc-700 flex items-center gap-2"
            >
              <Trash2 size={12} />
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeftSidebar;
