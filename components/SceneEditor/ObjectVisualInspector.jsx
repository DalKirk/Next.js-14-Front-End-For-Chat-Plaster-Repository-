// components/SceneEditor/ObjectVisualInspector.jsx
// Complete visual editor for entities/decorations (sprite, transform, effects)

import React from 'react';

const SPRITE_CATEGORIES = ['sprite', 'pickup', 'icon', 'entity', 'misc'];

const ObjectVisualInspector = ({ object, assets, onChange }) => {
  // Assets that could be used as sprites for this object
  const spriteAssets = assets.filter(a => SPRITE_CATEGORIES.includes(a.category));

  const set = (key, value) => onChange({ ...object, [key]: value });

  const inputCls = `flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5
                    text-xs text-white focus:outline-none focus:border-purple-500`;

  return (
    <div className="p-3 space-y-0.5 max-h-96 overflow-y-auto">

      {/* ════════ SPRITE SOURCE ════════ */}
      <Section title="Sprite">
        <Row label="Image">
          <select
            value={object.assetId || ''}
            onChange={(e) => set('assetId', e.target.value || null)}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5
                       text-xs text-white focus:outline-none focus:border-purple-500"
          >
            <option value="">— Use emoji fallback —</option>
            {spriteAssets.map(a => (
              <option key={a.id} value={a.id}>{a.name} ({a.width}×{a.height})</option>
            ))}
          </select>
        </Row>

        {/* Emoji fallback — only shown when no image is set */}
        {!object.assetId && (
          <Row label="Emoji">
            <input
              type="text"
              value={object.fallbackEmoji || '🔲'}
              onChange={(e) => set('fallbackEmoji', e.target.value)}
              maxLength={2}
              className="w-12 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5
                         text-center text-lg focus:outline-none focus:border-purple-500"
            />
            <span className="text-xs text-zinc-600">single emoji</span>
          </Row>
        )}
      </Section>

      {/* ════════ TRANSFORM ════════ */}
      <Section title="Transform">
        <Row label="Scale">
          <input 
            type="number" 
            min="0.1" 
            max="5" 
            step="0.1" 
            value={object.scale || 1}
            onChange={(e) => set('scale', Number(e.target.value))}
            className={inputCls} 
          />
          <span className="text-xs text-zinc-600">×</span>
        </Row>

        <Row label="Rotation">
          <input 
            type="number" 
            min="-360" 
            max="360" 
            step="5" 
            value={object.rotation || 0}
            onChange={(e) => set('rotation', Number(e.target.value))}
            className={inputCls} 
          />
          <span className="text-xs text-zinc-600">°</span>
        </Row>

        <Row label="Flip">
          <Toggle label="X" checked={object.flipX} onChange={(v) => set('flipX', v)} />
          <Toggle label="Y" checked={object.flipY} onChange={(v) => set('flipY', v)} />
        </Row>
      </Section>

      {/* ════════ APPEARANCE ════════ */}
      <Section title="Appearance">
        <Row label="Tint">
          <input 
            type="color" 
            value={object.tintColor || '#ffffff'}
            onChange={(e) => set('tintColor', e.target.value)}
            className="w-8 h-7 rounded cursor-pointer border border-zinc-600 bg-transparent flex-shrink-0" 
          />
          <input 
            type="text" 
            value={object.tintColor || '#ffffff'}
            onChange={(e) => set('tintColor', e.target.value)}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1
                       text-xs text-white font-mono focus:outline-none focus:border-purple-500" 
          />
        </Row>

        <Row label="Alpha">
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.05" 
            value={object.alpha ?? 1}
            onChange={(e) => set('alpha', Number(e.target.value))}
            className="flex-1 accent-purple-500" 
          />
          <span className="text-xs text-zinc-500 w-8 text-right">{object.alpha ?? 1}</span>
        </Row>
      </Section>

      {/* ════════ GLOW EFFECT ════════ */}
      <EffectSection
        title="Glow"
        enabled={object.glowEnabled}
        onToggle={(v) => set('glowEnabled', v)}
      >
        <Row label="Color">
          <input 
            type="color" 
            value={object.glowColor || '#ffffff'}
            onChange={(e) => set('glowColor', e.target.value)}
            className="w-8 h-7 rounded cursor-pointer border border-zinc-600 bg-transparent" 
          />
        </Row>
        <Row label="Distance">
          <input 
            type="range" 
            min="2" 
            max="40" 
            step="1" 
            value={object.glowDistance || 15}
            onChange={(e) => set('glowDistance', Number(e.target.value))}
            className="flex-1 accent-purple-500" 
          />
          <span className="text-xs text-zinc-500 w-6 text-right">{object.glowDistance || 15}</span>
        </Row>
        <Row label="Strength">
          <input 
            type="range" 
            min="0.5" 
            max="5" 
            step="0.5" 
            value={object.glowStrength || 2}
            onChange={(e) => set('glowStrength', Number(e.target.value))}
            className="flex-1 accent-purple-500" 
          />
          <span className="text-xs text-zinc-500 w-6 text-right">{object.glowStrength || 2}</span>
        </Row>
        <Row label="Pulse">
          <Toggle label="Animate" checked={object.glowPulse} onChange={(v) => set('glowPulse', v)} />
        </Row>
      </EffectSection>

      {/* ════════ DROP SHADOW ════════ */}
      <EffectSection
        title="Shadow"
        enabled={object.shadowEnabled}
        onToggle={(v) => set('shadowEnabled', v)}
      >
        <Row label="Color">
          <input 
            type="color" 
            value={object.shadowColor || '#000000'}
            onChange={(e) => set('shadowColor', e.target.value)}
            className="w-8 h-7 rounded cursor-pointer border border-zinc-600 bg-transparent" 
          />
        </Row>
        <Row label="Alpha">
          <input 
            type="range" 
            min="0.1" 
            max="1" 
            step="0.05" 
            value={object.shadowAlpha ?? 0.5}
            onChange={(e) => set('shadowAlpha', Number(e.target.value))}
            className="flex-1 accent-purple-500" 
          />
          <span className="text-xs text-zinc-500 w-6 text-right">{object.shadowAlpha ?? 0.5}</span>
        </Row>
        <Row label="Blur">
          <input 
            type="range" 
            min="0" 
            max="20" 
            step="1" 
            value={object.shadowBlur || 4}
            onChange={(e) => set('shadowBlur', Number(e.target.value))}
            className="flex-1 accent-purple-500" 
          />
          <span className="text-xs text-zinc-500 w-6 text-right">{object.shadowBlur || 4}</span>
        </Row>
        <div className="flex gap-3 mt-1">
          <div className="flex-1">
            <label className="text-xs text-zinc-500 block mb-0.5">Offset X</label>
            <input 
              type="number" 
              min="-20" 
              max="20" 
              step="1" 
              value={object.shadowOffsetX || 3}
              onChange={(e) => set('shadowOffsetX', Number(e.target.value))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5
                         text-xs text-white focus:outline-none focus:border-purple-500" 
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-zinc-500 block mb-0.5">Offset Y</label>
            <input 
              type="number" 
              min="-20" 
              max="20" 
              step="1" 
              value={object.shadowOffsetY || 3}
              onChange={(e) => set('shadowOffsetY', Number(e.target.value))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5
                         text-xs text-white focus:outline-none focus:border-purple-500" 
            />
          </div>
        </div>
      </EffectSection>

      {/* ════════ OUTLINE ════════ */}
      <EffectSection
        title="Outline"
        enabled={object.outlineEnabled}
        onToggle={(v) => set('outlineEnabled', v)}
      >
        <Row label="Color">
          <input 
            type="color" 
            value={object.outlineColor || '#000000'}
            onChange={(e) => set('outlineColor', e.target.value)}
            className="w-8 h-7 rounded cursor-pointer border border-zinc-600 bg-transparent" 
          />
        </Row>
        <Row label="Width">
          <input 
            type="range" 
            min="1" 
            max="6" 
            step="1" 
            value={object.outlineWidth || 2}
            onChange={(e) => set('outlineWidth', Number(e.target.value))}
            className="flex-1 accent-purple-500" 
          />
          <span className="text-xs text-zinc-500 w-6 text-right">{object.outlineWidth || 2}px</span>
        </Row>
      </EffectSection>
    </div>
  );
};

// ─── Reusable pieces ─────────────────────────────────────────────

const Section = ({ title, children }) => (
  <div className="py-1">
    <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 mt-2 first:mt-0">
      {title}
    </div>
    <div className="space-y-1.5">{children}</div>
  </div>
);

// Effect sections have an enable toggle in their header.
// The body only renders when enabled.
const EffectSection = ({ title, enabled, onToggle, children }) => (
  <div className="py-1">
    <div className="flex items-center justify-between mb-1">
      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mt-1">
        {title}
      </span>
      <label className="flex items-center gap-1.5 cursor-pointer">
        <div
          onClick={() => onToggle(!enabled)}
          className={`w-8 h-4 rounded-full relative transition-colors cursor-pointer ${
            enabled ? 'bg-purple-600' : 'bg-zinc-600'
          }`}
        >
          <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${
            enabled ? 'translate-x-4' : 'translate-x-0.5'
          }`} />
        </div>
      </label>
    </div>
    {enabled && <div className="space-y-1.5 ml-0">{children}</div>}
  </div>
);

const Row = ({ label, children }) => (
  <div className="flex items-center gap-2">
    <label className="text-xs text-zinc-500 w-16 flex-shrink-0 text-right">{label}</label>
    <div className="flex-1 flex items-center gap-2">{children}</div>
  </div>
);

const Toggle = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-1.5 cursor-pointer">
    <input 
      type="checkbox" 
      checked={!!checked} 
      onChange={(e) => onChange(e.target.checked)} 
      className="accent-purple-500" 
    />
    <span className="text-xs text-zinc-400">{label}</span>
  </label>
);

export default ObjectVisualInspector;
