'use client';

import React, { useState } from 'react';
import { 
  FolderOpen, Image, Music, Code, FileJson, 
  Plus, Search, Grid, List, Upload, Trash2,
  Terminal, AlertCircle, Info, CheckCircle,
  X, ChevronRight, Play, Zap, Volume2, VolumeX,
  Maximize2, Minimize2, Layers
} from 'lucide-react';
import { EventEditor } from '../EventEditor';
import { SceneEditorPanel } from '../SceneEditor';

/**
 * BottomPanel - Tabbed panel for Assets, Events, Scenes, and Console
 */
const BottomPanel = ({
  events,
  onEventsChange,
  selectedEventId,
  onSelectEvent,
  onAddEvent,
  onDeleteEvent,
  consoleLogs,
  onClearConsole,
  assets,
  onUploadAsset,
  audioSystem,
  gameState,
  sceneObjects,
  onExpandEvents,
  onExpandScenes,
  isExpanded = false,
  // Scene Manager props
  project,
  onProjectChange,
  currentSceneId,
  onSceneSelect,
  selectedCanvasObject,
  onCanvasObjectChange,
  onAddAssetToScene,
  onAddAnimationToScene,
}) => {
  const [activeTab, setActiveTab] = useState('assets');
  const [assetView, setAssetView] = useState('grid');
  const [assetFilter, setAssetFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const tabs = [
    { id: 'assets', label: 'Assets', icon: <FolderOpen size={14} /> },
    { id: 'scenes', label: 'Scenes', icon: <Layers size={14} />, count: project?.scenes?.length },
    { id: 'audio', label: 'Audio', icon: <Music size={14} /> },
    { id: 'events', label: 'Events', icon: <Zap size={14} />, count: events?.length },
    { id: 'console', label: 'Console', icon: <Terminal size={14} />, count: consoleLogs?.filter(l => l.type === 'error').length },
  ];

  return (
    <div className="h-full w-full min-h-0 overflow-hidden bg-zinc-800 border-t border-zinc-700 flex flex-col">
      {/* Tab Bar - hidden in expanded mode */}
      {!isExpanded && (
        <div className="flex items-center justify-between border-b border-zinc-700 bg-zinc-850">
          <div className="flex items-center">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 text-sm border-b-2 transition ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-white bg-zinc-800'
                    : 'border-transparent text-zinc-400 hover:text-white hover:bg-zinc-750'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                    tab.id === 'console' ? 'bg-red-600' : 'bg-zinc-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
        </div>

        {/* Tab Actions */}
        <div className="flex items-center gap-2 px-3">
          {activeTab === 'assets' && (
            <>
              <button
                onClick={() => setAssetView(assetView === 'grid' ? 'list' : 'grid')}
                className="p-1.5 hover:bg-zinc-700 rounded transition"
                title={assetView === 'grid' ? 'List View' : 'Grid View'}
              >
                {assetView === 'grid' ? <List size={14} /> : <Grid size={14} />}
              </button>
              <button
                onClick={onUploadAsset}
                className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs transition"
              >
                <Upload size={12} />
                Import
              </button>
            </>
          )}
          {activeTab === 'scenes' && (
            <>
              {onExpandScenes && !isExpanded && (
                <button
                  onClick={onExpandScenes}
                  className="flex items-center gap-1 px-2 py-1 bg-cyan-600 hover:bg-cyan-500 rounded text-xs transition"
                  title="Expand to full screen"
                >
                  <Maximize2 size={12} />
                  Expand
                </button>
              )}
            </>
          )}
          {activeTab === 'events' && (
            <>
              {onExpandEvents && !isExpanded && (
                <button
                  onClick={onExpandEvents}
                  className="flex items-center gap-1 px-2 py-1 bg-purple-600 hover:bg-purple-500 rounded text-xs transition"
                  title="Expand to full screen"
                >
                  <Maximize2 size={12} />
                  Expand
                </button>
              )}
              <button
                onClick={() => onAddEvent?.()}
                className="flex items-center gap-1 px-2 py-1 bg-green-600 hover:bg-green-500 rounded text-xs transition"
              >
                <Plus size={12} />
                Add Event
              </button>
            </>
          )}
          {activeTab === 'console' && (
            <button
              onClick={onClearConsole}
              className="flex items-center gap-1 px-2 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-xs transition"
            >
              <Trash2 size={12} />
              Clear
            </button>
          )}
        </div>
      </div>
      )}

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {(activeTab === 'assets' && !isExpanded) && (
          <AssetsTab
            assets={assets}
            view={assetView}
            filter={assetFilter}
            setFilter={setAssetFilter}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onAddToScene={onAddAnimationToScene}
          />
        )}
        {(activeTab === 'scenes' && !isExpanded) && project && (
          <SceneEditorPanel
            project={project}
            onProjectChange={onProjectChange}
            currentSceneId={currentSceneId}
            onSceneSelect={onSceneSelect}
            selectedObject={selectedCanvasObject}
            onObjectChange={onCanvasObjectChange}
            onAddAssetToScene={onAddAssetToScene}
          />
        )}
        {(activeTab === 'audio' && !isExpanded) && (
          <AudioTab audioSystem={audioSystem} />
        )}
        {(activeTab === 'events' || isExpanded) && (
          <EventEditor
            events={events}
            onEventsChange={onEventsChange}
            selectedEventId={selectedEventId}
            onSelectEvent={onSelectEvent}
            gameState={{ ...gameState, sceneObjects }}
          />
        )}
        {(activeTab === 'console' && !isExpanded) && (
          <ConsoleTab
            logs={consoleLogs}
          />
        )}
      </div>
    </div>
  );
};

// Assets Tab Component
const AssetsTab = ({ assets = [], view, filter, setFilter, searchQuery, setSearchQuery, onAddToScene }) => {
  const assetTypes = [
    { id: 'all', label: 'All', icon: <FolderOpen size={12} /> },
    { id: 'sprites', label: 'Sprites', icon: <Image size={12} /> },
    { id: 'audio', label: 'Audio', icon: <Music size={12} /> },
    { id: 'scripts', label: 'Scripts', icon: <Code size={12} /> },
    { id: 'data', label: 'Data', icon: <FileJson size={12} /> },
  ];

  const filteredAssets = assets.filter(asset => {
    const matchesFilter = filter === 'all' || 
      asset.type === filter || 
      (filter === 'sprites' && asset.category === 'sprite') || 
      (filter === 'sprites' && asset.type === 'animation');
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="h-full flex">
      {/* Asset Type Sidebar */}
      <div className="w-32 border-r border-zinc-700 p-2 space-y-1">
        {assetTypes.map(type => (
          <button
            key={type.id}
            onClick={() => setFilter(type.id)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition ${
              filter === type.id
                ? 'bg-blue-600 text-white'
                : 'hover:bg-zinc-700 text-zinc-400'
            }`}
          >
            {type.icon}
            {type.label}
          </button>
        ))}
      </div>

      {/* Asset Browser */}
      <div className="flex-1 flex flex-col">
        {/* Search */}
        <div className="p-2 border-b border-zinc-700">
          <div className="relative">
            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 pl-7 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Asset Grid/List */}
        <div className="flex-1 overflow-y-auto p-2">
          {filteredAssets.length > 0 ? (
            view === 'grid' ? (
              <div className="grid grid-cols-4 gap-2">
                {filteredAssets.map(asset => (
                  <AssetCard key={asset.id} asset={asset} onAddToScene={onAddToScene} />
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredAssets.map(asset => (
                  <AssetRow key={asset.id} asset={asset} />
                ))}
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500">
              <FolderOpen size={48} className="mb-2 opacity-50" />
              <p className="text-sm">No assets found</p>
              <button className="mt-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-xs text-white transition">
                Import Assets
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Asset Card Component
const AssetCard = ({ asset, onAddToScene }) => {
  // For animation assets, use first frame as thumbnail
  const thumbnail = asset.thumbnail || 
    (asset.type === 'animation' && asset.data?.frames?.[0]);
  
  const isAnimation = asset.type === 'animation';
  
  return (
    <div className="bg-zinc-700/50 rounded-lg p-2 hover:bg-zinc-700 transition group relative">
      <div className="aspect-square bg-zinc-800 rounded mb-2 flex items-center justify-center overflow-hidden">
        {thumbnail ? (
          <img 
            src={thumbnail} 
            alt={asset.name} 
            className="w-full h-full object-contain"
            style={{ imageRendering: 'pixelated' }}
          />
        ) : (
          <Image size={24} className="text-zinc-600" />
        )}
      </div>
      <p className="text-xs truncate text-center mb-1">{asset.name}</p>
      {isAnimation && onAddToScene && (
        <button
          onClick={() => onAddToScene(asset)}
          className="w-full py-1 px-2 bg-purple-600 hover:bg-purple-500 rounded text-[10px] text-white transition opacity-0 group-hover:opacity-100"
          title="Add animated player to scene"
        >
          <Plus size={10} className="inline mr-0.5" />
          Add to Scene
        </button>
      )}
    </div>
  );
};

// Asset Row Component
const AssetRow = ({ asset }) => {
  // For animation assets, use first frame as thumbnail
  const thumbnail = asset.thumbnail || 
    (asset.type === 'animation' && asset.data?.frames?.[0]);
  
  return (
    <div className="flex items-center gap-3 px-2 py-1.5 hover:bg-zinc-700 rounded cursor-pointer transition">
      <div className="w-8 h-8 bg-zinc-700 rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
        {thumbnail ? (
          <img 
            src={thumbnail} 
            alt={asset.name} 
            className="w-full h-full object-contain"
            style={{ imageRendering: 'pixelated' }}
          />
        ) : (
          <Image size={14} className="text-zinc-500" />
        )}
      </div>
      <span className="text-sm flex-1 truncate">{asset.name}</span>
      <span className="text-xs text-zinc-500">{asset.type}</span>
    </div>
  );
};

// Events Tab Component
const EventsTab = ({ events = [], onAddEvent, onDeleteEvent }) => {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-2">
        {events.length > 0 ? (
          <div className="space-y-2">
            {events.map((event, idx) => (
              <EventRow key={event.id || idx} event={event} onDelete={() => onDeleteEvent?.(event.id)} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500">
            <Zap size={48} className="mb-2 opacity-50" />
            <p className="text-sm">No events defined</p>
            <p className="text-xs mt-1">Events control game logic</p>
            <button 
              onClick={onAddEvent}
              className="mt-3 px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded text-xs text-white transition"
            >
              Create First Event
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Event Row Component
const EventRow = ({ event, onDelete }) => (
  <div className="flex items-center gap-3 px-3 py-2 bg-zinc-700/50 rounded-lg hover:bg-zinc-700 transition group">
    <div className="w-8 h-8 bg-blue-600/20 rounded flex items-center justify-center flex-shrink-0">
      <Zap size={14} className="text-blue-400" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium">{event.name || 'Unnamed Event'}</p>
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <span>{event.trigger || 'On Start'}</span>
        <ChevronRight size={10} />
        <span>{event.action || 'No Action'}</span>
      </div>
    </div>
    <button 
      onClick={onDelete}
      className="p-1.5 hover:bg-red-600/20 rounded opacity-0 group-hover:opacity-100 transition"
    >
      <Trash2 size={14} className="text-red-400" />
    </button>
  </div>
);

// Console Tab Component
const ConsoleTab = ({ logs = [] }) => {
  const getLogIcon = (type) => {
    switch (type) {
      case 'error':
        return <AlertCircle size={14} className="text-red-400" />;
      case 'warning':
        return <AlertCircle size={14} className="text-yellow-400" />;
      case 'success':
        return <CheckCircle size={14} className="text-green-400" />;
      default:
        return <Info size={14} className="text-blue-400" />;
    }
  };

  const getLogClass = (type) => {
    switch (type) {
      case 'error':
        return 'bg-red-900/20 border-l-red-500';
      case 'warning':
        return 'bg-yellow-900/20 border-l-yellow-500';
      case 'success':
        return 'bg-green-900/20 border-l-green-500';
      default:
        return 'bg-zinc-700/20 border-l-blue-500';
    }
  };

  return (
    <div className="h-full overflow-y-auto p-2 font-mono text-xs">
      {logs.length > 0 ? (
        <div className="space-y-1">
          {logs.map((log, idx) => (
            <div 
              key={idx}
              className={`flex items-start gap-2 px-2 py-1.5 rounded border-l-2 ${getLogClass(log.type)}`}
            >
              <div className="flex-shrink-0 mt-0.5">{getLogIcon(log.type)}</div>
              <div className="flex-1 min-w-0">
                <span className="text-zinc-300">{log.message}</span>
                {log.source && (
                  <span className="text-zinc-600 ml-2">{log.source}</span>
                )}
              </div>
              {log.time && (
                <span className="text-zinc-600 flex-shrink-0">
                  {log.time instanceof Date ? log.time.toLocaleTimeString() : log.time}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center h-full text-zinc-500">
          <Terminal size={24} className="mr-2 opacity-50" />
          <span>Console is empty</span>
        </div>
      )}
    </div>
  );
};

// Audio Tab Component
const AudioTab = ({ audioSystem }) => {
  const [volumes, setVolumes] = useState({
    master: 1.0,
    music: 0.7,
    sfx: 1.0
  });
  const [muted, setMuted] = useState({
    master: false,
    music: false,
    sfx: false
  });
  const [loadedSounds, setLoadedSounds] = useState([]);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = React.useRef(null);

  const handleVolumeChange = (type, value) => {
    const newValue = parseFloat(value);
    setVolumes(prev => ({ ...prev, [type]: newValue }));
    
    if (audioSystem?.current) {
      switch (type) {
        case 'master':
          audioSystem.current.setMasterVolume(newValue);
          break;
        case 'music':
          audioSystem.current.setMusicVolume(newValue);
          break;
        case 'sfx':
          audioSystem.current.setSfxVolume(newValue);
          break;
      }
    }
  };

  const toggleMute = (type) => {
    setMuted(prev => ({ ...prev, [type]: !prev[type] }));
    
    if (audioSystem?.current) {
      switch (type) {
        case 'master':
          audioSystem.current.toggleMasterMute();
          break;
        case 'music':
          audioSystem.current.toggleMusicMute();
          break;
        case 'sfx':
          audioSystem.current.toggleSfxMute();
          break;
      }
    }
  };

  const handleAudioUpload = (e) => {
    const files = Array.from(e.target.files || []);
    console.log('[BottomPanel] Audio upload, files:', files.length);
    console.log('[BottomPanel] audioSystem available:', !!audioSystem?.current);
    setUploadError(null); // Clear previous errors
    
    files.forEach(file => {
      if (file.type.startsWith('audio/')) {
        // Create object URL for the audio file
        const url = URL.createObjectURL(file);
        const soundId = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
        
        // Extract format from filename for Howler (blob URLs don't have extensions)
        const extension = file.name.split('.').pop()?.toLowerCase();
        const formatMap = {
          'mp3': 'mp3',
          'ogg': 'ogg',
          'wav': 'wav',
          'webm': 'webm',
          'm4a': 'mp4',
          'aac': 'aac',
          'flac': 'flac'
        };
        const format = formatMap[extension] || extension;
        
        console.log('[BottomPanel] Loading sound:', soundId, 'format:', format, 'from blob URL');
        
        if (audioSystem?.current) {
          audioSystem.current.loadSound(soundId, url, {
            volume: 1.0,
            format: [format], // Tell Howler the audio format explicitly
            html5: true, // Use HTML5 Audio for blob URLs (more compatible)
            onLoad: () => {
              console.log('[BottomPanel] Sound loaded successfully:', soundId);
              setLoadedSounds(prev => {
                // Prevent duplicates
                if (prev.some(s => s.id === soundId)) {
                  return prev;
                }
                return [...prev, { id: soundId, name: file.name, url }];
              });
            },
            onError: (error) => {
              console.error('[BottomPanel] Sound load error:', soundId, error);
              URL.revokeObjectURL(url); // Clean up the blob URL
              
              // Show user-friendly error message
              if (error && error.includes && error.includes('codec')) {
                setUploadError(`"${file.name}" - Unsupported audio format. Try MP3, OGG, or WAV.`);
              } else {
                setUploadError(`Failed to load "${file.name}". Try a different format.`);
              }
              
              // Clear error after 5 seconds
              setTimeout(() => setUploadError(null), 5000);
            }
          });
        } else {
          // Store for later even without audio system
          console.warn('[BottomPanel] No audio system, storing sound reference only');
          setLoadedSounds(prev => [...prev, { id: soundId, name: file.name, url }]);
        }
      }
    });
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const playSound = (soundId) => {
    console.log('[BottomPanel] playSound called:', soundId);
    console.log('[BottomPanel] audioSystem:', audioSystem);
    console.log('[BottomPanel] audioSystem.current:', audioSystem?.current);
    if (audioSystem?.current) {
      const result = audioSystem.current.play(soundId);
      console.log('[BottomPanel] play result:', result);
    } else {
      console.warn('[BottomPanel] No audio system available');
    }
  };

  const removeSound = (soundId, url) => {
    if (audioSystem?.current) {
      audioSystem.current.unload(soundId);
    }
    URL.revokeObjectURL(url);
    setLoadedSounds(prev => prev.filter(s => s.id !== soundId));
  };

  const VolumeSlider = ({ label, type, icon }) => (
    <div className="flex items-center gap-3 p-3 bg-zinc-750 rounded-lg">
      <button
        onClick={() => toggleMute(type)}
        className={`p-2 rounded transition ${muted[type] ? 'bg-red-600/20 text-red-400' : 'hover:bg-zinc-600 text-zinc-300'}`}
        title={muted[type] ? 'Unmute' : 'Mute'}
      >
        {muted[type] ? <VolumeX size={18} /> : icon}
      </button>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-zinc-300">{label}</span>
          <span className="text-xs text-zinc-500">{Math.round(volumes[type] * 100)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volumes[type]}
          onChange={(e) => handleVolumeChange(type, e.target.value)}
          className="w-full h-2 bg-zinc-600 rounded-lg appearance-none cursor-pointer slider"
          style={{
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${volumes[type] * 100}%, #52525b ${volumes[type] * 100}%, #52525b 100%)`
          }}
        />
      </div>
    </div>
  );

  return (
    <div className="h-full p-4 overflow-auto">
      <div className="max-w-md space-y-3">
        <h3 className="text-sm font-medium text-zinc-300 mb-4 flex items-center gap-2">
          <Volume2 size={16} />
          Audio Settings
        </h3>
        
        <VolumeSlider 
          label="Master Volume" 
          type="master" 
          icon={<Volume2 size={18} />}
        />
        <VolumeSlider 
          label="Music Volume" 
          type="music" 
          icon={<Music size={18} />}
        />
        <VolumeSlider 
          label="Sound Effects" 
          type="sfx" 
          icon={<Volume2 size={18} />}
        />

        {/* Upload Audio */}
        <div className="mt-6 pt-4 border-t border-zinc-700">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs text-zinc-500">Upload Audio Files</h4>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-xs transition cursor-pointer"
            >
              <Upload size={12} />
              Upload
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,.ogg,.wav,.webm,audio/mpeg,audio/ogg,audio/wav,audio/webm"
              multiple
              onChange={handleAudioUpload}
              style={{ position: 'absolute', left: '-9999px' }}
            />
          </div>
          <p className="text-xs text-zinc-600 mb-3">
            Supported: MP3, OGG, WAV (PCM), WebM
          </p>
          
          {/* Upload Error Message */}
          {uploadError && (
            <div className="p-2 mb-3 bg-red-600/20 border border-red-500/50 rounded text-xs text-red-400">
              ⚠️ {uploadError}
            </div>
          )}
        </div>

        {/* Loaded Sounds */}
        {loadedSounds.length > 0 && (
          <div className="mt-4 pt-4 border-t border-zinc-700">
            <h4 className="text-xs text-zinc-500 mb-3">Loaded Sounds ({loadedSounds.length})</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {loadedSounds.map(sound => (
                <div key={sound.id} className="flex items-center gap-2 p-2 bg-zinc-750 rounded">
                  <button
                    onClick={() => playSound(sound.id)}
                    className="p-1.5 bg-green-600 hover:bg-green-500 rounded transition"
                    title="Play"
                  >
                    <Play size={12} />
                  </button>
                  <span className="flex-1 text-xs text-zinc-300 truncate">{sound.name}</span>
                  <span className="text-xs text-zinc-500 font-mono">{sound.id}</span>
                  <button
                    onClick={() => removeSound(sound.id, sound.url)}
                    className="p-1 hover:bg-red-600/20 text-red-400 rounded transition"
                    title="Remove"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Default Sounds Info */}
        <div className="mt-6 pt-4 border-t border-zinc-700">
          <h4 className="text-xs text-zinc-500 mb-3">Default Sound IDs</h4>
          <p className="text-xs text-zinc-600 mb-3">
            Use these IDs in your game events:
          </p>
          <div className="flex flex-wrap gap-2">
            {['click', 'jump', 'hit', 'collect', 'land', 'hurt'].map(sound => (
              <span
                key={sound}
                className="px-2 py-1 bg-zinc-700 rounded text-xs text-zinc-400 font-mono"
              >
                {sound}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BottomPanel;
