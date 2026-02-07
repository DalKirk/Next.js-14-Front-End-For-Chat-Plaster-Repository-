'use client';

import React, { useState } from 'react';
import { 
  Save, FolderOpen, Download, Upload, FilePlus, 
  ChevronDown, HardDrive, Clock, AlertCircle
} from 'lucide-react';
import ProjectStorage from '../../lib/persistence/ProjectStorage';
import SlotPicker from './SlotPicker';

/**
 * ProjectMenu - Top menu bar for project management
 * 
 * Provides New, Save, Load, Export, Import functionality
 */
const ProjectMenu = ({
  project,
  onLoadProject,
  onNewProject,
  onProjectChange,
  disabled = false
}) => {
  const [showSlotPicker, setShowSlotPicker] = useState(false);
  const [slotPickerMode, setSlotPickerMode] = useState('save'); // 'save' | 'load'
  const [showMenu, setShowMenu] = useState(false);
  const [notification, setNotification] = useState(null);

  // Show temporary notification
  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Handle New Project
  const handleNew = () => {
    if (window.confirm('Create a new project? Any unsaved changes will be lost.')) {
      onNewProject?.();
      showNotification('New project created', 'success');
    }
    setShowMenu(false);
  };

  // Open Save modal
  const handleSave = () => {
    setSlotPickerMode('save');
    setShowSlotPicker(true);
    setShowMenu(false);
  };

  // Open Load modal
  const handleLoad = () => {
    setSlotPickerMode('load');
    setShowSlotPicker(true);
    setShowMenu(false);
  };

  // Handle Export
  const handleExport = () => {
    if (!project) {
      showNotification('No project to export', 'error');
      return;
    }
    ProjectStorage.exportProject(project);
    showNotification('Project exported successfully', 'success');
    setShowMenu(false);
  };

  // Handle Import
  const handleImport = () => {
    ProjectStorage.openImportDialog(
      (importedProject) => {
        onLoadProject?.(importedProject);
        showNotification(`Imported: ${importedProject.name}`, 'success');
      },
      (error) => {
        showNotification(`Import failed: ${error}`, 'error');
      }
    );
    setShowMenu(false);
  };

  // Handle slot selection
  const handleSlotSelect = (slotNumber) => {
    if (slotPickerMode === 'save') {
      const result = ProjectStorage.saveSlot(project, slotNumber);
      if (result.success) {
        showNotification(`Saved to Slot ${slotNumber}`, 'success');
      } else {
        showNotification(`Save failed: ${result.error}`, 'error');
      }
    } else {
      const loaded = ProjectStorage.loadSlot(slotNumber);
      if (loaded) {
        onLoadProject?.(loaded);
        showNotification(`Loaded: ${loaded.name}`, 'success');
      } else {
        showNotification('Failed to load from slot', 'error');
      }
    }
    setShowSlotPicker(false);
  };

  // Handle slot delete
  const handleSlotDelete = (slotNumber) => {
    ProjectStorage.deleteSlot(slotNumber);
    showNotification(`Slot ${slotNumber} deleted`, 'info');
  };

  return (
    <>
      {/* Menu Bar */}
      <div className="flex items-center gap-1 px-2 py-1 bg-zinc-850 border-b border-zinc-700">
        {/* Project dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            disabled={disabled}
            className="flex items-center gap-1 px-2 py-1 text-sm text-zinc-300 hover:bg-zinc-700 rounded transition disabled:opacity-50"
          >
            <HardDrive size={14} />
            Project
            <ChevronDown size={12} />
          </button>

          {showMenu && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 z-40"
                onClick={() => setShowMenu(false)}
              />
              
              {/* Dropdown */}
              <div className="absolute top-full left-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 py-1 min-w-48">
                <button
                  onClick={handleNew}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition"
                >
                  <FilePlus size={14} />
                  New Project
                </button>
                
                <div className="h-px bg-zinc-700 my-1" />
                
                <button
                  onClick={handleSave}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition"
                >
                  <Save size={14} />
                  Save to Slot...
                  <span className="ml-auto text-xs text-zinc-500">Ctrl+S</span>
                </button>
                
                <button
                  onClick={handleLoad}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition"
                >
                  <FolderOpen size={14} />
                  Load from Slot...
                  <span className="ml-auto text-xs text-zinc-500">Ctrl+O</span>
                </button>
                
                <div className="h-px bg-zinc-700 my-1" />
                
                <button
                  onClick={handleExport}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition"
                >
                  <Download size={14} />
                  Export to File...
                </button>
                
                <button
                  onClick={handleImport}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition"
                >
                  <Upload size={14} />
                  Import from File...
                </button>
              </div>
            </>
          )}
        </div>

        {/* Project name display */}
        <div className="flex items-center gap-2 ml-4">
          <span className="text-sm text-zinc-400">{project?.name || 'Untitled'}</span>
          {ProjectStorage.hasAutosave() && (
            <span className="flex items-center gap-1 text-xs text-green-400" title="Autosave active">
              <Clock size={10} />
              Saved
            </span>
          )}
        </div>

        {/* Quick save/load buttons */}
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={handleSave}
            disabled={disabled}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition disabled:opacity-50"
            title="Save to Slot (Ctrl+S)"
          >
            <Save size={16} />
          </button>
          <button
            onClick={handleExport}
            disabled={disabled}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition disabled:opacity-50"
            title="Export Project"
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-600' :
          notification.type === 'error' ? 'bg-red-600' :
          'bg-blue-600'
        } text-white text-sm animate-fade-in`}>
          {notification.type === 'error' && <AlertCircle size={16} />}
          {notification.message}
        </div>
      )}

      {/* Slot Picker Modal */}
      {showSlotPicker && (
        <SlotPicker
          mode={slotPickerMode}
          onSelect={handleSlotSelect}
          onDelete={handleSlotDelete}
          onClose={() => setShowSlotPicker(false)}
        />
      )}
    </>
  );
};

export default ProjectMenu;
