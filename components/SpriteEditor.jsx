'use client';

import React, { useState, useEffect, useRef } from 'react';
import NextImage from 'next/image';

/**
 * Advanced Sprite Editor Component
 * Allows users to:
 * - Load sprite sheets and split into frames
 * - Preview animations in real-time
 * - Select frames to create custom animations
 * - Adjust animation speed
 * - Export animation definitions
 */
function SpriteEditor({ sprite, onSave, onClose }) {
  const [frames, setFrames] = useState([]);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [animationSpeed, setAnimationSpeed] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);
  const [editorMessage, setEditorMessage] = useState('');
  // Multi-state editing
  const [states, setStates] = useState({}); // name -> { frames: [dataUrl], frameDuration, loop, transitions }
  const [editingState, setEditingState] = useState(null);
  const [transitionDraft, setTransitionDraft] = useState({ target: '', condition: 'always' });
  const [testInput, setTestInput] = useState({ horizontal: 0, jumpPressed: false, isGrounded: true, velocityY: 0 });
  const [statePreviewPlaying, setStatePreviewPlaying] = useState(false);
  const [statePreviewFrame, setStatePreviewFrame] = useState(0);
  // Minimal export/install workflow: create a player animation JSON and export
  // to GameBuilder via BroadcastChannel/CustomEvent and localStorage.
  const exportToGameBuilder = (name = 'exported') => {
    // If there are authoring states, export them; otherwise export current selection as 'idle'
    let animStates = {};
    if (Object.keys(states).length > 0) {
      animStates = { ...states };
    } else {
      const selected = frames.filter(f => f.selected);
      if (selected.length === 0) {
        setEditorMessage('Select frames to export');
        setTimeout(() => setEditorMessage(''), 2000);
        return;
      }
      animStates['idle'] = {
        frames: selected.map(f => f.dataUrl),
        frameDuration: animationSpeed,
        loop: true,
        transitions: {}
      };
    }
    const animJson = { name, states: animStates };
    // Ensure compatibility: provide a top-level `frames` entry (legacy clients expect this)
    if (!animJson.frames) {
      if (animStates['idle'] && Array.isArray(animStates['idle'].frames) && animStates['idle'].frames.length > 0) {
        animJson.frames = animStates['idle'].frames;
      } else {
        const firstStateKey = Object.keys(animStates)[0];
        if (firstStateKey && animStates[firstStateKey] && Array.isArray(animStates[firstStateKey].frames)) {
          animJson.frames = animStates[firstStateKey].frames;
        } else {
          animJson.frames = [];
        }
      }
    }
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('gamebuilder-animations');
        bc.postMessage(animJson);
        bc.close();
      } else if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('gamebuilder:importAnimation', { detail: animJson }));
      }
      try { localStorage.setItem('gamebuilder.playerAnimation', JSON.stringify(animJson)); } catch (e) {}
      const kind = Object.keys(animStates).length > 1 ? 'multi-state' : 'single-state';
      setEditorMessage?.(`Exported ${kind} animation to GameBuilder`);
      setEditorMessage(`Exported ${kind} animation to GameBuilder`);
      setTimeout(() => setEditorMessage?.(''), 2000);
    } catch (err) {
      console.warn('Export failed', err);
      setEditorMessage?.('Export failed');
      setTimeout(() => setEditorMessage?.(''), 2000);
    }
  }
  
  const canvasRef = useRef(null);
  
  // Load sprite sheet and split into frames
  useEffect(() => {
    if (!sprite) return;
    
    const img = new Image();
    img.src = sprite.src;
    img.onload = () => {
      const frameCount = Math.floor(img.width / sprite.frameWidth);
      const newFrames = [];
      
      for (let i = 0; i < frameCount; i++) {
        const canvas = document.createElement('canvas');
        canvas.width = sprite.frameWidth;
        canvas.height = sprite.frameHeight;
        const ctx = canvas.getContext('2d');
        
        ctx.drawImage(
          img,
          i * sprite.frameWidth, 0,
          sprite.frameWidth, sprite.frameHeight,
          0, 0,
          sprite.frameWidth, sprite.frameHeight
        );
        
        newFrames.push({
          id: i,
          dataUrl: canvas.toDataURL(),
          selected: false
        });
      }
      
      setFrames(newFrames);
    };
  }, [sprite]);

  // Persist simple state edits per-sprite so users don't lose work
  useEffect(() => {
    try {
      if (!sprite || !sprite.id) return;
      const saved = localStorage.getItem('sprite-editor.states.' + sprite.id);
      if (saved) {
        const parsed = JSON.parse(saved);
        setStates(parsed);
      }
    } catch (e) {}
  }, [sprite]);

  useEffect(() => {
    try {
      if (!sprite || !sprite.id) return;
      localStorage.setItem('sprite-editor.states.' + sprite.id, JSON.stringify(states));
    } catch (e) {}
  }, [states, sprite]);
  
  // Animation preview
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentFrame(prev => (prev + 1) % frames.length);
    }, animationSpeed);
    
    return () => clearInterval(interval);
  }, [isPlaying, animationSpeed, frames.length]);

  // helper to evaluate a transition condition (same semantics as GameBuilder eval)
  const evaluateConditionLocal = (cond, input, gState) => {
    if (!cond) return false;
    if (typeof cond === 'boolean') return cond;
    if (typeof cond === 'string' && cond === 'always') return true;
    if (Array.isArray(cond)) return cond.some(c => evaluateConditionLocal(c, input, gState));
    if (typeof cond === 'object') {
      if (cond.always) return true;
      if (typeof cond.minHorizontal === 'number') return Math.abs(input.horizontal || 0) >= cond.minHorizontal;
      if (typeof cond.maxHorizontal === 'number') return Math.abs(input.horizontal || 0) <= cond.maxHorizontal;
      if (typeof cond.jumpPressed === 'boolean') return !!input.jumpPressed === !!cond.jumpPressed;
      if (typeof cond.isGrounded === 'boolean') return !!gState.onGround === !!cond.isGrounded;
      if (typeof cond.velocityYLessThan === 'number') return (gState.playerVel?.y || 0) < cond.velocityYLessThan;
      if (typeof cond.velocityYGreaterThan === 'number') return (gState.playerVel?.y || 0) > cond.velocityYGreaterThan;
      if (typeof cond.property === 'string' && typeof cond.op === 'string') {
        const val = (gState[cond.property] !== undefined) ? gState[cond.property] : (input[cond.property] !== undefined ? input[cond.property] : null);
        if (val === null) return false;
        switch (cond.op) {
          case 'eq': return val === cond.value;
          case 'ne': return val !== cond.value;
          case 'lt': return val < cond.value;
          case 'gt': return val > cond.value;
          case 'lte': return val <= cond.value;
          case 'gte': return val >= cond.value;
        }
      }
    }
    return false;
  }

  // Preview state frames when editingState is selected
  useEffect(() => {
    // Reset preview when editing state changes
    setStatePreviewFrame(0);
    setStatePreviewPlaying(false);
  }, [editingState]);

  useEffect(() => {
    if (!editingState) return;
    if (!statePreviewPlaying) return;
    const s = states[editingState];
    if (!s || !s.frames || s.frames.length === 0) return;
    const dur = s.frameDuration || animationSpeed || 100;
    const id = setInterval(() => {
      setStatePreviewFrame(f => (f + 1) % s.frames.length);
    }, dur);
    return () => clearInterval(id);
  }, [statePreviewPlaying, editingState, states, animationSpeed]);

  // Reset preview frame if frames change in the editing state
  useEffect(() => {
    if (!editingState) return;
    setStatePreviewFrame(0);
  }, [editingState, (states[editingState] && states[editingState].frames && states[editingState].frames.length) ? states[editingState].frames.length : 0]);
  
  // Draw current frame
  useEffect(() => {
    if (!canvasRef.current || frames.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const img = new Image();
    img.src = frames[currentFrame].dataUrl;
    img.onload = () => {
      // Draw at actual frame size (centered if canvas is larger)
      const x = (canvas.width - img.width) / 2;
      const y = (canvas.height - img.height) / 2;
      ctx.drawImage(img, x, y, img.width, img.height);
    };
  }, [currentFrame, frames]);
  
  function createAnimation() {
    const selectedFrames = frames.filter(f => f.selected).map(f => f.id);
    
    if (selectedFrames.length === 0) {
      alert('Select frames first');
      return;
    }
    
    const animationName = prompt('Animation name:');
    if (!animationName) return;
    
    let animation;
    if (Object.keys(states).length === 0) {
      animation = {
        name: animationName,
        frames: selectedFrames,
        speed: animationSpeed,
        loop: true
      };
    } else {
      // Bake authoring states into exported animation
      animation = {
        name: animationName,
        states: { ...states }
      };
    }
    // Provide frames top-level for compatibility (use idle/default state's frames if possible)
    if (!animation.frames) {
      if (animation.states && animation.states.idle && Array.isArray(animation.states.idle.frames)) {
        animation.frames = animation.states.idle.frames;
      } else if (animation.states) {
        const k = Object.keys(animation.states)[0];
        animation.frames = (k && animation.states[k] && Array.isArray(animation.states[k].frames)) ? animation.states[k].frames : [];
      }
    }
    onSave(animation);
  }
  
  function toggleFrameSelection(frameId) {
    setFrames(prevFrames => prevFrames.map(f => 
      f.id === frameId ? { ...f, selected: !f.selected } : f
    ));
  }
  
  function selectAllFrames() {
    setFrames(prevFrames => prevFrames.map(f => ({ ...f, selected: true })));
  }
  
  function clearSelection() {
    setFrames(prevFrames => prevFrames.map(f => ({ ...f, selected: false })));
  }
  
  // Reserved for future multi-select functionality
  // function selectRange(startId, endId) {
  //   const start = Math.min(startId, endId);
  //   const end = Math.max(startId, endId);
  //   setFrames(frames.map(f => ({
  //     ...f,
  //     selected: f.id >= start && f.id <= end ? true : f.selected
  //   })));
  // }
  
  if (!sprite) {
    return (
      <div className="bg-gray-800 p-4 rounded-lg text-center">
        <p className="text-gray-400">No sprite selected</p>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-800 p-3 sm:p-4 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-3 sm:mb-4">
        <h3 className="text-base sm:text-lg font-bold">Sprite Editor</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="px-2 sm:px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
          >
            Close
          </button>
        )}
      </div>
      {editorMessage && (
        <div className="mb-2 text-sm text-yellow-300">{editorMessage}</div>
      )}
      
      {/* Preview */}
      <div className="mb-3 sm:mb-4">
        <div className="flex items-center justify-center bg-gray-900 border border-gray-600 rounded p-2 sm:p-4 min-h-[150px] sm:min-h-[200px]">
          <canvas
            ref={canvasRef}
            width={Math.min(sprite?.frameWidth || 128, 400)}
            height={Math.min(sprite?.frameHeight || 128, 400)}
            className="image-rendering-pixelated border border-gray-700 max-w-full"
            style={{ 
              imageRendering: 'pixelated'
            }}
          />
        </div>
        
        <div className="flex gap-1 sm:gap-2 mt-2 flex-wrap">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors text-sm sm:text-base"
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
          
          <button
            onClick={() => setCurrentFrame((prev) => (prev - 1 + frames.length) % frames.length)}
            className="px-3 sm:px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors disabled:opacity-50 text-sm sm:text-base"
            disabled={frames.length === 0}
          >
            ⏮ <span className="hidden sm:inline">Prev</span>
          </button>
          
          <button
            onClick={() => setCurrentFrame((prev) => (prev + 1) % frames.length)}
            className="px-3 sm:px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors disabled:opacity-50 text-sm sm:text-base"
            disabled={frames.length === 0}
          >
            ⏭ <span className="hidden sm:inline">Next</span>
          </button>
          
          <label className="flex-1 sm:flex-none flex items-center gap-2 bg-gray-700 px-2 sm:px-3 py-2 rounded text-xs sm:text-sm">
            <span className="hidden sm:inline">Speed:</span>
            <input
              type="range"
              min="50"
              max="500"
              value={animationSpeed}
              onChange={(e) => setAnimationSpeed(Number(e.target.value))}
              className="w-20 sm:w-32 flex-1"
            />
            <span className="font-mono whitespace-nowrap">{animationSpeed}ms</span>
          </label>
        </div>
      </div>
      
      {/* Frame Timeline */}
      <div className="mb-3 sm:mb-4">
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-xs sm:text-sm font-semibold">Frames ({frames.length})</h4>
          <div className="flex gap-1 sm:gap-2">
            <button
              onClick={selectAllFrames}
              className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            >
              <span className="hidden sm:inline">Select </span>All
            </button>
            <button
              onClick={clearSelection}
              className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            >
              Clear
            </button>
          </div>
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2 bg-gray-900 p-2 rounded border border-gray-700">
          {frames.length === 0 ? (
            <p className="text-gray-500 text-sm">Loading frames...</p>
          ) : (
            frames.map(frame => (
              <div
                key={frame.id}
                onClick={() => toggleFrameSelection(frame.id)}
                onTouchStart={(e) => { e.preventDefault(); toggleFrameSelection(frame.id); }}
                className={`flex-shrink-0 cursor-pointer border-2 rounded overflow-hidden transition-all ${
                  frame.selected ? 'border-blue-500 shadow-lg shadow-blue-500/50' : 'border-gray-600'
                } ${currentFrame === frame.id ? 'ring-2 ring-yellow-500' : ''}`}
              >
                <div className="w-16 h-16 flex items-center justify-center bg-gray-800 overflow-hidden">
                  <NextImage
                    src={frame.dataUrl}
                    alt={`Frame ${frame.id}`}
                    width={64}
                    height={64}
                    unoptimized
                    style={{ 
                      imageRendering: 'pixelated',
                      maxWidth: '64px',
                      maxHeight: '64px',
                      width: 'auto',
                      height: 'auto'
                    }}
                  />
                </div>
                <div className={`text-xs text-center py-1 ${
                  frame.selected ? 'bg-blue-600' : 'bg-gray-700'
                }`}>
                  {frame.id}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Animation Creation */}
      <div className="bg-gray-900 p-3 rounded border border-gray-700">
        <h4 className="text-xs sm:text-sm font-semibold mb-2">Create Animation</h4>
        <p className="text-xs text-gray-400 mb-3">
          Select frames and click Create Animation to define a new animation sequence
        </p>
        
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <button
            onClick={createAnimation}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded transition-colors font-semibold text-sm sm:text-base"
          >
            ✨ Create Animation
          </button>
          <button
            onClick={() => exportToGameBuilder('exported')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors font-semibold text-sm sm:text-base"
          >
            ⤴ Export to GameBuilder
          </button>
          
          <div className="text-xs text-gray-400 flex items-center justify-center sm:justify-start">
            {frames.filter(f => f.selected).length} frame(s) selected
          </div>
        </div>
        <div className="text-[11px] text-gray-400 mt-2">
          Export Mode: <span className="text-sm text-gray-200 font-semibold">{Object.keys(states).length > 0 ? 'multi-state' : 'single-state'}</span>
        </div>
      </div>

      {/* Multi-state management */}
      <div className="bg-gray-900 p-3 rounded border border-gray-700 mt-4">
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-xs sm:text-sm font-semibold">States & Transitions</h4>
          <div className="text-xs text-gray-400">Define multiple named states and transitions</div>
        </div>
                <div className="flex gap-2 mb-2">
          <input id="new-state-name" placeholder="state name (e.g., idle)" className="px-2 py-1 text-sm rounded bg-gray-700" />
          <button
            onClick={() => {
              const name = document.getElementById('new-state-name')?.value?.trim();
              if (!name) { setEditorMessage('Set a state name'); setTimeout(() => setEditorMessage(''), 1500); return; }
              if (states[name]) { setEditorMessage('State exists'); setTimeout(() => setEditorMessage(''), 1500); return; }
              setStates(prev => ({ ...prev, [name]: { frames: [], frameDuration: animationSpeed, loop: true, transitions: {} } }));
              document.getElementById('new-state-name').value = '';
            }}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
          >Add State</button>
        </div>
        <div className="flex gap-4">
          <div className="w-1/3">
            <div className="text-xs text-gray-300 mb-2">States</div>
            <div className="bg-gray-800 border border-gray-700 p-2 rounded max-h-40 overflow-y-auto">
              {Object.keys(states).length === 0 ? <div className="text-gray-400 text-xs">No states defined</div> : Object.keys(states).map(name => (
                <div key={name} className={`flex justify-between items-center gap-2 p-1 rounded hover:bg-gray-700 ${editingState === name ? 'bg-gray-700' : ''}`}>
                  <div className="text-xs truncate">{name} <span className="text-[10px] text-gray-400">({states[name].frames.length})</span></div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditingState(name)} className="text-xs px-2 py-1 bg-gray-600 rounded">Edit</button>
                    <button onClick={() => { 
                      setStates(prev => { 
                        const copy = { ...prev }; 
                        // delete the state
                        delete copy[name]; 
                        // remove transitions from other states that reference this state
                        Object.keys(copy).forEach(s => {
                          if (copy[s].transitions && copy[s].transitions[name]) {
                            const tcopy = { ...copy[s].transitions };
                            delete tcopy[name];
                            copy[s] = { ...copy[s], transitions: tcopy };
                          }
                        });
                        return copy; 
                      }); 
                      if (editingState === name) setEditingState(null); 
                    }} className="text-xs px-2 py-1 bg-red-600 rounded">Del</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

                  <div className="flex-1">
            <div className="text-xs text-gray-300 mb-2">State Editor</div>
                {editingState ? (
              <div className="bg-gray-800 p-2 border border-gray-700 rounded">
                  <div className="flex items-center gap-2 mb-2">
                  <div className="text-sm font-semibold">Editing: {editingState}</div>
                  <button onClick={() => { setStates(prev => ({ ...prev, [editingState]: { ...prev[editingState], frames: frames.filter(f => f.selected).map(fr => fr.dataUrl) } })); setEditorMessage('Assigned selected frames'); setTimeout(() => setEditorMessage(''), 1500); }} className="text-xs px-2 py-1 bg-cyan-600 rounded">Assign selected frames</button>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <label className="text-xs">Frame Duration</label>
                  <input type="number" className="px-2 py-1 bg-gray-700 rounded text-sm" defaultValue={states[editingState]?.frameDuration || animationSpeed} onBlur={(e) => { const val = Number(e.target.value) || animationSpeed; setStates(prev => ({ ...prev, [editingState]: { ...prev[editingState], frameDuration: val } })); }} />
                  <label className="text-xs flex items-center gap-2"><input type="checkbox" defaultChecked={states[editingState]?.loop} onChange={(e) => { setStates(prev => ({ ...prev, [editingState]: { ...prev[editingState], loop: !!e.target.checked } })); }} /> Loop</label>
                </div>
                <div className="mb-2 text-xs text-gray-400">Assigned Frames ({states[editingState].frames.length})</div>
                <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
                  {states[editingState].frames.map((url, idx) => (
                    <div key={idx} className="w-12 h-12 bg-gray-900 flex items-center justify-center border border-gray-700 rounded">
                      <img src={url} alt={`f${idx}`} style={{ width: 32, height: 32, imageRendering: 'pixelated' }} />
                    </div>
                  ))}
                </div>
                <div className="text-xs text-gray-300 font-semibold mb-1">Transitions</div>
                {(() => {
                  const invalid = Object.keys(states[editingState].transitions || {}).filter(t => !states[t]);
                  if (invalid.length > 0) {
                    return (
                      <div className="text-xs text-red-400 mb-2">Warning: transitions reference missing states: {invalid.join(', ')}</div>
                    );
                  }
                  return null;
                })()}
                <div className="mb-2">
                  {states[editingState].transitions && Object.keys(states[editingState].transitions).length > 0 ?
                    Object.entries(states[editingState].transitions).map(([tgt, cond]) => {
                      const active = evaluateConditionLocal(cond, testInput, { onGround: testInput.isGrounded, playerVel: { y: testInput.velocityY } });
                      return (
                        <div key={tgt} className="flex items-center justify-between gap-2 mb-1 text-xs bg-gray-700 p-1 rounded">
                          <div>
                            {tgt} <span className="text-gray-400">({JSON.stringify(cond)})</span>
                            {!states[tgt] && <span className="ml-2 text-red-400">(Invalid target)</span>}
                            {active && <span className="ml-2 text-cyan-300">(Active)</span>}
                          </div>
                          <div className="flex gap-1">
                            <button className="px-2 py-0.5 text-xs bg-red-600 rounded"
                              onClick={() => {
                                const copy = { ...states };
                                if (copy[editingState] && copy[editingState].transitions) {
                                  const t = { ...copy[editingState].transitions };
                                  delete t[tgt];
                                  copy[editingState] = { ...copy[editingState], transitions: t };
                                }
                                setStates(copy);
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      );
                    }) : <div className="text-gray-500 text-xs">No transitions</div>}
                </div>
                {/* Preview controls for state */}
                <div className="mt-3 mb-2">
                  <div className="flex items-center gap-2 mb-2">
                    <button onClick={() => setStatePreviewPlaying(p => !p)} className={`px-2 py-1 rounded ${statePreviewPlaying ? 'bg-red-600' : 'bg-blue-600'}`}>{statePreviewPlaying ? 'Stop' : 'Play'} Preview</button>
                    <button onClick={() => setStatePreviewFrame(f => Math.max(0, f - 1))} className="px-2 py-1 bg-gray-700 rounded">Prev</button>
                    <button onClick={() => setStatePreviewFrame(f => f + 1)} className="px-2 py-1 bg-gray-700 rounded">Next</button>
                    <div className="text-xs text-gray-400">Frame: {statePreviewFrame + 1} / {states[editingState].frames.length}</div>
                  </div>
                  <div className="w-24 h-24 bg-gray-900 border border-gray-700 rounded flex items-center justify-center">
                    {states[editingState].frames && states[editingState].frames.length > 0 ? (
                      <img src={states[editingState].frames[statePreviewFrame % states[editingState].frames.length]} alt={`preview${statePreviewFrame}`} style={{ width: 48, height: 48, imageRendering: 'pixelated' }} />
                    ) : <div className="text-xs text-gray-500">No frames</div>}
                  </div>
                </div>
                {/* Transition Simulation */}
                <div className="mt-3 p-2 bg-gray-900 rounded border border-gray-700">
                  <div className="text-xs text-gray-300 font-semibold mb-2">Transition Simulation</div>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-xs">Horizontal:</label>
                    <input type="range" min="-1" max="1" step="0.1" value={testInput.horizontal} onChange={(e) => setTestInput(t => ({ ...t, horizontal: Number(e.target.value) }))} />
                    <div className="text-xs">{testInput.horizontal}</div>
                    <label className="flex items-center gap-1 text-xs ml-2"><input type="checkbox" checked={testInput.isGrounded} onChange={(e) => setTestInput(t => ({ ...t, isGrounded: !!e.target.checked }))} /> Grounded</label>
                    <label className="flex items-center gap-1 text-xs ml-2"><input type="checkbox" checked={testInput.jumpPressed} onChange={(e) => setTestInput(t => ({ ...t, jumpPressed: !!e.target.checked }))} /> Jump</label>
                  </div>
                  <div className="text-xs text-gray-400 mb-2">Active Transitions: {
                    (() => {
                      const act = Object.entries(states[editingState].transitions || {}).filter(([tgt, cond]) => evaluateConditionLocal(cond, testInput, { onGround: testInput.isGrounded, playerVel: { y: testInput.velocityY } } )).map(([tgt]) => tgt);
                      if (act.length === 0) return 'None';
                      return act.join(', ');
                    })()
                  }</div>
                </div>
                <div className="flex gap-2 items-center">
                  <select value={transitionDraft.target} onChange={(e) => setTransitionDraft(d => ({ ...d, target: e.target.value }))} className="px-2 py-1 bg-gray-700 rounded text-sm">
                    <option value="">Select target</option>
                    {Object.keys(states).filter(s => s !== editingState).map(s => (<option key={s} value={s}>{s}</option>))}
                  </select>
                  <select value={transitionDraft.condition} onChange={(e) => setTransitionDraft(d => ({ ...d, condition: e.target.value }))} className="px-2 py-1 bg-gray-700 rounded text-sm">
                    <option value="always">always</option>
                    <option value="minHorizontal:0.2">minHorizontal &gt;= 0.2</option>
                    <option value="isGrounded:true">isGrounded</option>
                    <option value="jumpPressed:true">jumpPressed</option>
                  </select>
                  <button className="px-2 py-1 bg-blue-600 rounded text-xs" onClick={() => {
                    if (!transitionDraft.target) { setEditorMessage('Pick target'); setTimeout(() => setEditorMessage(''), 1500); return; }
                    setStates(prev => ({
                      ...prev,
                      [editingState]: {
                        ...prev[editingState],
                        transitions: {
                          ...(prev[editingState].transitions || {}),
                          [transitionDraft.target]: (transitionDraft.condition === 'always' ? true : (transitionDraft.condition.startsWith('minHorizontal:') ? { minHorizontal: Number(transitionDraft.condition.split(':')[1]) } : (transitionDraft.condition === 'isGrounded:true' ? { isGrounded: true } : { jumpPressed: true })))
                        }
                      }
                    }));
                    setTransitionDraft({ target: '', condition: 'always' });
                  }}>Add</button>
                  <button className="px-2 py-1 bg-green-600 rounded text-xs" onClick={() => {
                    // Export single state to GameBuilder by building small JSON
                    const anim = { name: `${editingState}-export`, states: { [editingState]: { frames: states[editingState].frames || [], frameDuration: states[editingState].frameDuration || animationSpeed, loop: !!states[editingState].loop, transitions: states[editingState].transitions || {} } } };
                    try {
                      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
                        const bc = new BroadcastChannel('gamebuilder-animations'); bc.postMessage(anim); bc.close();
                      } else if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('gamebuilder:importAnimation', { detail: anim }));
                      }
                      try { localStorage.setItem('gamebuilder.playerAnimation', JSON.stringify(anim)); } catch (e) {}
                      setEditorMessage('Exported state to GameBuilder'); setTimeout(() => setEditorMessage(''), 1500);
                    } catch (err) { console.warn('state export failed', err); setEditorMessage('Export failed'); setTimeout(() => setEditorMessage(''), 1200); }
                  }}>Export State</button>
                </div>
              </div>
            ) : (
              <div className="text-gray-400 text-xs">Select a state to edit</div>
            )}
          </div>
        </div>
      </div>
      
      {/* Info Section */}
      <div className="mt-4 text-xs text-gray-500 space-y-1">
        <p>💡 <strong>Tip:</strong> Click frames to select/deselect them for your animation</p>
        <p>💡 <strong>Tip:</strong> Use the preview controls to test your animation</p>
        <p>💡 <strong>Tip:</strong> Adjust speed slider to find the perfect timing</p>
      </div>
    </div>
  );
}

export default SpriteEditor;
