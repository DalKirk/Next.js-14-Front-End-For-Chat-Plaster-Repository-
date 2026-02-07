// components/AnimationEditor/AnimationEditor.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Play, Square } from 'lucide-react';

const AnimationEditor = ({ config, assets, onChange }) => {
  const [selectedAnim, setSelectedAnim] = useState(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewFrame, setPreviewFrame]     = useState(0);
  const previewTimerRef = useRef(null);
  const canvasRef       = useRef(null);
  const imgRef          = useRef(null);

  const asset = assets.find(a => a.id === config.spriteSheetAssetId);
  const defs  = config.animationDefs || {};
  const fw    = config.frameWidth;
  const fh    = config.frameHeight;

  // Load the sprite sheet image for preview rendering
  useEffect(() => {
    if (!asset) return;
    const img = new Image();
    img.onload = () => { imgRef.current = img; drawSheet(); };
    img.src = asset.base64 || asset.url;
  }, [asset?.id]);

  // Recalculate grid when frame size changes
  useEffect(() => { drawSheet(); }, [fw, fh, selectedAnim, defs]);

  // Preview animation playback
  useEffect(() => {
    if (!previewPlaying || !selectedAnim || !defs[selectedAnim]) {
      clearInterval(previewTimerRef.current);
      return;
    }
    const anim = defs[selectedAnim];
    const speed = anim.speed || 150;
    previewTimerRef.current = setInterval(() => {
      setPreviewFrame(prev => {
        const next = prev + 1;
        if (next >= anim.frames.length) return anim.loop !== false ? 0 : prev;
        return next;
      });
    }, speed);
    return () => clearInterval(previewTimerRef.current);
  }, [previewPlaying, selectedAnim, defs]);

  // ── Sheet grid drawing ──
  const drawSheet = () => {
    const canvas = canvasRef.current;
    const img   = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    canvas.width  = img.width;
    canvas.height = img.height;

    // Draw the image (pixelated for pixel art)
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0);

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= img.width; x += fw) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, img.height); ctx.stroke();
    }
    for (let y = 0; y <= img.height; y += fh) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(img.width, y); ctx.stroke();
    }

    // Highlight frames that belong to the selected animation
    if (selectedAnim && defs[selectedAnim]) {
      const anim = defs[selectedAnim];
      const cols = Math.floor(img.width / fw);

      anim.frames.forEach((frameIdx, i) => {
        const col = frameIdx % cols;
        const row = Math.floor(frameIdx / cols);
        // Highlight color
        ctx.fillStyle = 'rgba(139, 92, 246, 0.35)';
        ctx.fillRect(col * fw, row * fh, fw, fh);
        // Frame order number
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.min(fw * 0.3, 12)}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(i), col * fw + fw / 2, row * fh + fh / 2);
      });
    }
  };

  // ── Click a frame on the sheet ──
  const handleSheetClick = (e) => {
    if (!asset || !selectedAnim) return;
    const canvas = canvasRef.current;
    const rect   = canvas.getBoundingClientRect();
    // Scale click coords from CSS size to canvas pixel size
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top)  * scaleY;

    const col = Math.floor(px / fw);
    const row = Math.floor(py / fh);
    const cols = Math.floor(asset.width / fw);
    const frameIdx = row * cols + col;

    // Bounds check
    if (col >= cols || row >= Math.floor(asset.height / fh)) return;

    const anim = { ...defs[selectedAnim] };
    // Toggle: if already in frames, remove it. If not, add it.
    const existing = anim.frames.indexOf(frameIdx);
    if (existing !== -1) {
      anim.frames = anim.frames.filter((_, i) => i !== existing);
    } else {
      anim.frames = [...anim.frames, frameIdx];
    }

    onChange({ ...config, animationDefs: { ...defs, [selectedAnim]: anim } });
    setPreviewFrame(0);
  };

  // ── Animation CRUD ──
  const addAnimation = () => {
    const name = `anim_${Object.keys(defs).length}`;
    onChange({
      ...config,
      animationDefs: { ...defs, [name]: { frames: [], speed: 150, loop: true } }
    });
    setSelectedAnim(name);
  };

  const deleteAnimation = (name) => {
    const newDefs = { ...defs };
    delete newDefs[name];
    onChange({ ...config, animationDefs: newDefs });
    if (selectedAnim === name) setSelectedAnim(Object.keys(newDefs)[0] || null);
  };

  const renameAnimation = (oldName, newName) => {
    if (!newName || newName === oldName || defs[newName]) return;
    const newDefs = {};
    Object.keys(defs).forEach(k => {
      newDefs[k === oldName ? newName : k] = defs[k];
    });
    onChange({ ...config, animationDefs: newDefs });
    if (selectedAnim === oldName) setSelectedAnim(newName);
  };

  const updateAnimProp = (key, value) => {
    if (!selectedAnim) return;
    onChange({
      ...config,
      animationDefs: {
        ...defs,
        [selectedAnim]: { ...defs[selectedAnim], [key]: value }
      }
    });
  };

  // ── Reorder a frame within the animation ──
  const moveFrame = (fromIdx, toIdx) => {
    if (!selectedAnim) return;
    const anim  = { ...defs[selectedAnim] };
    const frames = [...anim.frames];
    const [moved] = frames.splice(fromIdx, 1);
    frames.splice(toIdx, 0, moved);
    anim.frames = frames;
    onChange({ ...config, animationDefs: { ...defs, [selectedAnim]: anim } });
  };

  const currentAnim = selectedAnim ? defs[selectedAnim] : null;

  return (
    <div className="space-y-3">

      {/* Animation list + add */}
      <div className="flex gap-1.5 flex-wrap">
        {Object.keys(defs).map(name => (
          <button
            key={name}
            onClick={() => { setSelectedAnim(name); setPreviewPlaying(false); setPreviewFrame(0); }}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              selectedAnim === name
                ? 'border-purple-500 bg-purple-900/30 text-purple-300'
                : 'border-zinc-600 bg-zinc-800 text-zinc-400 hover:border-zinc-500'
            }`}
          >
            {name}
          </button>
        ))}
        <button
          onClick={addAnimation}
          className="text-xs px-2 py-1 rounded-full border border-dashed border-zinc-600
                     text-zinc-500 hover:border-purple-500 hover:text-purple-400 transition-colors"
        >
          <Plus size={12} className="inline" /> Add
        </button>
      </div>

      {/* Selected animation controls */}
      {selectedAnim && currentAnim && (
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 space-y-2.5">

          {/* Name + delete row */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={selectedAnim}
              onChange={(e) => renameAnimation(selectedAnim, e.target.value)}
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1
                         text-xs text-white font-semibold focus:outline-none focus:border-purple-500"
            />
            <button onClick={() => deleteAnimation(selectedAnim)}
              className="text-zinc-500 hover:text-red-400 transition-colors">
              <Trash2 size={14} />
            </button>
          </div>

          {/* Speed + Loop */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-zinc-500 block mb-0.5">Speed (ms/frame)</label>
              <input type="number" min="30" max="2000" step="10" value={currentAnim.speed || 150}
                onChange={(e) => updateAnimProp('speed', Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1
                           text-xs text-white focus:outline-none focus:border-purple-500" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-zinc-500 block mb-0.5">Loop</label>
              <select value={currentAnim.loop !== false ? 'true' : 'false'}
                onChange={(e) => updateAnimProp('loop', e.target.value === 'true')}
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1
                           text-xs text-white focus:outline-none focus:border-purple-500">
                <option value="true">Yes — loops back to start</option>
                <option value="false">No — holds last frame</option>
              </select>
            </div>
          </div>

          {/* Frame order strip + preview */}
          <div className="flex gap-3 items-start">
            {/* Frame order */}
            <div className="flex-1">
              <label className="text-xs text-zinc-500 block mb-1">Frame Order</label>
              <div className="flex gap-1 flex-wrap min-h-8">
                {currentAnim.frames.map((frameIdx, i) => {
                  const cols = asset ? Math.floor(asset.width / fw) : 1;
                  const col  = frameIdx % cols;
                  const row  = Math.floor(frameIdx / cols);
                  return (
                    <div key={`${frameIdx}-${i}`} className="relative group">
                      <div className="w-8 h-8 bg-zinc-900 border border-zinc-600 rounded overflow-hidden
                                      flex items-center justify-center text-xs text-zinc-500">
                        {frameIdx}
                      </div>
                      {/* Reorder arrows (appear on hover) */}
                      <div className="absolute -top-4 left-0 right-0 flex justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {i > 0 && (
                          <button onClick={() => moveFrame(i, i - 1)}
                            className="text-zinc-400 hover:text-white text-xs leading-none">◀</button>
                        )}
                        {i < currentAnim.frames.length - 1 && (
                          <button onClick={() => moveFrame(i, i + 1)}
                            className="text-zinc-400 hover:text-white text-xs leading-none">▶</button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {currentAnim.frames.length === 0 && (
                  <span className="text-xs text-zinc-600 italic">Click frames on the sheet below</span>
                )}
              </div>
            </div>

            {/* Preview */}
            <div className="flex-shrink-0 w-24">
              <label className="text-xs text-zinc-500 block mb-1">Preview</label>
              <div className="w-24 h-24 bg-zinc-900 border border-zinc-700 rounded flex items-center justify-center">
                {asset && currentAnim.frames.length > 0 && (
                  <PreviewFrame
                    asset={asset}
                    frameIdx={currentAnim.frames[previewFrame] || 0}
                    fw={fw} fh={fh}
                  />
                )}
              </div>
              <button
                onClick={() => { setPreviewPlaying(!previewPlaying); setPreviewFrame(0); }}
                className="mt-1 w-full flex items-center justify-center gap-1 text-xs
                           text-zinc-400 hover:text-white transition-colors"
              >
                {previewPlaying ? <><Square size={10} /> Stop</> : <><Play size={10} /> Play</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sprite sheet grid (click to add/remove frames) */}
      {asset && (
        <div>
          <label className="text-xs text-zinc-500 block mb-1">
            Sprite Sheet — click frames to add/remove from "{selectedAnim || '...'}"
          </label>
          <div className="border border-zinc-700 rounded overflow-hidden bg-zinc-900"
               style={{ maxHeight: 260, overflowY: 'auto' }}>
            <canvas
              ref={canvasRef}
              onClick={handleSheetClick}
              className="cursor-crosshair"
              style={{ imageRendering: 'pixelated', maxWidth: '100%' }}
            />
          </div>
        </div>
      )}

      {!asset && (
        <p className="text-xs text-zinc-600 italic">
          Set a Sprite Sheet asset above to start defining animations.
        </p>
      )}
    </div>
  );
};

// ─── Sub-component: renders one frame from the sheet as an <img> crop ──
const PreviewFrame = ({ asset, frameIdx, fw, fh }) => {
  const cols = Math.floor(asset.width / fw);
  const col  = frameIdx % cols;
  const row  = Math.floor(frameIdx / cols);
  const src = asset.base64 || asset.url;

  return (
    <img
      src={src}
      alt="preview"
      style={{
        imageRendering: 'pixelated',
        // Crop via negative object-position + fixed size
        objectFit: 'none',
        objectPosition: `-${col * fw * (96 / fw)}px -${row * fh * (96 / fh)}px`,
        width:  96 * (fw / fw),  // scale to fit the preview box
        height: 96 * (fh / fh),
        transform: `scale(${Math.min(88 / fw, 88 / fh)})`,
        transformOrigin: 'top left'
      }}
    />
  );
};

export default AnimationEditor;
