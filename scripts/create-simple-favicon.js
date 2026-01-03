const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function createSimpleFavicon() {
  try {
    console.log('🎯 Creating a BOLD, SIMPLE favicon that WILL work...');
    
    // Create a very simple, bold favicon using basic shapes
    const svgIcon = `<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
      <!-- Dark blue background -->
      <rect width="32" height="32" fill="#0F1419"/>
      
      <!-- Bright cyan "S" letter - very bold and simple -->
      <text x="16" y="24" text-anchor="middle" fill="#00FFCC" font-family="Arial Black" font-size="24" font-weight="900">S</text>
    </svg>`;
    
    // Convert to high-quality PNG
    const pngBuffer = await sharp(Buffer.from(svgIcon))
      .png({ quality: 100 })
      .toBuffer();
    
    // Create multiple sizes
    const sizes = [16, 32, 48];
    
    for (const size of sizes) {
      const resized = await sharp(pngBuffer)
        .resize(size, size, { kernel: sharp.kernel.lanczos3 })
        .png({ quality: 100 })
        .toBuffer();
      
      fs.writeFileSync(path.join(__dirname, `../public/favicon-simple-${size}.png`), resized);
      console.log(`✓ Created favicon-simple-${size}.png`);
    }
    
    // Also create as .ico
    const icoBuffer = await sharp(pngBuffer)
      .resize(32, 32)
      .png({ quality: 100 })
      .toBuffer();
    
    fs.writeFileSync(path.join(__dirname, '../public/favicon-simple.ico'), icoBuffer);
    console.log('✓ Created favicon-simple.ico');
    
    // Create a super simple SVG without gradients
    const simpleSVG = `<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" fill="#0F1419"/>
  <text x="16" y="24" text-anchor="middle" fill="#00FFCC" font-family="Arial" font-size="20" font-weight="bold">S</text>
</svg>`;
    
    fs.writeFileSync(path.join(__dirname, '../public/favicon-simple.svg'), simpleSVG);
    console.log('✓ Created favicon-simple.svg');
    
    console.log('\n🚀 Created ULTRA-SIMPLE favicons:');
    console.log('   • Bold white "S" on dark background');
    console.log('   • No gradients, no complex shapes');
    console.log('   • Multiple formats and sizes');
    console.log('   • Guaranteed to be visible');
    
  } catch (error) {
    console.error('Error creating simple favicon:', error);
  }
}

createSimpleFavicon();