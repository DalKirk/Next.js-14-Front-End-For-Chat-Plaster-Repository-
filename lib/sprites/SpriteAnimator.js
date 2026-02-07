// lib/sprites/SpriteAnimator.js
import * as PIXI from 'pixi.js';

export class SpriteAnimator {
  /**
   * @param {PIXI.Texture} sheetTexture  – full sprite sheet, from AssetManager.getTexture()
   * @param {number}       sheetW        – pixel width of the sheet image (asset.width)
   * @param {number}       sheetH        – pixel height of the sheet image (asset.height)
   * @param {object}       config
   * @param {number}       config.frameWidth        – width of one frame in pixels
   * @param {number}       config.frameHeight       – height of one frame in pixels
   * @param {object}       config.animations        – { name: { frames: [0,1,2], speed: 120, loop: true }, ... }
   * @param {string}       config.defaultAnimation  – which animation plays on creation
   */
  constructor(sheetTexture, sheetW, sheetH, config) {
    this.sheetTexture = sheetTexture;
    this.frameWidth   = config.frameWidth;
    this.frameHeight  = config.frameHeight;
    this.animations   = config.animations || {};

    // Grid layout of the sheet
    this.cols = Math.floor(sheetW / this.frameWidth);
    this.rows = Math.floor(sheetH / this.frameHeight);

    // Animation state
    this.currentAnimation = config.defaultAnimation || 'idle';
    this.currentFrame     = 0;     // index into the active animation's frames[] array
    this.frameTimer       = 0;     // ms accumulated since last frame advance
    this.animationSpeed   = 100;   // fallback ms-per-frame if anim doesn't specify speed
    this.paused           = false;
    this.facingRight      = true;

    // Slice the sheet into per-frame sub-textures once. After this, every
    // frame advance is just reading an element from this array — no allocation.
    this._frameTextures = this._sliceSheet();
  }

  // ─── Slice ───────────────────────────────────────────────────────────────
  // Each sub-texture is a PIXI.Texture with a Rectangle frame that crops a
  // region of the shared BaseTexture. All sub-textures reference the same
  // GPU upload. This is how PixiJS sprite sheets work internally.
  _sliceSheet() {
    const textures = [];
    const base = this.sheetTexture.baseTexture;

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const frame = new PIXI.Rectangle(
          col * this.frameWidth,
          row * this.frameHeight,
          this.frameWidth,
          this.frameHeight
        );
        textures.push(new PIXI.Texture({ source: base, frame }));
      }
    }

    return textures;
  }

  // ─── Switch animation ────────────────────────────────────────────────────
  setAnimation(name) {
    if (!this.animations[name]) {
      console.warn(`SpriteAnimator: animation "${name}" not found`);
      return;
    }

    // Only reset if actually switching. Calling setAnimation('walk') every
    // frame while already playing 'walk' does nothing.
    if (this.currentAnimation !== name) {
      this.currentAnimation = name;
      this.currentFrame     = 0;
      this.frameTimer       = 0;
    }
  }

  // ─── Per-frame update ────────────────────────────────────────────────────
  // Called once per frame by AnimatedSpriteBehavior. deltaTime is in ms.
  update(deltaTime) {
    if (this.paused) return;

    const anim = this.animations[this.currentAnimation];
    if (!anim || !anim.frames || anim.frames.length === 0) return;

    this.frameTimer += deltaTime;

    const frameDuration = anim.speed || this.animationSpeed;

    if (this.frameTimer >= frameDuration) {
      // Subtract rather than reset to zero. If delta was large (e.g. the tab
      // was backgrounded), the remainder carries over and keeps timing accurate.
      this.frameTimer -= frameDuration;

      this.currentFrame++;

      if (this.currentFrame >= anim.frames.length) {
        if (anim.loop !== false) {
          this.currentFrame = 0;
        } else {
          // Hold on the last frame
          this.currentFrame = anim.frames.length - 1;
          // Fire completion callback once, then clear it
          if (anim.onComplete) {
            anim.onComplete();
            anim.onComplete = null;
          }
        }
      }
    }
  }

  // ─── Output: the texture for the current frame ──────────────────────────
  // AnimatedSpriteBehavior reads this every frame and writes it onto the sprite.
  get currentTexture() {
    const anim = this.animations[this.currentAnimation];
    if (!anim || !anim.frames || anim.frames.length === 0) {
      return this._frameTextures[0] || null;
    }

    // anim.frames[this.currentFrame] is the linear sheet index (row-major).
    // _frameTextures was built in the same row-major order, so we index directly.
    const sheetIndex = anim.frames[this.currentFrame];
    return this._frameTextures[sheetIndex] || this._frameTextures[0];
  }

  // ─── Direction ───────────────────────────────────────────────────────────
  setDirection(facingRight) {
    this.facingRight = facingRight;
  }
}
