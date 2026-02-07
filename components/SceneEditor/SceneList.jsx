// components/SceneEditor/SceneList.jsx
// Scene CRUD - add, delete, rename, reorder, set start scene

import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Star, 
  ChevronUp, 
  ChevronDown,
  Copy,
  Edit2,
  Check,
  X,
  Play,
  Eye
} from 'lucide-react';
import { createScene, cloneScene, createEntity, createPlatform } from '../../lib/scenes/SceneData';

const SceneList = ({
  scenes,
  currentSceneId,
  startSceneId,
  onScenesChange,
  onSceneSelect,
  onStartSceneChange
}) => {
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');

  // ── Add new scene ──
  const handleAddScene = () => {
    const newScene = createScene(`Scene ${scenes.length + 1}`);
    
    // Add default content - a player and ground platform
    newScene.layers.entities = [
      { ...createEntity('player', 2, 12), id: `player-${Date.now()}`, name: 'Player', fallbackEmoji: '😊' }
    ];
    newScene.layers.platforms = [
      createPlatform(0, 14, 20, 1)  // Ground platform across the bottom
    ];
    
    onScenesChange([...scenes, newScene]);
    onSceneSelect(newScene.id);
  };

  // ── Delete scene ──
  const handleDeleteScene = (sceneId) => {
    // Prevent deleting the last scene
    if (scenes.length <= 1) return;

    const newScenes = scenes.filter(s => s.id !== sceneId);
    onScenesChange(newScenes);

    // If we deleted the current scene, switch to another
    if (currentSceneId === sceneId) {
      onSceneSelect(newScenes[0].id);
    }

    // If we deleted the start scene, set a new one
    if (startSceneId === sceneId) {
      onStartSceneChange(newScenes[0].id);
    }
  };

  // ── Duplicate scene ──
  const handleDuplicateScene = (scene) => {
    const cloned = cloneScene(scene);
    const index = scenes.findIndex(s => s.id === scene.id);
    const newScenes = [...scenes];
    newScenes.splice(index + 1, 0, cloned);
    onScenesChange(newScenes);
    onSceneSelect(cloned.id);
  };

  // ── Rename scene ──
  const startEditing = (scene) => {
    setEditingId(scene.id);
    setEditingName(scene.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName('');
  };

  const confirmEditing = () => {
    if (!editingName.trim()) {
      cancelEditing();
      return;
    }

    const newScenes = scenes.map(s => 
      s.id === editingId 
        ? { ...s, name: editingName.trim(), updatedAt: Date.now() }
        : s
    );
    onScenesChange(newScenes);
    setEditingId(null);
    setEditingName('');
  };

  // ── Reorder scenes ──
  const moveScene = (sceneId, direction) => {
    const index = scenes.findIndex(s => s.id === sceneId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= scenes.length) return;

    const newScenes = [...scenes];
    [newScenes[index], newScenes[newIndex]] = [newScenes[newIndex], newScenes[index]];
    onScenesChange(newScenes);
  };

  // ── Set as start scene ──
  const handleSetStartScene = (sceneId) => {
    onStartSceneChange(sceneId);
  };

  return (
    <div className="space-y-3">
      {/* ── Add Scene Button ── */}
      <button
        onClick={handleAddScene}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 
                   bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium
                   rounded-lg transition-colors"
      >
        <Plus size={16} />
        Add Scene
      </button>

      {/* ── Scene List ── */}
      <div className="space-y-1">
        {scenes.map((scene, index) => {
          const isSelected = scene.id === currentSceneId;
          const isStartScene = scene.id === startSceneId;
          const isEditing = editingId === scene.id;

          return (
            <div
              key={scene.id}
              className={`group relative rounded-lg border transition-all ${
                isSelected
                  ? 'bg-purple-900/40 border-purple-500 shadow-lg shadow-purple-500/20'
                  : 'bg-zinc-800/50 border-zinc-700/50 hover:border-zinc-600'
              }`}
            >
              {/* Active scene badge */}
              {isSelected && (
                <div className="absolute -top-2 left-3 px-2 py-0.5 bg-purple-600 rounded text-[10px] font-bold text-white uppercase tracking-wider">
                  Editing
                </div>
              )}
              
              {/* Main row */}
              <div
                className={`flex items-center gap-2 px-3 py-2 ${isSelected ? 'pt-4' : ''}`}
              >
                {/* Start scene indicator */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleSetStartScene(scene.id); }}
                  className={`flex-shrink-0 transition-colors ${
                    isStartScene
                      ? 'text-yellow-400'
                      : 'text-zinc-600 hover:text-yellow-400'
                  }`}
                  title={isStartScene ? 'Start Scene' : 'Set as Start Scene'}
                >
                  <Star size={14} fill={isStartScene ? 'currentColor' : 'none'} />
                </button>

                {/* Scene name */}
                {isEditing ? (
                  <div className="flex-1 flex items-center gap-1">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') confirmEditing();
                        if (e.key === 'Escape') cancelEditing();
                      }}
                      autoFocus
                      className="flex-1 bg-zinc-900 border border-purple-500 rounded px-2 py-0.5
                                 text-sm text-white focus:outline-none"
                    />
                    <button
                      onClick={confirmEditing}
                      className="text-green-400 hover:text-green-300 p-0.5"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="text-red-400 hover:text-red-300 p-0.5"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <span className="flex-1 text-sm text-zinc-200 truncate">
                    {scene.name}
                  </span>
                )}

                {/* Actions (visible on hover or when selected) */}
                {!isEditing && (
                  <div className={`flex items-center gap-0.5 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    {/* Edit name */}
                    <button
                      onClick={(e) => { e.stopPropagation(); startEditing(scene); }}
                      className="p-1 text-zinc-500 hover:text-zinc-300"
                      title="Rename"
                    >
                      <Edit2 size={14} />
                    </button>

                    {/* Duplicate */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDuplicateScene(scene); }}
                      className="p-1 text-zinc-500 hover:text-zinc-300"
                      title="Duplicate"
                    >
                      <Copy size={14} />
                    </button>
                    
                    {/* Reorder */}
                    <button
                      onClick={(e) => { e.stopPropagation(); moveScene(scene.id, 'up'); }}
                      disabled={index === 0}
                      className="p-1 text-zinc-500 hover:text-zinc-300 disabled:opacity-30 disabled:hover:text-zinc-500"
                      title="Move Up"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); moveScene(scene.id, 'down'); }}
                      disabled={index === scenes.length - 1}
                      className="p-1 text-zinc-500 hover:text-zinc-300 disabled:opacity-30 disabled:hover:text-zinc-500"
                      title="Move Down"
                    >
                      <ChevronDown size={14} />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteScene(scene.id); }}
                      disabled={scenes.length <= 1}
                      className="p-1 text-zinc-500 hover:text-red-400 disabled:opacity-30 disabled:hover:text-zinc-500"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Scene info and Enter button */}
              <div className="px-3 pb-2 flex items-center justify-between">
                <div className="flex gap-3 text-xs text-zinc-500">
                  <span>{scene.layers.entities.length} entities</span>
                  <span>{scene.layers.platforms.length} platforms</span>
                </div>
                
                {/* Enter Scene button (only show for non-selected scenes) */}
                {!isSelected && !isEditing && (
                  <button
                    onClick={() => onSceneSelect(scene.id)}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium
                               bg-green-600 hover:bg-green-500 text-white rounded
                               transition-colors"
                  >
                    <Eye size={12} />
                    Enter
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {scenes.length === 0 && (
        <div className="text-center py-8 text-zinc-600 text-sm">
          No scenes yet. Click "Add Scene" to create one.
        </div>
      )}
    </div>
  );
};

export default SceneList;
