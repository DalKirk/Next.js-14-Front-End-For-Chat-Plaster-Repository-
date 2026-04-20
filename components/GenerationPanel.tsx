'use client';

import { useState, type ReactNode } from 'react';

/* ─── Types ─── */

export interface GenerationModel {
  id: string;
  name: string;
  badge: string;
  description?: string;
}

export interface GenerationStyle {
  id: string;
  label: string;
}

export interface GenerationRatio {
  id: string;
  label: string;
  w: number;
  h: number;
}

export interface GenerationPanelConfig {
  /** Title shown at top of sidebar */
  title: string;
  /** Accent color for active states – CSS color string */
  accent: string;
  /** Available models for this generation type */
  models: GenerationModel[];
  /** Default model id */
  defaultModel?: string;
  /** Optional style presets */
  styles?: GenerationStyle[];
  /** Default style id */
  defaultStyle?: string;
  /** Optional aspect ratios */
  ratios?: GenerationRatio[];
  /** Default ratio id */
  defaultRatio?: string;
  /** Show negative prompt field */
  showNegativePrompt?: boolean;
  /** Show steps slider */
  showSteps?: boolean;
  /** Show guidance/CFG slider */
  showGuidance?: boolean;
  /** Show variations slider */
  showVariations?: boolean;
  /** Custom parameter sliders */
  sliders?: { label: string; key: string; min: number; max: number; step: number; default: number; display?: (v: number) => string }[];
  /** Generate button label */
  generateLabel?: string;
  /** Credits display text */
  creditsNote?: string;
  /** Prompt placeholder */
  promptPlaceholder?: string;
}

export interface GenerationPanelState {
  prompt: string;
  negativePrompt: string;
  model: string;
  style: string;
  ratio: string;
  sliders: Record<string, number>;
}

export interface GenerationPanelProps {
  config: GenerationPanelConfig;
  /** Callback when Generate is clicked */
  onGenerate?: (state: GenerationPanelState) => void;
  /** Whether generation is in progress */
  generating?: boolean;
  /** Override height, default 580px */
  height?: number | string;
  /** Canvas content (your generator output) */
  children?: ReactNode;
}

/* ─── Styles ─── */

const s = {
  wrap: {
    display: 'flex' as const,
    flexDirection: 'row' as const,
    background: '#141414',
    color: '#f0f0f0',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    fontSize: '14px',
    borderRadius: 6,
    overflow: 'hidden' as const,
  },
  sidebar: {
    width: 252,
    flexShrink: 0,
    background: '#191919',
    borderRight: '1px solid #2a2a2a',
    display: 'flex' as const,
    flexDirection: 'column' as const,
    overflowY: 'auto' as const,
  },
  section: {
    padding: '12px 14px',
    borderBottom: '1px solid #2a2a2a',
  },
  label: {
    fontSize: 10,
    fontWeight: 600 as const,
    color: '#555',
    letterSpacing: '1px',
    textTransform: 'uppercase' as const,
    marginBottom: 8,
  },
  textarea: {
    width: '100%',
    background: '#222',
    border: '1px solid #333',
    borderRadius: 3,
    padding: '8px 10px',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    fontSize: 12,
    color: '#f0f0f0',
    resize: 'none' as const,
    outline: 'none',
    lineHeight: 1.55,
  },
  canvas: {
    flex: 1,
    background: '#0f0f0f',
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    position: 'relative' as const,
    overflow: 'hidden' as const,
  },
};

/* ─── Sub-components ─── */

function ModelOpt({ name, badge, description, active, accent, onClick }: {
  name: string; badge: string; description?: string; active: boolean; accent: string; onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 9, padding: '6px 7px', borderRadius: 3, cursor: 'pointer',
        border: active ? `1px solid ${accent}33` : '1px solid transparent',
        background: active ? `${accent}0f` : 'transparent',
        transition: 'all 0.15s',
      }}
    >
      <div style={{
        width: 13, height: 13, borderRadius: '50%', flexShrink: 0,
        border: active ? `1.5px solid ${accent}` : '1.5px solid #444',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: active ? `0 0 6px ${accent}55` : 'none',
        transition: 'all 0.15s',
      }}>
        {active && <div style={{ width: 5, height: 5, borderRadius: '50%', background: accent }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 12, color: active ? accent : '#9d9d9d' }}>{name}</span>
        {description && <div style={{ fontSize: 9, color: '#555', marginTop: 1 }}>{description}</div>}
      </div>
      <span style={{
        fontSize: 9, color: '#666', background: '#2a2a2a',
        border: '1px solid #333', padding: '1px 6px', borderRadius: 3, flexShrink: 0,
      }}>{badge}</span>
    </div>
  );
}

function StyleOpt({ label, active, accent, onClick }: {
  label: string; active: boolean; accent: string; onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '5px 7px', border: active ? `1px solid ${accent}` : '1px solid #333',
        borderRadius: 3, fontSize: 11,
        color: active ? accent : '#9d9d9d',
        fontWeight: active ? 600 : 400,
        background: active ? `${accent}0f` : '#222',
        cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center' as const,
      }}
    >
      {label}
    </div>
  );
}

function RatioChip({ label, w, h, active, accent, onClick }: {
  label: string; w: number; h: number; active: boolean; accent: string; onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        flex: 1, padding: '5px 3px',
        border: active ? `1px solid ${accent}` : '1px solid #333',
        borderRadius: 3, fontSize: 10,
        color: active ? accent : '#9d9d9d',
        background: active ? `${accent}0f` : '#222',
        cursor: 'pointer', display: 'flex', flexDirection: 'column' as const,
        alignItems: 'center', gap: 3, transition: 'all 0.15s',
        boxShadow: active ? `0 0 6px ${accent}18` : 'none',
      }}
    >
      <div style={{ width: w, height: h, border: `1px solid ${active ? accent : '#666'}`, opacity: 0.6 }} />
      <span>{label}</span>
    </div>
  );
}

function SliderCtrl({ label, min, max, step, value, accent, onChange, display }: {
  label: string; min: number; max: number; step: number; value: number; accent: string;
  onChange: (v: number) => void; display?: string;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: '#9d9d9d' }}>{label}</span>
        <span style={{ fontSize: 11, color: accent, fontWeight: 600 }}>{display ?? value}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{
          WebkitAppearance: 'none', width: '100%', height: 2,
          background: '#444', borderRadius: 2, outline: 'none', cursor: 'pointer',
          accentColor: accent,
        }}
      />
    </div>
  );
}

/* ─── Main component ─── */

export default function GenerationPanel({ config, onGenerate, generating, height, children }: GenerationPanelProps) {
  const {
    title, accent, models, styles: styleOpts, ratios,
    showNegativePrompt, sliders: customSliders,
    generateLabel, creditsNote, promptPlaceholder,
  } = config;

  const [prompt, setPrompt] = useState('');
  const [negPrompt, setNegPrompt] = useState('');
  const [model, setModel] = useState(config.defaultModel || models[0]?.id || '');
  const [styleId, setStyleId] = useState(config.defaultStyle || styleOpts?.[0]?.id || '');
  const [ratio, setRatio] = useState(config.defaultRatio || ratios?.[0]?.id || '');
  const [sliderVals, setSliderVals] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    customSliders?.forEach(sl => { init[sl.key] = sl.default; });
    return init;
  });

  const handleGenerate = () => {
    if (!prompt.trim() || generating) return;
    onGenerate?.({
      prompt: prompt.trim(),
      negativePrompt: negPrompt.trim(),
      model,
      style: styleId,
      ratio,
      sliders: sliderVals,
    });
  };

  const focusBorder = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    e.target.style.borderColor = accent;
    e.target.style.boxShadow = `0 0 0 1px ${accent}33`;
  };
  const blurBorder = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    e.target.style.borderColor = '#333';
    e.target.style.boxShadow = 'none';
  };

  return (
    <div style={{ ...s.wrap, height: height ?? 580 }}>
      {/* ─── SIDEBAR ─── */}
      <div style={s.sidebar}>

        {/* Title */}
        <div style={{ ...s.section, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: accent, boxShadow: `0 0 8px ${accent}55` }} />
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em', color: '#e0e0e0' }}>{title}</span>
        </div>

        {/* Prompt */}
        <div style={s.section}>
          <div style={s.label}>Prompt</div>
          <textarea
            rows={4}
            placeholder={promptPlaceholder || 'Describe what you want to generate...'}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
            style={s.textarea}
            onFocus={focusBorder}
            onBlur={blurBorder}
          />
          {showNegativePrompt && (
            <textarea
              rows={2}
              placeholder="Negative prompt (optional)"
              value={negPrompt}
              onChange={e => setNegPrompt(e.target.value)}
              style={{ ...s.textarea, marginTop: 5 }}
              onFocus={focusBorder}
              onBlur={blurBorder}
            />
          )}
        </div>

        {/* Model */}
        <div style={s.section}>
          <div style={s.label}>Model</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {models.map(m => (
              <ModelOpt
                key={m.id} name={m.name} badge={m.badge} description={m.description}
                active={model === m.id} accent={accent} onClick={() => setModel(m.id)}
              />
            ))}
          </div>
        </div>

        {/* Style (if provided) */}
        {styleOpts && styleOpts.length > 0 && (
          <div style={s.section}>
            <div style={s.label}>Style</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
              {styleOpts.map(st => (
                <StyleOpt key={st.id} label={st.label} active={styleId === st.id} accent={accent} onClick={() => setStyleId(st.id)} />
              ))}
            </div>
          </div>
        )}

        {/* Aspect Ratio (if provided) */}
        {ratios && ratios.length > 0 && (
          <div style={s.section}>
            <div style={s.label}>Aspect Ratio</div>
            <div style={{ display: 'flex', gap: 3 }}>
              {ratios.map(r => (
                <RatioChip key={r.id} label={r.label} w={r.w} h={r.h} active={ratio === r.id} accent={accent} onClick={() => setRatio(r.id)} />
              ))}
            </div>
          </div>
        )}

        {/* Custom sliders */}
        {customSliders && customSliders.length > 0 && (
          <div style={s.section}>
            <div style={s.label}>Parameters</div>
            {customSliders.map(sl => (
              <SliderCtrl
                key={sl.key} label={sl.label}
                min={sl.min} max={sl.max} step={sl.step}
                value={sliderVals[sl.key] ?? sl.default}
                accent={accent}
                onChange={v => setSliderVals(prev => ({ ...prev, [sl.key]: v }))}
                display={sl.display ? sl.display(sliderVals[sl.key] ?? sl.default) : undefined}
              />
            ))}
          </div>
        )}

        {/* Generate */}
        <div style={{
          padding: '12px 14px', background: '#111', borderTop: '1px solid #2a2a2a',
          marginTop: 'auto', flexShrink: 0,
        }}>
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || generating}
            style={{
              width: '100%', padding: 9, background: 'transparent',
              border: `1px solid ${accent}`,
              borderRadius: 3, color: accent,
              fontFamily: "'Segoe UI', system-ui, sans-serif",
              fontSize: 13, fontWeight: 600, cursor: !prompt.trim() || generating ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: `0 0 10px ${accent}22, inset 0 0 10px ${accent}08`,
              opacity: !prompt.trim() || generating ? 0.4 : 1,
              transition: 'all 0.2s',
            }}
          >
            {generating ? (
              <>
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                  <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeDasharray="28" strokeDashoffset="8" />
                </svg>
                Generating…
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                {generateLabel || 'Generate'}
              </>
            )}
          </button>
          {creditsNote && (
            <div style={{ textAlign: 'center' as const, fontSize: 10, color: '#555', marginTop: 6 }}>{creditsNote}</div>
          )}
        </div>
      </div>

      {/* ─── CANVAS ─── */}
      <div style={s.canvas}>
        {/* Corner brackets */}
        {(['top:16px,left:16px,1px 0 0 1px', 'top:16px,right:16px,1px 1px 0 0', 'bottom:16px,left:16px,0 0 1px 1px', 'bottom:16px,right:16px,0 1px 1px 0'] as const).map((def, i) => {
          const [pos1, pos2, bw] = def.split(',');
          const [k1, v1] = pos1.split(':');
          const [k2, v2] = pos2.split(':');
          return (
            <div key={i} style={{
              position: 'absolute', width: 14, height: 14,
              borderStyle: 'solid', borderColor: `${accent}33`, borderWidth: bw,
              [k1]: v1, [k2]: v2,
            }} />
          );
        })}
        {children ?? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, opacity: 0.2 }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="2" y="2" width="28" height="28" rx="1" stroke={accent} strokeWidth="1" />
              <circle cx="10" cy="10" r="3" fill={accent} />
              <path d="M2 22l8-8 6 6 4-4 10 10" stroke={accent} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ fontSize: 11, color: '#9d9d9d', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Output renders here
            </span>
          </div>
        )}
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
