# Pluto Animated Sprites — Complete Implementation

## What Changed and Why

The original `SpriteAnimator` was a self-contained class: it loaded its own image, drew to a Canvas2D context, and managed its own state. That worked when Pluto had one player on one canvas. It doesn't work now because:

**Canvas2D → PixiJS.** The engine renders via PixiJS containers and sprites. Anything drawn with `ctx.drawImage` is invisible to the layer system, doesn't move with the camera, and can't receive filters. The animator needs to own a `PIXI.Sprite` and swap its texture frame each tick — not draw to a context.

**Duplicate image loading.** `new Image()` loads the sprite sheet independently of the rest of the engine. `AssetManager` already loads, caches, and manages textures. The animator should get its texture from there.

**Entity-agnostic.** The original was implicitly "the player." The new version attaches to any entity via the Behavior system — player, enemy, NPC, boss — and its animation config is defined in the scene data so it round-trips through save/load.

**Editor-configurable animations.** Which frames belong to "walk," how fast they play, whether they loop — all of that needs to be editable in the UI, not hardcoded in JavaScript. The animation definitions live in SceneData and a new `AnimationEditor` panel lets users define them visually.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 AnimatedSpriteBehavior                    │
│  (registered in BehaviorRegistry, runs every frame)      │
│                                                          │
│   owns ──▶  SpriteAnimator                               │
│               │                                          │
│               │  reads texture from AssetManager         │
│               │  creates PIXI.Texture sub-regions        │
│               │  updates sprite.texture each frame       │
│               ▼                                          │
│            PIXI.Sprite  ──▶  LayerRenderer               │
│            (the actual       replaces the static         │
│             thing on screen) sprite that was there before│
└─────────────────────────────────────────────────────────┘

Data flow:
  SceneData (animation defs) ──▶ AnimatedSpriteBehavior.config
  AssetManager (cached texture) ──▶ SpriteAnimator.sheetTexture
  SpriteAnimator.currentFrame ──▶ sprite.texture = sub-texture
  Other behaviors (e.g. PlatformCharacter) ──▶ animator.setAnimation('run')
```

---

## File Structure

```
src/
  systems/
    sprites/
      SpriteAnimator.js            ← The animation engine (rewritten)
      AnimatedSpriteBehavior.js    ← Behavior wrapper
      index.js
  components/
    AnimationEditor/
      AnimationEditor.jsx          ← UI: define animations from a sprite sheet
      index.js
  systems/
    behaviors/
      BehaviorRegistry.js          ← PATCH: add the new behavior entry
    scenes/
      LayerRenderer.js             ← PATCH: skip static sprite for animated entities
      SceneData.js                 ← PATCH: add animationDefs to entity schema
```

---

## 1. SpriteAnimator.js — The Animation Engine

This is your original class, rewritten. Same core logic (frame timer, loop/hold, animation switching). Different rendering layer: it works with PixiJS textures and exposes its current frame as a texture the caller can put on any sprite.

```javascript
// src/systems/sprites/SpriteAnimator.js
import * as PIXI from 'pixi.js';

export class SpriteAnimator {
  /**
   * @param {PIXI.Texture} sheetTexture   – the full sprite sheet, from AssetManager
   * @param {object}       sheetAsset     – the asset definition (has .width, .height)
   * @param {object}       config         – { frameWidth, frameHeight, animations, defaultAnimation }
   *
   * config.animations shape:
   *   {
   *     idle:   { frames: [0, 1, 2],    speed: 200, loop: true  },
   *     walk:   { frames: [3, 4, 5, 6], speed: 100, loop: true  },
   *     jump:   { frames: [7, 8],       speed: 150, loop: false },
   *     hurt:   { frames: [9],          speed: 100, loop: false },
   *     attack: { frames: [10,11,12],   speed: 80,  loop: false }
   *   }
   *
   * frames[] are linear indices into the sheet grid (row-major, 0-based).
   * Frame 0 = top-left tile. Frame 1 = one tile to the right. Etc.
   */
  constructor(sheetTexture, sheetAsset, config) {
    this.sheetTexture = sheetTexture;   // PIXI.Texture (the full sheet)
    this.sheetAsset   = sheetAsset;     // { width, height } of the image
    this.frameWidth   = config.frameWidth;
    this.frameHeight  = config.frameHeight;
    this.animations   = config.animations || {};

    // How many columns in the sheet (for converting linear index → col/row)
    this.cols = Math.floor(sheetAsset.width / this.frameWidth);

    // ── Animation state ──
    this.currentAnimation = config.defaultAnimation || 'idle';
    this.currentFrameIndex = 0;   // index INTO the current animation's frames array
    this.frameTimer = 0;

    // ── Directional flip ──
    this.facingRight = true;

    // ── Build the sub-texture for each frame index on the sheet ──
    // We pre-compute these once. Each is a PIXI.Texture that crops the
    // sheet to exactly one frame. Swapping sprite.texture to one of these
    // is a single property assignment — zero draw calls, zero allocation.
    this._framTextures = this._buildFrameTextures();

    // ── Completion callback (set externally if needed) ──
    this.onAnimationComplete = null;
  }

  // ─── Pre-compute one sub-texture per frame on the sheet ──────────
  _buildFrameTextures() {
    const textures = [];
    const totalFrames = this.cols * Math.floor(this.sheetAsset.height / this.frameHeight);

    for (let i = 0; i < totalFrames; i++) {
      const col = i % this.cols;
      const row = Math.floor(i / this.cols);

      // PIXI.Texture.from() with a Rectangle crops the base texture.
      // All sub-textures share the same BaseTexture — no extra GPU memory.
      const rect = new PIXI.Rectangle(
        col * this.frameWidth,
        row * this.frameHeight,
        this.frameWidth,
        this.frameHeight
      );
      textures.push(new PIXI.Texture({ source: this.sheetTexture.baseTexture, frame: rect }));
    }

    return textures;
  }

  // ─── Animation switching ─────────────────────────────────────────

  /**
   * Switch to a named animation. If it's already playing, does nothing
   * (no restart). Call with { force: true } to restart it.
   */
  setAnimation(name, options = {}) {
    if (!this.animations[name]) {
      console.warn(`SpriteAnimator: animation "${name}" not defined`);
      return;
    }

    if (this.currentAnimation === name && !options.force) return;

    this.currentAnimation  = name;
    this.currentFrameIndex = 0;
    this.frameTimer        = 0;
  }

  // ─── Per-frame update ────────────────────────────────────────────

  /**
   * Advance the animation. Call once per frame.
   * @param {number} deltaTime – milliseconds since last frame
   */
  update(deltaTime) {
    const anim = this.animations[this.currentAnimation];
    if (!anim || !anim.frames || anim.frames.length === 0) return;

    this.frameTimer += deltaTime;

    const frameDuration = anim.speed || 150; // ms per frame, default 150

    if (this.frameTimer >= frameDuration) {
      this.frameTimer -= frameDuration; // carry over remainder for consistent timing

      this.currentFrameIndex++;

      if (this.currentFrameIndex >= anim.frames.length) {
        if (anim.loop !== false) {
          // Loop back to start
          this.currentFrameIndex = 0;
        } else {
          // Hold on the last frame
          this.currentFrameIndex = anim.frames.length - 1;
          // Fire completion callback once
          if (this.onAnimationComplete) {
            this.onAnimationComplete(this.currentAnimation);
            this.onAnimationComplete = null; // one-shot
          }
        }
      }
    }
  }

  // ─── Current frame texture ───────────────────────────────────────
  // The behavior (or LayerRenderer) reads this each frame and sets it
  // on the PIXI.Sprite.

  get currentTexture() {
    const anim = this.animations[this.currentAnimation];
    if (!anim || !anim.frames || anim.frames.length === 0) {
      return this._framTextures[0] || null; // fallback to first frame
    }

    const sheetFrameIndex = anim.frames[this.currentFrameIndex];
    return this._framTextures[sheetFrameIndex] || this._framTextures[0];
  }

  // ─── Direction ───────────────────────────────────────────────────

  setDirection(facingRight) {
    this.facingRight = facingRight;
  }

  // ─── Queries ─────────────────────────────────────────────────────

  get isAnimationComplete() {
    const anim = this.animations[this.currentAnimation];
    if (!anim || anim.loop !== false) return false;
    return this.currentFrameIndex >= anim.frames.length - 1;
  }

  get currentAnimationName() {
    return this.currentAnimation;
  }
}
```

---

## 2. AnimatedSpriteBehavior.js — The Behavior Wrapper

This is what you attach to an entity in the editor. It owns a `SpriteAnimator`, calls `update()` every frame, writes the current texture onto the entity's sprite in the LayerRenderer, and exposes `setAnimation()` so other behaviors and event actions can trigger animations.

```javascript
// src/systems/sprites/AnimatedSpriteBehavior.js
import * as PIXI from 'pixi.js';
import { Behavior }       from '../behaviors/Behavior';
import { SpriteAnimator } from './SpriteAnimator';

export class AnimatedSpriteBehavior extends Behavior {
  static behaviorId = 'animatedSprite';

  // ── Config schema ──
  // These are the fields that appear in the Behavior inspector.
  // animationDefs is special: it's edited via the AnimationEditor, not
  // the auto-generated fields. We mark it type: 'animationEditor' so
  // BehaviorConfigs.jsx renders the custom component instead of a text input.
  static configSchema = [
    { key: 'spriteSheetAssetId',  label: 'Sprite Sheet',      type: 'asset',            default: null,    description: 'The uploaded sprite sheet image' },
    { key: 'frameWidth',          label: 'Frame Width',       type: 'number',           default: 32,      min: 8,   max: 512, step: 1 },
    { key: 'frameHeight',         label: 'Frame Height',      type: 'number',           default: 32,      min: 8,   max: 512, step: 1 },
    { key: 'defaultAnimation',    label: 'Default Animation', type: 'string',           default: 'idle' },
    { key: 'animationDefs',       label: 'Animations',        type: 'animationEditor',  default: {
        idle: { frames: [0], speed: 200, loop: true }
      }
    },
    { key: 'autoDirection',       label: 'Auto Flip',         type: 'boolean',          default: true,   description: 'Flip sprite based on movement direction' }
  ];

  constructor(object, config = {}) {
    super(object, config);

    // Fill defaults from schema
    AnimatedSpriteBehavior.configSchema.forEach(({ key, default: def }) => {
      if (this.config[key] === undefined) this.config[key] = def;
    });

    // The animator is created lazily on first update, because we need
    // access to AssetManager which is passed via gameState.
    this._animator = null;
    this._sprite   = null;   // the PIXI.Sprite we control
    this._lastDirection = null;
  }

  // ─── Lazy initialization ──────────────────────────────────────────
  // Called on the first update() once gameState (with assetManager) is available.

  _initialize(gameState) {
    const { assetManager, assets } = gameState;
    if (!assetManager || !assets) return false;

    const asset = assets.find(a => a.id === this.config.spriteSheetAssetId);
    if (!asset) return false;

    const sheetTexture = assetManager.getTexture(asset);
    if (!sheetTexture) return false;

    // Build the animator
    this._animator = new SpriteAnimator(sheetTexture, asset, {
      frameWidth:        this.config.frameWidth,
      frameHeight:       this.config.frameHeight,
      animations:        this.config.animationDefs,
      defaultAnimation: this.config.defaultAnimation
    });

    // Create the sprite that will be placed in the scene.
    // LayerRenderer will pick this up and add it to the entity container
    // (see the LayerRenderer patch).
    this._sprite = new PIXI.Sprite(this._animator.currentTexture);
    this._sprite.anchor.set(0.5);

    // Tag it so LayerRenderer knows this entity is animated
    this._sprite._isAnimated = true;

    // Store on the object so LayerRenderer can find it
    this.object._animatedSprite = this._sprite;
    this.object._animator       = this._animator;

    return true;
  }

  // ─── Per-frame update ─────────────────────────────────────────────

  update(deltaTime, keys, gameState) {
    if (!this.enabled) return;

    // Lazy init on first frame
    if (!this._animator) {
      if (!this._initialize(gameState)) return; // asset not ready yet
    }

    // Advance animation
    this._animator.update(deltaTime);

    // Push current frame onto the sprite
    if (this._sprite) {
      this._sprite.texture = this._animator.currentTexture;

      // Auto-flip based on movement direction
      if (this.config.autoDirection && this.object.vel) {
        if (this.object.vel.x !== 0) {
          const movingRight = this.object.vel.x > 0;
          this._animator.setDirection(movingRight);
          this._sprite.scale.x = movingRight ? Math.abs(this._sprite.scale.x) : -Math.abs(this._sprite.scale.x);
        }
      }
    }
  }

  // ─── Public API (called by other behaviors or event actions) ────

  /**
   * Switch to a named animation.
   * @param {string} name    – animation name (must exist in animationDefs)
   * @param {object} options – { force: true } to restart if already playing
   */
  setAnimation(name, options = {}) {
    if (this._animator) {
      this._animator.setAnimation(name, options);
    }
  }

  /** Set a callback that fires once when a non-looping animation finishes */
  onComplete(callback) {
    if (this._animator) {
      this._animator.onAnimationComplete = callback;
    }
  }

  /** Which animation is currently playing */
  get currentAnimation() {
    return this._animator?.currentAnimationName || this.config.defaultAnimation;
  }

  /** Whether the current (non-looping) animation has finished */
  get isComplete() {
    return this._animator?.isAnimationComplete || false;
  }

  // ─── Cleanup ──────────────────────────────────────────────────────

  destroy() {
    if (this._sprite) {
      // Don't destroy the sprite here — LayerRenderer owns it in the scene graph.
      // Just clear our references.
      this._sprite = null;
    }
    if (this.object) {
      delete this.object._animatedSprite;
      delete this.object._animator;
    }
    this._animator = null;
  }
}
```

---

## 3. AnimationEditor.jsx — Define Animations in the UI

When the user has an animated sprite behavior attached, this panel replaces the plain text input for `animationDefs`. It shows the sprite sheet as a grid, lets users click frames to select them, and define named animations with speed and loop settings.

```jsx
// src/components/AnimationEditor/AnimationEditor.jsx
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
    img.src = asset.base64;
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

  return (
    <img
      src={asset.base64}
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
```

---

## 4. Patches

### A. BehaviorRegistry — add the new entry

Find the `registry` array in `BehaviorRegistry.js`. Add this entry alongside the existing ones:

```javascript
// At the top, add the import:
import { AnimatedSpriteBehavior } from '../sprites/AnimatedSpriteBehavior';

// In the registry array, add:
{
  id:          'animatedSprite',
  name:        'Animated Sprite',
  icon:        '🎬',
  category:    'Visual',
  description: 'Plays a sprite sheet animation. Works on any entity.',
  BehaviorClass: AnimatedSpriteBehavior,
  configSchema:  AnimatedSpriteBehavior.configSchema
}
```

### B. BehaviorConfigs.jsx — handle the two new config types

The auto-generated config UI doesn't know about `type: 'asset'` or `type: 'animationEditor'`. Add two cases to the renderer:

```jsx
// In BehaviorConfigs.jsx, inside the field-type switch:

// ── Asset picker ──
// Renders a dropdown of uploaded assets filtered to sprite sheets
case 'asset': {
  const spriteAssets = assets.filter(a =>
    a.category === 'sprite' || a.category === 'misc'
  );
  return (
    <select value={value || ''} onChange={(e) => onChange(field.key, e.target.value || null)}
      className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1
                 text-xs text-white focus:outline-none focus:border-purple-500">
      <option value="">— None —</option>
      {spriteAssets.map(a => (
        <option key={a.id} value={a.id}>{a.name} ({a.width}×{a.height})</option>
      ))}
    </select>
  );
}

// ── Animation editor ──
// Renders the full AnimationEditor component
case 'animationEditor': {
  return (
    <AnimationEditor
      config={fullConfig}   // the entire behavior config, not just this field
      assets={assets}
      onChange={(updatedConfig) => {
        // Update every key that changed
        Object.keys(updatedConfig).forEach(k => {
          if (updatedConfig[k] !== fullConfig[k]) {
            onChange(k, updatedConfig[k]);
          }
        });
      }}
    />
  );
}
```

### C. LayerRenderer — skip static sprite for animated entities

In `_buildEntities`, after creating the visual object, check whether the entity has an `AnimatedSpriteBehavior` in its behavior definitions. If it does, skip creating a static sprite — the behavior will create and manage its own animated sprite instead.

```javascript
// In LayerRenderer._buildEntities(), replace the forEach body:

_buildEntities(entities) {
  entities.forEach(ent => {
    // Check if this entity has an animated sprite behavior.
    // If so, the behavior creates and owns its sprite — we just reserve
    // a slot in _entitySprites that the behavior will fill on its first frame.
    const hasAnimatedSprite = (ent.behaviors || []).some(b => b.type === 'animatedSprite');

    if (hasAnimatedSprite) {
      // Don't create a static sprite. The AnimatedSpriteBehavior will set
      // object._animatedSprite on its first update, and we'll pick it up
      // in updateEntityPosition().
      this._entitySprites.set(ent.id, null); // placeholder
    } else {
      // Original path: static sprite (image or emoji)
      const display = this._createVisualObject(ent);
      display.x = ent.gridX * this.gridSize + this.gridSize / 2;
      display.y = ent.gridY * this.gridSize + this.gridSize / 2;
      this.entityContainer.addChild(display);
      this._entitySprites.set(ent.id, display);
    }
  });
}
```

And update `updateEntityPosition` to handle the animated sprite being added after initial build:

```javascript
updateEntityPosition(entityId, x, y) {
  let d = this._entitySprites.get(entityId);

  // If this entity has an animated sprite that was created by the behavior
  // after the initial scene load, adopt it now.
  if (!d) {
    // Find the entity's game object and check for the animated sprite
    // (set by AnimatedSpriteBehavior._initialize)
    // This is passed in via gameState.entities — GameBuilder calls this
    // with the entity object which has _animatedSprite on it after init.
    return; // will be picked up next frame once the sprite exists
  }

  d.x = x;
  d.y = y;
}
```

And add a method GameBuilder calls once per frame to adopt any newly-created animated sprites:

```javascript
/**
 * Call this every frame after behaviors have updated.
 * Picks up any animated sprites that were created by AnimatedSpriteBehavior
 * and adds them to the entity container.
 */
adoptAnimatedSprites(entities) {
  entities.forEach(ent => {
    if (!ent._animatedSprite) return;                          // no animator
    if (this._entitySprites.get(ent.id) === ent._animatedSprite) return; // already adopted

    // Remove the old placeholder (or old static sprite)
    const old = this._entitySprites.get(ent.id);
    if (old && old !== ent._animatedSprite) {
      this.entityContainer.removeChild(old);
      old.destroy?.();
    }

    // Add the animated sprite
    ent._animatedSprite.x = ent.x || 0;
    ent._animatedSprite.y = ent.y || 0;
    this.entityContainer.addChild(ent._animatedSprite);
    this._entitySprites.set(ent.id, ent._animatedSprite);
  });
}
```

### D. GameBuilder game loop — call adoptAnimatedSprites

In the game loop, after `behaviorManager.update()` and before `layerRenderer.update()`, add:

```javascript
// Adopt any animated sprites that were just initialized by behaviors
layerRendererRef.current.adoptAnimatedSprites(gameStateRef.current.entities);
```

### E. GameBuilder game loop — pass assetManager and assets into gameState

The `AnimatedSpriteBehavior` needs access to AssetManager during its lazy init. Add these to the gameState object created in `initializeGameState`:

```javascript
// In initializeGameState, add to the gameState object:
gameStateRef.current = {
  // ... existing fields ...

  // Scene Manager references needed by AnimatedSpriteBehavior
  assetManager: assetManagerRef.current,
  assets:       project.assets
};
```

---

## How Other Behaviors Trigger Animations

The whole point is that enemies and players share this system. A `PatrolBehavior` enemy walks back and forth — it should play "walk." A `HealthBehavior` enemy that just took damage should flash "hurt." Here's the pattern:

```javascript
// Inside any other behavior's update():
update(deltaTime, keys, gameState) {
  // ... do your thing ...

  // Get the animator on this same object (if it has one)
  const animator = gameState.behaviorManager?.getBehavior(this.object.id, 'animatedSprite');
  if (!animator) return; // no animated sprite on this object, nothing to do

  // Trigger animations based on state:
  if (this.object.vel && Math.abs(this.object.vel.x) > 1) {
    animator.setAnimation('walk');
  } else {
    animator.setAnimation('idle');
  }
}

// Or from an Event action:
// "When enemy takes damage → play 'hurt' animation"
execute: (params, context) => {
  const { behaviorManager } = context;
  const animator = behaviorManager.getBehavior(params.enemyId, 'animatedSprite');
  if (animator) {
    animator.setAnimation('hurt', { force: true });
    animator.onComplete(() => {
      animator.setAnimation('idle');
    });
  }
}
```

---

## Testing Checklist

```
Sprite Sheet Setup
  [ ] Upload a sprite sheet image via AssetBrowser (category: sprite)
  [ ] Attach AnimatedSpriteBehavior to a player entity
  [ ] Set the sprite sheet asset in the behavior config
  [ ] Set frame width and frame height to match the sheet's tile size
  [ ] The sheet grid appears in the AnimationEditor

Animation Definition
  [ ] Can add a new animation (name appears as a tab)
  [ ] Can rename an animation
  [ ] Can delete an animation
  [ ] Clicking a frame on the sheet adds it to the selected animation
  [ ] Clicking it again removes it
  [ ] Frame order numbers appear on selected frames in the sheet
  [ ] Frame order strip shows the sequence correctly
  [ ] Reorder arrows on frames in the strip work (◀ ▶)
  [ ] Speed slider changes how fast the preview plays
  [ ] Loop toggle: "Yes" loops, "No" holds the last frame
  [ ] Preview Play/Stop button works

Runtime — Player
  [ ] Player shows the animated sprite (not the emoji or static image)
  [ ] Default animation plays on spawn
  [ ] PlatformCharacterBehavior moving right → sprite flips to face right
  [ ] Moving left → flips left
  [ ] Can trigger a different animation from an event action

Runtime — Enemy
  [ ] Attach AnimatedSpriteBehavior to an enemy entity
  [ ] Enemy shows its animated sprite
  [ ] PatrolBehavior walking → "walk" animation plays (if wired)
  [ ] HealthBehavior damage → "hurt" animation plays (if wired)
  [ ] onComplete callback fires when a non-looping animation finishes

Multiple Animated Entities
  [ ] Player and two different enemy types all have their own sprite sheets
  [ ] All three animate independently at their own speeds
  [ ] Destroying an enemy removes its animated sprite cleanly
  [ ] Loading a new scene clears all animated sprites without errors
```
