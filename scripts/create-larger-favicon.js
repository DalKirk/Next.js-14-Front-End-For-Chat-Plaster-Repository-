const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function createLargerFavicon() {
  const inputFile = path.join(__dirname, '../public/IconOnly_Transparent.png');
  const outputDir = path.join(__dirname, '../public');
  
  // Check if input file exists
  if (!fs.existsSync(inputFile)) {
    console.error('Input file not found:', inputFile);
    return;
  }
  
  try {
    // Create a larger favicon for better visibility - 64x64 scaled to 32x32 for crispness
    await sharp(inputFile)
      .resize(64, 64, {
        kernel: sharp.kernel.lanczos3,
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png({ quality: 100, compressionLevel: 9 })
      .toFile(path.join(outputDir, 'favicon-large.png'));
      
    console.log('Generated larger favicon: favicon-large.png (64x64)');
    
    // Also create a high-contrast version if the original is too subtle
    await sharp(inputFile)
      .resize(32, 32, {
        kernel: sharp.kernel.lanczos3,
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 } // White background for contrast
      })
      .png({ quality: 100, compressionLevel: 9 })
      .toFile(path.join(outputDir, 'favicon-contrast.png'));
      
    console.log('Generated high-contrast favicon: favicon-contrast.png (32x32)');
    
    console.log('\nNote: Browser favicons have size limitations. Even with larger files,');
    console.log('they will be displayed at 16x16 to 32x32 pixels in browser tabs.');
    console.log('This is normal browser behavior and cannot be changed.');
    
  } catch (error) {
    console.error('Error generating larger favicons:', error);
  }
}

createLargerFavicon();