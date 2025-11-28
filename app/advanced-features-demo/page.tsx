'use client';

import React, { useState, useEffect, useRef } from 'react';
import TileSystem from '@systems/TileSystem';
import TilePalette from '@/components/TilePalette';
import SpriteEditor from '@/components/SpriteEditor';
import BrushTool from '@systems/BrushTool';
import BrushControls from '@/components/BrushControls';
import LayerSystem from '@systems/LayerSystem';
import LayerPanel from '@/components/LayerPanel';

/**
 * Demo page for testing the advanced features
 * Access at: /advanced-features-demo
 */
export default function AdvancedFeaturesDemo() {
  const [showTilePalette, setShowTilePalette] = useState(false);
  // const [showSpriteEditor] = useState(false); // Reserved for future sprite editor toggle
  const [showBrushControls, setShowBrushControls] = useState(false);
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [selectedTileset, setSelectedTileset] = useState<string | null>(null);
  const [selectedTileId, setSelectedTileId] = useState(0);
  const [activeTab, setActiveTab] = useState('tiles');
  const [isMouseDown, setIsMouseDown] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tileSystemRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const brushToolRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layerSystemRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);
  const cameraRef = useRef({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Sprite editor state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [customSprite, setCustomSprite] = useState<any>(null);
  const [frameWidth, setFrameWidth] = useState(128);
  const [frameHeight, setFrameHeight] = useState(128);
  const [uploadedFrames, setUploadedFrames] = useState<string[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [sampleSprite, setSampleSprite] = useState<any>(null);
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const multipleFilesInputRef = useRef<HTMLInputElement>(null);
  
  // Initialize systems
  useEffect(() => {
    const ts = new TileSystem(40);
    const brush = new BrushTool();
    const layers = new LayerSystem();
    
    brushToolRef.current = brush;
    layerSystemRef.current = layers;
    
    // Create placeholder tilesets with colors
    const createPlaceholderTileset = (name: string, colors: string[]) => {
      const canvas = document.createElement('canvas');
      canvas.width = 64; // 4 tiles x 16px
      canvas.height = 16;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';
      
      colors.forEach((color, i) => {
        // Fill tile
        ctx.fillStyle = color;
        ctx.fillRect(i * 16, 0, 16, 16);
        
        // Border
        ctx.strokeStyle = '#000';
        ctx.strokeRect(i * 16, 0, 16, 16);
        
        // Label
        ctx.fillStyle = '#fff';
        ctx.font = '10px monospace';
        ctx.fillText(String(i), i * 16 + 4, 12);
      });
      
      return canvas.toDataURL();
    };
    
    ts.loadTileset('terrain', createPlaceholderTileset('terrain', 
      ['#8B7355', '#A0826D', '#6B5344', '#5A4433']
    ), 16, 16);
    
    ts.loadTileset('objects', createPlaceholderTileset('objects',
      ['#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B']
    ), 16, 16);
    
    tileSystemRef.current = ts;
  }, []);
  
  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    function draw() {
      if (!canvas || !ctx) return;
      
      // Clear
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw tiles
      if (tileSystemRef.current) {
        tileSystemRef.current.draw(
          ctx,
          cameraRef.current.x,
          cameraRef.current.y,
          canvas.width,
          canvas.height
        );
      }
      
      // Draw grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      
      const tileSize = 40;
      for (let x = 0; x < canvas.width; x += tileSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += tileSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
      
      // Stats
      if (tileSystemRef.current) {
        ctx.fillStyle = '#fff';
        ctx.font = '14px monospace';
        ctx.fillText(`Tiles: ${tileSystemRef.current.getTileCount()}`, 10, 20);
        if (selectedTileset) {
          ctx.fillText(`Selected: ${selectedTileset} #${selectedTileId}`, 10, 40);
        }
      }
      
      animationFrameRef.current = requestAnimationFrame(draw);
    }
    
    draw();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [selectedTileset, selectedTileId]);
  
  // Canvas mouse handlers
  function handleCanvasMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    setIsMouseDown(true);
    handleCanvasPaint(e);
  }
  
  function handleCanvasMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (isMouseDown) {
      handleCanvasPaint(e);
    }
  }
  
  function handleCanvasMouseUp() {
    setIsMouseDown(false);
    if (brushToolRef.current) {
      brushToolRef.current.reset();
    }
  }
  
  // Core paint logic shared by mouse and touch
  function handlePaintAt(worldX: number, worldY: number, opts?: { shift?: boolean; ctrl?: boolean }) {
    if (!tileSystemRef.current || !selectedTileset) return;
    const { x, y } = tileSystemRef.current.worldToGrid(worldX, worldY);
    const shift = !!opts?.shift;
    const ctrl = !!opts?.ctrl;

    if (brushToolRef.current) {
      const pickedTile = brushToolRef.current.apply(
        tileSystemRef.current,
        x,
        y,
        selectedTileset,
        selectedTileId
      );
      if (pickedTile && brushToolRef.current.mode === 'eyedropper') {
        setSelectedTileset(pickedTile.tilesetName);
        setSelectedTileId(pickedTile.tileId);
        brushToolRef.current.setMode('paint');
      }
      return;
    }

    // Fallback simple placement
    if (shift) {
      tileSystemRef.current.removeTile(x, y);
    } else if (ctrl) {
      tileSystemRef.current.floodFill(x, y, selectedTileset, selectedTileId, 500);
    } else {
      tileSystemRef.current.setTile(x, y, selectedTileset, selectedTileId);
    }
  }

  function handleCanvasPaint(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const worldX = e.clientX - rect.left;
    const worldY = e.clientY - rect.top;
    handlePaintAt(worldX, worldY, { shift: e.shiftKey, ctrl: e.ctrlKey });
  }

  // Touch support
  function handleTouchStart(e: React.TouchEvent<HTMLCanvasElement>) {
    if (!canvasRef.current) return;
    e.preventDefault();
    setIsMouseDown(true);
    const rect = canvasRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    if (!touch) return;
    const worldX = touch.clientX - rect.left;
    const worldY = touch.clientY - rect.top;
    handlePaintAt(worldX, worldY);
  }

  function handleTouchMove(e: React.TouchEvent<HTMLCanvasElement>) {
    if (!isMouseDown || !canvasRef.current) return;
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    if (!touch) return;
    const worldX = touch.clientX - rect.left;
    const worldY = touch.clientY - rect.top;
    handlePaintAt(worldX, worldY);
  }

  function handleTouchEnd(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    setIsMouseDown(false);
    if (brushToolRef.current) {
      brushToolRef.current.reset();
    }
  }
  
  function clearAllTiles() {
    if (tileSystemRef.current) {
      tileSystemRef.current.clear();
    }
  }
  
  function exportTiles() {
    if (!tileSystemRef.current) return;
    const data = tileSystemRef.current.export();
    console.log('Exported tiles:', data);
    alert('Tile data exported to console');
  }
  
  // Handle sprite sheet upload
  function handleSpriteUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        // Auto-detect if this is a single sprite or a sprite sheet
        const potentialFrames = Math.floor(img.width / frameWidth);
        
        // If the image dimensions match the frame dimensions, it's a single sprite
        if (img.width === frameWidth && img.height === frameHeight) {
          setCustomSprite({
            src: img.src,
            frameWidth: img.width,
            frameHeight: img.height
          });
          alert(`✓ Single sprite loaded: ${img.width}x${img.height}px`);
        } 
        // If width is evenly divisible, likely a sprite sheet
        else if (img.width % frameWidth === 0 && img.height === frameHeight) {
          setCustomSprite({
            src: img.src,
            frameWidth: frameWidth,
            frameHeight: frameHeight
          });
          alert(`✓ Sprite sheet loaded: ${potentialFrames} frames of ${frameWidth}x${frameHeight}px each`);
        }
        // Otherwise, use the full image as a single frame
        else {
          setCustomSprite({
            src: img.src,
            frameWidth: img.width,
            frameHeight: img.height
          });
          setFrameWidth(img.width);
          setFrameHeight(img.height);
          alert(`✓ Image loaded as single sprite: ${img.width}x${img.height}px\n(Frame size adjusted to match)`);
        }
      };
    };
    reader.readAsDataURL(file);
  }
  
  // Load the 8 sample sprites on mount
  useEffect(() => {
    loadSampleSprites();
  }, []);
  
  async function loadSampleSprites() {
    setIsLoadingSample(true);
    
    const spriteFiles = [
      '/sprites/StartWalk_01.png',
      '/sprites/Sprite_StartWalk_02.png',
      '/sprites/Sprite_Walk_03.png',
      '/sprites/Sprite_Walk_04.png',
      '/sprites/Sprite_Walk_05.png',
      '/sprites/Sprite_Walk_06.png',
      '/sprites/Sprite_Walk_07.png',
      '/sprites/Sprite_Walk_08.png'
    ];
    
    try {
      // Load all sprite images
      const loadPromises = spriteFiles.map(src => {
        return new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = src;
        });
      });
      
      const images = await Promise.all(loadPromises);
      
      // Get max dimensions
      const maxWidth = Math.max(...images.map(img => img.width));
      const maxHeight = Math.max(...images.map(img => img.height));
      
      // Create horizontal sprite sheet
      const canvas = document.createElement('canvas');
      canvas.width = maxWidth * images.length;
      canvas.height = maxHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;
      
      // Draw all frames
      images.forEach((img, index) => {
        ctx.drawImage(img, index * maxWidth, 0, maxWidth, maxHeight);
      });
      
      const spriteData = {
        src: canvas.toDataURL(),
        frameWidth: maxWidth,
        frameHeight: maxHeight
      };
      
      setSampleSprite(spriteData);
      setFrameWidth(maxWidth);
      setFrameHeight(maxHeight);
      
    } catch (error) {
      console.error('Error loading sample sprites:', error);
      // Fallback to a simple sample if sprites don't load
      setSampleSprite({
        src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAAAgCAYAAADaInAlAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEgAACxIB0t1+/AAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAEGSURBVHic7dYxCoNAEIbhf40WFhaC9zkDKQQvYJdCwN7GwkPY2Np6AQsbwUIMphARt9hJBvJ9zcLM7Ow/DDu7m1QAAAAAAAAAAAAAAAAAAACAfRLZA+CNBmqkQWr+2kh1Ukn2UODXLdRP/Xqh7qmUWsmeDfyqQN1Sv16oe2qlRrbngD+xVLeS/fUCdU+N1Mr2HPAnFlpJde+Fuqdm6iR7NvCLArVS3XuhbqmZesmeC/yqQN1S/XqhbqmZesmeDfyicOuS7bnAh4h0FQAAAAAAAAAAAAAAAAAAAACweZlsD8DbCFWSPQQAAAAAAAAAAAAAAAAAAPjNExYRU2d7YjC2AAAAAElFTkSuQmCC',
        frameWidth: 32,
        frameHeight: 32
      });
    } finally {
      setIsLoadingSample(false);
    }
  }
  
  function handleLoadSample() {
    setCustomSprite(null);
    setUploadedFrames([]);
    loadSampleSprites();
  }
  
  // Handle multiple image uploads for animation
  function handleMultipleImagesUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      alert('Please upload image files');
      return;
    }
    
    // Load all images
    const loadPromises = imageFiles.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          resolve(event.target?.result as string);
        };
        reader.readAsDataURL(file);
      });
    });
    
    Promise.all(loadPromises).then(imageSrcs => {
      // Get dimensions from first image to determine frame size
      const img = new Image();
      img.src = imageSrcs[0];
      img.onload = () => {
        setUploadedFrames(imageSrcs);
        
        // Create a horizontal sprite sheet from all images
        const canvas = document.createElement('canvas');
        const maxWidth = Math.max(...imageSrcs.map(() => img.width));
        const maxHeight = Math.max(...imageSrcs.map(() => img.height));
        
        canvas.width = maxWidth * imageSrcs.length;
        canvas.height = maxHeight;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) return;
        
        // Load and draw each image
        let loaded = 0;
        imageSrcs.forEach((src, index) => {
          const frameImg = new Image();
          frameImg.src = src;
          frameImg.onload = () => {
            ctx.drawImage(frameImg, index * maxWidth, 0, maxWidth, maxHeight);
            loaded++;
            
            // When all images are drawn, set as sprite
            if (loaded === imageSrcs.length) {
              setCustomSprite({
                src: canvas.toDataURL(),
                frameWidth: maxWidth,
                frameHeight: maxHeight
              });
              setFrameWidth(maxWidth);
              setFrameHeight(maxHeight);
              alert(`✓ ${imageSrcs.length} images loaded as animation frames!\nFrame size: ${maxWidth}x${maxHeight}px`);
            }
          };
        });
      };
    });
  }
  
  // Types for animation objects coming from the SpriteEditor onSave
  interface AnimationStateData {
    frames?: any[];
    frameDuration?: number;
    speed?: number;
    loop?: boolean;
  }
  interface AnimationData {
    name?: string;
    frames?: any[];
    speed?: number;
    loop?: boolean;
    states?: Record<string, AnimationStateData> | null;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">Advanced Features Demo</h1>
            <p className="text-gray-400">
              Test the Tile System, Tile Palette, and Sprite Editor
            </p>
          </div>
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-purple-500 text-white px-4 py-2 rounded-lg transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 19-7-7 7-7"/>
              <path d="M19 12H5"/>
            </svg>
            <span className="hidden sm:inline">Back</span>
          </button>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('tiles')}
            className={`px-6 py-3 rounded-t-lg transition-colors ${
              activeTab === 'tiles'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            🧱 Tile System
          </button>
          <button
            onClick={() => setActiveTab('sprites')}
            className={`px-6 py-3 rounded-t-lg transition-colors ${
              activeTab === 'sprites'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            ✨ Sprite Editor
          </button>
        </div>
        
        {/* Tile System Tab */}
        {activeTab === 'tiles' && (
          <div className="space-y-6">
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-2xl font-bold mb-4">Tile System Demo</h2>
              
              {/* Controls */}
              <div className="flex gap-3 mb-4 flex-wrap">
                <button
                  onClick={() => setShowTilePalette(!showTilePalette)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                >
                  {showTilePalette ? 'Hide' : 'Show'} Tile Palette
                </button>
                <button
                  onClick={() => setShowBrushControls(!showBrushControls)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded transition-colors"
                >
                  🖌️ {showBrushControls ? 'Hide' : 'Show'} Brush
                </button>
                <button
                  onClick={() => setShowLayerPanel(!showLayerPanel)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded transition-colors"
                >
                  🎨 {showLayerPanel ? 'Hide' : 'Show'} Layers
                </button>
                <button
                  onClick={clearAllTiles}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
                >
                  Clear All Tiles
                </button>
                <button
                  onClick={exportTiles}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition-colors"
                >
                  Export to Console
                </button>
              </div>
              
              {/* Instructions */}
              <div className="bg-gray-900 p-4 rounded mb-4">
                <h3 className="font-semibold mb-2">Instructions:</h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Click &quot;Show Tile Palette&quot; to select tiles</li>
                  <li>• <strong>Click</strong> on canvas to place tiles</li>
                  <li>• <strong>Shift+Click</strong> to remove tiles</li>
                  <li>• <strong>Ctrl+Click</strong> for flood fill</li>
                </ul>
              </div>
              
              {/* Canvas */}
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchEnd}
                  width={800}
                  height={600}
                  className="border border-gray-700 rounded cursor-crosshair bg-gray-950"
                  style={{ touchAction: 'none' }}
                />
                
                {/* Tile Palette Overlay */}
                {showTilePalette && (
                  <div className="absolute top-4 right-4 z-10">
                    <TilePalette
                      tileSystem={tileSystemRef.current}
                      onTileSelect={(tileset: string, tileId: number) => {
                        setSelectedTileset(tileset);
                        setSelectedTileId(tileId);
                      }}
                      onClose={() => setShowTilePalette(false)}
                    />
                  </div>
                )}
                
                {/* Brush Controls Overlay */}
                {showBrushControls && brushToolRef.current && (
                  <div className="absolute top-4 left-4 z-10">
                    <BrushControls
                      brush={brushToolRef.current}
                      onChange={() => {
                        // Force re-render
                        setShowBrushControls(true);
                      }}
                    />
                  </div>
                )}
                
                {/* Layer Panel Overlay */}
                {showLayerPanel && layerSystemRef.current && (
                  <div className="absolute bottom-4 left-4 z-10">
                    <LayerPanel
                      layerSystem={layerSystemRef.current}
                      onChange={() => {
                        // Force re-render
                        setShowLayerPanel(true);
                      }}
                      onClose={() => setShowLayerPanel(false)}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Sprite Editor Tab */}
        {activeTab === 'sprites' && (
          <div className="space-y-6">
            {/* Upload Controls */}
            <div className="bg-gray-800 p-4 sm:p-6 rounded-lg">
              <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Load Sprite or Sprite Sheet</h2>
              
              <div className="space-y-4">
                <div className="bg-gray-900 border border-gray-700 rounded p-3">
                  <p className="text-gray-300 text-sm mb-2">
                    📌 <strong>Upload Options:</strong>
                  </p>
                  <ul className="text-gray-400 text-xs sm:text-sm space-y-1 ml-4">
                    <li>• <strong>Single Sprite:</strong> Upload any size image - it will be treated as one frame</li>
                    <li>• <strong>Sprite Sheet:</strong> Set frame dimensions first, then upload horizontal strip (e.g., 4 frames of 32x32 = 128x32 total)</li>
                    <li>• <strong>Multiple Images:</strong> Select multiple images at once to create an animation (frames will be combined automatically)</li>
                  </ul>
                </div>
                
                {/* Frame Size Inputs */}
                <div className="flex gap-2 sm:gap-4 items-end flex-wrap">
                  <div className="w-full sm:w-auto">
                    <label className="block text-xs sm:text-sm text-gray-400 mb-1">
                      Frame Width (px) 
                      <span className="text-gray-500 text-xs ml-1 hidden sm:inline">(for sprite sheets)</span>
                    </label>
                    <input
                      type="number"
                      value={frameWidth}
                      onChange={(e) => setFrameWidth(Math.max(1, parseInt(e.target.value) || 32))}
                      className="bg-gray-900 border border-gray-700 rounded px-3 py-2 w-full sm:w-32 text-white text-sm sm:text-base"
                      min="1"
                    />
                  </div>
                  
                  <div className="w-full sm:w-auto">
                    <label className="block text-xs sm:text-sm text-gray-400 mb-1">
                      Frame Height (px)
                      <span className="text-gray-500 text-xs ml-1 hidden sm:inline">(for sprite sheets)</span>
                    </label>
                    <input
                      type="number"
                      value={frameHeight}
                      onChange={(e) => setFrameHeight(Math.max(1, parseInt(e.target.value) || 32))}
                      className="bg-gray-900 border border-gray-700 rounded px-3 py-2 w-full sm:w-32 text-white text-sm sm:text-base"
                      min="1"
                    />
                  </div>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleSpriteUpload}
                    className="hidden"
                  />
                  
                  <input
                    ref={multipleFilesInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleMultipleImagesUpload}
                    className="hidden"
                  />
                  
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" className="sm:w-[18px] sm:h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    <span className="hidden sm:inline">Upload Single/Sheet</span>
                    <span className="sm:hidden">Single/Sheet</span>
                  </button>
                  
                  <button
                    onClick={() => multipleFilesInputRef.current?.click()}
                    className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" className="sm:w-[18px] sm:h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <path d="m21 15-5-5L5 21"/>
                    </svg>
                    <span className="hidden sm:inline">Upload Multiple Images</span>
                    <span className="sm:hidden">Multiple</span>
                  </button>
                  
                  <button
                    onClick={handleLoadSample}
                    className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors text-sm sm:text-base"
                  >
                    <span className="hidden sm:inline">{customSprite ? 'Reset to Sample' : 'Reload Sample'}</span>
                    <span className="sm:hidden">Sample</span>
                  </button>
                  
                  {customSprite && (
                    <button
                      onClick={() => {
                        setCustomSprite(null);
                        setUploadedFrames([]);
                      }}
                      className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" className="sm:w-[18px] sm:h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18"/>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                      </svg>
                      <span className="hidden sm:inline">Clear Upload</span>
                      <span className="sm:hidden">Clear</span>
                    </button>
                  )}
                </div>
                
                {isLoadingSample && (
                  <div className="bg-gray-900 border border-blue-700 rounded p-3">
                    <p className="text-blue-400 text-xs sm:text-sm">
                      ⏳ Loading 8 sample walk sprites...
                    </p>
                  </div>
                )}
                
                {!isLoadingSample && sampleSprite && !customSprite && (
                  <div className="bg-gray-900 border border-purple-700 rounded p-3">
                    <p className="text-purple-400 text-xs sm:text-sm">
                      ✓ Sample loaded: 8 walk animation frames ({frameWidth}x{frameHeight}px each)
                    </p>
                  </div>
                )}
                
                {customSprite && (
                  <div className="bg-gray-900 border border-green-700 rounded p-3">
                    <p className="text-green-400 text-xs sm:text-sm">
                      ✓ Custom sprite loaded! Frame size: {frameWidth}x{frameHeight}px
                      {uploadedFrames.length > 0 && ` | ${uploadedFrames.length} frames from multiple images`}
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Sprite Editor */}
            <div className="bg-gray-800 p-4 sm:p-6 rounded-lg">
              <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Sprite Editor</h2>
              
              {isLoadingSample ? (
                <div className="text-center py-12">
                  <p className="text-gray-400">Loading sample sprites...</p>
                </div>
              ) : (
                <SpriteEditor
                  sprite={customSprite || sampleSprite}
                  onSave={(animation: AnimationData) => {
                    console.log('Animation created:', animation);
                    let framesSummary = '';
                    if (Array.isArray(animation.frames)) {
                      framesSummary = `Frames: [${animation.frames.join(', ')}]\n`;
                    } else if (animation.states && typeof animation.states === 'object') {
                      const parts = Object.entries(animation.states as Record<string, AnimationStateData>).map(([name, s]) => {
                        const ss = s as AnimationStateData;
                        const count = ss?.frames?.length ?? (Array.isArray(ss) ? ss.length : 0);
                        const dur = ss?.frameDuration ?? ss?.speed ?? '';
                        const loop = typeof ss?.loop === 'boolean' ? ss.loop : '';
                        return `${name} (${count} frames${dur ? `, ${dur}ms` : ''}${loop !== '' ? `, loop:${loop}` : ''})`;
                      });
                      framesSummary = `States: ${parts.join('; ')}\n`;
                    }
                    alert(
                      `Animation "${animation.name || 'untitled'}" created!\n` +
                      framesSummary +
                      (typeof animation.speed === 'number' ? `Speed: ${animation.speed}ms\n` : '') +
                      (typeof animation.loop !== 'undefined' ? `Loop: ${animation.loop}\n` : '')
                    );
                  }}
                  onClose={() => {}}
                />
              )}
            </div>
          </div>
        )}
        
        {/* Documentation Link */}
        <div className="mt-8 bg-gray-800 p-6 rounded-lg">
          <h3 className="text-xl font-bold mb-2">📚 Documentation</h3>
          <p className="text-gray-400 mb-4">
            See <code className="bg-gray-900 px-2 py-1 rounded">ADVANCED_FEATURES_GUIDE.md</code> for
            complete documentation and API reference.
          </p>
          <p className="text-gray-400">
            Integration guide: <code className="bg-gray-900 px-2 py-1 rounded">INTEGRATION_STEPS.js</code>
          </p>
        </div>
      </div>
    </div>
  );
}
