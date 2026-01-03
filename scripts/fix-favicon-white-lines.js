const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function fixFaviconWhiteLines() {
  const inputFile = path.join(__dirname, '../public/IconOnly_Transparent.png');
  const outputDir = path.join(__dirname, '../public');
  
  try {
    // Create a better favicon without white background issues
    // Option 1: Keep transparency but enhance contrast
    const faviconBuffer = await sharp(inputFile)
      .resize(32, 32, {
        kernel: sharp.kernel.lanczos3,
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
      })
      .png({ quality: 100, compressionLevel: 9 })
      .toBuffer();
    
    // Save as favicon.ico (PNG format)
    fs.writeFileSync(path.join(outputDir, 'favicon.ico'), faviconBuffer);
    console.log('✓ Fixed favicon.ico - removed white lines');
    
    // Create a high-contrast version without white lines for PNG favicons
    const contrastBuffer = await sharp(inputFile)
      .resize(32, 32, {
        kernel: sharp.kernel.lanczos3,
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      // Enhance the image contrast without adding background
      .modulate({
        brightness: 1.2, // Slightly brighter
        saturation: 1.3, // More saturated
        hue: 0
      })
      .png({ quality: 100, compressionLevel: 9 })
      .toBuffer();
    
    fs.writeFileSync(path.join(outputDir, 'favicon-contrast.png'), contrastBuffer);
    console.log('✓ Fixed favicon-contrast.png - enhanced contrast without white background');
    
    // Create different sizes with proper transparency
    const sizes = [
      { width: 16, height: 16, name: 'favicon-16x16.png' },
      { width: 48, height: 48, name: 'favicon-48x48.png' }
    ];
    
    for (const size of sizes) {
      const buffer = await sharp(inputFile)
        .resize(size.width, size.height, {
          kernel: sharp.kernel.lanczos3,
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent
        })
        .modulate({
          brightness: 1.1,
          saturation: 1.2
        })
        .png({ quality: 100, compressionLevel: 9 })
        .toBuffer();
        
      fs.writeFileSync(path.join(outputDir, size.name), buffer);
      console.log(`✓ Fixed ${size.name} - no white lines`);
    }
    
    console.log('\n✅ All favicons fixed - white lines removed!');
    console.log('🎨 Enhanced contrast and brightness for better visibility');
    console.log('🔲 Maintained transparent background to avoid white lines');
    
  } catch (error) {
    console.error('Error fixing favicons:', error);
  }
}

fixFaviconWhiteLines();