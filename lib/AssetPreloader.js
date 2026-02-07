import * as PIXI from 'pixi.js';

/**
 * AssetPreloader - Manages asset loading with progress tracking
 * 
 * Features:
 * - Bulk asset loading with progress callback
 * - Support for images, sprite sheets, and fonts
 * - Asset manifest loading
 * - Retry logic for failed loads
 * - Cache management
 */
export class AssetPreloader {
  constructor() {
    this.loadedAssets = new Map();
    this.loadingQueue = [];
    this.isLoading = false;
    this.retryCount = 3;
    this.retryDelay = 1000;
  }

  /**
   * Add an asset to the loading queue
   * @param {Object} asset - Asset definition
   * @param {string} asset.name - Unique name for the asset
   * @param {string} asset.url - URL to load from
   * @param {string} asset.type - Type: 'texture', 'spritesheet', 'font', 'json'
   * @param {Object} asset.options - Additional options (e.g., frame data for spritesheets)
   */
  add(asset) {
    if (!this.loadedAssets.has(asset.name)) {
      this.loadingQueue.push(asset);
    }
    return this;
  }

  /**
   * Add multiple assets at once
   * @param {Array} assets - Array of asset definitions
   */
  addMany(assets) {
    assets.forEach(asset => this.add(asset));
    return this;
  }

  /**
   * Load an asset manifest JSON file
   * @param {string} manifestUrl - URL to the manifest JSON
   * @returns {Promise<void>}
   */
  async loadManifest(manifestUrl) {
    try {
      const response = await fetch(manifestUrl);
      const manifest = await response.json();
      
      if (manifest.textures) {
        manifest.textures.forEach(t => this.add({ ...t, type: 'texture' }));
      }
      if (manifest.spritesheets) {
        manifest.spritesheets.forEach(s => this.add({ ...s, type: 'spritesheet' }));
      }
      if (manifest.fonts) {
        manifest.fonts.forEach(f => this.add({ ...f, type: 'font' }));
      }
      if (manifest.json) {
        manifest.json.forEach(j => this.add({ ...j, type: 'json' }));
      }

      console.log(`[AssetPreloader] Loaded manifest with ${this.loadingQueue.length} assets`);
    } catch (error) {
      console.error('[AssetPreloader] Failed to load manifest:', error);
      throw error;
    }
  }

  /**
   * Load all queued assets
   * @param {Function} onProgress - Progress callback (progress: 0-1)
   * @param {Function} onError - Error callback (asset, error)
   * @returns {Promise<Map>} Map of loaded assets
   */
  async loadAll(onProgress = null, onError = null) {
    if (this.isLoading) {
      throw new Error('Already loading assets');
    }

    this.isLoading = true;
    const total = this.loadingQueue.length;
    let loaded = 0;

    const results = new Map();

    for (const asset of this.loadingQueue) {
      try {
        const result = await this.loadAsset(asset);
        results.set(asset.name, result);
        this.loadedAssets.set(asset.name, result);
        loaded++;

        if (onProgress) {
          onProgress(loaded / total, asset.name);
        }
      } catch (error) {
        console.error(`[AssetPreloader] Failed to load: ${asset.name}`, error);
        if (onError) {
          onError(asset, error);
        }
      }
    }

    // Clear the queue
    this.loadingQueue = [];
    this.isLoading = false;

    console.log(`[AssetPreloader] Loaded ${loaded}/${total} assets`);
    return results;
  }

  /**
   * Load a single asset with retry logic
   */
  async loadAsset(asset, attempt = 1) {
    try {
      switch (asset.type) {
        case 'texture':
          return await this.loadTexture(asset);
        case 'spritesheet':
          return await this.loadSpriteSheet(asset);
        case 'font':
          return await this.loadFont(asset);
        case 'json':
          return await this.loadJSON(asset);
        default:
          // Default to texture
          return await this.loadTexture(asset);
      }
    } catch (error) {
      if (attempt < this.retryCount) {
        console.warn(`[AssetPreloader] Retrying ${asset.name} (attempt ${attempt + 1})`);
        await this.delay(this.retryDelay);
        return this.loadAsset(asset, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Load a texture
   */
  async loadTexture(asset) {
    const texture = await PIXI.Assets.load(asset.url);
    return { type: 'texture', texture };
  }

  /**
   * Load a sprite sheet with frame data
   */
  async loadSpriteSheet(asset) {
    const baseTexture = await PIXI.Assets.load(asset.url);
    const frames = new Map();

    // If frame data is provided, extract frames
    if (asset.options?.frames) {
      for (const [frameName, frameInfo] of Object.entries(asset.options.frames)) {
        const rectangle = new PIXI.Rectangle(
          frameInfo.x, frameInfo.y,
          frameInfo.width || frameInfo.w,
          frameInfo.height || frameInfo.h
        );
        const texture = new PIXI.Texture({
          source: baseTexture.source,
          frame: rectangle
        });
        frames.set(frameName, texture);
      }
    }

    // If it's a grid-based sprite sheet
    if (asset.options?.grid) {
      const { cols, rows, frameWidth, frameHeight, prefix = 'frame' } = asset.options.grid;
      let index = 0;
      
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const rectangle = new PIXI.Rectangle(
            col * frameWidth,
            row * frameHeight,
            frameWidth,
            frameHeight
          );
          const texture = new PIXI.Texture({
            source: baseTexture.source,
            frame: rectangle
          });
          frames.set(`${prefix}_${index}`, texture);
          index++;
        }
      }
    }

    return { type: 'spritesheet', baseTexture, frames };
  }

  /**
   * Load a font
   */
  async loadFont(asset) {
    const font = new FontFace(asset.name, `url(${asset.url})`);
    await font.load();
    document.fonts.add(font);
    return { type: 'font', font };
  }

  /**
   * Load JSON data
   */
  async loadJSON(asset) {
    const response = await fetch(asset.url);
    const data = await response.json();
    return { type: 'json', data };
  }

  /**
   * Get a loaded asset
   */
  get(name) {
    return this.loadedAssets.get(name);
  }

  /**
   * Get a texture from a loaded asset
   */
  getTexture(name) {
    const asset = this.loadedAssets.get(name);
    if (asset?.type === 'texture') {
      return asset.texture;
    }
    return null;
  }

  /**
   * Get a frame from a loaded sprite sheet
   */
  getFrame(sheetName, frameName) {
    const asset = this.loadedAssets.get(sheetName);
    if (asset?.type === 'spritesheet') {
      return asset.frames.get(frameName);
    }
    return null;
  }

  /**
   * Get all frames from a sprite sheet as an array
   * Useful for animations
   */
  getFrameArray(sheetName, prefix = null) {
    const asset = this.loadedAssets.get(sheetName);
    if (asset?.type === 'spritesheet') {
      const textures = [];
      asset.frames.forEach((texture, name) => {
        if (!prefix || name.startsWith(prefix)) {
          textures.push(texture);
        }
      });
      return textures;
    }
    return [];
  }

  /**
   * Check if asset is loaded
   */
  has(name) {
    return this.loadedAssets.has(name);
  }

  /**
   * Clear all loaded assets
   */
  clear() {
    this.loadedAssets.forEach((asset) => {
      if (asset.texture?.destroy) {
        asset.texture.destroy(true);
      }
      if (asset.baseTexture?.destroy) {
        asset.baseTexture.destroy(true);
      }
      if (asset.frames) {
        asset.frames.forEach(t => t.destroy?.(true));
      }
    });
    this.loadedAssets.clear();
    this.loadingQueue = [];
    console.log('[AssetPreloader] Cleared all assets');
  }

  /**
   * Get loading stats
   */
  getStats() {
    return {
      loaded: this.loadedAssets.size,
      queued: this.loadingQueue.length,
      isLoading: this.isLoading
    };
  }

  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default AssetPreloader;
