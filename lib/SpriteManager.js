import * as PIXI from 'pixi.js';

/**
 * SpriteManager - Manages textures and sprites for PixiJS
 * 
 * Phase 3 Enhanced Features:
 * - Sprite sheet / atlas loading with frame extraction
 * - Animation support with AnimatedSprite
 * - Texture pooling for efficient reuse
 * - Batch sprite creation for performance
 * - Asset manifest loading
 */
export class SpriteManager {
  constructor(app = null) {
    this.app = app;
    this.textures = new Map();
    this.textStyles = new Map();
    this.spriteSheets = new Map();      // Loaded sprite sheets
    this.animations = new Map();         // Animation frame sequences
    this.texturePool = new Map();        // Pooled textures for reuse
    this.pendingLoads = new Map();       // Track pending asset loads
    this.shapeCache = new Map();         // Cached rect/circle textures by key
  }

  /**
   * Set the PixiJS application reference
   * Required for rendering text to textures
   */
  setApp(app) {
    this.app = app;
  }

  /**
   * Create a cached text style
   */
  getTextStyle(fontSize = 40, color = '#ffffff', fontFamily = 'Arial') {
    const key = `${fontSize}_${color}_${fontFamily}`;
    
    if (!this.textStyles.has(key)) {
      const style = new PIXI.TextStyle({
        fontFamily,
        fontSize,
        fill: color,
        align: 'center',
      });
      this.textStyles.set(key, style);
    }
    
    return this.textStyles.get(key);
  }

  /**
   * Create a text sprite (PIXI.Text)
   * Good for dynamic text that changes frequently
   */
  createTextSprite(text, fontSize = 40, color = '#ffffff') {
    const style = this.getTextStyle(fontSize, color);
    const textSprite = new PIXI.Text({ text, style });
    textSprite.anchor.set(0.5);
    return textSprite;
  }

  /**
   * Create a texture from text/emoji
   * Use this when you have many instances of the same text/emoji
   * Much more efficient than creating PIXI.Text for each instance
   */
  async createTextTexture(text, fontSize = 40, color = '#ffffff') {
    const key = `text_${text}_${fontSize}_${color}`;
    
    if (this.textures.has(key)) {
      return this.textures.get(key);
    }

    if (!this.app) {
      console.warn('[SpriteManager] No app set, cannot create text texture');
      return null;
    }

    // Create temporary text object
    const style = this.getTextStyle(fontSize, color);
    const textObj = new PIXI.Text({ text, style });
    textObj.anchor.set(0.5);

    // Create render texture
    const padding = 4;
    const renderTexture = PIXI.RenderTexture.create({
      width: textObj.width + padding * 2,
      height: textObj.height + padding * 2,
      resolution: this.app.renderer.resolution,
    });

    // Position text in center of render texture
    textObj.x = renderTexture.width / 2;
    textObj.y = renderTexture.height / 2;

    // Render text to texture
    this.app.renderer.render({
      container: textObj,
      target: renderTexture,
    });

    // Cleanup temporary text object
    textObj.destroy();

    // Cache and return
    this.textures.set(key, renderTexture);
    return renderTexture;
  }

  /**
   * Create a sprite from a cached texture
   */
  createSpriteFromTexture(textureName) {
    const texture = this.textures.get(textureName);
    if (!texture) {
      console.warn(`[SpriteManager] Texture not found: ${textureName}`);
      return null;
    }

    const sprite = new PIXI.Sprite(texture);
    sprite.anchor.set(0.5);
    return sprite;
  }

  /**
   * Create a sprite from text/emoji (uses cached textures)
   */
  async createSprite(text, fontSize = 40, color = '#ffffff') {
    try {
      const texture = await this.createTextTexture(text, fontSize, color);
      if (!texture) {
        console.warn(`[SpriteManager] Failed to create texture for: ${text}`);
        return null;
      }

      const sprite = new PIXI.Sprite(texture);
      sprite.anchor.set(0.5);
      return sprite;
    } catch (error) {
      console.error(`[SpriteManager] Error creating sprite:`, error);
      return null;
    }
  }

  /**
   * Create a simple colored rectangle sprite (cached by dimensions + color)
   */
  createRectSprite(width, height, color = 0xffffff) {
    const cacheKey = `rect_${width}_${height}_${color}`;
    
    // Check cache first
    let texture = this.shapeCache.get(cacheKey);
    
    if (!texture) {
      const graphics = new PIXI.Graphics();
      graphics.rect(0, 0, width, height);
      graphics.fill({ color });
      
      texture = this.app.renderer.generateTexture(graphics);
      this.shapeCache.set(cacheKey, texture);
      graphics.destroy();
    }
    
    const sprite = new PIXI.Sprite(texture);
    sprite.anchor.set(0.5);
    return sprite;
  }

  /**
   * Create a circle sprite (cached by radius + color)
   */
  createCircleSprite(radius, color = 0xffffff) {
    const cacheKey = `circle_${radius}_${color}`;
    
    // Check cache first
    let texture = this.shapeCache.get(cacheKey);
    
    if (!texture) {
      const graphics = new PIXI.Graphics();
      graphics.circle(radius, radius, radius);
      graphics.fill({ color });
      
      texture = this.app.renderer.generateTexture(graphics);
      this.shapeCache.set(cacheKey, texture);
      graphics.destroy();
    }
    
    const sprite = new PIXI.Sprite(texture);
    sprite.anchor.set(0.5);
    return sprite;
  }

  /**
   * Load an image texture from URL
   */
  async loadTexture(name, url) {
    if (this.textures.has(name)) {
      return this.textures.get(name);
    }

    try {
      const texture = await PIXI.Assets.load(url);
      this.textures.set(name, texture);
      return texture;
    } catch (error) {
      console.error(`[SpriteManager] Failed to load texture: ${name}`, error);
      return null;
    }
  }

  /**
   * Get a cached texture by name
   */
  getTexture(name) {
    return this.textures.get(name);
  }

  /**
   * Check if texture exists
   */
  hasTexture(name) {
    return this.textures.has(name);
  }

  /**
   * Unload a specific texture by name
   */
  unloadTexture(name) {
    const texture = this.textures.get(name);
    if (texture) {
      if (texture.destroy) {
        texture.destroy(true);
      }
      this.textures.delete(name);
      console.log(`[SpriteManager] Unloaded texture: ${name}`);
      return true;
    }
    return false;
  }

  /**
   * Clear all cached textures and styles
   */
  clear() {
    // Cancel any pending loads
    this.pendingLoads.clear();
    
    // Destroy textures
    this.textures.forEach((texture) => {
      if (texture.destroy) {
        texture.destroy(true);
      }
    });
    this.textures.clear();
    
    // Destroy shape cache
    this.shapeCache.forEach((texture) => {
      if (texture.destroy) {
        texture.destroy(true);
      }
    });
    this.shapeCache.clear();
    
    // Destroy pooled textures
    this.texturePool.forEach((texture) => {
      if (texture.destroy) {
        texture.destroy(true);
      }
    });
    this.texturePool.clear();
    
    this.textStyles.clear();
    this.spriteSheets.clear();
    this.animations.clear();
    
    console.log('[SpriteManager] Cleared all caches');
  }

  /**
   * Get cache stats
   */
  getStats() {
    return {
      textureCount: this.textures.size,
      styleCount: this.textStyles.size,
      spriteSheetCount: this.spriteSheets.size,
      animationCount: this.animations.size,
      poolSize: this.texturePool.size,
      shapeCacheSize: this.shapeCache.size,
      pendingLoads: this.pendingLoads.size,
    };
  }

  // ============================================
  // PHASE 3: SPRITE SHEET & ATLAS SUPPORT
  // ============================================

  /**
   * Load a sprite sheet from URL with frame definitions
   * @param {string} name - Unique name for this sprite sheet
   * @param {string} imageUrl - URL to the sprite sheet image
   * @param {Object} frameData - Frame definitions { frameName: {x, y, width, height} }
   * @returns {Promise<Map>} Map of frameName -> Texture
   */
  async loadSpriteSheet(name, imageUrl, frameData) {
    if (this.spriteSheets.has(name)) {
      return this.spriteSheets.get(name);
    }

    // Prevent duplicate loads
    if (this.pendingLoads.has(name)) {
      return this.pendingLoads.get(name);
    }

    const loadPromise = (async () => {
      try {
        // Load the base texture
        const baseTexture = await PIXI.Assets.load(imageUrl);
        const frames = new Map();

        // Extract frames from the sprite sheet
        for (const [frameName, frame] of Object.entries(frameData)) {
          // Validate frame dimensions
          if (frame.x < 0 || frame.y < 0 || frame.width <= 0 || frame.height <= 0) {
            console.warn(`[SpriteManager] Invalid frame dimensions for: ${frameName}`);
            continue;
          }
          
          const rectangle = new PIXI.Rectangle(
            frame.x, frame.y, frame.width, frame.height
          );
          const texture = new PIXI.Texture({
            source: baseTexture.source,
            frame: rectangle
          });
          frames.set(frameName, texture);
          
          // Also add to main textures cache with full path
          this.textures.set(`${name}/${frameName}`, texture);
        }

        this.spriteSheets.set(name, { baseTexture, frames });
        this.pendingLoads.delete(name);
        console.log(`[SpriteManager] Loaded sprite sheet: ${name} with ${frames.size} frames`);
        return frames;
      } catch (error) {
        this.pendingLoads.delete(name);
        console.error(`[SpriteManager] Failed to load sprite sheet: ${name}`, error);
        throw error;
      }
    })();

    this.pendingLoads.set(name, loadPromise);
    return loadPromise;
  }

  /**
   * Load sprite sheet from a JSON atlas file (e.g., TexturePacker format)
   * @param {string} name - Unique name for this sprite sheet
   * @param {string} jsonUrl - URL to the JSON atlas file
   * @returns {Promise<Map>} Map of frameName -> Texture
   */
  async loadSpriteSheetFromAtlas(name, jsonUrl) {
    if (this.spriteSheets.has(name)) {
      return this.spriteSheets.get(name);
    }

    try {
      // Load atlas JSON
      const response = await fetch(jsonUrl);
      const atlasData = await response.json();
      
      // Get image path from atlas
      const imagePath = jsonUrl.replace(/[^/]+$/, atlasData.meta.image);
      
      // Build frame data from atlas
      const frameData = {};
      for (const [frameName, frameInfo] of Object.entries(atlasData.frames)) {
        const frame = frameInfo.frame || frameInfo;
        frameData[frameName] = {
          x: frame.x,
          y: frame.y,
          width: frame.w || frame.width,
          height: frame.h || frame.height
        };
      }

      return this.loadSpriteSheet(name, imagePath, frameData);
    } catch (error) {
      console.error(`[SpriteManager] Failed to load atlas: ${name}`, error);
      throw error;
    }
  }

  /**
   * Get a frame texture from a loaded sprite sheet
   */
  getSpriteSheetFrame(sheetName, frameName) {
    const sheet = this.spriteSheets.get(sheetName);
    if (!sheet) {
      console.warn(`[SpriteManager] Sprite sheet not found: ${sheetName}`);
      return null;
    }
    return sheet.frames.get(frameName);
  }

  /**
   * Create a sprite from a sprite sheet frame
   */
  createSpriteFromSheet(sheetName, frameName) {
    const texture = this.getSpriteSheetFrame(sheetName, frameName);
    if (!texture) return null;

    const sprite = new PIXI.Sprite(texture);
    sprite.anchor.set(0.5);
    return sprite;
  }

  // ============================================
  // ANIMATION SUPPORT
  // ============================================

  /**
   * Define an animation from sprite sheet frames
   * @param {string} animName - Name for this animation
   * @param {string} sheetName - Sprite sheet to use
   * @param {string[]} frameNames - Array of frame names in order
   * @param {number} speed - Animation speed (frames per tick, default 0.1)
   */
  defineAnimation(animName, sheetName, frameNames, speed = 0.1) {
    const sheet = this.spriteSheets.get(sheetName);
    if (!sheet) {
      console.warn(`[SpriteManager] Cannot define animation, sheet not found: ${sheetName}`);
      return;
    }

    const textures = frameNames.map(fn => sheet.frames.get(fn)).filter(Boolean);
    if (textures.length !== frameNames.length) {
      console.warn(`[SpriteManager] Some frames not found for animation: ${animName}`);
    }

    this.animations.set(animName, { textures, speed, sheetName });
    console.log(`[SpriteManager] Defined animation: ${animName} with ${textures.length} frames`);
  }

  /**
   * Define animation from a frame pattern (e.g., "walk_0", "walk_1", "walk_2")
   * @param {string} animName - Name for this animation
   * @param {string} sheetName - Sprite sheet to use
   * @param {string} prefix - Frame name prefix (e.g., "walk_")
   * @param {number} frameCount - Number of frames
   * @param {number} speed - Animation speed
   */
  defineAnimationFromPattern(animName, sheetName, prefix, frameCount, speed = 0.1) {
    const frameNames = [];
    for (let i = 0; i < frameCount; i++) {
      frameNames.push(`${prefix}${i}`);
    }
    this.defineAnimation(animName, sheetName, frameNames, speed);
  }

  /**
   * Create an animated sprite from a defined animation
   * @returns {PIXI.AnimatedSprite|null}
   */
  createAnimatedSprite(animName) {
    const anim = this.animations.get(animName);
    if (!anim) {
      console.warn(`[SpriteManager] Animation not found: ${animName}`);
      return null;
    }

    const animSprite = new PIXI.AnimatedSprite(anim.textures);
    animSprite.anchor.set(0.5);
    animSprite.animationSpeed = anim.speed;
    animSprite.loop = true;
    return animSprite;
  }

  // ============================================
  // TEXTURE POOLING (for batch sprite creation)
  // ============================================

  /**
   * Pre-create and pool textures for efficient reuse
   * @param {string} key - Pool key
   * @param {Function} createFn - Async function that returns a texture
   */
  async poolTexture(key, createFn) {
    if (this.texturePool.has(key)) {
      return this.texturePool.get(key);
    }

    const texture = await createFn();
    this.texturePool.set(key, texture);
    return texture;
  }

  /**
   * Get a pooled texture
   */
  getPooledTexture(key) {
    return this.texturePool.get(key);
  }

  /**
   * Pre-pool common game textures for efficiency
   * Call this during game initialization
   */
  async prePoolGameTextures(config) {
    const texturesToPool = [
      { key: 'platform', text: config.platformSprite || '🟫', size: config.gridSize || 40 },
      { key: 'coin', text: config.coinSprite || '🪙', size: config.gridSize || 40 },
      { key: 'player', text: config.playerSprite || '😊', size: config.gridSize || 40 },
      { key: 'enemy', text: config.enemySprite || '👾', size: config.gridSize || 40 },
      { key: 'goal', text: config.goalSprite || '🏁', size: config.gridSize || 40 },
    ];

    const promises = texturesToPool.map(({ key, text, size }) =>
      this.poolTexture(key, () => this.createTextTexture(text, size))
    );

    await Promise.all(promises);
    console.log(`[SpriteManager] Pre-pooled ${texturesToPool.length} game textures`);
  }

  /**
   * Create sprite from pooled texture (fast!)
   */
  createPooledSprite(key) {
    const texture = this.texturePool.get(key);
    if (!texture) {
      console.warn(`[SpriteManager] Pooled texture not found: ${key}`);
      return null;
    }

    const sprite = new PIXI.Sprite(texture);
    sprite.anchor.set(0.5);
    return sprite;
  }

  // ============================================
  // BATCH OPERATIONS
  // ============================================

  /**
   * Create multiple sprites at once using pooled textures
   * Much faster than creating individually
   * @param {string} poolKey - Pooled texture key
   * @param {Array<{x: number, y: number}>} positions - Array of positions
   * @param {PIXI.Container} container - Container to add sprites to
   * @returns {PIXI.Sprite[]} Array of created sprites
   */
  createBatchSprites(poolKey, positions, container) {
    const texture = this.texturePool.get(poolKey);
    if (!texture) {
      console.warn(`[SpriteManager] Cannot batch create, texture not pooled: ${poolKey}`);
      return [];
    }

    const sprites = positions.map(pos => {
      const sprite = new PIXI.Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.x = pos.x;
      sprite.y = pos.y;
      container.addChild(sprite);
      return sprite;
    });

    return sprites;
  }

  /**
   * Create a ParticleContainer for ultra-high-performance particle rendering
   * Use this for effects like rain, snow, explosions with 1000s of particles
   * @param {number} maxSize - Maximum particles (default 10000)
   * @param {Object} properties - Which properties can change
   */
  createParticleContainer(maxSize = 10000, properties = {}) {
    const defaultProps = {
      position: true,
      scale: true,
      rotation: true,
      alpha: true,
      tint: true,
      ...properties
    };

    return new PIXI.ParticleContainer(maxSize, defaultProps);
  }

  /**
   * Create a white pixel texture for tinting (useful for particles)
   */
  createWhitePixelTexture() {
    const key = '__white_pixel__';
    if (this.texturePool.has(key)) {
      return this.texturePool.get(key);
    }

    const graphics = new PIXI.Graphics();
    graphics.rect(0, 0, 4, 4);
    graphics.fill({ color: 0xffffff });
    
    const texture = this.app.renderer.generateTexture(graphics);
    graphics.destroy();
    
    this.texturePool.set(key, texture);
    return texture;
  }
}

export default SpriteManager;
