// lib/scenes/AssetManager.js
// Handles texture caching and asset management for PixiJS

import * as PIXI from 'pixi.js';

export class AssetManager {
  constructor() {
    // Map of assetId → PIXI.Texture
    this.textureCache = new Map();
    
    // Track loading promises to avoid duplicate loads
    this.loadingPromises = new Map();
  }

  /**
   * Import a file and create an asset definition
   * @param {File} file - The file to import
   * @returns {Promise<Object|null>} Asset definition or null if invalid
   */
  async importFile(file) {
    if (!file.type.startsWith('image/')) {
      console.warn('AssetManager: Skipping non-image file:', file.name);
      return null;
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const base64 = e.target.result;
        const img = new Image();
        
        img.onload = () => {
          resolve({
            id: `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: file.name.replace(/\.[^/.]+$/, ''),
            category: 'misc',
            base64,
            width: img.width,
            height: img.height,
            createdAt: Date.now()
          });
        };
        
        img.onerror = () => {
          console.warn('AssetManager: Failed to load image:', file.name);
          resolve(null);
        };
        
        img.src = base64;
      };
      
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Get or create a PIXI texture for an asset
   * @param {string} assetId - The asset ID
   * @param {Array} assets - Array of asset definitions to search
   * @returns {PIXI.Texture|null} The texture or null if not found
   */
  getTexture(assetId, assets) {
    if (!assetId) return null;

    // Check cache first
    if (this.textureCache.has(assetId)) {
      return this.textureCache.get(assetId);
    }

    // Find the asset definition
    const asset = assets.find(a => a.id === assetId);
    if (!asset || !asset.base64) {
      console.warn('AssetManager: Asset not found:', assetId);
      return null;
    }

    // Create texture from base64
    try {
      const texture = PIXI.Texture.from(asset.base64);
      this.textureCache.set(assetId, texture);
      return texture;
    } catch (err) {
      console.error('AssetManager: Failed to create texture:', err);
      return null;
    }
  }

  /**
   * Preload textures for a list of assets
   * @param {Array} assets - Array of asset definitions
   * @returns {Promise<void>}
   */
  async preloadAssets(assets) {
    const promises = assets.map(asset => {
      if (!asset.base64) return Promise.resolve();
      
      // Skip if already cached
      if (this.textureCache.has(asset.id)) {
        return Promise.resolve();
      }

      // Check if already loading
      if (this.loadingPromises.has(asset.id)) {
        return this.loadingPromises.get(asset.id);
      }

      // Create loading promise
      const loadPromise = new Promise((resolve) => {
        try {
          const texture = PIXI.Texture.from(asset.base64);
          this.textureCache.set(asset.id, texture);
          resolve();
        } catch (err) {
          console.error('AssetManager: Failed to preload:', asset.name, err);
          resolve();
        }
      });

      this.loadingPromises.set(asset.id, loadPromise);
      return loadPromise;
    });

    await Promise.all(promises);
    this.loadingPromises.clear();
  }

  /**
   * Remove a texture from cache and destroy it
   * @param {string} assetId - The asset ID to remove
   */
  destroyTexture(assetId) {
    if (this.textureCache.has(assetId)) {
      const texture = this.textureCache.get(assetId);
      texture.destroy(true);
      this.textureCache.delete(assetId);
    }
  }

  /**
   * Clear all cached textures
   */
  clearCache() {
    this.textureCache.forEach((texture, id) => {
      texture.destroy(true);
    });
    this.textureCache.clear();
    this.loadingPromises.clear();
  }

  /**
   * Check if an asset is cached
   * @param {string} assetId - The asset ID
   * @returns {boolean}
   */
  isCached(assetId) {
    return this.textureCache.has(assetId);
  }

  /**
   * Get cache statistics
   * @returns {Object}
   */
  getStats() {
    return {
      cachedTextures: this.textureCache.size,
      pendingLoads: this.loadingPromises.size
    };
  }
}

export default AssetManager;
