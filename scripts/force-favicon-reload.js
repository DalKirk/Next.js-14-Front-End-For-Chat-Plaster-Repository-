/**
 * Force Favicon Reload Script
 * This script adds meta tags to force browsers to reload the favicon
 */

const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const timestamp = Date.now();

// Create a cache-busting favicon redirect
const htmlRedirect = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Favicon Cache Clear</title>
  
  <!-- Force favicon reload with timestamp -->
  <link rel="icon" type="image/x-icon" href="/favicon-simple.ico?v=${timestamp}" />
  <link rel="shortcut icon" href="/favicon-simple.ico?v=${timestamp}" />
  
  <!-- Multiple formats to ensure browser compatibility -->
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-simple-16.png?v=${timestamp}" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-simple-32.png?v=${timestamp}" />
  <link rel="icon" type="image/svg+xml" href="/favicon-simple.svg?v=${timestamp}" />
  
  <!-- Clear cache headers -->
  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
  <meta http-equiv="Pragma" content="no-cache">
  <meta http-equiv="Expires" content="0">
  
  <script>
    // Force browser to request favicon
    setTimeout(() => {
      const link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/x-icon';
      link.href = '/favicon-simple.ico?v=${timestamp}';
      
      // Remove old favicon links
      document.querySelectorAll('link[rel*="icon"]').forEach(el => el.remove());
      
      // Add new favicon
      document.head.appendChild(link);
      
      console.log('Favicon forcibly reloaded with timestamp: ${timestamp}');
    }, 100);
  </script>
</head>
<body>
  <h1>Favicon Reload Complete</h1>
  <p>Timestamp: ${timestamp}</p>
  <p><a href="/">Return to main site</a></p>
</body>
</html>`;

// Write the cache-clearing HTML file
fs.writeFileSync(path.join(publicDir, 'favicon-reload.html'), htmlRedirect);

console.log('✅ Created favicon reload page at /favicon-reload.html');
console.log(`🔄 Cache-busting timestamp: ${timestamp}`);
console.log('🌐 Visit http://localhost:3000/favicon-reload.html then go back to main page');