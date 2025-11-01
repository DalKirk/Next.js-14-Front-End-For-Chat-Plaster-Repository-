// Placeholder background generator for immediate use without assets
function createPlaceholderGradient(type) {
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
    case 'mountains-dark':
      ctx.fillStyle = '#A0826D';
      ctx.beginPath();
      ctx.moveTo(0, 480);
      for (let x = 0; x < 800; x += 80) {
        ctx.lineTo(x, 480 - 150 - Math.random() * 50);
        ctx.lineTo(x + 40, 480 - 120);
      }
      ctx.lineTo(800, 480);
      ctx.closePath();
      ctx.fill();
      return canvas.toDataURL();
    case 'mountains-light':
      ctx.fillStyle = '#8B7355';
      ctx.beginPath();
      ctx.moveTo(0, 480);
      for (let x = 0; x < 800; x += 100) {
        ctx.lineTo(x, 480 - 200 - Math.random() * 80);
        ctx.lineTo(x + 50, 480 - 150);
      }
      ctx.lineTo(800, 480);
      ctx.closePath();
      ctx.fill();
      return canvas.toDataURL();
    case 'night':
      gradient = ctx.createLinearGradient(0, 0, 0, 480);
      gradient.addColorStop(0, '#0F2027');
      gradient.addColorStop(0.5, '#203A43');
      gradient.addColorStop(1, '#2C5364');
      break;
    case 'stars':
      ctx.fillStyle = 'rgba(0, 0, 0, 0)';
      ctx.fillRect(0, 0, 800, 480);
      for (let i = 0; i < 200; i++) {
        const x = Math.random() * 800;
        const y = Math.random() * 480;
        const size = Math.random() * 2;
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.random()})`;
        ctx.fillRect(x, y, size, size);
      }
      return canvas.toDataURL();
    case 'underwater':
      gradient = ctx.createLinearGradient(0, 0, 0, 480);
      gradient.addColorStop(0, '#006994');
      gradient.addColorStop(0.5, '#0080B8');
      gradient.addColorStop(1, '#00A0DC');
      break;
    case 'desert':
      gradient = ctx.createLinearGradient(0, 0, 0, 480);
      gradient.addColorStop(0, '#FFE4B5');
      gradient.addColorStop(0.5, '#FFDEAD');
      gradient.addColorStop(1, '#F4A460');
      break;
    default:
      gradient = ctx.createLinearGradient(0, 0, 0, 480);
      gradient.addColorStop(0, '#87CEEB');
      gradient.addColorStop(1, '#E0F6FF');
  }
  
  if (gradient) {
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 800, 480);
  }
  
  return canvas.toDataURL();
}

export const backgroundPresets = {
  forest: {
    name: 'Forest',
    layers: [
      { src: createPlaceholderGradient('sky'), speed: 0.0, yOffset: 0 },
      { src: createPlaceholderGradient('mountains-dark'), speed: 0.1, yOffset: 50 },
      { src: createPlaceholderGradient('mountains-light'), speed: 0.2, yOffset: 100 }
    ],
    backgroundColor: '#87CEEB'
  },
  
  cave: {
    name: 'Cave',
    layers: [
      { src: createPlaceholderGradient('night'), speed: 0.0, yOffset: 0 }
    ],
    backgroundColor: '#1a1a2e'
  },
  
  city: {
    name: 'City',
    layers: [
      { src: createPlaceholderGradient('sky'), speed: 0.0, yOffset: 0 }
    ],
    backgroundColor: '#ffa500'
  },
  
  space: {
    name: 'Space',
    layers: [
      { src: createPlaceholderGradient('night'), speed: 0.0, yOffset: 0 },
      { src: createPlaceholderGradient('stars'), speed: 0.1, yOffset: 0 }
    ],
    backgroundColor: '#000033'
  },
  
  underwater: {
    name: 'Underwater',
    layers: [
      { src: createPlaceholderGradient('underwater'), speed: 0.0, yOffset: 0 }
    ],
    backgroundColor: '#1e90ff'
  },
  
  desert: {
    name: 'Desert',
    layers: [
      { src: createPlaceholderGradient('desert'), speed: 0.0, yOffset: 0 }
    ],
    backgroundColor: '#f4a460'
  },
  
  solid: {
    name: 'Solid Color',
    layers: [],
    backgroundColor: '#87CEEB'
  }
};
