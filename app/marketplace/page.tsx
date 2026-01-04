'use client';

import { useState } from 'react';
import JSZip from 'jszip';
import { Roboto_Slab } from 'next/font/google';

const robotoSlab = Roboto_Slab({ subsets: ['latin'] });

interface Icon {
  name: string;
  color: string;
  desc: string;
  svg: string;
}

const PNG_SIZES = [16, 32, 64, 128, 256, 512];

const icons: Icon[] = [
  { name: 'shelter', color: '#8b7355', desc: 'Essential safe house icon for survival interfaces', 
    svg: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 22V12h6v10" stroke-linecap="round" stroke-linejoin="round"/><line x1="2" y1="9" x2="22" y2="9" stroke-width="3" stroke-linecap="round"/>' },
  { name: 'radiation', color: '#d4af37', desc: 'Warning symbol for contaminated zones',
    svg: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3M19.07 4.93l-2.12 2.12M22 12h-3M19.07 19.07l-2.12-2.12M12 22v-3M4.93 19.07l2.12-2.12M2 12h3M4.93 4.93l2.12 2.12"/>' },
  { name: 'gas-mask', color: '#a0a0a0', desc: 'Protection equipment indicator',
    svg: '<circle cx="12" cy="12" r="4"/><path d="M16 12c0-2.21-1.79-4-4-4s-4 1.79-4 4"/><path d="M8 12v4c0 1.1-.9 2-2 2s-2-.9-2-2v-4M16 12v4c0 1.1.9 2 2 2s2-.9 2-2v-4"/><circle cx="10" cy="11" r="1"/><circle cx="14" cy="11" r="1"/>' },
  { name: 'weapon', color: '#8b4513', desc: 'Combat and defense system icon',
    svg: '<line x1="3" y1="21" x2="9" y2="15"/><path d="M15 9l6-6M9 15l-3 3M21 3l-3 3"/><rect x="13" y="7" width="8" height="2" transform="rotate(45 17 8)"/>' },
  { name: 'water', color: '#4a90e2', desc: 'Vital resource indicator',
    svg: '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/><line x1="8" y1="14" x2="16" y2="14" stroke-width="3"/>' },
  { name: 'rations', color: '#6b8e23', desc: 'Food supply system',
    svg: '<rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 3v4M8 3v4"/><line x1="2" y1="11" x2="22" y2="11"/><line x1="7" y1="15" x2="17" y2="15"/>' },
  { name: 'med-kit', color: '#c41e3a', desc: 'First aid and health system',
    svg: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="12" y1="8" x2="12" y2="16" stroke-width="3"/><line x1="8" y1="12" x2="16" y2="12" stroke-width="3"/>' },
  { name: 'scavenge', color: '#cd7f32', desc: 'Resource hunting and gathering',
    svg: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><circle cx="11" cy="11" r="3"/>' },
  { name: 'power', color: '#ffd700', desc: 'Energy and battery status',
    svg: '<rect x="1" y="6" width="18" height="12" rx="2" ry="2"/><line x1="23" y1="10" x2="23" y2="14" stroke-width="4"/><line x1="5" y1="10" x2="5" y2="14" stroke-width="3"/><line x1="9" y1="10" x2="9" y2="14" stroke-width="3"/>' },
  { name: 'danger', color: '#ff4444', desc: 'Alert and warning system',
    svg: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13" stroke-width="3"/><circle cx="12" cy="17" r="1" fill="#ff4444"/>' },
  { name: 'map', color: '#8b7355', desc: 'Navigation and exploration',
    svg: '<polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>' },
  { name: 'fire', color: '#ff6b35', desc: 'Campfire and warmth source',
    svg: '<path d="M12 2c-1.5 3-3 4.5-3 7.5 0 2.5 1.5 4.5 3 4.5s3-2 3-4.5c0-3-1.5-4.5-3-7.5z"/><path d="M9 14c-1 2-1.5 3.5-1.5 5.5 0 1.5 1 2.5 2.5 2.5s2.5-1 2.5-2.5c0-2-0.5-3.5-1.5-5.5M15 14c1 2 1.5 3.5 1.5 5.5 0 1.5-1 2.5-2.5 2.5s-2.5-1-2.5-2.5c0-2 0.5-3.5 1.5-5.5"/>' },
  { name: 'inventory', color: '#556b2f', desc: 'Backpack and storage system',
    svg: '<path d="M20 8v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/><rect x="4" y="8" width="16" height="4"/><circle cx="12" cy="16" r="2"/>' },
  { name: 'radio', color: '#708090', desc: 'Communication equipment',
    svg: '<rect x="2" y="8" width="20" height="13" rx="2" ry="2"/><circle cx="8" cy="15" r="2"/><line x1="14" y1="12" x2="18" y2="12"/><line x1="14" y1="16" x2="18" y2="16"/><path d="M7 8l8-6"/>' },
  { name: 'light', color: '#ffeb3b', desc: 'Flashlight and illumination',
    svg: '<path d="M9 2h6l1 7H8l1-7z"/><path d="M8 9v13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V9"/><line x1="12" y1="13" x2="12" y2="18" stroke-width="3"/>' },
  { name: 'death', color: '#dcdcdc', desc: 'Mortality and danger indicator',
    svg: '<path d="M12 2C6.5 2 2 6.5 2 12c0 3.3 1.7 6.3 4.2 8.1L8 22h8l1.8-1.9C20.3 18.3 22 15.3 22 12c0-5.5-4.5-10-10-10z"/><circle cx="9" cy="11" r="2"/><circle cx="15" cy="11" r="2"/><path d="M9 16h6"/>' },
  { name: 'defense', color: '#b0c4de', desc: 'Protection and shield system',
    svg: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 2v20"/>' },
  { name: 'secure', color: '#b8860b', desc: 'Lock and security features',
    svg: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><circle cx="12" cy="16" r="1" fill="#b8860b"/><line x1="12" y1="17" x2="12" y2="19" stroke-width="2"/>' },
  { name: 'biohazard', color: '#00ff00', desc: 'Toxic contamination warning',
    svg: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="6" r="2"/><circle cx="16.5" cy="15" r="2"/><circle cx="7.5" cy="15" r="2"/><path d="M12 8v2M10.6 10.6l-1.4 1.4M13.4 10.6l1.4 1.4"/>' },
  { name: 'survivors', color: '#d4af37', desc: 'Group and community system',
    svg: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>' }
];

export default function MarketplacePage() {
  const [selectedFormats, setSelectedFormats] = useState<Record<string, string>>({});
  const [downloadStatus, setDownloadStatus] = useState<string>('');

  const generateSVGFile = (icon: Icon): string => {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${icon.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
  ${icon.svg}
</svg>`;
  };

  const generatePNG = (icon: Icon, size: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const svgContent = generateSVGFile(icon);
      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d', { alpha: true });
        
        if (ctx) {
          // Ensure transparent background
          ctx.clearRect(0, 0, size, size);
          ctx.drawImage(img, 0, 0, size, size);
          
          canvas.toBlob((blob) => {
            URL.revokeObjectURL(url);
            if (blob) resolve(blob);
            else reject(new Error('Failed to generate PNG'));
          }, 'image/png');
        } else {
          reject(new Error('Canvas context not available'));
        }
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load SVG'));
      };
      
      img.src = url;
    });
  };

  const downloadSVG = (icon: Icon) => {
    const svgContent = generateSVGFile(icon);
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${icon.name}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloadStatus(`Downloaded ${icon.name}.svg!`);
    setTimeout(() => setDownloadStatus(''), 3000);
  };

  const downloadPNG = async (icon: Icon, size: number) => {
    try {
      setDownloadStatus(`Generating ${size}x${size} PNG...`);
      const blob = await generatePNG(icon, size);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${icon.name}_${size}x${size}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloadStatus(`Downloaded ${icon.name}_${size}x${size}.png!`);
      setTimeout(() => setDownloadStatus(''), 3000);
    } catch (error) {
      setDownloadStatus('Failed to generate PNG');
      setTimeout(() => setDownloadStatus(''), 3000);
    }
  };

  const downloadAllPNGSizes = async (icon: Icon) => {
    setDownloadStatus(`Preparing all PNG sizes for ${icon.name}...`);
    const zip = new JSZip();
    
    for (const size of PNG_SIZES) {
      try {
        const blob = await generatePNG(icon, size);
        zip.file(`${size}x${size}/${icon.name}_${size}x${size}.png`, blob);
      } catch (error) {
        console.error(`Failed to generate ${size}x${size} PNG:`, error);
      }
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${icon.name}-png-all-sizes.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloadStatus(`Downloaded all PNG sizes for ${icon.name}!`);
    setTimeout(() => setDownloadStatus(''), 3000);
  };

  const downloadBothFormats = async (icon: Icon) => {
    setDownloadStatus(`Preparing complete package for ${icon.name}...`);
    const zip = new JSZip();
    
    const svgContent = generateSVGFile(icon);
    zip.file(`svg/${icon.name}.svg`, svgContent);
    
    for (const size of PNG_SIZES) {
      try {
        const blob = await generatePNG(icon, size);
        zip.file(`png/${size}x${size}/${icon.name}_${size}x${size}.png`, blob);
      } catch (error) {
        console.error(`Failed to generate ${size}x${size} PNG:`, error);
      }
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${icon.name}-complete-pack.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloadStatus(`Downloaded complete package for ${icon.name}!`);
    setTimeout(() => setDownloadStatus(''), 3000);
  };

  const handleDownloadIcon = async (icon: Icon) => {
    const format = selectedFormats[icon.name] || 'svg';
    
    if (format === 'svg') {
      downloadSVG(icon);
    } else if (format.startsWith('png-')) {
      const size = parseInt(format.split('-')[1]);
      await downloadPNG(icon, size);
    } else if (format === 'png-all') {
      await downloadAllPNGSizes(icon);
    } else if (format === 'both') {
      await downloadBothFormats(icon);
    }
  };

  const downloadAllSVGs = () => {
    setDownloadStatus('Preparing all SVG icons...');
    const zip = new JSZip();
    icons.forEach(icon => {
      const svgContent = generateSVGFile(icon);
      zip.file(`${icon.name}.svg`, svgContent);
    });

    zip.generateAsync({ type: 'blob' }).then(content => {
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'post-apocalyptic-icons-svg-package.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloadStatus('Downloaded all SVG icons!');
      setTimeout(() => setDownloadStatus(''), 3000);
    });
  };

  const downloadAllPNGs = async () => {
    setDownloadStatus('Preparing all PNG icons (this may take a minute)...');
    const zip = new JSZip();
    
    for (const icon of icons) {
      for (const size of PNG_SIZES) {
        try {
          const blob = await generatePNG(icon, size);
          zip.file(`${size}x${size}/${icon.name}_${size}x${size}.png`, blob);
        } catch (error) {
          console.error(`Failed to generate ${icon.name} at ${size}x${size}:`, error);
        }
      }
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'post-apocalyptic-icons-png-package.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloadStatus('Downloaded all PNG icons!');
    setTimeout(() => setDownloadStatus(''), 3000);
  };

  const downloadCompletePackage = async () => {
    setDownloadStatus('Preparing complete package with all formats (this may take a minute)...');
    const zip = new JSZip();
    
    icons.forEach(icon => {
      const svgContent = generateSVGFile(icon);
      zip.file(`svg/${icon.name}.svg`, svgContent);
    });
    
    for (const icon of icons) {
      for (const size of PNG_SIZES) {
        try {
          const blob = await generatePNG(icon, size);
          zip.file(`png/${size}x${size}/${icon.name}_${size}x${size}.png`, blob);
        } catch (error) {
          console.error(`Failed to generate ${icon.name} at ${size}x${size}:`, error);
        }
      }
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'post-apocalyptic-icons-complete-package.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloadStatus('Downloaded complete package!');
    setTimeout(() => setDownloadStatus(''), 3000);
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white p-8 ${robotoSlab.className}`}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
            Post-Apocalyptic Icon Marketplace
          </h1>
          <p className="text-xl text-gray-300 mb-6">
            Professional survival-themed icons for your wasteland projects
          </p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105"
          >
            ← Back to Home
          </a>
        </div>

        {downloadStatus && (
          <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-pulse">
            {downloadStatus}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-gradient-to-br from-blue-900 to-blue-800 p-6 rounded-xl border-2 border-blue-600 hover:border-blue-400 transition-all">
            <h3 className="text-2xl font-bold mb-3 text-blue-300">Free SVG Package</h3>
            <p className="text-gray-300 mb-4">All 20 icons in scalable SVG format</p>
            <div className="mb-4">
              <span className="text-4xl font-bold text-green-400">FREE</span>
            </div>
            <button
              onClick={downloadAllSVGs}
              className="w-full bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg transition-all transform hover:scale-105"
            >
              Download SVG Package
            </button>
          </div>

          <div className="bg-gradient-to-br from-purple-900 to-purple-800 p-6 rounded-xl border-2 border-purple-600 hover:border-purple-400 transition-all">
            <h3 className="text-2xl font-bold mb-3 text-purple-300">Premium PNG Package</h3>
            <p className="text-gray-300 mb-4">All icons in 6 PNG sizes (16px to 512px)</p>
            <div className="mb-4">
              <span className="text-4xl font-bold text-yellow-400">$19</span>
            </div>
            <button
              onClick={downloadAllPNGs}
              className="w-full bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg transition-all transform hover:scale-105"
            >
              Download PNG Package
            </button>
          </div>

          <div className="bg-gradient-to-br from-orange-900 to-red-800 p-6 rounded-xl border-2 border-orange-600 hover:border-orange-400 transition-all">
            <h3 className="text-2xl font-bold mb-3 text-orange-300">Ultimate Package</h3>
            <p className="text-gray-300 mb-4">SVG + all PNG sizes (140 files total)</p>
            <div className="mb-4">
              <span className="text-4xl font-bold text-yellow-400">$29</span>
              <span className="text-sm text-gray-400 ml-2 line-through">$39</span>
            </div>
            <button
              onClick={downloadCompletePackage}
              className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 px-6 py-3 rounded-lg transition-all transform hover:scale-105"
            >
              Download Complete Package
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {icons.map((icon) => (
            <div key={icon.name} className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700 hover:border-cyan-500 transition-all">
              <div className="w-32 h-32 mx-auto mb-4 flex items-center justify-center bg-gray-900/50 rounded-lg p-6">
                <svg
                  width="100%"
                  height="100%"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={icon.color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  dangerouslySetInnerHTML={{ __html: icon.svg }}
                />
              </div>
              
              <h3 className="text-lg font-bold text-center mb-2 capitalize">
                {icon.name.replace('-', ' ')}
              </h3>
              
              <p className="text-sm text-gray-400 text-center mb-4">
                {icon.desc}
              </p>
              
              <select
                value={selectedFormats[icon.name] || 'svg'}
                onChange={(e) => setSelectedFormats({ ...selectedFormats, [icon.name]: e.target.value })}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg mb-3 text-sm"
              >
                <option value="svg">SVG (Free)</option>
                <option value="png-16">PNG 16x16</option>
                <option value="png-32">PNG 32x32</option>
                <option value="png-64">PNG 64x64</option>
                <option value="png-128">PNG 128x128</option>
                <option value="png-256">PNG 256x256</option>
                <option value="png-512">PNG 512x512</option>
                <option value="png-all">All PNG Sizes (ZIP)</option>
                <option value="both">Complete Pack (SVG + PNG)</option>
              </select>
              
              <button
                onClick={() => handleDownloadIcon(icon)}
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 px-4 py-2 rounded-lg transition-all transform hover:scale-105 text-sm"
              >
                Download
              </button>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center text-gray-400">
          <p>© 2025 StarCyeed Productions. All icons designed for commercial and personal use.</p>
          <p className="mt-2">License: Free for any project. Attribution appreciated but not required.</p>
        </div>
      </div>
    </div>
  );
}
