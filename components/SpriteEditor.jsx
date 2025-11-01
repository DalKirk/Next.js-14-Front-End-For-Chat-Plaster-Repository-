'use client';

import React, { useState, useEffect, useRef } from 'react';
import NextImage from 'next/image';

/**
 * Advanced Sprite Editor Component
 * Allows users to:
 * - Load sprite sheets and split into frames
 * - Preview animations in real-time
 * - Select frames to create custom animations
 * - Adjust animation speed
 * - Export animation definitions
 */
function SpriteEditor({ sprite, onSave, onClose }) {
  const [frames, setFrames] = useState([]);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [animationSpeed, setAnimationSpeed] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const canvasRef = useRef(null);
  
  // Load sprite sheet and split into frames
  useEffect(() => {
    if (!sprite) return;
    
    const img = new Image();
    img.src = sprite.src;
    img.onload = () => {
      const frameCount = Math.floor(img.width / sprite.frameWidth);
      const newFrames = [];
      
      for (let i = 0; i < frameCount; i++) {
        const canvas = document.createElement('canvas');
        canvas.width = sprite.frameWidth;
        canvas.height = sprite.frameHeight;
        const ctx = canvas.getContext('2d');
        
        ctx.drawImage(
          img,
          i * sprite.frameWidth, 0,
          sprite.frameWidth, sprite.frameHeight,
          0, 0,
          sprite.frameWidth, sprite.frameHeight
        );
        
        newFrames.push({
          id: i,
          dataUrl: canvas.toDataURL(),
          selected: false
        });
      }
      
      setFrames(newFrames);
    };
  }, [sprite]);
  
  // Animation preview
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentFrame(prev => (prev + 1) % frames.length);
    }, animationSpeed);
    
    return () => clearInterval(interval);
  }, [isPlaying, animationSpeed, frames.length]);
  
  // Draw current frame
  useEffect(() => {
    if (!canvasRef.current || frames.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const img = new Image();
    img.src = frames[currentFrame].dataUrl;
    img.onload = () => {
      // Draw at actual frame size (centered if canvas is larger)
      const x = (canvas.width - img.width) / 2;
      const y = (canvas.height - img.height) / 2;
      ctx.drawImage(img, x, y, img.width, img.height);
    };
  }, [currentFrame, frames]);
  
  function createAnimation() {
    const selectedFrames = frames.filter(f => f.selected).map(f => f.id);
    
    if (selectedFrames.length === 0) {
      alert('Select frames first');
      return;
    }
    
    const animationName = prompt('Animation name:');
    if (!animationName) return;
    
    const animation = {
      name: animationName,
      frames: selectedFrames,
      speed: animationSpeed,
      loop: true
    };
    
    onSave(animation);
  }
  
  function toggleFrameSelection(frameId) {
    setFrames(prevFrames => prevFrames.map(f => 
      f.id === frameId ? { ...f, selected: !f.selected } : f
    ));
  }
  
  function selectAllFrames() {
    setFrames(prevFrames => prevFrames.map(f => ({ ...f, selected: true })));
  }
  
  function clearSelection() {
    setFrames(prevFrames => prevFrames.map(f => ({ ...f, selected: false })));
  }
  
  // Reserved for future multi-select functionality
  // function selectRange(startId, endId) {
  //   const start = Math.min(startId, endId);
  //   const end = Math.max(startId, endId);
  //   setFrames(frames.map(f => ({
  //     ...f,
  //     selected: f.id >= start && f.id <= end ? true : f.selected
  //   })));
  // }
  
  if (!sprite) {
    return (
      <div className="bg-gray-800 p-4 rounded-lg text-center">
        <p className="text-gray-400">No sprite selected</p>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-800 p-3 sm:p-4 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-3 sm:mb-4">
        <h3 className="text-base sm:text-lg font-bold">Sprite Editor</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="px-2 sm:px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
          >
            Close
          </button>
        )}
      </div>
      
      {/* Preview */}
      <div className="mb-3 sm:mb-4">
        <div className="flex items-center justify-center bg-gray-900 border border-gray-600 rounded p-2 sm:p-4 min-h-[150px] sm:min-h-[200px]">
          <canvas
            ref={canvasRef}
            width={Math.min(sprite?.frameWidth || 128, 400)}
            height={Math.min(sprite?.frameHeight || 128, 400)}
            className="image-rendering-pixelated border border-gray-700 max-w-full"
            style={{ 
              imageRendering: 'pixelated'
            }}
          />
        </div>
        
        <div className="flex gap-1 sm:gap-2 mt-2 flex-wrap">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors text-sm sm:text-base"
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
          
          <button
            onClick={() => setCurrentFrame((prev) => (prev - 1 + frames.length) % frames.length)}
            className="px-3 sm:px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors disabled:opacity-50 text-sm sm:text-base"
            disabled={frames.length === 0}
          >
            ⏮ <span className="hidden sm:inline">Prev</span>
          </button>
          
          <button
            onClick={() => setCurrentFrame((prev) => (prev + 1) % frames.length)}
            className="px-3 sm:px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors disabled:opacity-50 text-sm sm:text-base"
            disabled={frames.length === 0}
          >
            ⏭ <span className="hidden sm:inline">Next</span>
          </button>
          
          <label className="flex-1 sm:flex-none flex items-center gap-2 bg-gray-700 px-2 sm:px-3 py-2 rounded text-xs sm:text-sm">
            <span className="hidden sm:inline">Speed:</span>
            <input
              type="range"
              min="50"
              max="500"
              value={animationSpeed}
              onChange={(e) => setAnimationSpeed(Number(e.target.value))}
              className="w-20 sm:w-32 flex-1"
            />
            <span className="font-mono whitespace-nowrap">{animationSpeed}ms</span>
          </label>
        </div>
      </div>
      
      {/* Frame Timeline */}
      <div className="mb-3 sm:mb-4">
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-xs sm:text-sm font-semibold">Frames ({frames.length})</h4>
          <div className="flex gap-1 sm:gap-2">
            <button
              onClick={selectAllFrames}
              className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            >
              <span className="hidden sm:inline">Select </span>All
            </button>
            <button
              onClick={clearSelection}
              className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            >
              Clear
            </button>
          </div>
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2 bg-gray-900 p-2 rounded border border-gray-700">
          {frames.length === 0 ? (
            <p className="text-gray-500 text-sm">Loading frames...</p>
          ) : (
            frames.map(frame => (
              <div
                key={frame.id}
                onClick={() => toggleFrameSelection(frame.id)}
                className={`flex-shrink-0 cursor-pointer border-2 rounded overflow-hidden transition-all ${
                  frame.selected ? 'border-blue-500 shadow-lg shadow-blue-500/50' : 'border-gray-600'
                } ${currentFrame === frame.id ? 'ring-2 ring-yellow-500' : ''}`}
              >
                <div className="w-16 h-16 flex items-center justify-center bg-gray-800 overflow-hidden">
                  <NextImage
                    src={frame.dataUrl}
                    alt={`Frame ${frame.id}`}
                    width={64}
                    height={64}
                    unoptimized
                    style={{ 
                      imageRendering: 'pixelated',
                      maxWidth: '64px',
                      maxHeight: '64px',
                      width: 'auto',
                      height: 'auto'
                    }}
                  />
                </div>
                <div className={`text-xs text-center py-1 ${
                  frame.selected ? 'bg-blue-600' : 'bg-gray-700'
                }`}>
                  {frame.id}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Animation Creation */}
      <div className="bg-gray-900 p-3 rounded border border-gray-700">
        <h4 className="text-xs sm:text-sm font-semibold mb-2">Create Animation</h4>
        <p className="text-xs text-gray-400 mb-3">
          Select frames and click Create Animation to define a new animation sequence
        </p>
        
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <button
            onClick={createAnimation}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition-colors font-semibold text-sm sm:text-base"
          >
            ✨ Create Animation
          </button>
          
          <div className="text-xs text-gray-400 flex items-center justify-center sm:justify-start">
            {frames.filter(f => f.selected).length} frame(s) selected
          </div>
        </div>
      </div>
      
      {/* Info Section */}
      <div className="mt-4 text-xs text-gray-500 space-y-1">
        <p>💡 <strong>Tip:</strong> Click frames to select/deselect them for your animation</p>
        <p>💡 <strong>Tip:</strong> Use the preview controls to test your animation</p>
        <p>💡 <strong>Tip:</strong> Adjust speed slider to find the perfect timing</p>
      </div>
    </div>
  );
}

export default SpriteEditor;
