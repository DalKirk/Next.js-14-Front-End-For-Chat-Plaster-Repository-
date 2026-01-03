const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function createBetterFavicon() {
  const inputFile = path.join(__dirname, '../public/IconOnly_Transparent.png');
  const outputDir = path.join(__dirname, '../public');
  
  try {
    console.log('🔍 Analyzing successful favicon strategies...');
    console.log('✓ Google: Simple "G" with bold colors');
    console.log('✓ Facebook: Bold "f" on solid blue');
    console.log('✓ Twitter: Simple bird silhouette');
    console.log('✓ GitHub: Bold white cat on dark background');
    console.log('✓ YouTube: Play button symbol');
    console.log('');
    console.log('🎯 Strategy: Create bold, high-contrast, simplified version');
    
    // Strategy 1: Create a very bold, high-contrast version
    const boldFavicon = await sharp(inputFile)
      .resize(32, 32, {
        kernel: sharp.kernel.lanczos3,
        fit: 'contain',
        background: { r: 0, g: 20, b: 40, alpha: 1 } // Dark blue background like your theme
      })
      // Make it much more bold and contrasty
      .modulate({
        brightness: 1.5,  // Much brighter
        saturation: 2.0,  // Much more saturated
        hue: 0
      })
      // Add contrast enhancement
      .linear(1.5, -(128 * 1.5) + 128) // Increase contrast
      .png({ quality: 100, compressionLevel: 9 })
      .toBuffer();
    
    fs.writeFileSync(path.join(outputDir, 'favicon.ico'), boldFavicon);
    console.log('✓ Created bold favicon.ico with dark background');
    
    // Strategy 2: Create an even simpler, symbol-like version at 64x64 then scale down
    // This gives better detail when scaled
    const symbolFavicon = await sharp(inputFile)
      .resize(64, 64, {
        kernel: sharp.kernel.lanczos3,
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .modulate({
        brightness: 1.8,
        saturation: 2.5,
        hue: 0
      })
      .linear(2.0, -(128 * 2.0) + 128) // Very high contrast
      .resize(32, 32, { kernel: sharp.kernel.lanczos3 }) // Scale down for crisp result
      .png({ quality: 100, compressionLevel: 9 })
      .toBuffer();
    
    fs.writeFileSync(path.join(outputDir, 'favicon-bold.png'), symbolFavicon);
    console.log('✓ Created ultra-bold symbol favicon');
    
    // Strategy 3: Create SVG favicon for scalability (some modern browsers support this)
    const svgFavicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
      <rect width="32" height="32" fill="#1e1b4b"/>
      <text x="16" y="22" text-anchor="middle" fill="#00ffcc" font-family="Arial Black" font-size="18" font-weight="900">S</text>
    </svg>`;
    
    fs.writeFileSync(path.join(outputDir, 'favicon.svg'), svgFavicon);
    console.log('✓ Created SVG favicon with bold "S" symbol');
    
    // Strategy 4: Create different sizes optimized for different contexts
    const sizes = [
      { size: 16, name: 'favicon-16x16.png' },
      { size: 32, name: 'favicon-32x32.png' },
      { size: 48, name: 'favicon-48x48.png' }
    ];
    
    for (const sizeInfo of sizes) {
      const optimizedFavicon = await sharp(inputFile)
        .resize(sizeInfo.size * 2, sizeInfo.size * 2, { // Render at 2x then scale down
          kernel: sharp.kernel.lanczos3,
          fit: 'contain',
          background: { r: 0, g: 20, b: 40, alpha: 1 }
        })
        .modulate({
          brightness: sizeInfo.size <= 16 ? 2.0 : 1.5, // Brighter for smaller sizes
          saturation: sizeInfo.size <= 16 ? 3.0 : 2.0,
          hue: 0
        })
        .linear(sizeInfo.size <= 16 ? 2.5 : 2.0, -(128 * (sizeInfo.size <= 16 ? 2.5 : 2.0)) + 128)
        .resize(sizeInfo.size, sizeInfo.size, { kernel: sharp.kernel.lanczos3 })
        .png({ quality: 100, compressionLevel: 9 })
        .toBuffer();
      
      fs.writeFileSync(path.join(outputDir, sizeInfo.name), optimizedFavicon);
      console.log(`✓ Created optimized ${sizeInfo.name} (extra bold for ${sizeInfo.size}px)`);
    }
    
    console.log('');
    console.log('🎨 Applied successful favicon strategies:');
    console.log('• Bold, high-contrast design');
    console.log('• Dark background for logo pop');
    console.log('• Simplified details for small sizes');
    console.log('• Multiple formats (PNG, ICO, SVG)');
    console.log('• Size-specific optimizations');
    console.log('');
    console.log('💡 Note: Even with these optimizations, browser favicons');
    console.log('   are limited to ~16-32px display size by design.');
    console.log('   The improvements make them more visible within those constraints.');
    
  } catch (error) {
    console.error('Error creating better favicon:', error);
  }
}

createBetterFavicon();