'use client';

import React, { useState, useCallback, useRef } from 'react';
import * as PIXI from 'pixi.js';
import PixiCanvas from '../../components/PixiCanvas';
import { SpriteManager } from '../../lib/SpriteManager';

/**
 * PixiJS Test Page
 * 
 * Tests basic PixiJS rendering with:
 * - Background color
 * - Emoji sprites
 * - Basic animation
 * - Performance monitoring
 */
export default function PixiTestPage() {
  const [isReady, setIsReady] = useState(false);
  const [fps, setFps] = useState(0);
  const [spriteCount, setSpriteCount] = useState(0);
  
  const appRef = useRef(null);
  const spriteManagerRef = useRef(new SpriteManager());
  const spritesRef = useRef([]);

  const handleAppReady = useCallback(async (app) => {
    appRef.current = app;
    spriteManagerRef.current.setApp(app);
    setIsReady(true);

    // Create a container for game objects
    const gameContainer = new PIXI.Container();
    app.stage.addChild(gameContainer);

    // Add some test sprites
    const emojis = ['🌟', '🎮', '🚀', '💎', '🔥', '⚡', '🌈', '🎯'];
    const sprites = [];

    for (let i = 0; i < 50; i++) {
      const emoji = emojis[i % emojis.length];
      const sprite = await spriteManagerRef.current.createSprite(emoji, 32);
      
      if (sprite) {
        sprite.x = Math.random() * 750 + 25;
        sprite.y = Math.random() * 550 + 25;
        sprite.vx = (Math.random() - 0.5) * 2;
        sprite.vy = (Math.random() - 0.5) * 2;
        
        gameContainer.addChild(sprite);
        sprites.push(sprite);
      }
    }

    spritesRef.current = sprites;
    setSpriteCount(sprites.length);

    // Animation loop
    let frameCount = 0;
    let lastTime = performance.now();

    app.ticker.add(() => {
      // Animate sprites
      sprites.forEach(sprite => {
        sprite.x += sprite.vx;
        sprite.y += sprite.vy;
        sprite.rotation += 0.02;

        // Bounce off walls
        if (sprite.x < 20 || sprite.x > 780) sprite.vx *= -1;
        if (sprite.y < 20 || sprite.y > 580) sprite.vy *= -1;
      });

      // Calculate FPS
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastTime = now;
      }
    });

    console.log('[PixiTest] Initialized with', sprites.length, 'sprites');
  }, []);

  const addMoreSprites = async () => {
    if (!appRef.current) return;

    const emojis = ['🍎', '🍊', '🍋', '🍇', '🍓', '🍒'];
    const gameContainer = appRef.current.stage.children[0];

    for (let i = 0; i < 100; i++) {
      const emoji = emojis[i % emojis.length];
      const sprite = await spriteManagerRef.current.createSprite(emoji, 24);
      
      if (sprite) {
        sprite.x = 400 + (Math.random() - 0.5) * 100;
        sprite.y = 300 + (Math.random() - 0.5) * 100;
        sprite.vx = (Math.random() - 0.5) * 4;
        sprite.vy = (Math.random() - 0.5) * 4;
        
        gameContainer.addChild(sprite);
        spritesRef.current.push(sprite);
      }
    }

    setSpriteCount(spritesRef.current.length);
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">🎮 PixiJS Test Page</h1>
        
        <div className="mb-4 flex gap-4 items-center">
          <div className={`px-3 py-1 rounded ${isReady ? 'bg-green-600' : 'bg-yellow-600'}`}>
            {isReady ? '✅ PixiJS Ready' : '⏳ Initializing...'}
          </div>
          
          <div className="px-3 py-1 rounded bg-blue-600">
            FPS: {fps}
          </div>
          
          <div className="px-3 py-1 rounded bg-purple-600">
            Sprites: {spriteCount}
          </div>
          
          <button
            onClick={addMoreSprites}
            disabled={!isReady}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded disabled:opacity-50"
          >
            + Add 100 Sprites
          </button>
        </div>

        <PixiCanvas
          width={800}
          height={600}
          backgroundColor={0x1a1a2e}
          onAppReady={handleAppReady}
          className="shadow-2xl"
        />

        <div className="mt-6 p-4 bg-zinc-800 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">📊 Test Results</h2>
          <ul className="space-y-1 text-zinc-300">
            <li>• WebGL rendering: {isReady ? '✅ Working' : '⏳ Loading'}</li>
            <li>• Sprite creation: {spriteCount > 0 ? '✅ Working' : '⏳ Loading'}</li>
            <li>• Animation: {fps > 0 ? '✅ Working' : '⏳ Loading'}</li>
            <li>• Performance: {fps >= 55 ? '🚀 Excellent' : fps >= 30 ? '👍 Good' : '⚠️ Low'}</li>
          </ul>
        </div>

        <div className="mt-4 text-sm text-zinc-500">
          <p>This page tests basic PixiJS v8 functionality in your Next.js environment.</p>
          <p>Click "Add 100 Sprites" to stress test performance.</p>
        </div>
      </div>
    </div>
  );
}
