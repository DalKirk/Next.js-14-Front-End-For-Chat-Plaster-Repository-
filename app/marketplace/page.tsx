'use client';

import { useState } from 'react';
import JSZip from 'jszip';

interface Icon {
  name: string;
  color: string;
  desc: string;
  svg: string;
}

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
    setDownloadStatus(`Downloaded ${icon.name}.svg`);
    setTimeout(() => setDownloadStatus(''), 3000);
  };

  const downloadAllSVGs = async () => {
    setDownloadStatus('Preparing SVG package...');
    const zip = new JSZip();
    
    icons.forEach(icon => {
      const svgContent = generateSVGFile(icon);
      zip.file(`${icon.name}.svg`, svgContent);
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wasteland-icons-svg-pack.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloadStatus('Downloaded complete SVG package!');
    setTimeout(() => setDownloadStatus(''), 3000);
  };

  const handleFormatChange = (iconName: string, format: string) => {
    setSelectedFormats(prev => ({ ...prev, [iconName]: format }));
  };

  const handleDownloadIcon = (icon: Icon) => {
    const format = selectedFormats[icon.name] || 'svg';
    
    if (format === 'svg' || format.startsWith('png-') || format === 'png-all' || format === 'both') {
      downloadSVG(icon);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-black text-[rgba(230,247,255,0.92)]">
      <div className="container mx-auto px-4 py-10 max-w-[1400px]">
        {/* Header */}
        <header className="text-center mb-12 p-10 bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-2 border-cyan-500/30 rounded-xl backdrop-blur-sm">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent" style={{ letterSpacing: '3px' }}>
            ⚠ WASTELAND ICONS ⚠
          </h1>
          <p className="text-xl text-gray-300 mb-6">Professional Post-Apocalyptic Icon Pack - Multi-Format</p>
          
          <div className="flex justify-center gap-4 flex-wrap mb-6">
            <div className="bg-cyan-500/20 border-2 border-cyan-400 px-5 py-3 rounded-lg text-cyan-400 font-bold text-sm">
              📦 SVG - Scalable Vector
            </div>
            <div className="bg-purple-500/20 border-2 border-purple-400 px-5 py-3 rounded-lg text-purple-400 font-bold text-sm">
              🖼️ PNG - 6 Sizes (16-512px)
            </div>
            <div className="bg-pink-500/20 border-2 border-pink-400 px-5 py-3 rounded-lg text-pink-400 font-bold text-sm">
              🎮 Game Engine Ready
            </div>
          </div>

          <div className="flex justify-around flex-wrap gap-6 my-8">
            <div className="text-center">
              <div className="text-5xl font-bold text-cyan-400">{icons.length}</div>
              <div className="text-sm text-gray-400 uppercase tracking-wider mt-2">Unique Icons</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-purple-400">{icons.length * 7}</div>
              <div className="text-sm text-gray-400 uppercase tracking-wider mt-2">Total Files</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-pink-400">2</div>
              <div className="text-sm text-gray-400 uppercase tracking-wider mt-2">Formats</div>
            </div>
          </div>

          <div className="bg-amber-900/30 border-l-4 border-cyan-400 p-6 rounded-lg text-gray-300 max-w-3xl mx-auto">
            💀 <strong>COMPLETE SURVIVOR&apos;S PACK:</strong> Get all {icons.length} premium post-apocalyptic icons in SVG (vector) format. 
            Perfect for Unity, Unreal Engine, web development, and any creative project. Fully customizable and production-ready.
          </div>
        </header>

        {/* Download Status */}
        {downloadStatus && (
          <div className="fixed top-4 right-4 bg-green-500 text-black px-6 py-3 rounded-lg font-bold z-50 shadow-lg">
            ✅ {downloadStatus}
          </div>
        )}

        {/* Download All Section */}
        <div className="text-center mb-12 p-10 bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-2 border-cyan-400 rounded-xl backdrop-blur-sm">
          <h2 className="text-4xl font-bold text-cyan-400 mb-6 uppercase">Complete Icon Package</h2>
          
          <div className="max-w-md mx-auto bg-gray-900/50 border-2 border-cyan-500/50 rounded-xl p-8 hover:border-cyan-400 transition-all">
            <h3 className="text-2xl font-bold text-cyan-400 mb-4">🌐 SVG BUNDLE</h3>
            <ul className="text-left text-gray-300 mb-6 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-green-400 font-bold">✓</span>
                <span>{icons.length} Icons in SVG format</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 font-bold">✓</span>
                <span>Infinitely scalable vectors</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 font-bold">✓</span>
                <span>Customizable colors in code</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 font-bold">✓</span>
                <span>Tiny file sizes (&lt;5KB each)</span>
              </li>
            </ul>
            <div className="text-4xl font-bold text-green-400 mb-4">FREE</div>
            <button
              onClick={downloadAllSVGs}
              className="w-full py-4 px-8 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-black font-bold rounded-lg text-lg uppercase tracking-wider transition-all hover:scale-105 shadow-lg hover:shadow-green-500/50"
            >
              <span className="mr-2">⬇</span> Download SVG Package
            </button>
          </div>

          <p className="mt-6 text-gray-400 text-sm">
            💡 <strong>Note:</strong> PNG formats (16-512px) available in premium package via Gumroad (coming soon)
          </p>
        </div>

        {/* Format Info */}
        <div className="mb-12 p-8 bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-2 border-cyan-500/30 rounded-xl backdrop-blur-sm">
          <h3 className="text-3xl font-bold text-cyan-400 mb-6">📋 Format Guide</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-900/50 p-6 rounded-lg border-l-4 border-cyan-400">
              <h4 className="text-xl font-bold text-cyan-400 mb-3">📐 SVG Format</h4>
              <p className="text-gray-300 mb-3"><strong>Best For:</strong></p>
              <ul className="list-disc list-inside text-gray-300 space-y-1 mb-4">
                <li>Websites & web apps</li>
                <li>Responsive design</li>
                <li>Logos & branding</li>
                <li>Vector editing</li>
              </ul>
              <p className="text-gray-300"><strong>Features:</strong> Infinite scalability, tiny file sizes, easily customizable colors</p>
            </div>
            
            <div className="bg-gray-900/50 p-6 rounded-lg border-l-4 border-purple-400">
              <h4 className="text-xl font-bold text-purple-400 mb-3">🖼️ PNG Format (Premium)</h4>
              <p className="text-gray-300 mb-3"><strong>Best For:</strong></p>
              <ul className="list-disc list-inside text-gray-300 space-y-1 mb-4">
                <li>Unity & Unreal Engine</li>
                <li>2D game sprites & UI</li>
                <li>Mobile apps</li>
                <li>Fixed-size graphics</li>
              </ul>
              <p className="text-gray-300"><strong>Sizes:</strong> 16x16, 32x32, 64x64, 128x128, 256x256, 512x512px</p>
            </div>
          </div>
        </div>

        {/* Individual Icons */}
        <h2 className="text-4xl font-bold text-center text-cyan-400 mb-10 uppercase">Individual Icon Downloads</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
          {icons.map(icon => (
            <div
              key={icon.name}
              className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-2 border-gray-600 hover:border-cyan-400 rounded-xl p-6 flex flex-col items-center gap-4 transition-all hover:-translate-y-2 hover:shadow-xl hover:shadow-cyan-500/30"
            >
              <div className="w-20 h-20 bg-gray-900/50 rounded-lg flex items-center justify-center p-4">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={icon.color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-full h-full"
                  style={{ filter: 'drop-shadow(0 0 10px rgba(212, 175, 55, 0.5))' }}
                  dangerouslySetInnerHTML={{ __html: icon.svg }}
                />
              </div>
              
              <div className="text-center">
                <div className="text-lg font-bold text-cyan-400 uppercase tracking-wider mb-2">
                  {icon.name.replace(/-/g, ' ')}
                </div>
                <div className="text-sm text-gray-400 leading-relaxed">
                  {icon.desc}
                </div>
              </div>

              <div className="w-full bg-gray-900/50 rounded-lg p-4 text-xs text-gray-400 space-y-1">
                <p>🎨 Color: {icon.color}</p>
                <p>📦 Format: SVG (scalable)</p>
                <p>📏 Viewbox: 24×24</p>
              </div>

              <select
                className="w-full bg-gray-900/80 border border-gray-600 rounded-lg px-4 py-2 text-cyan-400 text-sm cursor-pointer focus:outline-none focus:border-cyan-400"
                value={selectedFormats[icon.name] || 'svg'}
                onChange={(e) => handleFormatChange(icon.name, e.target.value)}
              >
                <option value="svg">SVG - Scalable Vector</option>
                <option value="png-all" disabled>PNG - All Sizes (Premium)</option>
                <option value="both" disabled>Both - SVG + PNGs (Premium)</option>
              </select>

              <button
                onClick={() => handleDownloadIcon(icon)}
                className="w-full py-3 px-4 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-bold rounded-lg uppercase text-sm tracking-wider transition-all hover:scale-105 shadow-lg"
              >
                <span className="mr-2">⬇</span> Download
              </button>
            </div>
          ))}
        </div>

        {/* License Info */}
        <div className="p-8 bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-2 border-cyan-500/30 rounded-xl backdrop-blur-sm">
          <h3 className="text-3xl font-bold text-cyan-400 mb-6">📜 License Information</h3>
          <ul className="space-y-3 text-gray-300">
            <li className="flex items-start gap-3">
              <span className="text-green-400 font-bold text-xl">✅</span>
              <span><strong>Commercial Use:</strong> Use in any commercial project (games, apps, websites)</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-400 font-bold text-xl">✅</span>
              <span><strong>Unlimited Projects:</strong> Use in as many projects as you want</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-400 font-bold text-xl">✅</span>
              <span><strong>Modification:</strong> Customize colors, sizes, and styling</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-400 font-bold text-xl">✅</span>
              <span><strong>Client Work:</strong> Use for client projects and freelance work</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 font-bold text-xl">❌</span>
              <span><strong>No Resale:</strong> Cannot resell or redistribute the icons as-is</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 font-bold text-xl">❌</span>
              <span><strong>No Trademark:</strong> Cannot trademark the icons</span>
            </li>
          </ul>
          <p className="mt-6 text-gray-400">
            <strong>Support:</strong> Free icons include community support. Premium package includes email support and lifetime updates.
          </p>
        </div>

        {/* Back Button */}
        <div className="text-center mt-12">
          <a
            href="/"
            className="inline-block px-8 py-4 bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all duration-300 hover:scale-105"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
