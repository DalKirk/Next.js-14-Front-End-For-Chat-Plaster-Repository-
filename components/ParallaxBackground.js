class ParallaxLayer {
  constructor(imageSrc, scrollSpeed, yOffset = 0, options = {}) {
    this.image = new Image();
    this.image.src = imageSrc;
    this.loaded = false;
    
    this.image.onload = () => {
      this.loaded = true;
    };
    
    // scrollSpeed: 0.0 to 1.0 (Godot-style motion_scale)
    // 0.0 = static (infinitely far)
    // 0.2 = far away (mountains) - moves at 20% camera speed
    // 0.5 = mid distance (trees) - moves at 50% camera speed
    // 0.8 = near (bushes) - moves at 80% camera speed
    // 1.0 = foreground - moves with camera
    this.scrollSpeed = scrollSpeed;
    this.scrollOffset = 0; // Current scroll position
    this.yOffset = yOffset;
    this.alpha = options.alpha || 1.0;
    this.repeat = options.repeat !== undefined ? options.repeat : true; // Default to tiling
  }
  
  update(cameraX) {
    // Calculate scroll offset based on camera position and speed
    // Lower scroll speed = moves slower = appears further away
    this.scrollOffset = cameraX * this.scrollSpeed;
  }
  
  draw(ctx, canvasWidth, canvasHeight, levelWidth = 0) {
    if (!this.loaded || !this.image) return;
    
    ctx.save();
    ctx.globalAlpha = this.alpha;
    
    const imageWidth = this.image.width;
    const imageHeight = this.image.height;
    
    if (this.repeat) {
      // TILING MODE: Infinite seamless scrolling
      // Scale to fill canvas height
      const scale = canvasHeight / imageHeight;
      const scaledWidth = imageWidth * scale;
      const scaledHeight = canvasHeight;
      
      let offset = this.scrollOffset % scaledWidth;
      if (offset > 0) offset -= scaledWidth;
      
      for (let x = offset; x < canvasWidth; x += scaledWidth) {
        ctx.drawImage(this.image, x, this.yOffset, scaledWidth, scaledHeight);
      }
    } else {
      // NO TILING: Stretch image to always fill screen at all scroll positions
      // Calculate how much the camera can scroll (level width - canvas width)
      const maxCameraScroll = Math.max(0, levelWidth - canvasWidth);
      // Calculate how much the background should scroll (based on parallax speed)
      const maxBgScroll = maxCameraScroll * this.scrollSpeed;
      
      // The image needs to be wide enough to cover: canvasWidth + maxBgScroll
      const requiredWidth = canvasWidth + maxBgScroll;
      
      // Scale to cover height AND be wide enough for the scroll range
      const scaleY = canvasHeight / imageHeight;
      const scaleX = requiredWidth / imageWidth;
      const scale = Math.max(scaleX, scaleY);
      
      const scaledWidth = imageWidth * scale;
      const scaledHeight = imageHeight * scale;
      
      // Center vertically
      const yPos = (canvasHeight - scaledHeight) / 2 + this.yOffset;
      
      // X position based on scroll, clamped to never show gaps
      let x = -this.scrollOffset;
      x = Math.max(-(scaledWidth - canvasWidth), Math.min(0, x));
      
      ctx.drawImage(this.image, x, yPos, scaledWidth, scaledHeight);
    }
    
    ctx.restore();
  }
}

class ParallaxBackground {
  constructor() {
    this.layers = [];
  }
  
  addLayer(imageSrc, scrollSpeed, yOffset, options = {}) {
    const layer = new ParallaxLayer(imageSrc, scrollSpeed, yOffset, options);
    this.layers.push(layer);
    return layer;
  }
  
  update(cameraX) {
    this.layers.forEach(layer => layer.update(cameraX));
  }
  
  draw(ctx, canvasWidth, canvasHeight, levelWidth = 0) {
    // Draw layers from back to front
    this.layers.forEach(layer => {
      layer.draw(ctx, canvasWidth, canvasHeight, levelWidth);
    });
  }
  
  clear() {
    this.layers = [];
  }
}

export default ParallaxBackground;
