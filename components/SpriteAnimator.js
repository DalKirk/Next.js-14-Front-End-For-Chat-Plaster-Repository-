class SpriteAnimator {
  constructor(spriteSheetSrc, config) {
    this.image = new Image();
    this.image.src = spriteSheetSrc;
    this.loaded = false;
    
    this.image.onload = () => {
      this.loaded = true;
    };
    
    // Sprite sheet configuration
    this.frameWidth = config.frameWidth;
    this.frameHeight = config.frameHeight;
    this.animations = config.animations;
    
    // Animation state
    this.currentAnimation = config.defaultAnimation || 'idle';
    this.currentFrame = 0;
    this.frameTimer = 0;
    this.animationSpeed = 100; // ms per frame
    this.paused = false;
    this.facingRight = true;
  }
  
  setAnimation(name) {
    if (!this.animations[name]) {
      console.warn(`Animation "${name}" not found`);
      return;
    }
    
    if (this.currentAnimation !== name) {
      this.currentAnimation = name;
      this.currentFrame = this.animations[name].frames[0];
      this.frameTimer = 0;
    }
  }
  
  update(deltaTime) {
    if (this.paused || !this.loaded) return;
    
    const anim = this.animations[this.currentAnimation];
    if (!anim) return;
    
    this.frameTimer += deltaTime;
    
    const frameDuration = anim.speed || this.animationSpeed;
    
    if (this.frameTimer >= frameDuration) {
      this.frameTimer = 0;
      
      // Get current frame index in animation
      const frames = anim.frames;
      let currentIndex = frames.indexOf(this.currentFrame);
      
      if (currentIndex === -1) {
        currentIndex = 0;
      }
      
      // Move to next frame
      currentIndex++;
      
      if (currentIndex >= frames.length) {
        if (anim.loop !== false) {
          currentIndex = 0; // Loop
        } else {
          currentIndex = frames.length - 1; // Hold last frame
          if (anim.onComplete) {
            anim.onComplete();
          }
        }
      }
      
      this.currentFrame = frames[currentIndex];
    }
  }
  
  draw(ctx, x, y, width, height) {
    if (!this.loaded) return;
    
    // Calculate sprite position on sheet
    const cols = Math.floor(this.image.width / this.frameWidth);
    const col = this.currentFrame % cols;
    const row = Math.floor(this.currentFrame / cols);
    
    ctx.save();
    
    // Flip horizontally if facing left
    if (!this.facingRight) {
      ctx.scale(-1, 1);
      ctx.translate(-x * 2 - width, 0);
    }
    
    // Draw current frame
    ctx.drawImage(
      this.image,
      col * this.frameWidth,
      row * this.frameHeight,
      this.frameWidth,
      this.frameHeight,
      x,
      y,
      width,
      height
    );
    
    ctx.restore();
  }
  
  setDirection(right) {
    this.facingRight = right;
  }
}

export default SpriteAnimator;
