// lib/scenes/LayerRenderer.js
// Builds and manages the PixiJS scene graph for a scene
// Note: Advanced filters (DropShadow, Outline, Glow) require pixi-filters v8 when available

import * as PIXI from 'pixi.js';

export class LayerRenderer {
  constructor(app, assetManager, assets, gridSize = 48) {
    this.app = app;
    this.assetManager = assetManager;
    this.assets = assets;
    this.gridSize = gridSize;
    
    // Camera position
    this.cameraX = 0;
    this.cameraY = 0;
    
    // Current scene reference
    this.currentScene = null;
    
    // Animation state
    this.glowTime = 0;
    
    // ── Build container tree ──
    // Root container (doesn't move)
    this.root = new PIXI.Container();
    app.stage.addChild(this.root);
    
    // Parallax container (moves slower than camera for depth effect)
    this.parallaxContainer = new PIXI.Container();
    this.root.addChild(this.parallaxContainer);
    
    // World container (moves with camera)
    this.worldContainer = new PIXI.Container();
    this.root.addChild(this.worldContainer);
    
    // Sub-containers within world (render order)
    this.platformContainer = new PIXI.Container();
    this.decorationBackContainer = new PIXI.Container();  // zOrder < 0
    this.entityContainer = new PIXI.Container();
    this.decorationFrontContainer = new PIXI.Container(); // zOrder >= 0
    
    this.worldContainer.addChild(this.platformContainer);
    this.worldContainer.addChild(this.decorationBackContainer);
    this.worldContainer.addChild(this.entityContainer);
    this.worldContainer.addChild(this.decorationFrontContainer);
    
    // UI container (fixed on screen, unaffected by camera)
    this.uiContainer = new PIXI.Container();
    this.root.addChild(this.uiContainer);
    
    // Track sprites for updates
    this.parallaxSprites = [];  // { layer, sprites: [] }
    this.platformSprites = new Map(); // platformId → sprite
    this.entitySprites = new Map();   // entityId → sprite
    this.decorationSprites = new Map(); // decoId → sprite
  }

  /**
   * Load and render a scene
   * @param {Object} scene - Scene definition from SceneData
   */
  loadScene(scene) {
    this.currentScene = scene;
    
    // Clear existing
    this._clearAll();
    
    // Set background color (check renderer exists - may not be ready during async init)
    if (scene.backgroundColor && this.app?.renderer?.background) {
      this.app.renderer.background.color = scene.backgroundColor;
    }
    
    // Build all layers
    this._buildParallax(scene.layers?.parallax || []);
    this._buildPlatforms(scene.layers?.platforms || []);
    this._buildDecorations(scene.layers?.decorations || []);
    this._buildEntities(scene.layers?.entities || []);
  }

  /**
   * Clear all containers
   */
  _clearAll() {
    this.parallaxContainer.removeChildren();
    this.platformContainer.removeChildren();
    this.decorationBackContainer.removeChildren();
    this.entityContainer.removeChildren();
    this.decorationFrontContainer.removeChildren();
    this.uiContainer.removeChildren();
    
    this.parallaxSprites = [];
    this.platformSprites.clear();
    this.entitySprites.clear();
    this.decorationSprites.clear();
  }

  // ═══════════════════════════════════════════════════════════════
  // PARALLAX
  // ═══════════════════════════════════════════════════════════════

  _buildParallax(parallaxLayers) {
    // Sort by zOrder (lower = further back = rendered first)
    const sorted = [...parallaxLayers].sort((a, b) => a.zOrder - b.zOrder);
    
    sorted.forEach(layer => {
      if (!layer.visible) return;
      
      const texture = this.assetManager.getTexture(layer.assetId, this.assets);
      if (!texture) return;
      
      const layerData = { layer, sprites: [] };
      
      // Calculate how many tiles we need to cover the screen plus buffer
      const screenWidth = this.app.screen.width;
      const screenHeight = this.app.screen.height;
      const texWidth = texture.width * layer.scaleX;
      const texHeight = texture.height * layer.scaleY;
      
      // Number of tiles needed (with buffer for scrolling)
      const tilesX = layer.repeatX ? Math.ceil(screenWidth / texWidth) + 2 : 1;
      const tilesY = layer.repeatY ? Math.ceil(screenHeight / texHeight) + 2 : 1;
      
      for (let ty = 0; ty < tilesY; ty++) {
        for (let tx = 0; tx < tilesX; tx++) {
          const sprite = new PIXI.Sprite(texture);
          sprite.scale.set(layer.scaleX, layer.scaleY);
          sprite.alpha = layer.alpha;
          
          // Apply tint
          if (layer.tintColor && layer.tintColor !== '#ffffff') {
            sprite.tint = layer.tintColor;
          }
          
          // Position
          sprite.x = tx * texWidth;
          sprite.y = ty * texHeight;
          
          // Store original position for parallax calculation
          sprite.originalX = sprite.x;
          sprite.originalY = sprite.y;
          
          this.parallaxContainer.addChild(sprite);
          layerData.sprites.push(sprite);
        }
      }
      
      this.parallaxSprites.push(layerData);
    });
  }

  _updateParallax() {
    this.parallaxSprites.forEach(({ layer, sprites }) => {
      const texture = sprites[0]?.texture;
      if (!texture) return;
      
      const texWidth = texture.width * layer.scaleX;
      const texHeight = texture.height * layer.scaleY;
      
      sprites.forEach(sprite => {
        // Parallax offset based on camera and scroll speed
        let offsetX = -this.cameraX * layer.scrollSpeedX;
        let offsetY = -this.cameraY * layer.scrollSpeedY;
        
        // Wrap for seamless tiling
        if (layer.repeatX && texWidth > 0) {
          offsetX = ((offsetX % texWidth) + texWidth) % texWidth;
        }
        if (layer.repeatY && texHeight > 0) {
          offsetY = ((offsetY % texHeight) + texHeight) % texHeight;
        }
        
        // Apply to sprite position
        sprite.x = sprite.originalX + offsetX - (layer.repeatX ? texWidth : 0);
        sprite.y = sprite.originalY + offsetY - (layer.repeatY ? texHeight : 0);
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // PLATFORMS
  // ═══════════════════════════════════════════════════════════════

  _buildPlatforms(platforms) {
    platforms.forEach(platform => {
      if (!platform.visible) return;
      
      const container = new PIXI.Container();
      const gs = this.gridSize;
      const width = platform.gridWidth * gs;
      const height = platform.gridHeight * gs;
      
      // Position
      container.x = platform.gridX * gs;
      container.y = platform.gridY * gs;
      
      // Try to use image asset
      const texture = this.assetManager.getTexture(platform.assetId, this.assets);
      
      if (texture) {
        // Tile the texture across the platform
        for (let ty = 0; ty < platform.gridHeight; ty++) {
          for (let tx = 0; tx < platform.gridWidth; tx++) {
            const tile = new PIXI.Sprite(texture);
            tile.width = gs;
            tile.height = gs;
            tile.x = tx * gs;
            tile.y = ty * gs;
            
            if (platform.tintColor && platform.tintColor !== '#ffffff') {
              tile.tint = platform.tintColor;
            }
            
            container.addChild(tile);
          }
        }
      } else {
        // Solid color fallback
        const graphics = new PIXI.Graphics();
        
        // Fill
        graphics.rect(0, 0, width, height);
        graphics.fill(platform.fillColor || '#4a5568');
        
        // Border
        graphics.rect(0, 0, width, height);
        graphics.stroke({ width: 2, color: platform.borderColor || '#2d3748' });
        
        container.addChild(graphics);
      }
      
      // One-way platform indicator
      if (platform.oneWay) {
        const indicator = new PIXI.Graphics();
        indicator.moveTo(0, 2);
        indicator.lineTo(width, 2);
        indicator.stroke({ width: 3, color: '#00ffff', alpha: 0.7 });
        // Dashed effect with circles
        for (let x = 5; x < width; x += 10) {
          indicator.circle(x, 2, 2);
          indicator.fill('#00ffff');
        }
        container.addChild(indicator);
      }
      
      this.platformContainer.addChild(container);
      this.platformSprites.set(platform.id, container);
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // ENTITIES
  // ═══════════════════════════════════════════════════════════════

  _buildEntities(entities) {
    entities.forEach(ent => {
      if (!ent.visible) return;
      
      const display = this._createVisualObject(ent);
      if (!display) return;

      // If this entity has an AnimatedSpriteBehavior, the full sprite sheet
      // was passed as assetId. _createVisualObject scaled the sprite to fit
      // one grid cell based on the sheet's total dimensions — that's wrong
      // for an animated entity; we need it scaled to one frame's dimensions.
      // We also crop the texture to frame 0 so it doesn't flash the full
      // sheet image on the first frame before the behavior takes over.
      const animDef = (ent.behaviors || []).find(
        b => b.type === 'animatedSprite' && b.enabled !== false
      );

      if (animDef && animDef.config) {
        const asset = this.assets.find(a => a.id === ent.assetId);
        if (asset) {
          const fw  = animDef.config.frameWidth  || 32;
          const fh  = animDef.config.frameHeight || 32;
          const tex = this.assetManager.getTexture(asset);

          if (tex) {
            // Crop to frame 0 (top-left tile of the sheet)
            const frame0 = new PIXI.Texture({
              source: tex.baseTexture,
              frame:  new PIXI.Rectangle(0, 0, fw, fh)
            });

            // Find the main sprite. If effects are present, _createVisualObject
            // returned a Container with the main sprite as the last child.
            const mainSprite = (display instanceof PIXI.Sprite)
              ? display
              : display.children[display.children.length - 1];

            if (mainSprite instanceof PIXI.Sprite) {
              mainSprite.texture = frame0;

              // Re-scale: fit one frame into one grid cell, preserve any flip signs
              const baseScale = this.gridSize / Math.max(fw, fh);
              const userScale = ent.scale || 1;
              const signX     = mainSprite.scale.x < 0 ? -1 : 1;
              const signY     = mainSprite.scale.y < 0 ? -1 : 1;
              mainSprite.scale.set(
                baseScale * userScale * signX,
                baseScale * userScale * signY
              );
            }
          }
        }
      }

      display.x = ent.gridX * this.gridSize + this.gridSize / 2;
      display.y = ent.gridY * this.gridSize + this.gridSize / 2;

      this.entityContainer.addChild(display);
      this.entitySprites.set(ent.id, display);
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // DECORATIONS
  // ═══════════════════════════════════════════════════════════════

  _buildDecorations(decorations) {
    // Sort by zOrder
    const sorted = [...decorations].sort((a, b) => (a.zOrder || 0) - (b.zOrder || 0));
    
    sorted.forEach(deco => {
      if (!deco.visible) return;
      
      const sprite = this._createVisualObject(deco);
      if (sprite) {
        sprite.x = deco.gridX * this.gridSize + this.gridSize / 2;
        sprite.y = deco.gridY * this.gridSize + this.gridSize / 2;
        
        // Place in back or front container based on zOrder
        const container = (deco.zOrder || 0) < 0 
          ? this.decorationBackContainer 
          : this.decorationFrontContainer;
        
        container.addChild(sprite);
        this.decorationSprites.set(deco.id, sprite);
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // VISUAL OBJECT CREATION (shared by entities and decorations)
  // ═══════════════════════════════════════════════════════════════

  _createVisualObject(obj) {
    const container = new PIXI.Container();
    let mainSprite;
    
    // Try to use asset image
    const texture = this.assetManager.getTexture(obj.assetId, this.assets);
    
    if (texture) {
      mainSprite = new PIXI.Sprite(texture);
      mainSprite.anchor.set(0.5);
      
      // Scale to fit grid size, then apply user scale
      const baseScale = this.gridSize / Math.max(texture.width, texture.height);
      mainSprite.scale.set(baseScale * (obj.scale || 1));
    } else {
      // Emoji fallback
      mainSprite = new PIXI.Text({
        text: obj.fallbackEmoji || '🔲',
        style: {
          fontSize: this.gridSize * 0.7 * (obj.scale || 1),
          align: 'center'
        }
      });
      mainSprite.anchor.set(0.5);
    }
    
    // Apply transforms
    mainSprite.rotation = (obj.rotation || 0) * (Math.PI / 180);
    
    if (obj.flipX) mainSprite.scale.x *= -1;
    if (obj.flipY) mainSprite.scale.y *= -1;
    
    // Tint (only works on sprites, not text)
    if (mainSprite instanceof PIXI.Sprite && obj.tintColor && obj.tintColor !== '#ffffff') {
      mainSprite.tint = obj.tintColor;
    }
    
    // Alpha
    mainSprite.alpha = obj.alpha ?? 1;
    
    container.addChild(mainSprite);
    
    // Store reference for effects updates
    container.mainSprite = mainSprite;
    container.objectData = obj;
    
    // Apply effects (these require pixi-filters for full effect)
    this._applyEffects(container, obj);
    
    return container;
  }

  _applyEffects(container, obj) {
    const filters = [];
    
    // Glow effect (using BlurFilter as approximation - pixi-filters v8 not yet available)
    if (obj.glowEnabled) {
      try {
        const blur = new PIXI.BlurFilter({
          strength: obj.glowDistance || 8,
          quality: 2
        });
        filters.push(blur);
        container.glowFilter = blur;
      } catch (e) {
        console.warn('[LayerRenderer] Glow effect error:', e);
      }
    }
    
    // Shadow effect - requires pixi-filters v8 (not yet available for PixiJS v8)
    if (obj.shadowEnabled) {
      // TODO: Add DropShadowFilter when pixi-filters v8 is released
      console.log('[LayerRenderer] Shadow effect pending pixi-filters v8 release');
    }
    
    // Outline effect - requires pixi-filters v8 (not yet available for PixiJS v8)
    if (obj.outlineEnabled) {
      // TODO: Add OutlineFilter when pixi-filters v8 is released
      console.log('[LayerRenderer] Outline effect pending pixi-filters v8 release');
    }
    
    if (filters.length > 0) {
      container.filters = filters;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // CAMERA
  // ═══════════════════════════════════════════════════════════════

  /**
   * Set the camera position
   * @param {number} x - Camera X position
   * @param {number} y - Camera Y position
   */
  setCamera(x, y) {
    this.cameraX = x;
    this.cameraY = y;
    
    // Move world container opposite to camera
    this.worldContainer.x = -x;
    this.worldContainer.y = -y;
  }

  // ═══════════════════════════════════════════════════════════════
  // PER-FRAME UPDATE
  // ═══════════════════════════════════════════════════════════════

  /**
   * Called every frame to update animations
   * @param {number} delta - Time delta from ticker
   */
  update(delta = 1) {
    // Update parallax positions
    this._updateParallax();
    
    // Update glow pulse animation
    this.glowTime += delta * 0.05;
    
    this.entitySprites.forEach((container) => {
      const obj = container.objectData;
      if (obj?.glowEnabled && obj?.glowPulse && container.glowFilter) {
        // Pulse between 0.5x and 1.5x strength
        const pulse = 1 + Math.sin(this.glowTime * 3) * 0.5;
        container.glowFilter.outerStrength = (obj.glowStrength || 2) * pulse;
      }
    });
    
    this.decorationSprites.forEach((container) => {
      const obj = container.objectData;
      if (obj?.glowEnabled && obj?.glowPulse && container.glowFilter) {
        const pulse = 1 + Math.sin(this.glowTime * 3) * 0.5;
        container.glowFilter.outerStrength = (obj.glowStrength || 2) * pulse;
      }
    });
  }

  /**
   * Call this every frame after behaviors have updated.
   * Picks up any animated sprites that were created by AnimatedSpriteBehavior
   * and adds them to the entity container.
   * @param {Array} entities - Array of game entities
   */
  adoptAnimatedSprites(entities) {
    entities.forEach(ent => {
      if (!ent._animatedSprite) return;                          // no animator
      if (this.entitySprites.get(ent.id) === ent._animatedSprite) return; // already adopted

      // Remove the old placeholder (or old static sprite)
      const old = this.entitySprites.get(ent.id);
      if (old && old !== ent._animatedSprite) {
        this.entityContainer.removeChild(old);
        old.destroy?.();
      }

      // Add the animated sprite
      ent._animatedSprite.x = ent.x || (ent.gridX * this.gridSize + this.gridSize / 2);
      ent._animatedSprite.y = ent.y || (ent.gridY * this.gridSize + this.gridSize / 2);
      this.entityContainer.addChild(ent._animatedSprite);
      this.entitySprites.set(ent.id, ent._animatedSprite);
    });
  }

  /**
   * Update an entity's position (called from game loop)
   * @param {string} entityId - Entity ID
   * @param {number} x - World X position
   * @param {number} y - World Y position
   */
  updateEntityPosition(entityId, x, y) {
    const sprite = this.entitySprites.get(entityId);
    if (sprite) {
      sprite.x = x;
      sprite.y = y;
    }
  }

  /**
   * Set entity visibility
   * @param {string} entityId - Entity ID
   * @param {boolean} visible - Whether visible
   */
  setEntityVisible(entityId, visible) {
    const sprite = this.entitySprites.get(entityId);
    if (sprite) {
      sprite.visible = visible;
    }
  }

  // Returns the main PIXI.Sprite for an entity. If the entity has effects,
  // _createVisualObject wrapped it in a Container (outline behind, shadow
  // behind, glow behind, main sprite last). This method returns the main
  // sprite regardless of whether it's bare or inside a Container.
  // AnimatedSpriteBehavior uses this to get the sprite it swaps textures on.
  getEntitySprite(entityId) {
    const display = this.entitySprites.get(entityId);
    if (!display) return null;

    // No effects → bare Sprite
    if (display instanceof PIXI.Sprite) return display;

    // Has effects → Container. Main sprite is always the last child
    // (see _createVisualObject: effects are added first, main sprite last).
    if (display.children && display.children.length > 0) {
      const last = display.children[display.children.length - 1];
      if (last instanceof PIXI.Sprite) return last;
    }

    return null;
  }

  /**
   * Destroy the renderer and clean up
   */
  destroy() {
    this._clearAll();
    this.root.destroy({ children: true });
  }
}

export default LayerRenderer;
