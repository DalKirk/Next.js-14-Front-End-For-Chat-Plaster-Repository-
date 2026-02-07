// lib/sprites/AnimatedSpriteBehavior.js
import Behavior           from '../behaviors/Behavior';
import { SpriteAnimator } from './SpriteAnimator';

export class AnimatedSpriteBehavior extends Behavior {
  static behaviorId = 'animatedSprite';

  static configSchema = [
    {
      key:   'spriteSheetAssetId',
      label: 'Sprite Sheet',
      type:  'asset',
      default: null
    },
    {
      key:   'frameWidth',
      label: 'Frame Width (px)',
      type:  'number',
      default: 32, min: 4, max: 512, step: 1
    },
    {
      key:   'frameHeight',
      label: 'Frame Height (px)',
      type:  'number',
      default: 32, min: 4, max: 512, step: 1
    },
    {
      key:   'defaultAnimation',
      label: 'Default Animation',
      type:  'string',
      default: 'idle'
    },
    {
      key:   'animationDefs',
      label: 'Animations',
      type:  'spriteEditor',
      default: {
        idle: { frames: [0], speed: 200, loop: true }
      }
    },
    {
      key:   'autoFlip',
      label: 'Auto-Flip on Move',
      type:  'boolean',
      default: true
    }
  ];

  constructor(object, config = {}) {
    super(object, config);

    // Fill any missing config keys with schema defaults.
    // Deep-copy objects/arrays so each instance gets its own animationDefs.
    AnimatedSpriteBehavior.configSchema.forEach(({ key, default: def }) => {
      if (this.config[key] === undefined) {
        this.config[key] = (typeof def === 'object' && def !== null)
          ? JSON.parse(JSON.stringify(def))
          : def;
      }
    });

    this._animator      = null;  // SpriteAnimator, created on first update
    this._sprite        = null;  // the PIXI.Sprite we write textures onto (owned by LayerRenderer)
    this._lastX         = null;  // previous X position, used to derive movement direction
  }

  // ─── Lazy initialization ─────────────────────────────────────────────────
  // The constructor runs during rebuildForObject(), which happens inside
  // initializeGameState(). At that point the PixiJS textures are ready and
  // LayerRenderer has already built the entity sprites. But gameState hasn't
  // been fully assigned to the ref yet, so we can't read it in the constructor.
  // We wait until the first update() call instead.
  _initialize(gameState) {
    const { assetManager, assets, layerRenderer } = gameState;
    if (!assetManager || !assets) return false;

    // Find the sprite sheet asset
    const asset = assets.find(a => a.id === this.config.spriteSheetAssetId);
    if (!asset) return false;

    // Get the cached PixiJS texture
    const sheetTexture = assetManager.getTexture(asset);
    if (!sheetTexture) return false;

    // Build the animator — slices the sheet into frame sub-textures
    this._animator = new SpriteAnimator(sheetTexture, asset.width, asset.height, {
      frameWidth:        this.config.frameWidth,
      frameHeight:       this.config.frameHeight,
      animations:        this.config.animationDefs,
      defaultAnimation: this.config.defaultAnimation
    });

    // Get the PIXI.Sprite that LayerRenderer created for this entity.
    // If the entity has effects (shadow/glow/outline), the sprite is inside
    // a Container. getEntitySprite() handles that transparently.
    // If no layerRenderer, we use SceneView's sprite system via spritesRef
    if (layerRenderer && typeof layerRenderer.getEntitySprite === 'function') {
      this._sprite = layerRenderer.getEntitySprite(this.object.id);
    } else {
      // Fallback: SceneView manages sprites differently
      // The sprite will be accessed via the spritesRef in SceneView
      this._sprite = null;
    }

    // Seed _lastX so the first frame doesn't trigger a spurious flip
    this._lastX = this.object.x;

    return (this._animator !== null);
  }

  // ─── Per-frame update ────────────────────────────────────────────────────
  update(deltaTime, keys, gameState) {
    if (!this.enabled) return;

    // Lazy init on the first frame where gameState is available
    if (!this._animator) {
      if (!this._initialize(gameState)) return;
    }

    // Advance the animation timer → may change currentFrame
    // deltaTime comes in as seconds from BehaviorManager, convert to ms
    this._animator.update(deltaTime * 1000);

    // If we don't have a direct sprite reference, try to get it from gameState
    if (!this._sprite && gameState.sprites) {
      const spriteOrContainer = gameState.sprites[this.object.id];
      if (spriteOrContainer) {
        // Could be a Container with sprite as child, or a bare Sprite
        if (spriteOrContainer.children && spriteOrContainer.children.length > 0) {
          this._sprite = spriteOrContainer.children[0];
        } else {
          this._sprite = spriteOrContainer;
        }
      }
    }

    if (!this._sprite) return;

    // Write the current frame's texture onto the sprite.
    // This is a single property assignment — PixiJS handles the rest.
    this._sprite.texture = this._animator.currentTexture;

    // ── Auto-flip based on movement direction ──
    // We derive direction from position delta rather than reading .vel,
    // because not all movement behaviors expose a velocity property.
    // PlatformCharacterBehavior stores velocity on itself (this.velocity),
    // PatrolBehavior just mutates object.x directly. Position delta works
    // for both.
    if (this.config.autoFlip) {
      const currentX = this.object.x;
      const dx = currentX - this._lastX;
      this._lastX = currentX;

      if (dx > 0) {
        // Moving right
        this._animator.setDirection(true);
        this._sprite.scale.x = Math.abs(this._sprite.scale.x);
      } else if (dx < 0) {
        // Moving left
        this._animator.setDirection(false);
        this._sprite.scale.x = -Math.abs(this._sprite.scale.x);
      }
      // If dx === 0 (not moving), keep the last direction — don't flip back
    }
  }

  // ─── Public API ──────────────────────────────────────────────────────────
  // Other behaviors call these to trigger animations on this entity.
  //
  // Usage from another behavior:
  //   const anim = gameState.behaviorManager.getBehavior(this.object.id, 'animatedSprite');
  //   if (anim) anim.setAnimation('walk');

  setAnimation(name) {
    if (this._animator) this._animator.setAnimation(name);
  }

  get currentAnimation() {
    return this._animator
      ? this._animator.currentAnimation
      : this.config.defaultAnimation;
  }

  // ─── Cleanup ─────────────────────────────────────────────────────────────
  destroy() {
    // We do NOT own the sprite. LayerRenderer created it and will destroy it
    // when the scene unloads. We just drop our reference.
    this._animator = null;
    this._sprite   = null;
  }
}
