// components/SceneEditor/SceneEditorPanel.jsx
// Tabbed shell for scene management with Scenes/Layers/Assets tabs

import React, { useState } from 'react';
import { 
  Layers, 
  FolderOpen, 
  Image as ImageIcon, 
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import SceneList from './SceneList';
import LayerPanel from './LayerPanel';
import AssetBrowser from './AssetBrowser';
import ObjectVisualInspector from './ObjectVisualInspector';

const TABS = [
  { id: 'scenes', label: 'Scenes', icon: FolderOpen },
  { id: 'layers', label: 'Layers', icon: Layers },
  { id: 'assets', label: 'Assets', icon: ImageIcon }
];

const SceneEditorPanel = ({
  project,
  onProjectChange,
  currentSceneId,
  onSceneSelect,
  selectedObject,
  onObjectChange,
  onAddAssetToScene
}) => {
  const [activeTab, setActiveTab] = useState('scenes');
  const [collapsed, setCollapsed] = useState(false);

  // Get current scene
  const currentScene = project.scenes.find(s => s.id === currentSceneId);

  // ── Handlers ──
  const handleScenesChange = (newScenes) => {
    onProjectChange({ ...project, scenes: newScenes });
  };

  const handleAssetsChange = (newAssets) => {
    onProjectChange({ ...project, assets: newAssets });
  };

  const handleSceneChange = (updatedScene) => {
    const newScenes = project.scenes.map(s => 
      s.id === updatedScene.id ? updatedScene : s
    );
    onProjectChange({ ...project, scenes: newScenes });
  };

  const handleStartSceneChange = (sceneId) => {
    onProjectChange({ ...project, startSceneId: sceneId });
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 border-l border-zinc-800">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          </button>
          <span className="text-sm font-semibold text-zinc-300">Scene Editor</span>
        </div>
      </div>

      {!collapsed && (
        <>
          {/* ── Tab Bar ── */}
          <div className="flex border-b border-zinc-800">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
                    isActive
                      ? 'text-purple-400 border-b-2 border-purple-500 bg-zinc-800/50'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* ── Tab Content ── */}
          <div className="flex-1 overflow-y-auto p-3">
            {activeTab === 'scenes' && (
              <SceneList
                scenes={project.scenes}
                currentSceneId={currentSceneId}
                startSceneId={project.startSceneId}
                onScenesChange={handleScenesChange}
                onSceneSelect={onSceneSelect}
                onStartSceneChange={handleStartSceneChange}
              />
            )}

            {activeTab === 'layers' && currentScene && (
              <LayerPanel
                scene={currentScene}
                assets={project.assets}
                onChange={handleSceneChange}
                onAssetsChange={handleAssetsChange}
              />
            )}

            {activeTab === 'assets' && (
              <AssetBrowser
                assets={project.assets}
                onAssetsChange={handleAssetsChange}
                onAddToScene={onAddAssetToScene}
              />
            )}
          </div>

          {/* ── Object Inspector (shown when object selected) ── */}
          {selectedObject && (
            <div className="border-t border-zinc-800">
              <div className="px-3 py-2 bg-zinc-800/50">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Selected: {selectedObject.name || selectedObject.type || 'Object'}
                </span>
              </div>
              <ObjectVisualInspector
                object={selectedObject}
                assets={project.assets}
                onChange={onObjectChange}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SceneEditorPanel;
