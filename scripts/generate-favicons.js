const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateFavicons() {
  const inputFile = path.join(__dirname, '../public/IconOnly_Transparent.png');
  const outputDir = path.join(__dirname, '../public');
  
  // Check if input file exists
  if (!fs.existsSync(inputFile)) {
    console.error('Input file not found:', inputFile);
    return;
  }
  
  // Define favicon sizes
  const sizes = [
    { width: 16, height: 16, name: 'favicon-16x16.png' },
    { width: 32, height: 32, name: 'favicon-32x32.png' },
    { width: 48, height: 48, name: 'favicon-48x48.png' },
    { width: 180, height: 180, name: 'apple-touch-icon.png' },
    { width: 192, height: 192, name: 'android-chrome-192x192.png' },
    { width: 512, height: 512, name: 'android-chrome-512x512.png' }
  ];
  
  try {
    for (const size of sizes) {
      const outputPath = path.join(outputDir, size.name);
      
      await sharp(inputFile)
        .resize(size.width, size.height, {
          kernel: sharp.kernel.lanczos3,
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png({ quality: 100, compressionLevel: 9 })
        .toFile(outputPath);
        
      console.log(`Generated: ${size.name} (${size.width}x${size.height})`);
    }
    
    console.log('\nAll favicons generated successfully!');
    console.log('Update your HTML to use these specific favicon files.');
    
  } catch (error) {
    console.error('Error generating favicons:', error);
  }
}

// Check if sharp is available, if not provide install instructions
try {
  require('sharp');
  generateFavicons();
} catch (error) {
  console.log('Sharp is not installed. To generate proper favicons, run:');
  console.log('npm install sharp');
  console.log('Then run this script again.');
  
  // For now, let's just inform about the browser limitation
  console.log('\nNote: Browser favicons are inherently small (16x16 to 32x32 pixels).');
  console.log('This is a browser standard limitation, not a technical issue.');
  console.log('The favicon will always appear small in browser tabs - this is normal behavior.');
}