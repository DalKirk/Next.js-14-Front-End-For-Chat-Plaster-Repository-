// components/BehaviorPanel/BehaviorPanel.jsx
// Main panel for attaching/removing behaviors

'use client';

import React, { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import BehaviorCard from './BehaviorCard';
import BehaviorRegistry from '../../lib/behaviors/BehaviorRegistry';

/**
 * BehaviorPanel displays all behaviors attached to an object
 * and provides a picker to add new behaviors.
 * 
 * @param {Object} object - The selected object with behaviors array
 * @param {Array} assets - Project assets for asset picker
 * @param {Function} onChange - Called with updated object when behaviors change
 */
const BehaviorPanel = ({ object, assets = [], onChange }) => {
  const [pickerOpen, setPickerOpen] = useState(false);

  // Get attached behaviors from object
  const attached = object?.behaviors || [];
  const attachedIds = useMemo(
    () => new Set(attached.map(b => b.type)),
    [attached]
  );

  // Add a new behavior
  const handleAdd = (behaviorId) => {
    const defaultConfig = BehaviorRegistry.getDefaultConfig(behaviorId);

    onChange({
      ...object,
      behaviors: [
        ...attached,
        { type: behaviorId, enabled: true, config: defaultConfig }
      ]
    });
    setPickerOpen(false);
  };

  // Remove a behavior
  const handleRemove = (behaviorId) => {
    onChange({
      ...object,
      behaviors: attached.filter(b => b.type !== behaviorId)
    });
  };

  // Update a behavior's config
  const handleConfigChange = (behaviorId, key, value) => {
    onChange({
      ...object,
      behaviors: attached.map(b =>
        b.type === behaviorId
          ? { ...b, config: { ...b.config, [key]: value } }
          : b
      )
    });
  };

  // Toggle a behavior on/off
  const handleToggleEnabled = (behaviorId) => {
    onChange({
      ...object,
      behaviors: attached.map(b =>
        b.type === behaviorId
          ? { ...b, enabled: !b.enabled }
          : b
      )
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Attached Behaviors */}
      {attached.map(def => {
        const entry = BehaviorRegistry.get(def.type);
        if (!entry) return null; // Unknown behavior — skip gracefully

        return (
          <BehaviorCard
            key={def.type}
            entry={entry}
            config={def.config || {}}
            enabled={def.enabled !== false}
            assets={assets}
            onConfigChange={(key, value) => handleConfigChange(def.type, key, value)}
            onToggleEnabled={() => handleToggleEnabled(def.type)}
            onRemove={() => handleRemove(def.type)}
          />
        );
      })}

      {/* Empty state */}
      {attached.length === 0 && (
        <div className="border border-dashed border-zinc-700 rounded-lg p-4 text-center">
          <p className="text-zinc-500 text-sm">No behaviors attached.</p>
          <p className="text-zinc-600 text-xs mt-1">
            Add one below to give this object automatic behavior.
          </p>
        </div>
      )}

      {/* Add Behavior Button + Picker */}
      <div className="relative">
        <button
          onClick={() => setPickerOpen(!pickerOpen)}
          className="w-full flex items-center justify-center gap-2 border border-zinc-700 
                     hover:border-zinc-500 rounded-lg px-4 py-2.5 text-sm text-zinc-300 
                     hover:text-white transition bg-zinc-800 hover:bg-zinc-750"
        >
          <Plus size={16} />
          Add Behavior
        </button>

        {/* Behavior Picker Dropdown */}
        {pickerOpen && (
          <>
            {/* Backdrop to close picker */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setPickerOpen(false)}
            />

            <div className="absolute bottom-full mb-2 left-0 right-0 bg-zinc-800 
                            border border-zinc-600 rounded-lg shadow-xl overflow-hidden z-50
                            max-h-80 overflow-y-auto">
              {BehaviorRegistry.categories.map(category => {
                const entries = BehaviorRegistry.getByCategory(category)
                  .filter(e => !attachedIds.has(e.id)); // Hide already-attached

                if (entries.length === 0) return null;

                return (
                  <div key={category}>
                    {/* Category header */}
                    <div className="px-3 py-1.5 bg-zinc-900 text-xs font-semibold 
                                    text-zinc-500 uppercase tracking-wider sticky top-0">
                      {category}
                    </div>

                    {/* Behavior entries */}
                    {entries.map(entry => (
                      <button
                        key={entry.id}
                        onClick={() => handleAdd(entry.id)}
                        className="w-full text-left px-4 py-2.5 hover:bg-zinc-700 
                                   transition flex items-start gap-3"
                      >
                        <span className="text-xl leading-none mt-0.5">
                          {entry.icon}
                        </span>
                        <div>
                          <div className="text-sm text-white font-medium">
                            {entry.name}
                          </div>
                          <div className="text-xs text-zinc-500">
                            {entry.description}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })}

              {/* All behaviors already attached */}
              {BehaviorRegistry.all.every(e => attachedIds.has(e.id)) && (
                <div className="px-4 py-3 text-xs text-zinc-500 text-center">
                  All behaviors already attached.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BehaviorPanel;
