'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, FolderOpen, Trash2, Clock, HardDrive } from 'lucide-react';
import ProjectStorage from '../../lib/persistence/ProjectStorage';

/**
 * Format bytes to human readable string
 */
const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Format date relative to now
 */
const formatDate = (timestamp) => {
  if (!timestamp) return 'Unknown';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  // Less than 1 minute
  if (diff < 60000) return 'Just now';
  
  // Less than 1 hour
  if (diff < 3600000) {
    const mins = Math.floor(diff / 60000);
    return `${mins} minute${mins > 1 ? 's' : ''} ago`;
  }
  
  // Less than 24 hours
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  
  // Less than 7 days
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
  
  // Otherwise show date
  return date.toLocaleDateString();
};

/**
 * SlotPicker - Modal for save/load slot selection
 */
const SlotPicker = ({
  isOpen = false, // Whether modal is visible
  mode = 'save', // 'save' | 'load'
  onSelect,
  onDelete,
  onClose
}) => {
  const [slots, setSlots] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Load slot info when modal opens
  useEffect(() => {
    if (isOpen) {
      setSlots(ProjectStorage.getAllSlotsInfo());
      setConfirmDelete(null);
    }
  }, [isOpen]);

  // Don't render if not open
  if (!isOpen) return null;

  const handleDelete = (slotNumber) => {
    if (confirmDelete === slotNumber) {
      // slotNumber is 1-indexed, deleteSlot expects 1-indexed
      ProjectStorage.deleteSlot(slotNumber);
      onDelete?.(slotNumber);
      setSlots(ProjectStorage.getAllSlotsInfo());
      setConfirmDelete(null);
    } else {
      setConfirmDelete(slotNumber);
      // Auto-reset confirm after 3 seconds
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  const handleSelect = (slotNumber) => {
    // slotNumber is 1-indexed (1-5), pass directly to loadSlot which expects 1-indexed
    const slotData = mode === 'load' ? ProjectStorage.loadSlot(slotNumber) : null;
    // Pass 0-indexed to callback for array access compatibility
    onSelect?.(slotNumber - 1, slotData);
  };

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
          <div className="flex items-center gap-2">
            {mode === 'save' ? (
              <>
                <Save size={18} className="text-green-400" />
                <h2 className="text-lg font-medium text-white">Save Project</h2>
              </>
            ) : (
              <>
                <FolderOpen size={18} className="text-blue-400" />
                <h2 className="text-lg font-medium text-white">Load Project</h2>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Slots list */}
        <div className="p-4 space-y-2">
          {slots.map((slot, index) => {
            const slotNumber = index + 1;
            const isEmpty = !slot;
            
            return (
              <div
                key={slotNumber}
                className={`flex items-center gap-3 p-3 rounded-lg border transition ${
                  isEmpty 
                    ? 'border-zinc-700 bg-zinc-850 hover:bg-zinc-750' 
                    : 'border-zinc-600 bg-zinc-750 hover:bg-zinc-700'
                }`}
              >
                {/* Slot number */}
                <div className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold ${
                  isEmpty ? 'bg-zinc-700 text-zinc-500' : 'bg-blue-600 text-white'
                }`}>
                  {slotNumber}
                </div>

                {/* Slot info */}
                <div className="flex-1 min-w-0">
                  {isEmpty ? (
                    <div className="text-zinc-500 text-sm">Empty Slot</div>
                  ) : (
                    <>
                      <div className="text-white font-medium truncate">{slot.name}</div>
                      <div className="flex items-center gap-3 text-xs text-zinc-400">
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {formatDate(slot.savedAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <HardDrive size={10} />
                          {formatBytes(slot.size)}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {/* Delete button (only if slot has data) */}
                  {!isEmpty && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(slotNumber);
                      }}
                      className={`p-2 rounded transition ${
                        confirmDelete === slotNumber
                          ? 'bg-red-600 text-white'
                          : 'text-zinc-400 hover:text-red-400 hover:bg-zinc-600'
                      }`}
                      title={confirmDelete === slotNumber ? 'Click again to confirm' : 'Delete'}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}

                  {/* Select button */}
                  <button
                    onClick={() => handleSelect(slotNumber)}
                    disabled={mode === 'load' && isEmpty}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                      mode === 'save'
                        ? 'bg-green-600 hover:bg-green-500 text-white'
                        : isEmpty
                          ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-500 text-white'
                    }`}
                  >
                    {mode === 'save' 
                      ? (isEmpty ? 'Save' : 'Overwrite')
                      : 'Load'
                    }
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer with storage info */}
        <div className="px-4 py-3 border-t border-zinc-700 bg-zinc-850 rounded-b-xl">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Storage: {ProjectStorage.getStorageUsage().usedFormatted} used</span>
            <span className="text-zinc-500">
              {mode === 'save' 
                ? 'Select a slot to save your project'
                : 'Select a slot to load'
              }
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlotPicker;
