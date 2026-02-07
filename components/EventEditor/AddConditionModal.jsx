'use client';

import React, { useState, useMemo } from 'react';
import { X, Search, ChevronRight } from 'lucide-react';
import { ConditionRegistry } from '../../lib/events';

/**
 * AddConditionModal - Select a condition type from categorized list
 */
const AddConditionModal = ({ onClose, onAdd }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [hoveredCondition, setHoveredCondition] = useState(null);

  // Get all conditions organized by category
  const conditionsByCategory = useMemo(() => {
    const categories = {};
    
    Object.entries(ConditionRegistry).forEach(([type, config]) => {
      const category = config.category || 'Other';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push({ type, ...config });
    });

    return categories;
  }, []);

  // Category icons
  const categoryIcons = {
    'Basic': '🎯',
    'Collision': '💥',
    'Variables': '📊',
    'Input': '🎮',
    'Objects': '🎲',
    'Time': '⏰',
    'Scene': '🎬',
    'Physics': '⚡',
    'Animation': '🎬',
    'Advanced': '⚙️',
    'Other': '📦'
  };

  // Filter conditions based on search
  const filteredConditions = useMemo(() => {
    if (!searchQuery) return conditionsByCategory;

    const query = searchQuery.toLowerCase();
    const filtered = {};

    Object.entries(conditionsByCategory).forEach(([category, conditions]) => {
      const matching = conditions.filter(c =>
        c.type.toLowerCase().includes(query) ||
        (c.label && c.label.toLowerCase().includes(query)) ||
        (c.description && c.description.toLowerCase().includes(query))
      );
      if (matching.length > 0) {
        filtered[category] = matching;
      }
    });

    return filtered;
  }, [conditionsByCategory, searchQuery]);

  // Get default params for a condition type
  const getDefaultParams = (config) => {
    const params = {};
    if (config.params) {
      Object.entries(config.params).forEach(([key, paramConfig]) => {
        if (paramConfig.default !== undefined) {
          params[key] = paramConfig.default;
        } else if (paramConfig.type === 'number') {
          params[key] = 0;
        } else if (paramConfig.type === 'text') {
          params[key] = '';
        } else if (paramConfig.type === 'boolean') {
          params[key] = false;
        }
      });
    }
    return params;
  };

  const handleSelect = (conditionType, config) => {
    onAdd(conditionType, getDefaultParams(config));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-[700px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            📋 Add Condition
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition text-zinc-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-zinc-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conditions..."
              autoFocus
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 pl-10 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Categories */}
          <div className="w-48 border-r border-zinc-800 overflow-y-auto">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`w-full px-4 py-3 text-left text-sm font-semibold flex items-center gap-2 ${
                selectedCategory === null
                  ? 'bg-blue-900/30 text-blue-400'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              📂 All Categories
            </button>
            {Object.keys(filteredConditions).map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`w-full px-4 py-3 text-left text-sm flex items-center gap-2 ${
                  selectedCategory === category
                    ? 'bg-blue-900/30 text-blue-400'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                <span>{categoryIcons[category] || '📦'}</span>
                <span>{category}</span>
                <span className="ml-auto text-xs text-zinc-600">
                  {filteredConditions[category]?.length || 0}
                </span>
              </button>
            ))}
          </div>

          {/* Conditions List */}
          <div className="flex-1 overflow-y-auto p-4">
            {Object.entries(filteredConditions)
              .filter(([category]) => selectedCategory === null || selectedCategory === category)
              .map(([category, conditions]) => (
                <div key={category} className="mb-6">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase mb-2 flex items-center gap-2">
                    {categoryIcons[category] || '📦'} {category}
                  </h3>
                  <div className="grid gap-2">
                    {conditions.map(condition => (
                      <button
                        key={condition.type}
                        onClick={() => handleSelect(condition.type, condition)}
                        onMouseEnter={() => setHoveredCondition(condition)}
                        onMouseLeave={() => setHoveredCondition(null)}
                        className="w-full p-3 bg-zinc-800 hover:bg-blue-900/30 border border-zinc-700 hover:border-blue-500/30 rounded-lg text-left transition group"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-white group-hover:text-blue-400 flex items-center gap-2">
                              {condition.icon && <span>{condition.icon}</span>}
                              {condition.label || condition.type}
                            </div>
                            <div className="text-xs text-zinc-500 mt-1">
                              {condition.description || `Check if ${condition.type}`}
                            </div>
                          </div>
                          <ChevronRight size={16} className="text-zinc-600 group-hover:text-blue-400" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}

            {Object.keys(filteredConditions).length === 0 && (
              <div className="text-center text-zinc-500 py-12">
                <div className="text-4xl mb-4">🔍</div>
                <p>No conditions found matching "{searchQuery}"</p>
              </div>
            )}
          </div>
        </div>

        {/* Preview Panel (on hover) */}
        {hoveredCondition && (
          <div className="border-t border-zinc-800 p-4 bg-zinc-800/50">
            <h4 className="font-semibold text-blue-400 mb-2 flex items-center gap-2">
              {hoveredCondition.icon && <span>{hoveredCondition.icon}</span>}
              {hoveredCondition.label || hoveredCondition.type}
            </h4>
            <p className="text-sm text-zinc-400 mb-3">
              {hoveredCondition.description}
            </p>
            {hoveredCondition.params && Object.keys(hoveredCondition.params).length > 0 && (
              <div className="text-xs">
                <span className="text-zinc-500">Parameters: </span>
                <span className="text-zinc-300">
                  {Object.entries(hoveredCondition.params)
                    .map(([key, config]) => `${key}${config.required ? '*' : ''}`)
                    .join(', ')}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AddConditionModal;
