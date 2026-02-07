'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as PIXI from 'pixi.js';

/**
 * PixiCanvas - A React wrapper for PixiJS Application
 * 
 * This component creates and manages a PixiJS WebGL canvas.
 * Uses PixiJS v8 async initialization pattern.
 * 
 * @param {number} width - Canvas width in pixels
 * @param {number} height - Canvas height in pixels
 * @param {number} backgroundColor - Background color as hex (e.g., 0x87CEEB)
 * @param {function} onAppReady - Callback when PixiJS app is initialized
 * @param {function} onAppDestroy - Callback before app is destroyed (for cleanup)
 */
const PixiCanvas = ({ 
  width = 800, 
  height = 600, 
  backgroundColor = 0x87CEEB,
  onAppReady,
  onAppDestroy,
  className = ''
}) => {
  const containerRef = useRef(null);
  const appRef = useRef(null);
  const isInitializedRef = useRef(false);
  const resizeTimeoutRef = useRef(null);
  const [error, setError] = useState(null);

  // Initialize PixiJS Application
  const initPixi = useCallback(async () => {
    if (isInitializedRef.current || !containerRef.current) return;
    isInitializedRef.current = true;

    try {
      // Create new PixiJS Application
      const app = new PIXI.Application();
      
      // Initialize with PixiJS v8 async pattern
      await app.init({
        width,
        height,
        backgroundColor,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        powerPreference: 'high-performance',
      });

      // Store reference
      appRef.current = app;

      // Mount canvas to DOM
      if (containerRef.current) {
        containerRef.current.appendChild(app.canvas);
      }

      // Notify parent that app is ready
      if (onAppReady) {
        onAppReady(app);
      }

      // Detect renderer type (PixiJS v8 compatible)
      const rendererType = app.renderer.name || 
        (app.renderer.constructor.name.includes('WebGL') ? 'WebGL' : 'WebGPU');
      
      console.log('[PixiJS] Application initialized successfully');
      console.log(`[PixiJS] Renderer: ${rendererType}`);
      console.log(`[PixiJS] Resolution: ${app.renderer.resolution}x`);
      setError(null);
      
    } catch (err) {
      console.error('[PixiJS] Failed to initialize:', err);
      setError(err.message || 'Failed to initialize PixiJS');
      isInitializedRef.current = false;
    }
  }, [width, height, backgroundColor, onAppReady]);

  // Initialize on mount
  useEffect(() => {
    initPixi();

    // Cleanup on unmount
    return () => {
      // Clear any pending resize timeout
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
        resizeTimeoutRef.current = null;
      }
      
      if (appRef.current) {
        // Notify parent before destroying
        if (onAppDestroy) {
          onAppDestroy(appRef.current);
        }

        // Destroy PixiJS application and all children
        appRef.current.destroy(true, { 
          children: true, 
          texture: true,
          baseTexture: true 
        });
        appRef.current = null;
        isInitializedRef.current = false;
        
        console.log('[PixiJS] Application destroyed');
      }
    };
  }, [initPixi, onAppDestroy]);

  // Handle resize with debounce to prevent flicker
  useEffect(() => {
    if (!appRef.current) return;
    
    // Clear any pending resize
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    
    // Debounce resize by 16ms (~1 frame)
    resizeTimeoutRef.current = setTimeout(() => {
      if (appRef.current) {
        appRef.current.renderer.resize(width, height);
      }
    }, 16);
    
    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [width, height]);

  // Handle background color change
  useEffect(() => {
    if (appRef.current) {
      appRef.current.renderer.background.color = backgroundColor;
    }
  }, [backgroundColor]);

  // Show error state if initialization failed
  if (error) {
    return (
      <div 
        className={className}
        style={{ 
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width,
          height,
          border: '4px solid #ef4444',
          borderRadius: '8px',
          backgroundColor: '#1f1f1f',
          color: '#ef4444',
          fontSize: '14px',
          padding: '16px',
          textAlign: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚠️</div>
          <div>PixiJS Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={className}
      style={{ 
        display: 'inline-block',
        border: '4px solid #27272a',
        borderRadius: '8px',
        overflow: 'hidden',
        lineHeight: 0, // Prevent extra space below canvas
      }} 
    />
  );
};

export default PixiCanvas;
