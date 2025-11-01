// Animated Background Elements System
// Adds life to parallax backgrounds with clouds, birds, particles, etc.

class AnimatedBackgroundElement {
  constructor(type, layer) {
    this.type = type; // 'cloud', 'bird', 'particle', 'ambient', 'firefly', 'leaf'
    this.layer = layer; // Which parallax layer (0-1 for depth)
    this.x = Math.random() * 800;
    this.y = Math.random() * 480;
    this.speed = 0.5 + Math.random() * 2;
    this.scale = 0.5 + Math.random() * 1;
    this.alpha = 0.3 + Math.random() * 0.7;
    
    // Animation properties
    this.frame = 0;
    this.frameCount = 4;
    this.frameSpeed = 100 + Math.random() * 100;
    this.frameTimer = 0;
    
    // Movement pattern
    this.waveOffset = Math.random() * Math.PI * 2;
    this.waveAmplitude = 10 + Math.random() * 20;
    this.waveFrequency = 0.01 + Math.random() * 0.02;
    
    // Color variations
    this.hue = Math.random() * 360;
    this.brightness = 0.5 + Math.random() * 0.5;
  }
  
  update(deltaTime) {
    this.frameTimer += deltaTime;
    
    if (this.frameTimer >= this.frameSpeed) {
      this.frameTimer = 0;
      this.frame = (this.frame + 1) % this.frameCount;
    }
    
    // Move horizontally
    this.x -= this.speed * (1 - this.layer); // Slower for distant layers
    
    // Wave motion
    this.y += Math.sin(this.waveOffset + this.x * this.waveFrequency) * 0.2;
    
    // Wrap around
    if (this.x < -100) {
      this.x = 900;
      this.y = Math.random() * 480;
    }
  }
  
  draw(ctx, cameraX) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.translate(this.x - cameraX * this.layer, this.y);
    ctx.scale(this.scale, this.scale);
    
    // Draw based on type
    switch(this.type) {
      case 'cloud':
        this.drawCloud(ctx);
        break;
      case 'bird':
        this.drawBird(ctx);
        break;
      case 'particle':
        this.drawParticle(ctx);
        break;
      case 'firefly':
        this.drawFirefly(ctx);
        break;
      case 'leaf':
        this.drawLeaf(ctx);
        break;
      case 'star':
        this.drawStar(ctx);
        break;
    }
    
    ctx.restore();
  }
  
  drawCloud(ctx) {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-20, 0, 15, 0, Math.PI * 2);
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.arc(20, 0, 15, 0, Math.PI * 2);
    ctx.fill();
  }
  
  drawBird(ctx) {
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    
    // Simple bird shape that flaps
    const flap = this.frame < 2 ? -5 : 5;
    
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.quadraticCurveTo(-5, flap, 0, 0);
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(5, flap, 10, 0);
    ctx.stroke();
  }
  
  drawParticle(ctx) {
    ctx.fillStyle = this.frame % 2 === 0 ? '#FFFF00' : '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  
  drawFirefly(ctx) {
    // Glowing particle that pulses
    const pulse = Math.sin(this.frame * 0.5) * 0.5 + 0.5;
    const size = 3 + pulse * 2;
    
    // Glow effect
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 2);
    gradient.addColorStop(0, `rgba(255, 255, 100, ${pulse})`);
    gradient.addColorStop(1, 'rgba(255, 255, 100, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, size * 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Core
    ctx.fillStyle = '#FFFF00';
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();
  }
  
  drawLeaf(ctx) {
    // Falling leaf that rotates
    const rotation = this.frame * 0.5;
    ctx.rotate(rotation);
    
    ctx.fillStyle = `hsl(${this.hue}, 70%, 50%)`;
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.quadraticCurveTo(5, -5, 0, 0);
    ctx.quadraticCurveTo(-5, 5, 0, 10);
    ctx.quadraticCurveTo(5, 5, 0, 0);
    ctx.quadraticCurveTo(-5, -5, 0, -10);
    ctx.fill();
  }
  
  drawStar(ctx) {
    // Twinkling star
    const twinkle = Math.sin(this.frame * 0.3) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(255, 255, 255, ${twinkle})`;
    
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const x = Math.cos(angle) * 4;
      const y = Math.sin(angle) * 4;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.fill();
  }
}

// Extended ParallaxBackground with animated elements
class ParallaxBackgroundWithElements {
  constructor() {
    this.layers = [];
    this.animatedElements = [];
  }
  
  addLayer(imageSrc, scrollSpeed = 0.5, yOffset = 0) {
    this.layers.push({
      image: new Image(),
      src: imageSrc,
      scrollSpeed,
      yOffset,
      loaded: false,
      x: 0
    });
    
    const layer = this.layers[this.layers.length - 1];
    layer.image.src = imageSrc;
    layer.image.onload = () => {
      layer.loaded = true;
    };
  }
  
  addAnimatedElements(type, count, layer) {
    for (let i = 0; i < count; i++) {
      this.animatedElements.push(new AnimatedBackgroundElement(type, layer));
    }
  }
  
  update(cameraX, deltaTime = 16) {
    // Update layers
    this.layers.forEach(layer => {
      layer.x = -(cameraX * layer.scrollSpeed);
    });
    
    // Update animated elements
    this.animatedElements.forEach(element => element.update(deltaTime));
  }
  
  draw(ctx, canvasWidth, canvasHeight, cameraX) {
    // Draw parallax layers
    this.layers.forEach(layer => {
      if (layer.loaded) {
        const imgWidth = layer.image.width;
        const imgHeight = layer.image.height;
        const startX = Math.floor(layer.x % imgWidth) - imgWidth;
        
        for (let x = startX; x < canvasWidth; x += imgWidth) {
          ctx.drawImage(layer.image, x, layer.yOffset, imgWidth, imgHeight);
        }
      }
    });
    
    // Draw animated elements
    this.animatedElements.forEach(element => element.draw(ctx, cameraX));
  }
  
  clear() {
    this.layers = [];
    this.animatedElements = [];
  }
}

// Placeholder Background Generator
class PlaceholderBackgroundGenerator {
  static createGradientBackground(type = 'sky') {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    
    let gradient;
    
    switch(type) {
      case 'sky':
        gradient = ctx.createLinearGradient(0, 0, 0, 480);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(1, '#E0F6FF');
        break;
        
      case 'sunset':
        gradient = ctx.createLinearGradient(0, 0, 0, 480);
        gradient.addColorStop(0, '#FF6B6B');
        gradient.addColorStop(0.5, '#FFD93D');
        gradient.addColorStop(1, '#6C5CE7');
        break;
        
      case 'night':
        gradient = ctx.createLinearGradient(0, 0, 0, 480);
        gradient.addColorStop(0, '#0F2027');
        gradient.addColorStop(0.5, '#203A43');
        gradient.addColorStop(1, '#2C5364');
        break;
        
      case 'cave':
        gradient = ctx.createLinearGradient(0, 0, 0, 480);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#0f0f1e');
        break;
        
      case 'underwater':
        gradient = ctx.createLinearGradient(0, 0, 0, 480);
        gradient.addColorStop(0, '#00B4DB');
        gradient.addColorStop(1, '#0083B0');
        break;
        
      default:
        gradient = ctx.createLinearGradient(0, 0, 0, 480);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(1, '#E0F6FF');
    }
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 800, 480);
    
    return canvas.toDataURL();
  }
  
  static createMountainLayer(color = '#8B7355', height = 200) {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 480);
    
    // Generate random mountain peaks
    for (let x = 0; x < 800; x += 100) {
      const peakHeight = height + Math.random() * 100;
      ctx.lineTo(x, 480 - peakHeight);
      ctx.lineTo(x + 50, 480 - peakHeight + 50);
    }
    
    ctx.lineTo(800, 480);
    ctx.closePath();
    ctx.fill();
    
    return canvas.toDataURL();
  }
  
  static createTreeLayer(density = 10) {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    
    for (let i = 0; i < density; i++) {
      const x = Math.random() * 800;
      const y = 350 + Math.random() * 50;
      const size = 40 + Math.random() * 60;
      
      // Tree trunk
      ctx.fillStyle = '#6B4423';
      ctx.fillRect(x - 5, y, 10, 130);
      
      // Tree foliage
      ctx.fillStyle = '#2D5016';
      ctx.beginPath();
      ctx.arc(x, y - size/2, size, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(x - size/3, y - size/3, size * 0.8, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(x + size/3, y - size/3, size * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
    
    return canvas.toDataURL();
  }
  
  static createStarField(starCount = 100) {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    
    for (let i = 0; i < starCount; i++) {
      const x = Math.random() * 800;
      const y = Math.random() * 480;
      const size = Math.random() * 2;
      const brightness = Math.random();
      
      ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    return canvas.toDataURL();
  }
}

// Preset configurations with animated elements
const animatedBackgroundPresets = {
  forestAnimated: {
    name: 'Forest (Animated)',
    backgroundColor: '#87CEEB',
    layers: [
      { src: PlaceholderBackgroundGenerator.createGradientBackground('sky'), speed: 0.0, yOffset: 0 },
      { src: PlaceholderBackgroundGenerator.createMountainLayer('#A0826D', 150), speed: 0.2, yOffset: 150 },
      { src: PlaceholderBackgroundGenerator.createMountainLayer('#8B7355', 200), speed: 0.4, yOffset: 200 },
      { src: PlaceholderBackgroundGenerator.createTreeLayer(15), speed: 0.8, yOffset: 0 }
    ],
    animatedElements: [
      { type: 'cloud', count: 5, layer: 0.1 },
      { type: 'bird', count: 3, layer: 0.3 },
      { type: 'leaf', count: 10, layer: 0.7 }
    ]
  },
  
  nightAnimated: {
    name: 'Night Sky (Animated)',
    backgroundColor: '#0F2027',
    layers: [
      { src: PlaceholderBackgroundGenerator.createGradientBackground('night'), speed: 0.0, yOffset: 0 },
      { src: PlaceholderBackgroundGenerator.createStarField(200), speed: 0.1, yOffset: 0 },
      { src: PlaceholderBackgroundGenerator.createMountainLayer('#1a1a2e', 180), speed: 0.3, yOffset: 180 }
    ],
    animatedElements: [
      { type: 'star', count: 30, layer: 0.05 },
      { type: 'firefly', count: 15, layer: 0.6 }
    ]
  },
  
  sunsetAnimated: {
    name: 'Sunset (Animated)',
    backgroundColor: '#FF6B6B',
    layers: [
      { src: PlaceholderBackgroundGenerator.createGradientBackground('sunset'), speed: 0.0, yOffset: 0 },
      { src: PlaceholderBackgroundGenerator.createMountainLayer('#6B4E71', 160), speed: 0.2, yOffset: 160 }
    ],
    animatedElements: [
      { type: 'cloud', count: 8, layer: 0.15 },
      { type: 'bird', count: 5, layer: 0.4 },
      { type: 'particle', count: 20, layer: 0.5 }
    ]
  },
  
  underwaterAnimated: {
    name: 'Underwater (Animated)',
    backgroundColor: '#00B4DB',
    layers: [
      { src: PlaceholderBackgroundGenerator.createGradientBackground('underwater'), speed: 0.0, yOffset: 0 }
    ],
    animatedElements: [
      { type: 'particle', count: 50, layer: 0.3 }, // Bubbles
      { type: 'particle', count: 30, layer: 0.6 }
    ]
  }
};

export { 
  AnimatedBackgroundElement, 
  ParallaxBackgroundWithElements, 
  PlaceholderBackgroundGenerator,
  animatedBackgroundPresets 
};
