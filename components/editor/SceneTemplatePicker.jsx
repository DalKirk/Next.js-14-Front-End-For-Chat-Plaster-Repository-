'use client';

import React, { useState } from 'react';
import { X, Check, Gamepad2, Map, Target, MessageSquare, FileText } from 'lucide-react';
import { SCENE_TEMPLATES, TEMPLATE_CATEGORIES } from '../../lib/scenes/SceneTemplates';

/**
 * Category icons mapping
 */
const CATEGORY_ICONS = {
  [TEMPLATE_CATEGORIES.PLATFORMER]: Gamepad2,
  [TEMPLATE_CATEGORIES.TOP_DOWN]: Map,
  [TEMPLATE_CATEGORIES.SHOOTER]: Target,
  [TEMPLATE_CATEGORIES.DIALOG]: MessageSquare,
};

/**
 * SceneTemplatePicker - Modal for selecting a scene template when creating a new scene or project
 */
const SceneTemplatePicker = ({
  isOpen = false,
  onClose,
  onSelect,
  mode = 'scene', // 'scene' or 'project'
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [sceneName, setSceneName] = useState('');
  const [hoveredTemplate, setHoveredTemplate] = useState(null);

  const isProjectMode = mode === 'project';
  const nameLabel = isProjectMode ? 'Project Name' : 'Scene Name';
  const namePlaceholder = isProjectMode ? 'Enter project name...' : 'Enter scene name...';
  const createButtonText = isProjectMode ? 'Create Project' : 'Create Scene';
  const headerTitle = isProjectMode ? 'New Project' : 'New Scene';
  const headerSubtitle = isProjectMode 
    ? 'Choose a template for your first scene' 
    : 'Choose a template to get started';

  // Don't render if not open
  if (!isOpen) return null;

  const handleConfirm = () => {
    if (selectedTemplate) {
      const name = sceneName.trim() || `New ${selectedTemplate.name} Scene`;
      onSelect?.(selectedTemplate.id, name);
      // Reset state
      setSelectedTemplate(null);
      setSceneName('');
    }
  };

  const handleTemplateClick = (template) => {
    setSelectedTemplate(template);
    // Always update name to match selected template
    setSceneName(`${template.name} Scene`);
  };

  const handleClose = () => {
    setSelectedTemplate(null);
    setSceneName('');
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-3xl mx-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <FileText size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">{headerTitle}</h2>
              <p className="text-sm text-zinc-400">{headerSubtitle}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Template Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {SCENE_TEMPLATES.map((template) => {
              const isSelected = selectedTemplate?.id === template.id;
              const isHovered = hoveredTemplate?.id === template.id;
              const CategoryIcon = template.category ? CATEGORY_ICONS[template.category] : FileText;
              
              return (
                <button
                  key={template.id}
                  onClick={() => handleTemplateClick(template)}
                  onMouseEnter={() => setHoveredTemplate(template)}
                  onMouseLeave={() => setHoveredTemplate(null)}
                  className={`relative p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                    isSelected
                      ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30'
                      : isHovered
                        ? 'border-zinc-500 bg-zinc-700/50'
                        : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  {/* Selected checkmark */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                      <Check size={14} className="text-white" />
                    </div>
                  )}
                  
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl mb-3 ${
                    isSelected ? 'bg-blue-500/20' : 'bg-zinc-700'
                  }`}>
                    {template.icon}
                  </div>
                  
                  {/* Name */}
                  <h3 className={`font-semibold mb-1 ${isSelected ? 'text-blue-400' : 'text-white'}`}>
                    {template.name}
                  </h3>
                  
                  {/* Description */}
                  <p className="text-xs text-zinc-400 line-clamp-2">
                    {template.description}
                  </p>
                  
                  {/* Category badge */}
                  {template.category && (
                    <div className="mt-3 flex items-center gap-1.5">
                      <CategoryIcon size={12} className="text-zinc-500" />
                      <span className="text-xs text-zinc-500 capitalize">
                        {template.category.replace('-', ' ')}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Template Preview / Details */}
        {selectedTemplate && (
          <div className="px-6 py-4 border-t border-zinc-700 bg-zinc-850">
            <div className="flex items-start gap-4">
              {/* Preview info */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{selectedTemplate.icon}</span>
                  <h3 className="text-lg font-semibold text-white">{selectedTemplate.name}</h3>
                </div>
                <p className="text-sm text-zinc-400 mb-3">{selectedTemplate.description}</p>
                
                {/* Template features */}
                <div className="flex flex-wrap gap-2">
                  {selectedTemplate.defaultLayers?.platforms?.length > 0 && (
                    <span className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded text-xs">
                      {selectedTemplate.defaultLayers.platforms.length} Platforms
                    </span>
                  )}
                  {selectedTemplate.physics?.gravity?.y > 0 && (
                    <span className="px-2 py-1 bg-purple-600/20 text-purple-400 rounded text-xs">Gravity Physics</span>
                  )}
                  {selectedTemplate.physics?.gravity?.y === 0 && (
                    <span className="px-2 py-1 bg-green-600/20 text-green-400 rounded text-xs">Top-Down Movement</span>
                  )}
                  {selectedTemplate.weapons && (
                    <span className="px-2 py-1 bg-red-600/20 text-red-400 rounded text-xs">Shooting</span>
                  )}
                  {selectedTemplate.dialog && (
                    <span className="px-2 py-1 bg-yellow-600/20 text-yellow-400 rounded text-xs">Dialog System</span>
                  )}
                  {selectedTemplate.camera?.followPlayer && (
                    <span className="px-2 py-1 bg-cyan-600/20 text-cyan-400 rounded text-xs">Camera Follow</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer - Scene Name & Create Button */}
        <div className="px-6 py-4 border-t border-zinc-700 bg-zinc-900 rounded-b-xl">
          <div className="flex items-center gap-4">
            {/* Scene name input */}
            <div className="flex-1">
              <label className="block text-xs text-zinc-400 mb-1">{nameLabel}</label>
              <input
                type="text"
                value={sceneName}
                onChange={(e) => setSceneName(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder={namePlaceholder}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            
            {/* Buttons */}
            <div className="flex gap-2 pt-5">
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!selectedTemplate}
                className={`px-6 py-2 rounded-lg transition text-sm font-medium flex items-center gap-2 ${
                  selectedTemplate
                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                    : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                }`}
              >
                <Check size={16} />
                {createButtonText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SceneTemplatePicker;
