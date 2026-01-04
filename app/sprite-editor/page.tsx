'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// Dynamically import SpriteEditor to avoid SSR issues
const SpriteEditor = dynamic(() => import('@/components/SpriteEditor.jsx'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-black flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4">🎨</div>
        <p className="text-xl font-semibold text-slate-300">Loading Sprite Editor...</p>
      </div>
    </div>
  )
});

interface SpriteData {
  id: string;
  src: string;
  frameWidth: number;
  frameHeight: number;
}

export default function SpriteEditorPage() {
  const [mounted, setMounted] = useState(false);
  const [sprite, setSprite] = useState<SpriteData | null>(null);
  const [frameWidth, setFrameWidth] = useState(32);
  const [frameHeight, setFrameHeight] = useState(32);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    console.log('SpriteEditorPage mounted');
  }, []);

  const handleSave = (spriteData: any) => {
    console.log('Sprite saved:', spriteData);
    alert('Animation saved! Check console for details.');
  };

  const handleClose = () => {
    setSprite(null);
  };

  const handleSpriteUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setSprite({
          id: Date.now().toString(),
          src: event.target?.result as string,
          frameWidth: frameWidth,
          frameHeight: frameHeight
        });
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🎨</div>
          <p className="text-xl font-semibold text-slate-300">Initializing...</p>
        </div>
      </div>
    );
  }

  if (!sprite) {
    return (
      <div className="relative z-10 min-h-screen bg-gradient-to-br from-black via-slate-950 to-black flex items-center justify-center p-6">
        <div className="bg-gray-800 p-8 rounded-lg shadow-xl max-w-2xl w-full">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">🎨</div>
            <h1 className="text-3xl font-bold text-white mb-2">Sprite Editor</h1>
            <p className="text-gray-400">Upload a sprite sheet to create animations</p>
          </div>
          
          <div className="space-y-6">
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Frame Dimensions</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Frame Width (px)
                  </label>
                  <input
                    type="number"
                    value={frameWidth}
                    onChange={(e) => setFrameWidth(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-cyan-500"
                    min="8"
                    max="512"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Frame Height (px)
                  </label>
                  <input
                    type="number"
                    value={frameHeight}
                    onChange={(e) => setFrameHeight(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-cyan-500"
                    min="8"
                    max="512"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400">
                Set the size of each frame in your sprite sheet
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Upload Sprite Sheet
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleSpriteUpload}
                className="block w-full text-sm text-gray-300
                  file:mr-4 file:py-3 file:px-6
                  file:rounded file:border-0
                  file:text-sm file:font-semibold
                  file:bg-cyan-600 file:text-white
                  hover:file:bg-cyan-700
                  cursor-pointer border border-gray-600 rounded bg-gray-700 p-2"
              />
            </div>
            
            <div className="bg-gray-900 p-4 rounded border border-gray-700">
              <h3 className="text-sm font-semibold text-white mb-3">💡 Tips:</h3>
              <div className="text-xs text-gray-400 space-y-2">
                <p>• Upload a sprite sheet image (PNG recommended for transparency)</p>
                <p>• Set frame dimensions to match your sprite size (common: 16x16, 32x32, 64x64)</p>
                <p>• The editor will automatically split your sheet into frames</p>
                <p>• You can create multi-state animations with transitions</p>
                <p>• Export animations to integrate with the Game Builder</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/game-builder')}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded transition-all font-medium shadow-lg hover:shadow-purple-500/50"
              >
                ← Back to Game Builder
              </button>
              <button
                onClick={() => router.push('/')}
                className="flex-1 py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors font-medium"
              >
                Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 min-h-screen bg-gradient-to-br from-black via-slate-950 to-black p-4">
      <SpriteEditor 
        sprite={sprite}
        onSave={handleSave}
        onClose={handleClose}
      />
    </div>
  );
}
