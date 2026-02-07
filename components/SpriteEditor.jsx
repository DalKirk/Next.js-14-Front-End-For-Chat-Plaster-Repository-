'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, Play, Square, ChevronLeft, ChevronRight, Download, Send } from 'lucide-react';

/**
 * UPGRADED Sprite Editor Component
 * 
 * Now uses frame INDICES (not dataUrls) and CSS cropping for display.
 * Exports in AnimatedSpriteBehavior.animationDefs format:
 *   { idle: { frames: [0,1,2], speed: 150, loop: true, transitions: {...} }, ... }
 * 
 * Props:
 *   sprite: { id, src, frameWidth, frameHeight }
 *   onSave: (animationData) => void
 *   onClose: () => void
 */
function SpriteEditor({ sprite, onSave, onClose }) {
  // ── Sheet dimensions (computed once image loads) ──
  const [sheetWidth, setSheetWidth]   = useState(0);
  const [sheetHeight, setSheetHeight] = useState(0);
  const [sheetLoaded, setSheetLoaded] = useState(false);

  // ── Derived values ──
  const fw          = sprite?.frameWidth  || 32;
  const fh          = sprite?.frameHeight || 32;
  const cols        = sheetWidth  ? Math.floor(sheetWidth  / fw) : 0;
  const rows        = sheetHeight ? Math.floor(sheetHeight / fh) : 0;
  const totalFrames = cols * rows;

  // ── Animation definitions (AnimatedSpriteBehavior.animationDefs format) ──
  // { stateName: { frames: [indices], speed: ms, loop: bool, transitions: { target: condition } } }
  const [defs, setDefs] = useState({ idle: { frames: [0], speed: 150, loop: true, transitions: {} } });

  // ── UI state ──
  const [selectedAnim, setSelectedAnim]               = useState('idle');
  const [selectedFrames, setSelectedFrames]           = useState(new Set());
  const [sheetPreviewIdx, setSheetPreviewIdx]         = useState(0);
  const [sheetPlaying, setSheetPlaying]               = useState(false);
  const [sheetSpeed, setSheetSpeed]                   = useState(150);
  const [statePreviewIdx, setStatePreviewIdx]         = useState(0);
  const [statePreviewPlaying, setStatePreviewPlaying] = useState(false);
  const [message, setMessage]                         = useState('');
  const [transitionDraft, setTransitionDraft]         = useState({ target: '', condition: 'always' });
  const [newStateName, setNewStateName]               = useState('');
  const [testInput, setTestInput]                     = useState({ horizontal: 0, jumpPressed: false, isGrounded: true, velocityY: 0 });

  // ── Flash message ──
  const flash = useCallback((text) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 2500);
  }, []);

  // ── Load sheet dimensions ──
  useEffect(() => {
    if (!sprite?.src) return;
    setSheetLoaded(false);
    const img = new Image();
    img.onload = () => {
      setSheetWidth(img.width);
      setSheetHeight(img.height);
      setSheetLoaded(true);
    };
    img.onerror = () => flash('Failed to load sprite sheet');
    img.src = sprite.src;
  }, [sprite?.src, flash]);

  // ── Load saved defs from localStorage ──
  useEffect(() => {
    if (!sprite?.id) return;
    try {
      const saved = localStorage.getItem(`sprite-editor.defs.${sprite.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        setDefs(parsed);
        setSelectedAnim(Object.keys(parsed)[0] || 'idle');
      }
    } catch (e) { console.warn('Failed to load saved defs', e); }
  }, [sprite?.id]);

  // ── Save defs to localStorage on change ──
  useEffect(() => {
    if (!sprite?.id) return;
    try {
      localStorage.setItem(`sprite-editor.defs.${sprite.id}`, JSON.stringify(defs));
    } catch (e) { console.warn('Failed to save defs', e); }
  }, [defs, sprite?.id]);

  // ── Auto-select first animation if current is invalid ──
  useEffect(() => {
    const keys = Object.keys(defs);
    if (!selectedAnim && keys.length > 0) setSelectedAnim(keys[0]);
    if (selectedAnim && !defs[selectedAnim] && keys.length > 0) setSelectedAnim(keys[0]);
  }, [defs, selectedAnim]);

  // ── Reset state preview on selection change ──
  useEffect(() => {
    setStatePreviewIdx(0);
    setStatePreviewPlaying(false);
  }, [selectedAnim]);

  // ── Full-sheet playback ──
  useEffect(() => {
    if (!sheetPlaying || totalFrames === 0) return;
    const id = setInterval(() => {
      setSheetPreviewIdx(prev => (prev + 1) % totalFrames);
    }, sheetSpeed);
    return () => clearInterval(id);
  }, [sheetPlaying, sheetSpeed, totalFrames]);

  // ── Per-state preview playback ──
  useEffect(() => {
    if (!selectedAnim || !statePreviewPlaying) return;
    const anim = defs[selectedAnim];
    if (!anim?.frames?.length) return;
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

  // ── Frame display using background-image (most reliable for sprite sheets) ──
  const frameStyle = useCallback((frameIdx, size) => {
    if (!sheetLoaded || !sprite?.src || cols === 0) return { width: size, height: size, background: '#333' };
    const col = frameIdx % cols;
    const row = Math.floor(frameIdx / cols);
    // Scale factor to fit frame in the size
    const scale = size / Math.max(fw, fh);
    const displayW = fw * scale;
    const displayH = fh * scale;
    return {
      width: displayW,
      height: displayH,
      backgroundImage: `url(${sprite.src})`,
      backgroundPosition: `-${col * displayW}px -${row * displayH}px`,
      backgroundSize: `${sheetWidth * scale}px ${sheetHeight * scale}px`,
      backgroundRepeat: 'no-repeat',
      imageRendering: 'pixelated',
    };
  }, [sheetLoaded, sprite?.src, cols, fw, fh, sheetWidth, sheetHeight]);

  // ── Evaluate transition condition (for simulation) ──
  const evaluateCondition = useCallback((cond, input, gState) => {
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
    }
    return false;
  }, []);

  // ── Animation CRUD ──
  const addAnimation = useCallback(() => {
    const name = newStateName.trim();
    if (!name) { flash('Enter a state name'); return; }
    if (defs[name]) { flash('That name already exists'); return; }
    setDefs({ ...defs, [name]: { frames: [], speed: 150, loop: true, transitions: {} } });
    setNewStateName('');
    setSelectedAnim(name);
  }, [newStateName, defs, flash]);

  const deleteAnimation = useCallback((name) => {
    const next = { ...defs };
    delete next[name];
    // Remove transitions pointing to deleted state
    Object.keys(next).forEach(s => {
      if (next[s].transitions?.[name]) {
        const t = { ...next[s].transitions };
        delete t[name];
        next[s] = { ...next[s], transitions: t };
      }
    });
    setDefs(next);
    if (selectedAnim === name) setSelectedAnim(Object.keys(next)[0] || null);
  }, [defs, selectedAnim]);

  const renameAnimation = useCallback((oldName, newName) => {
    if (!newName || newName === oldName || defs[newName]) return;
    const next = {};
    Object.keys(defs).forEach(k => {
      next[k === oldName ? newName : k] = defs[k];
    });
    // Update transitions pointing to old name
    Object.keys(next).forEach(s => {
      if (next[s].transitions?.[oldName]) {
        const t = { ...next[s].transitions };
        t[newName] = t[oldName];
        delete t[oldName];
        next[s] = { ...next[s], transitions: t };
      }
    });
    setDefs(next);
    if (selectedAnim === oldName) setSelectedAnim(newName);
  }, [defs, selectedAnim]);

  const updateAnimProp = useCallback((key, value) => {
    if (!selectedAnim) return;
    setDefs(prev => ({ ...prev, [selectedAnim]: { ...prev[selectedAnim], [key]: value } }));
  }, [selectedAnim]);

  // ── Frame selection ──
  const toggleFrame = useCallback((idx) => {
    setSelectedFrames(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }, []);

  const selectAll  = useCallback(() => setSelectedFrames(new Set(Array.from({ length: totalFrames }, (_, i) => i))), [totalFrames]);
  const clearAll   = useCallback(() => setSelectedFrames(new Set()), []);

  const assignFrames = useCallback(() => {
    if (!selectedAnim) { flash('Select an animation first'); return; }
    if (selectedFrames.size === 0) { flash('Select frames first'); return; }
    const ordered = Array.from(selectedFrames).sort((a, b) => a - b);
    setDefs(prev => ({ ...prev, [selectedAnim]: { ...prev[selectedAnim], frames: ordered } }));
    flash(`Assigned ${ordered.length} frame(s) to "${selectedAnim}"`);
  }, [selectedAnim, selectedFrames, flash]);

  const moveFrame = useCallback((fromIdx, toIdx) => {
    if (!selectedAnim) return;
    setDefs(prev => {
      const frames = [...prev[selectedAnim].frames];
      const [moved] = frames.splice(fromIdx, 1);
      frames.splice(toIdx, 0, moved);
      return { ...prev, [selectedAnim]: { ...prev[selectedAnim], frames } };
    });
  }, [selectedAnim]);

  const removeFrameFromAnim = useCallback((posIdx) => {
    if (!selectedAnim) return;
    setDefs(prev => {
      const frames = prev[selectedAnim].frames.filter((_, i) => i !== posIdx);
      return { ...prev, [selectedAnim]: { ...prev[selectedAnim], frames } };
    });
  }, [selectedAnim]);

  // ── Transitions ──
  const addTransition = useCallback(() => {
    if (!selectedAnim || !transitionDraft.target) { flash('Pick a target state'); return; }
    let condObj;
    const raw = transitionDraft.condition;
    if (raw === 'always') condObj = true;
    else if (raw.startsWith('minHorizontal:')) condObj = { minHorizontal: Number(raw.split(':')[1]) };
    else if (raw === 'isGrounded:true') condObj = { isGrounded: true };
    else if (raw === 'jumpPressed:true') condObj = { jumpPressed: true };
    else condObj = true;

    setDefs(prev => ({
      ...prev,
      [selectedAnim]: {
        ...prev[selectedAnim],
        transitions: { ...(prev[selectedAnim].transitions || {}), [transitionDraft.target]: condObj }
      }
    }));
    setTransitionDraft({ target: '', condition: 'always' });
  }, [selectedAnim, transitionDraft, flash]);

  const removeTransition = useCallback((target) => {
    if (!selectedAnim) return;
    setDefs(prev => {
      const t = { ...(prev[selectedAnim].transitions || {}) };
      delete t[target];
      return { ...prev, [selectedAnim]: { ...prev[selectedAnim], transitions: t } };
    });
  }, [selectedAnim]);

  // ── Export to GameBuilder ──
  // Exports in format PlutoEditor expects: { name, states: {...}, spriteSheet: {...} }
  const exportToGameBuilder = useCallback(() => {
    if (Object.keys(defs).length === 0) {
      flash('Create at least one animation first');
      return;
    }

    // PlutoEditor expects 'states' key, not 'animationDefs'
    const exportData = {
      name: sprite?.id || 'sprite-animation',
      states: defs,  // PlutoEditor looks for this key
      spriteSheet: {
        src: sprite?.src,
        width: sheetWidth,
        height: sheetHeight,
        frameWidth: fw,
        frameHeight: fh
      },
      animationDefs: defs,  // Also include for AnimatedSpriteBehavior
      defaultAnimation: Object.keys(defs)[0] || 'idle'
    };

    try {
      console.log('[SpriteEditor] Exporting animation:', exportData);

      // BroadcastChannel for cross-tab
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('gamebuilder-animations');
        bc.postMessage(exportData);
        bc.close();
        console.log('[SpriteEditor] Sent via BroadcastChannel');
      }

      // CustomEvent for same-window
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('gamebuilder:importAnimation', { detail: exportData }));
      }

      // localStorage for persistence
      localStorage.setItem('gamebuilder.pendingAnimation', JSON.stringify(exportData));

      flash(`✓ Exported "${exportData.name}" to GameBuilder!`);
    } catch (err) {
      console.error('[SpriteEditor] Export failed:', err);
      flash('Export failed - check console');
    }
  }, [defs, sprite, sheetWidth, sheetHeight, fw, fh, flash]);

  // ── Download as JSON ──
  const downloadJSON = useCallback(() => {
    const exportData = {
      spriteSheet: { frameWidth: fw, frameHeight: fh },
      animationDefs: defs,
      defaultAnimation: Object.keys(defs)[0] || 'idle'
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sprite?.id || 'animation'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    flash('Downloaded animation JSON');
  }, [defs, fw, fh, sprite?.id, flash]);

  // ── Create animation (legacy callback for onSave prop) ──
  const createAnimation = useCallback(() => {
    if (Object.keys(defs).length === 0 || !defs[Object.keys(defs)[0]]?.frames?.length) {
      flash('Add frames to an animation first');
      return;
    }
    const animationName = prompt('Animation name:');
    if (!animationName) return;

    const animData = {
      name: animationName,
      spriteSheet: { src: sprite?.src, frameWidth: fw, frameHeight: fh },
      animationDefs: defs,
      defaultAnimation: Object.keys(defs)[0]
    };

    if (onSave) onSave(animData);
    flash(`Created animation "${animationName}"`);
  }, [defs, sprite, fw, fh, onSave, flash]);
  
  // ── No sprite loaded ──
  if (!sprite?.src) {
    return (
      <div className="bg-gray-800 p-8 rounded-lg text-center">
        <p className="text-gray-400">No sprite sheet loaded.</p>
        <p className="text-gray-500 text-sm mt-2">Pass a sprite prop with src, frameWidth, frameHeight</p>
      </div>
    );
  }

  if (!sheetLoaded) {
    return (
      <div className="bg-gray-800 p-8 rounded-lg text-center">
        <div className="text-4xl mb-4">⏳</div>
        <p className="text-gray-400">Loading sprite sheet...</p>
      </div>
    );
  }

  const currentAnim = selectedAnim ? defs[selectedAnim] : null;
  const simState = { onGround: testInput.isGrounded, playerVel: { y: testInput.velocityY } };

  return (
    <div className="bg-gray-800 p-3 sm:p-4 rounded-lg shadow-lg space-y-4">

      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold">🎬 Sprite Animation Editor</h3>
        <div className="flex gap-2">
          <button onClick={downloadJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors">
            <Download size={14} /> JSON
          </button>
          <button onClick={exportToGameBuilder}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 rounded text-sm font-semibold transition-colors">
            <Send size={14} /> GameBuilder
          </button>
          {onClose && (
            <button onClick={onClose}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors">
              Close
            </button>
          )}
        </div>
      </div>

      {/* Flash message */}
      {message && (
        <div className="text-sm text-yellow-300 bg-gray-900 border border-gray-700 rounded px-3 py-2">
          {message}
        </div>
      )}

      {/* Main preview */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-center">
          <div className="bg-gray-950 border border-gray-600 rounded p-2">
            <div style={frameStyle(sheetPreviewIdx, 128)} />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-center">
          <button onClick={() => { setSheetPlaying(p => !p); setSheetPreviewIdx(0); }}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors">
            {sheetPlaying ? <><Square size={12} /> Pause</> : <><Play size={12} /> Play</>}
          </button>
          <button onClick={() => setSheetPreviewIdx(prev => (prev - 1 + totalFrames) % totalFrames)}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => setSheetPreviewIdx(prev => (prev + 1) % totalFrames)}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors">
            <ChevronRight size={16} />
          </button>
          <label className="flex items-center gap-2 text-sm text-gray-400">
            Speed:
            <input type="range" min="50" max="500" value={sheetSpeed}
              onChange={(e) => setSheetSpeed(Number(e.target.value))} className="w-24" />
            <span className="font-mono w-14 text-right">{sheetSpeed}ms</span>
          </label>
        </div>
        <div className="text-sm text-gray-500 text-center">
          Frame {sheetPreviewIdx + 1} of {totalFrames} — {cols}×{rows} grid ({fw}×{fh} per frame)
        </div>
      </div>

      {/* Timeline */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400 font-semibold">
            Timeline ({totalFrames} frames) — {selectedFrames.size} selected
          </span>
          <div className="flex gap-2">
            <button onClick={selectAll} className="text-sm px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded">All</button>
            <button onClick={clearAll} className="text-sm px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded">Clear</button>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 bg-gray-900 p-3 rounded border border-gray-700">
          {Array.from({ length: totalFrames }, (_, idx) => {
            const isSel = selectedFrames.has(idx);
            const isCurrent = idx === sheetPreviewIdx;
            return (
              <div key={idx} onClick={() => { toggleFrame(idx); setSheetPreviewIdx(idx); }}
                className={`flex-shrink-0 cursor-pointer rounded overflow-hidden transition-all
                  border-2 ${isSel ? 'border-blue-500' : 'border-gray-600 hover:border-gray-500'}
                  ${isCurrent ? 'ring-2 ring-yellow-400' : ''}`}>
                <div style={frameStyle(idx, 48)} />
                <div className={`text-xs text-center py-0.5 ${isSel ? 'bg-blue-600' : 'bg-gray-700'}`}>
                  {idx}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Animation tabs */}
      <div className="flex gap-2 flex-wrap items-center">
        {Object.keys(defs).map(name => (
          <button key={name} onClick={() => setSelectedAnim(name)}
            className={`text-sm px-3 py-1 rounded-full border transition-colors ${
              selectedAnim === name
                ? 'border-purple-500 bg-purple-900/30 text-purple-300'
                : 'border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-500'
            }`}>
            {name} <span className="text-gray-500 ml-1">({(defs[name]?.frames || []).length})</span>
          </button>
        ))}
        <div className="flex gap-1">
          <input type="text" value={newStateName} placeholder="new state…"
            onChange={(e) => setNewStateName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addAnimation(); }}
            className="px-2 py-1 bg-gray-900 border border-gray-600 rounded text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500 w-32" />
          <button onClick={addAnimation}
            className="p-1.5 rounded border border-dashed border-gray-600 text-gray-500 hover:border-purple-500 hover:text-purple-400 transition-colors">
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Selected animation editor */}
      {selectedAnim && currentAnim && (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-4">
          {/* Name + delete */}
          <div className="flex items-center gap-2">
            <input type="text" value={selectedAnim}
              onChange={(e) => renameAnimation(selectedAnim, e.target.value)}
              className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm font-semibold focus:outline-none focus:border-purple-500" />
            <button onClick={() => deleteAnimation(selectedAnim)}
              className="text-gray-500 hover:text-red-400 transition-colors p-1.5">
              <Trash2 size={16} />
            </button>
          </div>

          {/* Speed + Loop */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm text-gray-500 block mb-1">Speed (ms/frame)</label>
              <input type="number" min="30" max="2000" step="10"
                value={currentAnim.speed || 150}
                onChange={(e) => updateAnimProp('speed', Number(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-purple-500" />
            </div>
            <div className="flex-1">
              <label className="text-sm text-gray-500 block mb-1">Loop</label>
              <select value={currentAnim.loop !== false ? 'true' : 'false'}
                onChange={(e) => updateAnimProp('loop', e.target.value === 'true')}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-purple-500">
                <option value="true">Yes — loops</option>
                <option value="false">No — holds last frame</option>
              </select>
            </div>
          </div>

          {/* Assign button */}
          <button onClick={assignFrames}
            className="w-full px-4 py-2 bg-purple-700 hover:bg-purple-600 rounded text-sm font-semibold transition-colors">
            Assign {selectedFrames.size} selected frame{selectedFrames.size !== 1 ? 's' : ''} →
          </button>

          {/* Frame sequence + preview */}
          <div className="flex gap-4 items-start">
            <div className="flex-1">
              <label className="text-sm text-gray-500 block mb-1">Frame Order ({currentAnim.frames.length} frames)</label>
              <div className="flex gap-1.5 flex-wrap min-h-[2.5rem]">
                {currentAnim.frames.map((frameIdx, posIdx) => (
                  <div key={`${frameIdx}-${posIdx}`} className="relative group">
                    <div className="bg-gray-950 border border-gray-600 rounded overflow-hidden">
                      <div style={frameStyle(frameIdx, 32)} />
                    </div>
                    <div className="absolute -top-5 left-0 right-0 flex justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {posIdx > 0 && (
                        <button onClick={() => moveFrame(posIdx, posIdx - 1)} className="text-gray-400 hover:text-white">
                          <ChevronLeft size={10} />
                        </button>
                      )}
                      <button onClick={() => removeFrameFromAnim(posIdx)} className="text-gray-500 hover:text-red-400">
                        <Trash2 size={10} />
                      </button>
                      {posIdx < currentAnim.frames.length - 1 && (
                        <button onClick={() => moveFrame(posIdx, posIdx + 1)} className="text-gray-400 hover:text-white">
                          <ChevronRight size={10} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {currentAnim.frames.length === 0 && (
                  <span className="text-sm text-gray-600 italic">Select frames above, then click Assign</span>
                )}
              </div>
            </div>

            {/* Preview */}
            <div className="flex-shrink-0">
              <label className="text-sm text-gray-500 block mb-1">Preview</label>
              <div className="bg-gray-950 border border-gray-700 rounded p-2">
                {currentAnim.frames.length > 0 ? (
                  <div style={frameStyle(currentAnim.frames[statePreviewIdx % currentAnim.frames.length], 80)} />
                ) : (
                  <span className="text-sm text-gray-600">No frames</span>
                )}
              </div>
              <div className="flex gap-1 mt-1.5 justify-center">
                <button onClick={() => { setStatePreviewPlaying(p => !p); setStatePreviewIdx(0); }}
                  className="text-gray-400 hover:text-white transition-colors">
                  {statePreviewPlaying ? <Square size={12} /> : <Play size={12} />}
                </button>
                <button onClick={() => setStatePreviewIdx(f => Math.max(0, f - 1))}
                  className="text-gray-400 hover:text-white">
                  <ChevronLeft size={12} />
                </button>
                <button onClick={() => setStatePreviewIdx(f => f + 1 < currentAnim.frames.length ? f + 1 : f)}
                  className="text-gray-400 hover:text-white">
                  <ChevronRight size={12} />
                </button>
              </div>
              <div className="text-xs text-gray-600 text-center mt-1">
                {statePreviewIdx + 1} / {currentAnim.frames.length || 0}
              </div>
            </div>
          </div>

          {/* Transitions */}
          <div>
            <div className="text-sm text-gray-400 font-semibold mb-2">Transitions</div>
            <div className="space-y-1.5 mb-2">
              {Object.keys(currentAnim.transitions || {}).length === 0 ? (
                <div className="text-sm text-gray-600">No transitions</div>
              ) : (
                Object.entries(currentAnim.transitions).map(([target, cond]) => {
                  const active = evaluateCondition(cond, testInput, simState);
                  return (
                    <div key={target} className="flex items-center justify-between gap-2 text-sm bg-gray-700 px-3 py-1.5 rounded">
                      <div className="truncate">
                        → <span className="text-purple-300">{target}</span>
                        <span className="text-gray-500 ml-2">({JSON.stringify(cond)})</span>
                        {!defs[target] && <span className="ml-2 text-red-400">(missing)</span>}
                        {active && <span className="ml-2 text-cyan-300 font-semibold">(active)</span>}
                      </div>
                      <button onClick={() => removeTransition(target)} className="text-gray-500 hover:text-red-400">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Add transition */}
            <div className="flex gap-2 items-center flex-wrap">
              <select value={transitionDraft.target}
                onChange={(e) => setTransitionDraft(d => ({ ...d, target: e.target.value }))}
                className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm focus:outline-none focus:border-purple-500">
                <option value="">Target…</option>
                {Object.keys(defs).filter(s => s !== selectedAnim).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <select value={transitionDraft.condition}
                onChange={(e) => setTransitionDraft(d => ({ ...d, condition: e.target.value }))}
                className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm focus:outline-none focus:border-purple-500">
                <option value="always">always</option>
                <option value="minHorizontal:0.2">moving (|h| ≥ 0.2)</option>
                <option value="isGrounded:true">grounded</option>
                <option value="jumpPressed:true">jump pressed</option>
              </select>
              <button onClick={addTransition}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded text-sm transition-colors">
                Add
              </button>
            </div>
          </div>

          {/* Transition simulation */}
          <div className="bg-gray-950 border border-gray-700 rounded p-3 space-y-2">
            <div className="text-sm text-gray-400 font-semibold">Transition Simulation</div>
            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-2 text-sm text-gray-400">
                Horiz:
                <input type="range" min="-1" max="1" step="0.1" value={testInput.horizontal}
                  onChange={(e) => setTestInput(t => ({ ...t, horizontal: Number(e.target.value) }))}
                  className="w-24" />
                <span className="w-10 text-right font-mono">{testInput.horizontal}</span>
              </label>
              <label className="flex items-center gap-1.5 text-sm text-gray-400 cursor-pointer">
                <input type="checkbox" checked={testInput.isGrounded}
                  onChange={(e) => setTestInput(t => ({ ...t, isGrounded: !!e.target.checked }))}
                  className="rounded" />
                Grounded
              </label>
              <label className="flex items-center gap-1.5 text-sm text-gray-400 cursor-pointer">
                <input type="checkbox" checked={testInput.jumpPressed}
                  onChange={(e) => setTestInput(t => ({ ...t, jumpPressed: !!e.target.checked }))}
                  className="rounded" />
                Jump
              </label>
            </div>
            <div className="text-sm text-gray-500">
              Active: {(() => {
                const active = Object.entries(currentAnim.transitions || {})
                  .filter(([, cond]) => evaluateCondition(cond, testInput, simState))
                  .map(([tgt]) => tgt);
                return active.length > 0
                  ? active.map(a => <span key={a} className="text-cyan-300 mr-2">{a}</span>)
                  : <span className="text-gray-600">none</span>;
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Sheet grid (optional detailed view) */}
      <details className="group">
        <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-400">
          ▶ Full Sprite Sheet Grid
        </summary>
        <div className="mt-2 border border-gray-700 rounded overflow-hidden bg-gray-900" style={{ maxHeight: 300, overflowY: 'auto' }}>
          <div className="relative inline-block" style={{ width: sheetWidth, height: sheetHeight }}>
            <img src={sprite.src} alt="sprite sheet" draggable={false} style={{ imageRendering: 'pixelated', display: 'block' }} />
            <div className="absolute inset-0" style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${cols}, ${fw}px)`,
              gridTemplateRows: `repeat(${rows}, ${fh}px)`,
            }}>
              {Array.from({ length: totalFrames }, (_, idx) => {
                const isSel = selectedFrames.has(idx);
                const inAnim = currentAnim?.frames.includes(idx);
                const animPos = currentAnim?.frames.indexOf(idx) ?? -1;
                return (
                  <div key={idx} onClick={() => { toggleFrame(idx); setSheetPreviewIdx(idx); }}
                    className="relative cursor-crosshair border border-white/10 hover:border-white/30 transition-colors"
                    style={{ width: fw, height: fh }}>
                    {isSel && <div className="absolute inset-0 bg-blue-500/25" />}
                    {inAnim && (
                      <div className="absolute inset-0 bg-purple-500/35 flex items-center justify-center">
                        <span className="text-white text-xs font-bold drop-shadow" style={{ fontSize: Math.min(fw * 0.3, 12) }}>
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
      </details>

      {/* Legacy Create Animation button for onSave callback */}
      {onSave && (
        <div className="bg-gray-900 p-3 rounded border border-gray-700">
          <button onClick={createAnimation}
            className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded font-semibold transition-colors">
            ✨ Create Animation (save)
          </button>
        </div>
      )}

      {/* Tips */}
      <div className="text-sm text-gray-600 space-y-1">
        <p>💡 Click frames in timeline to select, then "Assign" to add to the animation</p>
        <p>💡 Hover frame thumbnails in Frame Order to reorder or remove</p>
        <p>💡 Click "GameBuilder" to export — then open /game-builder to import</p>
      </div>
    </div>
  );
}

export default SpriteEditor;
