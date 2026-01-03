const fs = require('fs');
const path = require('path');

function createOptimizedSVGFavicon() {
  // Create a clean, simple SVG favicon optimized for small sizes
  const optimizedSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#17EAED;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#6078EA;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Clean background circle for better visibility -->
  <circle cx="32" cy="32" r="30" fill="#0F172A" stroke="#17EAED" stroke-width="2"/>
  
  <!-- Simplified Starcyeed logo - bold S shape -->
  <path d="M20 20 Q32 15 44 20 Q40 25 32 25 Q24 25 20 30 Q32 35 44 30 Q40 35 32 40 Q24 40 20 44" 
        fill="none" 
        stroke="url(#grad1)" 
        stroke-width="3" 
        stroke-linecap="round"/>
  
  <!-- Central star/dot -->
  <circle cx="32" cy="32" r="3" fill="url(#grad1)"/>
</svg>`;

  const outputPath = path.join(__dirname, '../public/favicon-optimized.svg');
  
  try {
    fs.writeFileSync(outputPath, optimizedSVG);
    console.log('✅ Created optimized SVG favicon: favicon-optimized.svg');
    console.log('🎨 Features:');
    console.log('  • Clean 64x64 viewBox for sharp rendering');
    console.log('  • Bold, simple design visible at small sizes');
    console.log('  • Dark background circle for contrast');
    console.log('  • Simplified S-curve representing Starcyeed');
    console.log('  • Cyan-to-blue gradient matching your brand');
    console.log('  • No complex details that become artifacts');
    
  } catch (error) {
    console.error('Error creating optimized SVG:', error);
  }
}

createOptimizedSVGFavicon();