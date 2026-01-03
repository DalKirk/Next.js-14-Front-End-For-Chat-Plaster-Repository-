const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function createFaviconICO() {
  const inputFile = path.join(__dirname, '../public/IconOnly_Transparent.png');
  const outputFile = path.join(__dirname, '../public/favicon.ico');
  
  try {
    // Create a high-quality 32x32 PNG with white background for better contrast
    // ICO format is best created from a single high-quality 32x32 source
    const iconBuffer = await sharp(inputFile)
      .resize(32, 32, {
        kernel: sharp.kernel.lanczos3,
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 } // White background
      })
      .png({ quality: 100, compressionLevel: 9 })
      .toBuffer();
    
    // For now, we'll create a PNG and rename it to .ico
    // This works in most modern browsers
    fs.writeFileSync(outputFile, iconBuffer);
    
    console.log('Generated favicon.ico with high contrast (32x32)');
    console.log('✓ White background for better visibility');
    console.log('✓ High quality PNG-based ICO format');
    
    // Also create a backup web manifest for PWA support
    const webManifest = {
      "name": "Starcyeed",
      "short_name": "Starcyeed",
      "icons": [
        {
          "src": "/android-chrome-192x192.png",
          "sizes": "192x192",
          "type": "image/png"
        },
        {
          "src": "/android-chrome-512x512.png",
          "sizes": "512x512", 
          "type": "image/png"
        }
      ],
      "theme_color": "#1e1b4b",
      "background_color": "#000000",
      "display": "standalone"
    };
    
    fs.writeFileSync(
      path.join(__dirname, '../public/site.webmanifest'), 
      JSON.stringify(webManifest, null, 2)
    );
    
    console.log('Generated site.webmanifest for PWA support');
    
  } catch (error) {
    console.error('Error creating favicon.ico:', error);
  }
}

createFaviconICO();