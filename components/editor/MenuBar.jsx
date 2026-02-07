'use client';

import React, { useState } from 'react';
import {
  Menu, Play, Square, Settings, Save, FolderOpen, Download,
  Plus, Image, Music, Code, Undo, Redo, Copy, Clipboard,
  Scissors, HelpCircle, Book, Users, Bug, FileText, Zap,
  FilePlus, Upload, Trash2
} from 'lucide-react';

/**
 * MenuBar - Top menu bar with File, Edit, Scene, Assets, Build, Help menus
 */
const MenuBar = ({ 
  mode, 
  onModeChange, 
  onTogglePlay, 
  onAddObject, 
  onSave,
  onSaveAs,
  onNewScene,
  onOpenProject,
  onImportProject,
  onExportProject,
  onNewProject,
  onClearStorage,
  onOpenEvents, 
  eventsExpanded 
}) => {
  return (
    <div className="bg-zinc-800 border-b border-zinc-700 select-none">
      {/* Top Row - Brand & Mode Toggle */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-700">
        <div className="flex items-center gap-2">
          <div className="text-xl">🎮</div>
          <h1 className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Pluto Engine
          </h1>
          <span className="text-xs text-zinc-500 ml-2">v2.0</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Mode Toggle */}
          <div className="flex gap-1 bg-zinc-900 p-1 rounded-lg">
            <button
              onClick={() => onModeChange('edit')}
              className={`px-4 py-1.5 rounded-md flex items-center gap-2 text-sm transition ${
                mode === 'edit'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-700'
              }`}
            >
              <Settings size={14} />
              Edit
            </button>
            <button
              onClick={onTogglePlay}
              className={`px-4 py-1.5 rounded-md flex items-center gap-2 text-sm transition ${
                mode === 'play'
                  ? 'bg-green-600 text-white shadow-lg'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-700'
              }`}
            >
              <Play size={14} />
              Play
            </button>
            {mode === 'play' && (
              <button
                onClick={onTogglePlay}
                className="px-4 py-1.5 rounded-md flex items-center gap-2 text-sm bg-red-600 hover:bg-red-500 text-white transition"
              >
                <Square size={14} />
                Stop
              </button>
            )}
          </div>

          {/* Events Mode Button */}
          <button
            onClick={onOpenEvents}
            className={`px-4 py-1.5 rounded-lg flex items-center gap-2 text-sm transition ${
              eventsExpanded
                ? 'bg-purple-600 text-white'
                : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
            }`}
            title="Open Event Editor (full screen)"
          >
            <Zap size={14} />
            Events
          </button>

          {/* Quick Actions */}
          <div className="flex gap-1">
            <button 
              onClick={onSave}
              className="p-2 hover:bg-zinc-700 rounded transition" 
              title="Save (Ctrl+S)"
            >
              <Save size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Row - Menu Items */}
      <div className="flex items-center px-2 py-1 gap-0.5">
        <MenuDropdown 
          label="File" 
          items={[
            { label: 'New Project', icon: FilePlus, action: onNewProject },
            { label: 'New Scene', icon: Plus, shortcut: 'Ctrl+N', action: onNewScene },
            { divider: true },
            { label: 'Open Project', icon: FolderOpen, shortcut: 'Ctrl+O', action: onOpenProject },
            { label: 'Import Project...', icon: Upload, action: onImportProject },
            { divider: true },
            { label: 'Save', icon: Save, shortcut: 'Ctrl+S', action: onSave },
            { label: 'Save As...', icon: Save, shortcut: 'Ctrl+Shift+S', action: onSaveAs },
            { divider: true },
            { label: 'Export Project', icon: Download, action: onExportProject },
            { label: 'Export as HTML5', icon: Download },
            { divider: true },
            { label: 'Clear Storage...', icon: Trash2, action: onClearStorage },
          ]} 
        />
        <MenuDropdown 
          label="Edit" 
          items={[
            { label: 'Undo', icon: Undo, shortcut: 'Ctrl+Z' },
            { label: 'Redo', icon: Redo, shortcut: 'Ctrl+Y' },
            { divider: true },
            { label: 'Cut', icon: Scissors, shortcut: 'Ctrl+X' },
            { label: 'Copy', icon: Copy, shortcut: 'Ctrl+C' },
            { label: 'Paste', icon: Clipboard, shortcut: 'Ctrl+V' },
            { divider: true },
            { label: 'Preferences', icon: Settings },
          ]} 
        />
        <MenuDropdown 
          label="Scene" 
          items={[
            { label: 'Add Player', action: () => onAddObject('player') },
            { label: 'Add Enemy', action: () => onAddObject('enemy') },
            { label: 'Add Coin', action: () => onAddObject('coin') },
            { label: 'Add Platform', action: () => onAddObject('platform') },
            { label: 'Add Goal', action: () => onAddObject('goal') },
            { divider: true },
            { label: 'Scene Settings' },
          ]} 
        />
        <MenuDropdown 
          label="Assets" 
          items={[
            { label: 'Import Sprite', icon: Image },
            { label: 'Import Sound', icon: Music },
            { label: 'Import Script', icon: Code },
            { divider: true },
            { label: 'Sprite Editor', icon: Image, onClick: () => window.open('/advanced-features-demo?tab=sprites', '_blank') },
            { label: 'Asset Library' },
          ]} 
        />
        <MenuDropdown 
          label="Build" 
          items={[
            { label: 'Export as HTML5' },
            { label: 'Export for Desktop' },
            { label: 'Export for Mobile' },
            { divider: true },
            { label: 'Build Settings' },
          ]} 
        />
        <MenuDropdown 
          label="Help" 
          items={[
            { label: 'Documentation', icon: Book },
            { label: 'Tutorials', icon: FileText },
            { label: 'Animated Sprites Guide', icon: FileText, onClick: () => window.open('/docs/ANIMATED_SPRITES_GUIDE.md', '_blank') },
            { label: 'Community', icon: Users },
            { divider: true },
            { label: 'Report Bug', icon: Bug },
            { label: 'About Pluto', icon: HelpCircle },
          ]} 
        />
      </div>
    </div>
  );
};

// Menu Dropdown Component
const MenuDropdown = ({ label, items }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div 
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        className={`px-3 py-1.5 text-sm rounded transition ${
          isOpen ? 'bg-zinc-700 text-white' : 'hover:bg-zinc-700 text-zinc-300'
        }`}
      >
        {label}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 pt-0.5 z-50">
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl min-w-52 py-1">
            {items.map((item, i) => (
              item.divider ? (
                <div key={i} className="h-px bg-zinc-700 my-1" />
              ) : (
                <button
                  key={i}
                  onClick={() => {
                    if (item.action) item.action();
                    if (item.onClick) item.onClick();
                    setIsOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-700 flex items-center justify-between gap-4 transition"
                >
                  <span className="flex items-center gap-2">
                    {item.icon && <item.icon size={14} className="text-zinc-400" />}
                    {item.label}
                  </span>
                  {item.shortcut && (
                    <span className="text-xs text-zinc-500">{item.shortcut}</span>
                  )}
                </button>
              )
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuBar;
