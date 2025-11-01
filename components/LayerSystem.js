/**
 * Layer System
 * 
 * Provides layer-based organization for game objects:
 * - Multiple layers (background, main, foreground, UI)
 * - Layer visibility toggle
 * - Layer locking (prevent editing)
 * - Layer opacity control
 * - Layer reordering
 * - Object-to-layer assignment
 */

class LayerSystem {
  constructor() {
    this.layers = [
      { 
        id: 'background', 
        name: 'Background', 
        visible: true, 
        locked: false, 
        opacity: 1.0, 
        objects: [],
        order: 0
      },
      { 
        id: 'main', 
        name: 'Main', 
        visible: true, 
        locked: false, 
        opacity: 1.0, 
        objects: [],
        order: 1
      },
      { 
        id: 'foreground', 
        name: 'Foreground', 
        visible: true, 
        locked: false, 
        opacity: 1.0, 
        objects: [],
        order: 2
      },
      { 
        id: 'ui', 
        name: 'UI', 
        visible: true, 
        locked: false, 
        opacity: 1.0, 
        objects: [],
        order: 3
      }
    ];
    this.activeLayer = 'main';
  }
  
  /**
   * Add new layer
   * @param {string} name - Layer name
   * @param {number|null} index - Insert position (null = end)
   * @returns {string} Layer ID
   */
  addLayer(name, index = null) {
    const layer = {
      id: Date.now().toString(),
      name,
      visible: true,
      locked: false,
      opacity: 1.0,
      objects: [],
      order: this.layers.length
    };
    
    if (index !== null) {
      this.layers.splice(index, 0, layer);
      this._updateLayerOrder();
    } else {
      this.layers.push(layer);
    }
    
    return layer.id;
  }
  
  /**
   * Remove layer
   * @param {string} layerId - Layer ID to remove
   * @returns {boolean} Success
   */
  removeLayer(layerId) {
    const index = this.layers.findIndex(l => l.id === layerId);
    if (index !== -1 && this.layers.length > 1) {
      this.layers.splice(index, 1);
      
      // Switch active layer if removed
      if (this.activeLayer === layerId) {
        this.activeLayer = this.layers[Math.max(0, index - 1)].id;
      }
      
      this._updateLayerOrder();
      return true;
    }
    return false;
  }
  
  /**
   * Get active layer
   * @returns {Object|null} Active layer object
   */
  getActiveLayer() {
    return this.layers.find(l => l.id === this.activeLayer);
  }
  
  /**
   * Get layer by ID
   * @param {string} layerId - Layer ID
   * @returns {Object|null} Layer object
   */
  getLayer(layerId) {
    return this.layers.find(l => l.id === layerId);
  }
  
  /**
   * Set active layer
   * @param {string} layerId - Layer ID to activate
   * @returns {boolean} Success
   */
  setActiveLayer(layerId) {
    const layer = this.getLayer(layerId);
    if (layer) {
      this.activeLayer = layerId;
      return true;
    }
    return false;
  }
  
  /**
   * Move layer to new position
   * @param {string} layerId - Layer ID to move
   * @param {number} newIndex - New position
   */
  moveLayer(layerId, newIndex) {
    const index = this.layers.findIndex(l => l.id === layerId);
    if (index !== -1) {
      const [layer] = this.layers.splice(index, 1);
      this.layers.splice(newIndex, 0, layer);
      this._updateLayerOrder();
    }
  }
  
  /**
   * Toggle layer visibility
   * @param {string} layerId - Layer ID
   * @returns {boolean} New visibility state
   */
  toggleVisibility(layerId) {
    const layer = this.getLayer(layerId);
    if (layer) {
      layer.visible = !layer.visible;
      return layer.visible;
    }
    return false;
  }
  
  /**
   * Toggle layer lock
   * @param {string} layerId - Layer ID
   * @returns {boolean} New lock state
   */
  toggleLock(layerId) {
    const layer = this.getLayer(layerId);
    if (layer) {
      layer.locked = !layer.locked;
      return layer.locked;
    }
    return false;
  }
  
  /**
   * Set layer opacity
   * @param {string} layerId - Layer ID
   * @param {number} opacity - Opacity (0.0 - 1.0)
   */
  setOpacity(layerId, opacity) {
    const layer = this.getLayer(layerId);
    if (layer) {
      layer.opacity = Math.max(0, Math.min(1, opacity));
    }
  }
  
  /**
   * Add object to layer
   * @param {string} layerId - Layer ID
   * @param {Object} object - Object to add
   * @returns {boolean} Success
   */
  addObjectToLayer(layerId, object) {
    const layer = this.getLayer(layerId);
    if (layer && !layer.locked) {
      // Add layer ID to object
      object.layerId = layerId;
      layer.objects.push(object);
      return true;
    }
    return false;
  }
  
  /**
   * Remove object from layer
   * @param {string} layerId - Layer ID
   * @param {Object} object - Object to remove
   * @returns {boolean} Success
   */
  removeObjectFromLayer(layerId, object) {
    const layer = this.getLayer(layerId);
    if (layer) {
      const index = layer.objects.indexOf(object);
      if (index !== -1) {
        layer.objects.splice(index, 1);
        return true;
      }
    }
    return false;
  }
  
  /**
   * Move object to different layer
   * @param {Object} object - Object to move
   * @param {string} fromLayerId - Source layer ID
   * @param {string} toLayerId - Target layer ID
   * @returns {boolean} Success
   */
  moveObjectToLayer(object, fromLayerId, toLayerId) {
    const toLayer = this.getLayer(toLayerId);
    if (toLayer && !toLayer.locked) {
      if (this.removeObjectFromLayer(fromLayerId, object)) {
        return this.addObjectToLayer(toLayerId, object);
      }
    }
    return false;
  }
  
  /**
   * Get all objects in layer
   * @param {string} layerId - Layer ID
   * @returns {Array} Array of objects
   */
  getLayerObjects(layerId) {
    const layer = this.getLayer(layerId);
    return layer ? layer.objects : [];
  }
  
  /**
   * Get all visible objects across all layers (bottom to top)
   * @returns {Array} Array of objects with layer info
   */
  getAllVisibleObjects() {
    const objects = [];
    
    // Sort layers by order (bottom to top)
    const sortedLayers = [...this.layers].sort((a, b) => a.order - b.order);
    
    sortedLayers.forEach(layer => {
      if (layer.visible) {
        layer.objects.forEach(obj => {
          objects.push({
            ...obj,
            layerId: layer.id,
            layerOpacity: layer.opacity
          });
        });
      }
    });
    
    return objects;
  }
  
  /**
   * Clear all objects from layer
   * @param {string} layerId - Layer ID
   * @returns {boolean} Success
   */
  clearLayer(layerId) {
    const layer = this.getLayer(layerId);
    if (layer && !layer.locked) {
      layer.objects = [];
      return true;
    }
    return false;
  }
  
  /**
   * Draw all layers
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} cameraX - Camera X offset
   * @param {number} cameraY - Camera Y offset
   * @param {Function} drawObjectFn - Function to draw individual objects
   */
  draw(ctx, cameraX, cameraY, drawObjectFn) {
    // Sort layers by order (bottom to top)
    const sortedLayers = [...this.layers].sort((a, b) => a.order - b.order);
    
    sortedLayers.forEach(layer => {
      if (!layer.visible) return;
      
      ctx.save();
      ctx.globalAlpha = layer.opacity;
      
      layer.objects.forEach(obj => {
        if (drawObjectFn) {
          drawObjectFn(ctx, obj, cameraX, cameraY);
        }
      });
      
      ctx.restore();
    });
  }
  
  /**
   * Export layer system to JSON
   * @returns {Object} Serialized layer system
   */
  export() {
    return {
      layers: this.layers.map(layer => ({
        id: layer.id,
        name: layer.name,
        visible: layer.visible,
        locked: layer.locked,
        opacity: layer.opacity,
        order: layer.order,
        objects: layer.objects
      })),
      activeLayer: this.activeLayer
    };
  }
  
  /**
   * Import layer system from JSON
   * @param {Object} data - Serialized layer system
   */
  import(data) {
    this.layers = data.layers.map(layer => ({
      ...layer,
      objects: layer.objects || []
    }));
    this.activeLayer = data.activeLayer || 'main';
  }
  
  /**
   * Update layer order values
   * @private
   */
  _updateLayerOrder() {
    this.layers.forEach((layer, index) => {
      layer.order = index;
    });
  }
  
  /**
   * Get layer count
   * @returns {number} Number of layers
   */
  getLayerCount() {
    return this.layers.length;
  }
  
  /**
   * Rename layer
   * @param {string} layerId - Layer ID
   * @param {string} newName - New layer name
   * @returns {boolean} Success
   */
  renameLayer(layerId, newName) {
    const layer = this.getLayer(layerId);
    if (layer) {
      layer.name = newName;
      return true;
    }
    return false;
  }
}

export default LayerSystem;
