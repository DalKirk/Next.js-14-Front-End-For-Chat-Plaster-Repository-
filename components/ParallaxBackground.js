class ParallaxLayer {
  constructor(imageSrc, scrollSpeed, yOffset = 0) {
    this.image = new Image();
    this.image.src = imageSrc;
    this.loaded = false;
    
    this.image.onload = () => {
      this.loaded = true;
    };
    
    this.scrollSpeed = scrollSpeed; // 0.0 to 1.0 (0 = static, 1 = same as camera)
    this.x = 0;
    this.yOffset = yOffset;
    this.alpha = 1.0;
  }
  
  update(cameraX) {
    // Move layer based on camera and scroll speed
    this.x = cameraX * this.scrollSpeed;
  }
  
  draw(ctx, canvasWidth) {
    if (!this.loaded) return;
    
    ctx.save();
    ctx.globalAlpha = this.alpha;
    
    // Calculate how many times to tile the image
    const imageWidth = this.image.width;
    const imageHeight = this.image.height;
    
    // Calculate start position (with wrapping)
    const startX = -(this.x % imageWidth);
    
    // Draw repeating background
    for (let x = startX; x < canvasWidth; x += imageWidth) {
      ctx.drawImage(
        this.image,
        x,
        this.yOffset,
        imageWidth,
        imageHeight
      );
    }
    
    ctx.restore();
  }
}

class ParallaxBackground {
  constructor() {
    this.layers = [];
  }
  
  addLayer(imageSrc, scrollSpeed, yOffset) {
    const layer = new ParallaxLayer(imageSrc, scrollSpeed, yOffset);
    this.layers.push(layer);
    return layer;
  }
  
  update(cameraX) {
    this.layers.forEach(layer => layer.update(cameraX));
  }
  
  draw(ctx, canvasWidth) {
    // Draw layers from back to front
    this.layers.forEach(layer => {
      layer.draw(ctx, canvasWidth);
    });
  }
  
  clear() {
    this.layers = [];
  }
}

export default ParallaxBackground;
