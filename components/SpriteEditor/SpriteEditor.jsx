// components/SpriteEditor/SpriteEditor.jsx
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Play, Square, ChevronLeft, ChevronRight } from 'lucide-react';

// ─── Pure helper: evaluate a transition condition against test inputs ────────
// Kept verbatim from the original. Same semantics, same condition types.
function evaluateCondition(cond, input, gState) {
  if (!cond) return false;
  if (typeof cond === 'boolean') return cond;
  if (typeof cond === 'string' && cond === 'always') return true;
  if (Array.isArray(cond)) return cond.some(c => evaluateCondition(c, input, gState));
  if (typeof cond === 'object') {
    if (cond.always) return true;
    if (typeof cond.minHorizontal === 'number')
      return Math.abs(input.horizontal || 0) >= cond.minHorizontal;
    if (typeof cond.maxHorizontal === 'number')
      return Math.abs(input.horizontal || 0) <= cond.maxHorizontal;
    if (typeof cond.jumpPressed === 'boolean')
      return !!input.jumpPressed === !!cond.jumpPressed;
    if (typeof cond.isGrounded === 'boolean')
      return !!gState.onGround === !!cond.isGrounded;
    if (typeof cond.velocityYLessThan === 'number')
      return (gState.playerVel?.y || 0) < cond.velocityYLessThan;
    if (typeof cond.velocityYGreaterThan === 'number')
      return (gState.playerVel?.y || 0) > cond.velocityYGreaterThan;
    if (typeof cond.property === 'string' && typeof cond.op === 'string') {
      const val = gState[cond.property] !== undefined
        ? gState[cond.property]
        : input[cond.property] !== undefined ? input[cond.property] : null;
      if (val === null) return false;
      switch (cond.op) {
        case 'eq':  return val === cond.value;
        case 'ne':  return val !== cond.value;
        case 'lt':  return val <  cond.value;
        case 'gt':  return val >  cond.value;
        case 'lte': return val <= cond.value;
        case 'gte': return val >= cond.value;
      }
    }
  }
  return false;
}

/**
 * SpriteEditor
 *
 * Mounts inside BehaviorConfigs when it encounters a field with type: 'spriteEditor'.
 * Receives the full behavior config, the project assets array, and an onChange
 * that writes back into the behavior config.
 *
 * @param {object}   config   – AnimatedSpriteBehavior config
 * @param {Array}    assets   – project.assets
 * @param {Function} onChange – (key, value) => void
 */
const SpriteEditor = ({ config, assets, onChange }) => {

  // ── Derived state (recomputed from config on every render) ───────────────
  const asset       = assets.find(a => a.id === config.spriteSheetAssetId);
  const fw          = config.frameWidth  || 32;
  const fh          = config.frameHeight || 32;
  const defs        = config.animationDefs || {};
  const cols        = asset ? Math.floor(asset.width  / fw) : 0;
  const rows        = asset ? Math.floor(asset.height / fh) : 0;
  const totalFrames = cols * rows;

  // ── UI state ─────────────────────────────────────────────────────────────
  const [selectedAnim,          setSelectedAnim]          = useState(null);
  const [selectedFrames,        setSelectedFrames]        = useState(new Set());
  const [sheetPreviewIdx,       setSheetPreviewIdx]       = useState(0);   // full-sheet playback cursor
  const [sheetPlaying,          setSheetPlaying]          = useState(false);
  const [sheetSpeed,            setSheetSpeed]            = useState(150);
  const [statePreviewIdx,       setStatePreviewIdx]       = useState(0);   // per-state preview cursor
  const [statePreviewPlaying,   setStatePreviewPlaying]   = useState(false);
  const [message,               setMessage]               = useState('');
  const [transitionDraft,       setTransitionDraft]       = useState({ target: '', condition: 'always' });
  const [newStateName,          setNewStateName]          = useState('');

  // Transition simulation inputs (kept from original)
  const [testInput, setTestInput] = useState({
    horizontal: 0,
    jumpPressed: false,
    isGrounded: true,
    velocityY: 0
  });

  // ── Auto-select first animation when none is selected ───────────────────
  useEffect(() => {
    const keys = Object.keys(defs);
    if (!selectedAnim && keys.length > 0) setSelectedAnim(keys[0]);
    // If the selected animation was deleted, fall back to the first one
    if (selectedAnim && !defs[selectedAnim] && keys.length > 0) setSelectedAnim(keys[0]);
  }, [defs, selectedAnim]);

  // Reset per-state preview when selection changes
  useEffect(() => {
    setStatePreviewIdx(0);
    setStatePreviewPlaying(false);
  }, [selectedAnim]);

  // ── Full-sheet playback (cycles through every frame on the sheet) ────────
  useEffect(() => {
    if (!sheetPlaying || totalFrames === 0) return;
    const id = setInterval(() => {
      setSheetPreviewIdx(prev => (prev + 1) % totalFrames);
    }, sheetSpeed);
    return () => clearInterval(id);
  }, [sheetPlaying, sheetSpeed, totalFrames]);

  // ── Per-state preview playback ───────────────────────────────────────────
  useEffect(() => {
    if (!selectedAnim || !statePreviewPlaying) return;
    const anim = defs[selectedAnim];
    if (!anim || !anim.frames || anim.frames.length === 0) return;
    const speed = anim.speed || 150;
    const id = setInterval(() => {
      setStatePreviewIdx(prev => {
        const next = prev + 1;
        if (next >= anim.frames.length) return anim.loop !== false ? 0 : prev;
        return next;
      });
    }, speed);
    return () => clearInterval(id);
  }, [statePreviewPlaying, selectedAnim, defs]);

  // Reset state preview when the frame count of the active animation changes
  useEffect(() => {
    setStatePreviewIdx(0);
  }, [selectedAnim, selectedAnim && defs[selectedAnim] ? defs[selectedAnim].frames.length : 0]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const flash = (text) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 2000);
  };

  // Write the full animationDefs object back into the behavior config.
  // This is the single write path. Everything that mutates animation state
  // calls this.
  const saveDefs = (newDefs) => onChange('animationDefs', newDefs);

  // Compute inline styles that crop the sheet image to show one frame
  // at a given display size. The image is scaled up so that one frame
  // fills the container, then object-position offsets to the right frame.
  const cropStyle = (frameIdx, displaySize) => {
    if (!asset) return {};
    const col   = frameIdx % cols;
    const row   = Math.floor(frameIdx / cols);
    const scale = displaySize / Math.max(fw, fh);
    return {
      imageRendering: 'pixelated',
      objectFit: 'none',
      objectPosition: `-${col * fw * scale}px -${row * fh * scale}px`,
      width:  asset.width  * scale,
      height: asset.height * scale,
    };
  };

  // ── Animation CRUD ───────────────────────────────────────────────────────

  const addAnimation = () => {
    const name = newStateName.trim();
    if (!name) { flash('Enter a state name'); return; }
    if (defs[name]) { flash('That name already exists'); return; }
    saveDefs({ ...defs, [name]: { frames: [], speed: 150, loop: true, transitions: {} } });
    setNewStateName('');
    setSelectedAnim(name);
  };

  const deleteAnimation = (name) => {
    const next = { ...defs };
    delete next[name];
    // Clean up transitions in other states that pointed to the deleted one
    Object.keys(next).forEach(s => {
      if (next[s].transitions && next[s].transitions[name]) {
        const t = { ...next[s].transitions };
        delete t[name];
        next[s] = { ...next[s], transitions: t };
      }
    });
    saveDefs(next);
    if (selectedAnim === name) setSelectedAnim(Object.keys(next)[0] || null);
  };

  const renameAnimation = (oldName, newName) => {
    if (!newName || newName === oldName || defs[newName]) return;
    const next = {};
    Object.keys(defs).forEach(k => {
      next[k === oldName ? newName : k] = defs[k];
    });
    // Update transition targets that referenced the old name
    Object.keys(next).forEach(s => {
      if (next[s].transitions && next[s].transitions[oldName]) {
        const t = { ...next[s].transitions };
        t[newName] = t[oldName];
        delete t[oldName];
        next[s] = { ...next[s], transitions: t };
      }
    });
    saveDefs(next);
    if (selectedAnim === oldName) setSelectedAnim(newName);
  };

  const updateAnimProp = (key, value) => {
    if (!selectedAnim) return;
    saveDefs({ ...defs, [selectedAnim]: { ...defs[selectedAnim], [key]: value } });
  };

  // ── Frame selection (timeline) ───────────────────────────────────────────

  const toggleFrame = (idx) => {
    setSelectedFrames(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const selectAll  = () => setSelectedFrames(new Set(Array.from({ length: totalFrames }, (_, i) => i)));
  const clearAll   = () => setSelectedFrames(new Set());

  // ── Assign selected timeline frames into the active animation ────────────
  const assignFrames = () => {
    if (!selectedAnim) { flash('Select an animation first'); return; }
    if (selectedFrames.size === 0) { flash('Select frames in the timeline first'); return; }
    // Preserve order: iterate indices in ascending order
    const ordered = Array.from(selectedFrames).sort((a, b) => a - b);
    saveDefs({ ...defs, [selectedAnim]: { ...defs[selectedAnim], frames: ordered } });
    flash(`Assigned ${ordered.length} frame(s) to "${selectedAnim}"`);
  };

  // ── Frame reorder within an animation ────────────────────────────────────
  const moveFrame = (fromIdx, toIdx) => {
    if (!selectedAnim) return;
    const frames = [...defs[selectedAnim].frames];
    const [moved] = frames.splice(fromIdx, 1);
    frames.splice(toIdx, 0, moved);
    saveDefs({ ...defs, [selectedAnim]: { ...defs[selectedAnim], frames } });
  };

  // Remove one frame from the animation's sequence (not from the sheet)
  const removeFrameFromAnim = (posIdx) => {
    if (!selectedAnim) return;
    const frames = defs[selectedAnim].frames.filter((_, i) => i !== posIdx);
    saveDefs({ ...defs, [selectedAnim]: { ...defs[selectedAnim], frames } });
  };

  // ── Transitions ──────────────────────────────────────────────────────────

  const addTransition = () => {
    if (!selectedAnim || !transitionDraft.target) { flash('Pick a target state'); return; }

    // Parse the condition dropdown value into the condition object shape
    // that evaluateCondition understands
    let condObj;
    const raw = transitionDraft.condition;
    if (raw === 'always') {
      condObj = true;
    } else if (raw.startsWith('minHorizontal:')) {
      condObj = { minHorizontal: Number(raw.split(':')[1]) };
    } else if (raw === 'isGrounded:true') {
      condObj = { isGrounded: true };
    } else if (raw === 'jumpPressed:true') {
      condObj = { jumpPressed: true };
    } else {
      condObj = true;
    }

    saveDefs({
      ...defs,
      [selectedAnim]: {
        ...defs[selectedAnim],
        transitions: {
          ...(defs[selectedAnim].transitions || {}),
          [transitionDraft.target]: condObj
        }
      }
    });
    setTransitionDraft({ target: '', condition: 'always' });
  };

  const removeTransition = (target) => {
    if (!selectedAnim) return;
    const t = { ...(defs[selectedAnim].transitions || {}) };
    delete t[target];
    saveDefs({ ...defs, [selectedAnim]: { ...defs[selectedAnim], transitions: t } });
  };

  // ── No asset ─────────────────────────────────────────────────────────────
  if (!asset) {
    return (
      <div className="mt-1 p-3 border border-dashed border-zinc-700 rounded-lg">
        <p className="text-xs text-zinc-500 italic text-center">
          Set a Sprite Sheet asset above to open the editor.
        </p>
      </div>
    );
  }

  const currentAnim = selectedAnim ? defs[selectedAnim] : null;

  // Simulation state object built from the test inputs, used by evaluateCondition
  const simState = { onGround: testInput.isGrounded, playerVel: { y: testInput.velocityY } };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="mt-1 space-y-3">

      {/* Flash message */}
      {message && (
        <div className="text-xs text-yellow-300 bg-zinc-800 border border-zinc-700 rounded px-2.5 py-1.5">
          {message}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          SECTION A — Full-sheet preview + timeline
          ════════════════════════════════════════════════════════════════════ */}

      {/* Main preview: shows one frame of the sheet, plays through all frames */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 space-y-2.5">
        <div className="flex items-center justify-center">
          <div className="w-40 h-40 bg-zinc-800 border border-zinc-700 rounded flex items-center justify-center overflow-hidden">
            <div style={{ overflow: 'hidden', width: 152, height: 152 }}>
              <img
                src={asset.base64}
                alt="preview"
                draggable={false}
                style={cropStyle(sheetPreviewIdx, 152)}
              />
            </div>
          </div>
        </div>

        {/* Playback controls */}
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <button
            onClick={() => { setSheetPlaying(p => !p); setSheetPreviewIdx(0); }}
            className="flex items-center gap-1 px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded text-xs text-white transition-colors"
          >
            {sheetPlaying ? <><Square size={10} /> Pause</> : <><Play size={10} /> Play</>}
          </button>
          <button
            onClick={() => setSheetPreviewIdx(prev => (prev - 1 + totalFrames) % totalFrames)}
            className="p-1.5 bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-300 transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => setSheetPreviewIdx(prev => (prev + 1) % totalFrames)}
            className="p-1.5 bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-300 transition-colors"
          >
            <ChevronRight size={14} />
          </button>
          <label className="flex items-center gap-1.5 text-xs text-zinc-400">
            Speed:
            <input
              type="range" min="50" max="500" value={sheetSpeed}
              onChange={(e) => setSheetSpeed(Number(e.target.value))}
              className="w-20"
            />
            <span className="font-mono w-12 text-right">{sheetSpeed}ms</span>
          </label>
        </div>
        <div className="text-xs text-zinc-500 text-center">
          Frame {sheetPreviewIdx + 1} of {totalFrames} — {cols} cols × {rows} rows ({fw}×{fh} per frame)
        </div>
      </div>

      {/* Timeline strip: all frames, click to select for assignment */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-zinc-400 font-semibold">
            Timeline ({totalFrames} frames) — {selectedFrames.size} selected
          </span>
          <div className="flex gap-1.5">
            <button onClick={selectAll}
              className="text-xs px-2 py-0.5 bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-300 transition-colors">
              All
            </button>
            <button onClick={clearAll}
              className="text-xs px-2 py-0.5 bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-300 transition-colors">
              Clear
            </button>
          </div>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-2 bg-zinc-900 p-2 rounded border border-zinc-700">
          {Array.from({ length: totalFrames }, (_, idx) => {
            const isSel     = selectedFrames.has(idx);
            const isCurrent = idx === sheetPreviewIdx;
            return (
              <div
                key={idx}
                onClick={() => { toggleFrame(idx); setSheetPreviewIdx(idx); }}
                className={`flex-shrink-0 cursor-pointer rounded overflow-hidden transition-all
                  border-2 ${isSel ? 'border-purple-500' : 'border-zinc-600 hover:border-zinc-500'}
                  ${isCurrent ? 'ring-2 ring-yellow-400' : ''}`}
              >
                <div className="w-16 h-16 overflow-hidden bg-zinc-800">
                  <img
                    src={asset.base64}
                    alt={`frame ${idx}`}
                    draggable={false}
                    style={cropStyle(idx, 64)}
                  />
                </div>
                <div className={`text-xs text-center py-0.5 ${isSel ? 'bg-purple-600' : 'bg-zinc-700'} text-white`}>
                  {idx}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION B — Animation state tabs + add new state
          ════════════════════════════════════════════════════════════════════ */}

      <div className="flex gap-1.5 flex-wrap items-center">
        {Object.keys(defs).map(name => (
          <button
            key={name}
            onClick={() => setSelectedAnim(name)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              selectedAnim === name
                ? 'border-purple-500 bg-purple-900/30 text-purple-300'
                : 'border-zinc-600 bg-zinc-800 text-zinc-400 hover:border-zinc-500'
            }`}
          >
            {name}
            <span className="text-zinc-500 ml-1">({(defs[name]?.frames || []).length})</span>
          </button>
        ))}

        {/* Add new state: inline input + button */}
        <div className="flex gap-1">
          <input
            type="text"
            value={newStateName}
            placeholder="new state…"
            onChange={(e) => setNewStateName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addAnimation(); }}
            className="px-2 py-0.5 bg-zinc-900 border border-zinc-600 rounded text-xs text-white
                       placeholder-zinc-600 focus:outline-none focus:border-purple-500 w-28"
          />
          <button
            onClick={addAnimation}
            className="p-1 rounded border border-dashed border-zinc-600
                       text-zinc-500 hover:border-purple-500 hover:text-purple-400 transition-colors"
          >
            <Plus size={12} />
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION C — Selected animation editor
          ════════════════════════════════════════════════════════════════════ */}

      {selectedAnim && currentAnim && (
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 space-y-3">

          {/* Name + delete */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={selectedAnim}
              onChange={(e) => renameAnimation(selectedAnim, e.target.value)}
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1
                         text-xs text-white font-semibold focus:outline-none focus:border-purple-500"
            />
            <button onClick={() => deleteAnimation(selectedAnim)}
              className="text-zinc-500 hover:text-red-400 transition-colors p-1">
              <Trash2 size={14} />
            </button>
          </div>

          {/* Speed + Loop */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-zinc-500 block mb-0.5">Speed (ms/frame)</label>
              <input
                type="number" min="30" max="2000" step="10"
                value={currentAnim.speed || 150}
                onChange={(e) => updateAnimProp('speed', Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1
                           text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-zinc-500 block mb-0.5">Loop</label>
              <select
                value={currentAnim.loop !== false ? 'true' : 'false'}
                onChange={(e) => updateAnimProp('loop', e.target.value === 'true')}
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1
                           text-xs text-white focus:outline-none focus:border-purple-500"
              >
                <option value="true">Yes — loops back to start</option>
                <option value="false">No — holds last frame</option>
              </select>
            </div>
          </div>

          {/* Assign button */}
          <button
            onClick={assignFrames}
            className="w-full px-3 py-1.5 bg-purple-700 hover:bg-purple-600 rounded text-xs text-white
                       font-semibold transition-colors"
          >
            Assign {selectedFrames.size} selected timeline frame{selectedFrames.size !== 1 ? 's' : ''} →
          </button>

          {/* Frame sequence strip + state preview side by side */}
          <div className="flex gap-3 items-start">
            {/* Frame sequence (the playback order for this animation) */}
            <div className="flex-1">
              <label className="text-xs text-zinc-500 block mb-1">
                Frame Order ({currentAnim.frames.length} frames)
              </label>
              <div className="flex gap-1 flex-wrap min-h-[2rem]">
                {currentAnim.frames.map((frameIdx, posIdx) => (
                  <div key={`${frameIdx}-${posIdx}`} className="relative group">
                    {/* Thumbnail */}
                    <div className="w-9 h-9 bg-zinc-900 border border-zinc-600 rounded overflow-hidden">
                      <div style={{ overflow: 'hidden', width: 36, height: 36 }}>
                        <img
                          src={asset.base64}
                          alt={`seq ${posIdx}`}
                          draggable={false}
                          style={cropStyle(frameIdx, 36)}
                        />
                      </div>
                    </div>
                    {/* Hover controls: reorder + remove */}
                    <div className="absolute -top-5 left-0 right-0 flex justify-center gap-0.5
                                    opacity-0 group-hover:opacity-100 transition-opacity">
                      {posIdx > 0 && (
                        <button onClick={() => moveFrame(posIdx, posIdx - 1)}
                          className="text-zinc-400 hover:text-white">
                          <ChevronLeft size={10} />
                        </button>
                      )}
                      <button onClick={() => removeFrameFromAnim(posIdx)}
                        className="text-zinc-500 hover:text-red-400">
                        <Trash2 size={9} />
                      </button>
                      {posIdx < currentAnim.frames.length - 1 && (
                        <button onClick={() => moveFrame(posIdx, posIdx + 1)}
                          className="text-zinc-400 hover:text-white">
                          <ChevronRight size={10} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {currentAnim.frames.length === 0 && (
                  <span className="text-xs text-zinc-600 italic">
                    Select frames in the timeline above, then click Assign
                  </span>
                )}
              </div>
            </div>

            {/* State preview box */}
            <div className="flex-shrink-0 w-24">
              <label className="text-xs text-zinc-500 block mb-1">Preview</label>
              <div className="w-24 h-24 bg-zinc-900 border border-zinc-700 rounded
                              flex items-center justify-center overflow-hidden">
                {currentAnim.frames.length > 0 ? (
                  <div style={{ overflow: 'hidden', width: 88, height: 88 }}>
                    <img
                      src={asset.base64}
                      alt="state preview"
                      draggable={false}
                      style={cropStyle(
                        currentAnim.frames[statePreviewIdx % currentAnim.frames.length],
                        88
                      )}
                    />
                  </div>
                ) : (
                  <span className="text-xs text-zinc-600">No frames</span>
                )}
              </div>
              {/* Play/Stop + Prev/Next */}
              <div className="flex gap-1 mt-1 justify-center">
                <button
                  onClick={() => { setStatePreviewPlaying(p => !p); setStatePreviewIdx(0); }}
                  className="text-xs text-zinc-400 hover:text-white transition-colors"
                >
                  {statePreviewPlaying ? <Square size={10} /> : <Play size={10} />}
                </button>
                <button
                  onClick={() => setStatePreviewIdx(f => Math.max(0, f - 1))}
                  className="text-xs text-zinc-400 hover:text-white">
                  <ChevronLeft size={10} />
                </button>
                <button
                  onClick={() => setStatePreviewIdx(f =>
                    f + 1 < currentAnim.frames.length ? f + 1 : f
                  )}
                  className="text-xs text-zinc-400 hover:text-white">
                  <ChevronRight size={10} />
                </button>
              </div>
              <div className="text-xs text-zinc-600 text-center mt-0.5">
                {statePreviewIdx + 1} / {currentAnim.frames.length || 0}
              </div>
            </div>
          </div>

          {/* ── Transitions ── */}
          <div>
            <div className="text-xs text-zinc-400 font-semibold mb-1.5">Transitions</div>

            {/* Dangling-target warning */}
            {(() => {
              const bad = Object.keys(currentAnim.transitions || {}).filter(t => !defs[t]);
              if (bad.length === 0) return null;
              return (
                <div className="text-xs text-red-400 bg-red-900/20 border border-red-800 rounded px-2 py-1 mb-1.5">
                  Warning: transitions point to missing states: {bad.join(', ')}
                </div>
              );
            })()}

            {/* Existing transition rows */}
            <div className="space-y-1 mb-2">
              {Object.keys(currentAnim.transitions || {}).length === 0 ? (
                <div className="text-xs text-zinc-600">No transitions</div>
              ) : (
                Object.entries(currentAnim.transitions).map(([target, cond]) => {
                  const active = evaluateCondition(cond, testInput, simState);
                  return (
                    <div key={target}
                      className="flex items-center justify-between gap-2 text-xs bg-zinc-700 px-2 py-1 rounded">
                      <div className="truncate">
                        → <span className="text-purple-300">{target}</span>
                        <span className="text-zinc-500 ml-1.5">({JSON.stringify(cond)})</span>
                        {!defs[target] && <span className="ml-1.5 text-red-400">(missing)</span>}
                        {active && <span className="ml-1.5 text-cyan-300 font-semibold">(active)</span>}
                      </div>
                      <button onClick={() => removeTransition(target)}
                        className="text-zinc-500 hover:text-red-400 flex-shrink-0">
                        <Trash2 size={10} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Add transition row */}
            <div className="flex gap-1.5 items-center flex-wrap">
              <select
                value={transitionDraft.target}
                onChange={(e) => setTransitionDraft(d => ({ ...d, target: e.target.value }))}
                className="px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-xs text-white
                           focus:outline-none focus:border-purple-500"
              >
                <option value="">Target…</option>
                {Object.keys(defs).filter(s => s !== selectedAnim).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <select
                value={transitionDraft.condition}
                onChange={(e) => setTransitionDraft(d => ({ ...d, condition: e.target.value }))}
                className="px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-xs text-white
                           focus:outline-none focus:border-purple-500"
              >
                <option value="always">always</option>
                <option value="minHorizontal:0.2">moving (|h| ≥ 0.2)</option>
                <option value="isGrounded:true">grounded</option>
                <option value="jumpPressed:true">jump pressed</option>
              </select>
              <button onClick={addTransition}
                className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs text-white transition-colors">
                Add
              </button>
            </div>
          </div>

          {/* ── Transition Simulation ── */}
          <div className="bg-zinc-900 border border-zinc-700 rounded p-2.5 space-y-2">
            <div className="text-xs text-zinc-400 font-semibold">Transition Simulation</div>
            <div className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-1.5 text-xs text-zinc-400">
                Horiz:
                <input
                  type="range" min="-1" max="1" step="0.1"
                  value={testInput.horizontal}
                  onChange={(e) => setTestInput(t => ({ ...t, horizontal: Number(e.target.value) }))}
                  className="w-20"
                />
                <span className="w-8 text-right font-mono">{testInput.horizontal}</span>
              </label>
              <label className="flex items-center gap-1 text-xs text-zinc-400 cursor-pointer">
                <input type="checkbox" checked={testInput.isGrounded}
                  onChange={(e) => setTestInput(t => ({ ...t, isGrounded: !!e.target.checked }))}
                  className="rounded" />
                Grounded
              </label>
              <label className="flex items-center gap-1 text-xs text-zinc-400 cursor-pointer">
                <input type="checkbox" checked={testInput.jumpPressed}
                  onChange={(e) => setTestInput(t => ({ ...t, jumpPressed: !!e.target.checked }))}
                  className="rounded" />
                Jump
              </label>
            </div>
            <div className="text-xs text-zinc-500">
              Active: {(() => {
                const active = Object.entries(currentAnim.transitions || {})
                  .filter(([, cond]) => evaluateCondition(cond, testInput, simState))
                  .map(([tgt]) => tgt);
                return active.length > 0
                  ? active.map(a => <span key={a} className="text-cyan-300 mr-2">{a}</span>)
                  : <span className="text-zinc-600">none</span>;
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          SECTION D — Sheet grid (click to toggle frames into the active anim)
          ════════════════════════════════════════════════════════════════════ */}

      <div>
        <label className="text-xs text-zinc-500 block mb-1">
          Sprite Sheet — click to select frames, then Assign into
          "<span className="text-purple-300">{selectedAnim || '…'}</span>"
        </label>
        <div className="border border-zinc-700 rounded overflow-hidden bg-zinc-900"
             style={{ maxHeight: 300, overflowY: 'auto' }}>

          {/* Relative container: image + grid overlay. The grid is positioned
              on top using absolute positioning. Each cell is exactly fw×fh. */}
          <div className="relative inline-block" style={{ width: asset.width, height: asset.height }}>

            {/* The sheet image */}
            <img
              src={asset.base64}
              alt="sprite sheet"
              draggable={false}
              style={{ imageRendering: 'pixelated', display: 'block' }}
            />

            {/* Grid of clickable cells on top of the image */}
            <div
              className="absolute inset-0"
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${cols}, ${fw}px)`,
                gridTemplateRows:    `repeat(${rows}, ${fh}px)`,
              }}
            >
              {Array.from({ length: totalFrames }, (_, idx) => {
                const isSel      = selectedFrames.has(idx);
                const inAnim     = currentAnim && currentAnim.frames.includes(idx);
                const animPos    = currentAnim ? currentAnim.frames.indexOf(idx) : -1;
                return (
                  <div
                    key={idx}
                    onClick={() => { toggleFrame(idx); setSheetPreviewIdx(idx); }}
                    className="relative cursor-crosshair border border-white/10 hover:border-white/30 transition-colors"
                    style={{ width: fw, height: fh }}
                  >
                    {/* Blue tint = selected in timeline */}
                    {isSel && <div className="absolute inset-0 bg-blue-500/25" />}
                    {/* Purple tint + order number = already in the active animation */}
                    {inAnim && (
                      <div className="absolute inset-0 bg-purple-500/35 flex items-center justify-center">
                        <span className="text-white text-xs font-bold drop-shadow"
                              style={{ fontSize: Math.min(fw * 0.3, 11) }}>
                          {animPos}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="text-xs text-zinc-600 space-y-0.5">
        <p>💡 Click frames in the timeline or sheet to select them</p>
        <p>💡 Click "Assign" to add selected frames to the active animation</p>
        <p>💡 Hover frame thumbnails in the sequence strip to reorder or remove</p>
        <p>💡 Purple numbers on the sheet show which frames are in this animation and in what order</p>
      </div>
    </div>
  );
};

export default SpriteEditor;
