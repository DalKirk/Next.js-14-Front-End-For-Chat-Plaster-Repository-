'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as PIXI from 'pixi.js';
import { 
  MousePointer2, Move, Square, Hand, ZoomIn, ZoomOut,
  Grid, Maximize, RotateCcw, Eye, EyeOff, Lock, Unlock,
  Play, Pause, SkipBack, Settings, Crosshair, Target, Zap,
  Gamepad2, MapPin
} from 'lucide-react';
import { CameraSystem } from '../../lib/CameraSystem';
import { PhysicsSystem, CollisionCategory } from '../../lib/PhysicsSystem';
import { AudioSystem, GameSounds } from '../../lib/AudioSystem';
import { InputSystem, DefaultBindings } from '../../lib/InputSystem';
import BehaviorManager from '../../lib/behaviors/BehaviorManager';
import { EventEvaluator } from '../../lib/events';
import { AssetManager, LayerRenderer, SceneManager } from '../../lib/scenes';

/**
 * SceneView - Main PixiJS canvas with editor tools
 */
const SceneView = ({
  sceneObjects = [],
  selectedObject,
  onSelectObject,
  onUpdateObject,
  onAddObject,
  mode = 'edit', // 'edit' | 'play'
  selectedTool = 'select',
  onToolChange,
  viewSettings = {},
  onViewSettingsChange,
  gameState = {},
  events = [],
  onPixiReady,
  onAudioSystemReady,
  // Scene Manager props
  project,
  currentSceneId,
  currentSceneName, // Display name of current scene
  assets = [], // Project assets for image rendering
  // Player start position
  playerStart,
  onUpdatePlayerStart,
}) => {
  const containerRef = useRef(null);
  const appRef = useRef(null);
  const cameraRef = useRef(null);
  const physicsRef = useRef(null);
  const audioRef = useRef(null);
  const inputRef = useRef(null);
  const worldContainerRef = useRef(null);
  const spritesRef = useRef({});
  const behaviorManagerRef = useRef(null);
  const eventEvaluatorRef = useRef(null);
  const eventsRef = useRef(events);
  const keysHeldRef = useRef(new Set());
  const mouseRef = useRef({ x: 0, y: 0, down: false });
  
  // Scene Manager refs
  const assetManagerRef = useRef(new AssetManager());
  const layerRendererRef = useRef(null);
  const sceneManagerRef = useRef(null);
  const sceneCameraRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const parallaxContainerRef = useRef(null);
  const parallaxSpritesRef = useRef([]);
  const playerStartSpriteRef = useRef(null);
  const gridRef = useRef(null);
  
  // Local tool state - manages its own state for immediate response
  const [activeTool, setActiveTool] = useState('select');
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isInitialized, setIsInitialized] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [cameraPos, setCameraPos] = useState({ x: 0, y: 0 });
  const [cursorWorldPos, setCursorWorldPos] = useState({ x: 0, y: 0 });
  
  // Refs for accessing state in canvas event handlers
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const activeToolRef = useRef('select');
  
  // Keep refs in sync with state
  useEffect(() => {
    isPanningRef.current = isPanning;
  }, [isPanning]);
  
  useEffect(() => {
    panStartRef.current = panStart;
  }, [panStart]);
  
  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);
  
  // Debug logging disabled to prevent Next.js log forwarding issues
  // const DEBUG = false;
  
  // Clear stale sprite refs on mount
  useEffect(() => {
    // if (DEBUG) console.log('[SceneView] MOUNT - clearing stale sprite refs');
    spritesRef.current = {};
  }, []);
  const [followPlayer, setFollowPlayer] = useState(true); // Enable by default
  const [physicsEnabled, setPhysicsEnabled] = useState(true);
  const [showPhysicsDebug, setShowPhysicsDebug] = useState(false);
  const [gamepadConnected, setGamepadConnected] = useState(false);
  const clickedOnObjectRef = useRef(false);
  
  // Keep refs in sync for camera following
  const followPlayerRef = useRef(true);
  const modeRef = useRef('edit');
  const sceneObjectsRef = useRef([]);
  const onUpdatePlayerStartRef = useRef(null);
  
  useEffect(() => {
    followPlayerRef.current = followPlayer;
    modeRef.current = mode;
    sceneObjectsRef.current = sceneObjects;
    onUpdatePlayerStartRef.current = onUpdatePlayerStart;
  }, [followPlayer, mode, sceneObjects, onUpdatePlayerStart]);

  // Center camera on player ONCE after first initialization
  const cameraInitializedOnPlayerRef = useRef(false);
  useEffect(() => {
    if (!isInitialized || !cameraRef.current || sceneObjects.length === 0) return;
    if (cameraInitializedOnPlayerRef.current) return; // Only run once
    
    const playerObject = sceneObjects.find(obj => obj.type === 'player');
    if (playerObject) {
      // Get the actual pixel position of the player
      const sprite = spritesRef.current[playerObject.id];
      const px = sprite?.x ?? playerObject.x ?? (playerObject.gridX ?? 0) * 32;
      const py = sprite?.y ?? playerObject.y ?? (playerObject.gridY ?? 0) * 32;
      console.log('[SceneView] ONE-TIME camera center on player:', { px, py, objId: playerObject.id });
      cameraRef.current.centerOn(px, py, true);
      cameraInitializedOnPlayerRef.current = true;
    }
  }, [sceneObjects, isInitialized]);
  const isDraggingRef = useRef(false);
  const dragDataRef = useRef({ 
    objectId: null, 
    startMouseX: 0, 
    startMouseY: 0, 
    startObjX: 0, 
    startObjY: 0 
  });
  const onUpdateObjectRef = useRef(onUpdateObject);
  const onSelectObjectRef = useRef(onSelectObject);
  
  // Update refs synchronously during render (before useEffects run)
  onUpdateObjectRef.current = onUpdateObject;
  onSelectObjectRef.current = onSelectObject;
  eventsRef.current = events;

  const tools = [
    { id: 'select', icon: <MousePointer2 size={16} />, label: 'Select (V)', key: 'v' },
    { id: 'move', icon: <Move size={16} />, label: 'Move (M)', key: 'm' },
    { id: 'rect', icon: <Square size={16} />, label: 'Rectangle (R)', key: 'r' },
    { id: 'pan', icon: <Hand size={16} />, label: 'Pan (H)', key: 'h' },
    { id: 'playerStart', icon: <MapPin size={16} />, label: 'Player Start (P)', key: 'p' },
  ];

  // Initialize PixiJS
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Prevent double initialization
    if (appRef.current) {
      console.log('[SceneView] PixiJS already initialized, skipping');
      return;
    }

    // Flag to track if this effect has been cleaned up
    let isCleanedUp = false;

    // Clean up any existing canvas in the container
    while (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild);
    }

    const initPixi = async () => {
      const app = new PIXI.Application();
      
      await app.init({
        width: canvasSize.width,
        height: canvasSize.height,
        backgroundColor: 0x1a1a2e,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      // Check if effect was cleaned up during async init
      if (isCleanedUp) {
        console.log('[SceneView] Effect cleaned up during init, destroying app');
        app.destroy(true);
        return;
      }

      // Double-check container still exists
      if (!containerRef.current) {
        app.destroy(true);
        return;
      }

      containerRef.current.appendChild(app.canvas);
      appRef.current = app;
      
      // Add canvas mouse event handlers for panning (works alongside sprite interaction)
      const canvas = app.canvas;
      const canvasMouseDown = (e) => {
        if (e.button === 1 || activeToolRef.current === 'pan') {
          e.preventDefault();
          setIsPanning(true);
          isPanningRef.current = true;
          setPanStart({ x: e.clientX, y: e.clientY });
          panStartRef.current = { x: e.clientX, y: e.clientY };
        }
      };
      
      const canvasMouseMove = (e) => {
        if (isPanningRef.current && cameraRef.current && panStartRef.current) {
          const dx = e.clientX - panStartRef.current.x;
          const dy = e.clientY - panStartRef.current.y;
          
          // Move camera directly (pan() divides by zoom internally)
          cameraRef.current.targetX -= dx / cameraRef.current.zoom;
          cameraRef.current.targetY -= dy / cameraRef.current.zoom;
          cameraRef.current.x = cameraRef.current.targetX;
          cameraRef.current.y = cameraRef.current.targetY;
          
          panStartRef.current = { x: e.clientX, y: e.clientY };
        }
      };
      
      const canvasMouseUp = (e) => {
        if (e.button === 1 || isPanningRef.current) {
          setIsPanning(false);
          isPanningRef.current = false;
        }
      };
      
      // Add wheel zoom handler
      const canvasWheel = (e) => {
        if (cameraRef.current) {
          e.preventDefault();
          const rect = canvas.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;
          
          // Get world position before zoom (center on mouse cursor)
          const worldBefore = cameraRef.current.screenToWorld(mouseX, mouseY);
          
          // Apply zoom using camera's zoom method
          const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
          const currentZoom = cameraRef.current.zoom || 1;
          const newZoom = Math.max(0.1, Math.min(5, currentZoom * zoomFactor));
          // Apply zoom instantly so we can compute correct world delta
          cameraRef.current.setZoom(newZoom, true);
          
          // Get world position after zoom
          const worldAfter = cameraRef.current.screenToWorld(mouseX, mouseY);
          
          // Adjust camera to keep mouse position stationary
          const deltaX = worldBefore.x - worldAfter.x;
          const deltaY = worldBefore.y - worldAfter.y;
          // Apply position adjustment instantly (pan only sets targetX/Y)
          cameraRef.current.targetX += deltaX;
          cameraRef.current.targetY += deltaY;
          cameraRef.current.x = cameraRef.current.targetX;
          cameraRef.current.y = cameraRef.current.targetY;
        }
      };
      
      canvas.addEventListener('mousedown', canvasMouseDown);
      canvas.addEventListener('mousemove', canvasMouseMove);
      canvas.addEventListener('mouseup', canvasMouseUp);
      canvas.addEventListener('mouseleave', canvasMouseUp);
      canvas.addEventListener('wheel', canvasWheel, { passive: false });

      // Enable stage pointer events for object interactions
      app.stage.eventMode = 'static';
      // Note: playerStart click is handled by the React onClick on the container div
      // (using canvas.getBoundingClientRect for correct coordinates)

      // Create world container (camera will move this)
      const worldContainer = new PIXI.Container();
      worldContainer.label = 'world';
      app.stage.addChild(worldContainer);
      worldContainerRef.current = worldContainer;

      // Create parallax container (rendered behind scene, moves with camera at different speeds)
      const parallaxContainer = new PIXI.Container();
      parallaxContainer.label = 'parallax';
      parallaxContainer.sortableChildren = true;
      worldContainer.addChild(parallaxContainer);
      parallaxContainerRef.current = parallaxContainer;

      // Create scene container inside world (for objects)
      const sceneContainer = new PIXI.Container();
      sceneContainer.label = 'scene';
      sceneContainer.sortableChildren = true; // Enable z-index sorting
      worldContainer.addChild(sceneContainer);

      // Initialize camera system with 2D platformer settings
      const camera = new CameraSystem(app, {
        zoom: 1,
        smoothing: 0.1,
        bounds: { minX: -10000, maxX: 10000, minY: -10000, maxY: 10000 },
        // 2D platformer features (for play mode)
        lookAhead: false, // Disabled in edit mode
        lookAheadDistance: 150,
        lookAheadSmoothing: 0.05,
        verticalOffset: 0, // Disabled in edit mode
        verticalOffsetSmoothing: 0.08,
        deadZone: { x: 100, y: 50 }
      });
      camera.setWorldContainer(worldContainer);
      cameraRef.current = camera;
      
      // Center camera on player position if available, otherwise default center
      let centerX = 400;
      let centerY = 300;
      
      // Find the player object to center camera on
      const playerObject = sceneObjects.find(obj => obj.type === 'player');
      console.log('[SceneView] Camera init - sceneObjects count:', sceneObjects.length);
      console.log('[SceneView] Camera init - found player object:', playerObject);
      if (playerObject) {
        centerX = (playerObject.x || 0) + (playerObject.gridX || 0) * 32;
        centerY = (playerObject.y || 0) + (playerObject.gridY || 0) * 32;
        console.log('[SceneView] Centering camera on player at:', { x: centerX, y: centerY });
      } else {
        console.log('[SceneView] No player found, using default camera center:', { x: centerX, y: centerY });
      }
      
      camera.centerOn(centerX, centerY, true);

      // Initialize physics system
      const physics = new PhysicsSystem({
        gravityX: 0,
        gravityY: 1,
        gravityScale: 0.001,
        debug: false
      });
      physicsRef.current = physics;

      // Initialize audio system
      const audio = new AudioSystem({
        masterVolume: 1.0,
        musicVolume: 0.5,
        sfxVolume: 0.8
      });
      audioRef.current = audio;

      // Initialize input system
      const input = new InputSystem({
        target: window,
        canvas: app.canvas,
        camera: camera,
        onGamepadConnect: (gp) => {
          console.log('[SceneView] Gamepad connected:', gp.id);
          setGamepadConnected(true);
        },
        onGamepadDisconnect: (gp) => {
          console.log('[SceneView] Gamepad disconnected:', gp.id);
          setGamepadConnected(false);
        },
      });
      inputRef.current = input;

      // Initialize behavior manager
      behaviorManagerRef.current = new BehaviorManager();

      // Initialize event evaluator
      eventEvaluatorRef.current = new EventEvaluator();
      eventEvaluatorRef.current.setDebugMode(false); // Disable debug logging to prevent log overload

      // NOTE: LayerRenderer/SceneManager are NOT used here because SceneView 
      // already has its own sprite rendering system that syncs with sceneObjects.
      // The Scene Manager is for future use when we want parallax backgrounds,
      // scene transitions, etc. For now, sceneObjects (derived from project) 
      // are rendered by SceneView's existing sprite system.
      // 
      // TODO: Migrate to LayerRenderer once we want full Scene Manager features:
      // - Parallax backgrounds
      // - Scene transitions (fade, slide)
      // - Visual effects (glow, shadow, outline)
      // - Decoration layers

      // Notify parent that audio system is ready
      if (onAudioSystemReady) {
        onAudioSystemReady(audio);
      }

      // Notify parent that PixiJS is ready
      if (onPixiReady) {
        onPixiReady(app);
      }

      // Note: Sound files need to be added to public/sounds/ folder
      // Example sounds to add: jump.mp3, land.mp3, hit.mp3, collect.mp3, click.mp3
      // For now, audio is initialized but sounds will only play when files exist

      // Add default ground plane for testing
      physics.createStatic('ground', -1000, 500, 3000, 50, {
        label: 'ground',
        friction: 0.8,
        restitution: 0.2
      });

      // Set up collision logging (guarded to avoid log flood in dev)
      physics.onCollisionStart = (idA, idB, pair) => {
        if (showPhysicsDebug) {
          console.log(`Collision start: ${idA} <-> ${idB}`);
        }
      };

      // NOTE: Test player removed - player-1 is created from sceneObjects automatically

      // Add grid (always visible, large area)
      const gridGraphics = drawGrid(sceneContainer, 4000, 4000);
      gridRef.current = gridGraphics;

      // Start game loop (camera + physics + input)
      let lastCameraX = 0;
      let lastCameraY = 0;
      let lastZoom = 1;
      let prevMode = null; // Track previous mode for detecting transitions
      
      app.ticker.add((ticker) => {
        // Helper to find the first player sprite
        const getPlayerSprite = () => {
          let sprite = spritesRef.current['player-1'];
          if (!sprite) {
            const playerObj = sceneObjectsRef.current.find(obj => obj.type === 'player');
            if (playerObj) sprite = spritesRef.current[playerObj.id];
          }
          return sprite;
        };
        
        // Camera update moved after physics/behaviors for fresh player position

        // Update physics (only in play mode)
        if (physicsRef.current && modeRef.current === 'play') {
          physicsRef.current.update(ticker.deltaMS);
          
          // Sync physics bodies back to sprites - but SKIP objects controlled by behaviors
          if (physicsRef.current.syncSprites) {
            // Build set of behavior-controlled object IDs to skip
            const behaviorControlled = new Set();
            if (behaviorManagerRef.current) {
              for (const [objectId] of behaviorManagerRef.current._instances) {
                behaviorControlled.add(objectId);
              }
            }
            
            // Only sync sprites NOT controlled by behaviors
            const filteredSprites = {};
            for (const [id, sprite] of Object.entries(spritesRef.current)) {
              if (!behaviorControlled.has(id)) {
                filteredSprites[id] = sprite;
              }
            }
            physicsRef.current.syncSprites(filteredSprites);
          }
        }

        // Update behaviors (only in play mode)
        if (behaviorManagerRef.current && modeRef.current === 'play') {
          // Build game state for behaviors
          const playerSprite = getPlayerSprite();
          const behaviorGameState = {
            playerPos: playerSprite ? { x: playerSprite.x, y: playerSprite.y } : { x: 0, y: 0 },
            mouse: mouseRef.current,
            floorY: 500,
            leftBound: -1000,
            rightBound: 3000,
            topBound: -1000,
            bottomBound: 500,
            gridSize: 32,
            // Add AssetManager and assets for AnimatedSpriteBehavior
            assetManager: assetManagerRef.current,
            assets: assets,
            // Add layerRenderer for getEntitySprite() access
            layerRenderer: layerRendererRef.current,
            // Add sprites reference for fallback sprite access
            sprites: spritesRef.current,
          };
          
          // Convert deltaMS to seconds for behaviors
          const deltaTime = ticker.deltaMS / 1000;
          
          behaviorManagerRef.current.update(deltaTime, keysHeldRef.current, behaviorGameState);
        }
        
        // ── Sync behavior object positions back to sprites (AFTER physics) ──
        // This ensures behavior-driven movement takes priority over physics
        if (behaviorManagerRef.current && modeRef.current === 'play') {
          for (const [objectId, objectBehaviors] of behaviorManagerRef.current._instances) {
            // Get the first behavior to access the object reference
            const firstBehavior = objectBehaviors.values().next().value;
            if (firstBehavior && firstBehavior.object) {
              const sprite = spritesRef.current[objectId];
              
              // Check if this object has an animated sprite from AnimatedSpriteBehavior
              if (firstBehavior.object._animatedSprite) {
                // Adopt the animated sprite if not already in scene
                if (!sprite || !sprite.children.includes(firstBehavior.object._animatedSprite)) {
                  // Remove old sprite content
                  if (sprite) {
                    sprite.removeChildren();
                    sprite.addChild(firstBehavior.object._animatedSprite);
                  } else {
                    // Create container for this entity
                    const container = new PIXI.Container();
                    container.addChild(firstBehavior.object._animatedSprite);
                    worldContainerRef.current.addChild(container);
                    spritesRef.current[objectId] = container;
                  }
                }
                
                // Update container position (the animated sprite is a child)
                const container = spritesRef.current[objectId];
                if (container) {
                  container.x = firstBehavior.object.x;
                  container.y = firstBehavior.object.y;
                }
              } else if (sprite) {
                // Regular sprite - FORCE position sync from behavior object
                sprite.x = firstBehavior.object.x;
                sprite.y = firstBehavior.object.y;
                
                // Handle flash visibility for health behavior
                if (firstBehavior.object.flashVisible !== undefined) {
                  sprite.visible = firstBehavior.object.flashVisible;
                }
              }
            }
          }
        }

        // ── Update camera AFTER physics/behaviors ──
        if (cameraRef.current) {
          cameraRef.current.setMode(modeRef.current);
          
          // Follow player in play mode if enabled
          if (modeRef.current === 'play' && followPlayerRef.current) {
            // Get player position from behavior object (authoritative)
            let followX = null, followY = null;
            
            if (behaviorManagerRef.current) {
              for (const [objectId, objectBehaviors] of behaviorManagerRef.current._instances) {
                const obj = sceneObjectsRef.current.find(o => o.id === objectId && o.type === 'player');
                if (obj) {
                  const firstBehavior = objectBehaviors.values().next().value;
                  if (firstBehavior?.object) {
                    followX = firstBehavior.object.x;
                    followY = firstBehavior.object.y;
                  }
                  break;
                }
              }
            }
            
            // Fallback: read from sprite
            if (followX === null) {
              const playerSprite = getPlayerSprite();
              if (playerSprite) {
                followX = playerSprite.x;
                followY = playerSprite.y;
              }
            }
            
            if (followX !== null && followY !== null) {
              // DIRECTLY position the camera - bypass centerOn/smoothing/bounds
              const hw = (cameraRef.current.viewportWidth || 800) / 2 / (cameraRef.current.zoom || 1);
              const hh = (cameraRef.current.viewportHeight || 600) / 2 / (cameraRef.current.zoom || 1);
              const camX = followX - hw;
              const camY = followY - hh;
              
              // Smooth follow (lerp 10% per frame)
              cameraRef.current.x += (camX - cameraRef.current.x) * 0.1;
              cameraRef.current.y += (camY - cameraRef.current.y) * 0.1;
              cameraRef.current.targetX = cameraRef.current.x;
              cameraRef.current.targetY = cameraRef.current.y;
              
              // Apply directly to world container
              const wc = worldContainerRef.current;
              if (wc) {
                wc.x = -cameraRef.current.x * cameraRef.current.zoom;
                wc.y = -cameraRef.current.y * cameraRef.current.zoom;
                wc.scale.set(cameraRef.current.zoom);
              }
            }
          } else {
            // Edit mode: use normal camera update
            cameraRef.current.update(ticker.deltaMS);
          }
          
          // Update state for UI display only if changed (to avoid excessive re-renders)
          const state = cameraRef.current.getState();
          const newX = Math.round(state.x);
          const newY = Math.round(state.y);
          const newZoom = state.zoom;
          
          if (newZoom !== lastZoom) {
            lastZoom = newZoom;
            setZoom(newZoom);
          }
          if (newX !== lastCameraX || newY !== lastCameraY) {
            lastCameraX = newX;
            lastCameraY = newY;
            setCameraPos({ x: newX, y: newY });
          }
          
          // ── Update parallax layers based on camera position ──
          if (parallaxSpritesRef.current.length > 0) {
            parallaxSpritesRef.current.forEach(({ layer, sprites }) => {
              if (!sprites || sprites.length === 0) return;
              
              const texWidth = sprites[0]._texWidth || 800;
              const texHeight = sprites[0]._texHeight || 600;
              
              sprites.forEach(sprite => {
                // Parallax offset based on camera and scroll speed
                let offsetX = -newX * (layer.scrollSpeedX || 0.5);
                let offsetY = -newY * (layer.scrollSpeedY || 0);
                
                // Wrap for seamless tiling
                if (layer.repeatX && texWidth > 0) {
                  offsetX = ((offsetX % texWidth) + texWidth) % texWidth;
                }
                if (layer.repeatY && texHeight > 0) {
                  offsetY = ((offsetY % texHeight) + texHeight) % texHeight;
                }
                
                // Apply to sprite position
                sprite.x = (sprite._originalX || 0) + offsetX + (layer.offsetX || 0) - (layer.repeatX ? texWidth : 0);
                sprite.y = (sprite._originalY || 0) + offsetY + (layer.offsetY || 0) - (layer.repeatY ? texHeight : 0);
              });
            });
          }
        }

        // ── Update sprite animations (for sprites with embedded _animationData) ──
        // This handles both old format (dataUrl textures) and new format (sprite sheet frames)
        if (modeRef.current === 'play') {
          for (const [objectId, spriteOrContainer] of Object.entries(spritesRef.current)) {
            // Find the animated child sprite
            let animSprite = spriteOrContainer?.getChildByLabel?.('animated');
            if (!animSprite) continue;
            
            const animData = animSprite._animationData;
            if (!animData || !animSprite._textures) continue;
            
            const currentState = animSprite._currentState || Object.keys(animData.states)[0];
            const stateData = animData.states?.[currentState];
            if (!stateData) continue;
            
            // ── Auto-flip sprite based on movement direction ──
            const currentX = spriteOrContainer.x;
            const lastX = animSprite._lastX ?? currentX;
            const deltaX = currentX - lastX;
            
            if (Math.abs(deltaX) > 0.1) {
              // Moving right = positive scale.x, moving left = negative scale.x
              const desiredSign = deltaX > 0 ? 1 : -1;
              const currentSign = animSprite.scale.x < 0 ? -1 : 1;
              if (desiredSign !== currentSign) {
                animSprite.scale.x = -animSprite.scale.x;
              }
            }
            animSprite._lastX = currentX;
            
            // Advance frame timer
            const speed = stateData.speed || 200; // ms per frame
            animSprite._frameTimer = (animSprite._frameTimer || 0) + ticker.deltaMS;
            
            if (animSprite._frameTimer >= speed) {
              animSprite._frameTimer = 0;
              
              // Get frame textures for current state
              const stateTextures = animSprite._textures[currentState];
              if (stateTextures && stateTextures.length > 0) {
                // Advance to next frame
                animSprite._currentFrame = (animSprite._currentFrame + 1) % stateTextures.length;
                
                // Apply texture
                animSprite.texture = stateTextures[animSprite._currentFrame];
              }
            }
          }
        }

        // NOTE: LayerRenderer update disabled - using SceneView's own camera/rendering
        // TODO: Enable when migrating to full Scene Manager

        // Process events (only in play mode)
        if (eventEvaluatorRef.current && modeRef.current === 'play') {
          const playerSprite = getPlayerSprite();
          
          // Build event execution context
          const eventContext = {
            gameState: {
              sprites: spritesRef.current,
              sceneObjects: sceneObjectsRef.current,
              playerPos: playerSprite ? { x: playerSprite.x, y: playerSprite.y } : { x: 0, y: 0 },
              // Helper methods for conditions/actions
              getObjectsByType: (type) => {
                return sceneObjectsRef.current.filter(obj => obj.type === type);
              },
              getObjectById: (id) => {
                return sceneObjectsRef.current.find(obj => obj.id === id);
              },
              getSprite: (id) => spritesRef.current[id],
              variables: {}, // Game variables like score, health
            },
            behaviorManager: behaviorManagerRef.current,
            audioSystem: audioRef.current,
            physicsSystem: physicsRef.current,
            inputSystem: inputRef.current,
            sceneManager: sceneManagerRef.current,
            globalVariables: sceneManagerRef.current?.globalVariables || new Map(),
            deltaTime: ticker.deltaMS / 1000,
          };
          
          // Process all enabled events
          const enabledEvents = eventsRef.current.filter(e => e.enabled);
          eventEvaluatorRef.current.processEvents(enabledEvents, eventContext);
        }

        // Update input system (always - needed for key state tracking)
        if (inputRef.current) {
          // Only process movement in play mode
          if (modeRef.current === 'play') {
            const horizontal = inputRef.current.getHorizontal();
            const vertical = inputRef.current.getVertical();
            
            // Find the first player object (any player-* id or type === 'player')
            let playerSprite = spritesRef.current['player-1'];
            if (!playerSprite) {
              // Look for any sprite with player type
              const playerObj = sceneObjectsRef.current.find(obj => obj.type === 'player');
              if (playerObj) {
                playerSprite = spritesRef.current[playerObj.id];
              }
            }
            
            // Apply direct movement only when no behavior system is active OR no player behaviors exist
            const hasPlayerBehaviors = behaviorManagerRef.current && 
              Array.from(behaviorManagerRef.current._instances.keys()).some(id => {
                const obj = sceneObjectsRef.current.find(obj => obj.id === id && obj.type === 'player');
                return obj !== undefined;
              });
            
            if (playerSprite && (horizontal !== 0 || vertical !== 0) && !hasPlayerBehaviors) {
              const speed = 8; // Increased from 5 for more responsive movement
              playerSprite.x += horizontal * speed;
              playerSprite.y += vertical * speed;
            }
            
            // Jump action
            if (inputRef.current.isActionPressed('jump')) {
              audioRef.current?.play('jump');
            }
          }
          
          // Must call update at end of frame (always, to track key states)
          inputRef.current.update();
        }
        
        // Update previous mode for next frame detection
        prevMode = modeRef.current;
      });

      setIsInitialized(true);
    };

    initPixi();

    return () => {
      console.log('[SceneView] Cleanup running');
      isCleanedUp = true;
      
      // Cleanup Scene Manager systems
      if (sceneManagerRef.current) {
        sceneManagerRef.current = null;
      }
      if (layerRendererRef.current) {
        layerRendererRef.current.destroy();
        layerRendererRef.current = null;
      }
      if (assetManagerRef.current) {
        assetManagerRef.current.clearCache();
      }
      
      if (inputRef.current) {
        inputRef.current.destroy();
        inputRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.destroy();
        audioRef.current = null;
      }
      if (physicsRef.current) {
        physicsRef.current.destroy();
        physicsRef.current = null;
      }
      if (cameraRef.current) {
        cameraRef.current.destroy();
        cameraRef.current = null;
      }
      if (behaviorManagerRef.current) {
        behaviorManagerRef.current.clear();
        behaviorManagerRef.current = null;
      }
      if (appRef.current) {
        appRef.current.destroy(true, { children: true, texture: true });
        appRef.current = null;
      }
    };
  }, []);

  // Simple keyboard movement (only in play mode) + camera pan in edit mode
  useEffect(() => {
    const keysHeld = new Set();
    const cameraPanKeys = new Set();
    
    const handleKeyDown = (e) => {
      // Don't capture keys when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return;
      }
      
      // Camera pan in EDIT mode with arrow keys (no shift needed)
      if (modeRef.current !== 'play') {
        const panSpeed = 10;
        if (e.code === 'ArrowLeft' || e.code === 'ArrowRight' || e.code === 'ArrowUp' || e.code === 'ArrowDown') {
          e.preventDefault();
          cameraPanKeys.add(e.code);
        }
        return;
      }
      
      // Prevent default browser behavior for game keys (scroll, etc.)
      e.preventDefault();
      
      keysHeld.add(e.code);
      // Use KeyboardEvent.key values for behavior system (e.g., 'a', 'ArrowLeft', 'w')
      keysHeldRef.current.add(e.key);
    };
    
    const handleKeyUp = (e) => {
      keysHeld.delete(e.code);
      keysHeldRef.current.delete(e.key);
      cameraPanKeys.delete(e.code);
    };
    
    // Mouse tracking for Draggable behavior
    const handleMouseMove = (e) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };
    const handleMouseDown = () => {
      mouseRef.current.down = true;
    };
    const handleMouseUp = () => {
      mouseRef.current.down = false;
    };
    
    // Camera pan interval for edit mode
    const cameraPanInterval = setInterval(() => {
      if (modeRef.current === 'play' || !cameraRef.current || cameraPanKeys.size === 0) return;
      
      const panSpeed = 8;
      let dx = 0, dy = 0;
      
      if (cameraPanKeys.has('ArrowLeft')) dx -= panSpeed;
      if (cameraPanKeys.has('ArrowRight')) dx += panSpeed;
      if (cameraPanKeys.has('ArrowUp')) dy -= panSpeed;
      if (cameraPanKeys.has('ArrowDown')) dy += panSpeed;
      
      if (dx !== 0 || dy !== 0) {
        cameraRef.current.pan(dx, dy);
      }
    }, 16);
    
    // Note: Manual movement interval removed to prevent conflicts with behaviors/physics.
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      clearInterval(cameraPanInterval);
      keysHeldRef.current.clear();
    };
  }, []);

  // Rebuild behaviors when entering play mode
  useEffect(() => {
    if (!behaviorManagerRef.current) return;
    
    // Toggle grid visibility based on mode
    if (gridRef.current) {
      gridRef.current.visible = mode === 'edit';
    }
    
    // Enable/disable platformer camera features based on mode
    if (cameraRef.current) {
      if (mode === 'play') {
        cameraRef.current.lookAhead = true;
        cameraRef.current.verticalOffset = -100;
      } else {
        cameraRef.current.lookAhead = false;
        cameraRef.current.verticalOffset = 0;
        cameraRef.current.currentLookAhead = 0;
        cameraRef.current.currentVerticalOffset = 0;
      }
    }
    
    if (mode === 'play') {
      // Entering play mode - rebuild behaviors for all objects
      console.log('[SceneView] ENTERING PLAY MODE. playerStart:', JSON.stringify(playerStart), 'sceneObjects count:', sceneObjects.length);
      behaviorManagerRef.current.clear();
      
      sceneObjects.forEach(obj => {
        if (obj.behaviors && obj.behaviors.length > 0) {
          // Create a game object reference that behaviors can modify
          const sprite = spritesRef.current[obj.id];
          
          // For player objects, use playerStart position if available
          let initX = sprite?.x ?? obj.x ?? 0;
          let initY = sprite?.y ?? obj.y ?? 0;
          if (obj.type === 'player' && playerStart?.enabled && playerStart.x !== undefined && playerStart.y !== undefined) {
            initX = playerStart.x;
            initY = playerStart.y;
          }
          
          const gameObj = {
            id: obj.id,
            type: obj.type,
            x: initX,
            y: initY,
            width: obj.width ?? 32,
            height: obj.height ?? 32,
            sprite: sprite // Reference to the actual sprite
          };
          
          behaviorManagerRef.current.rebuildForObject(gameObj, obj.behaviors);
        } else {
          // Object has no behaviors
        }
      });
      
      console.log('[SceneView] Behaviors rebuilt for play mode, instances:', behaviorManagerRef.current._instances.size);
      
      // Set camera mode to 'play' to enable bounds clamping
      if (cameraRef.current) {
        cameraRef.current.setMode('play');
      }
      
      // ── Auto-enable camera follow if there's a player ──
      const hasPlayer = sceneObjects.some(obj => obj.type === 'player');
      
      if (!hasPlayer) {
        // Create a default player object if none exists
        console.log('[SceneView] No player found, creating default auto-player');
        const defaultPlayer = {
          id: 'auto-player',
          name: 'Player',
          type: 'player',
          x: playerStart?.enabled ? playerStart.x : 400,
          y: playerStart?.enabled ? playerStart.y : 300,
          width: 32,
          height: 32,
          behaviors: [
            {
              type: 'topdown',
              enabled: true,
              config: {
                speed: 200,
                upKey: 'ArrowUp',
                downKey: 'ArrowDown', 
                leftKey: 'ArrowLeft',
                rightKey: 'ArrowRight'
              }
            }
          ]
        };
        
        // Add to scene objects temporarily (don't save to project)
        sceneObjectsRef.current = [...sceneObjectsRef.current, defaultPlayer];
        
        // Create sprite for the default player
        const playerSprite = new PIXI.Graphics();
        playerSprite.beginFill(0x00ff00);
        playerSprite.drawRect(-16, -16, 32, 32);
        playerSprite.endFill();
        playerSprite.x = defaultPlayer.x;
        playerSprite.y = defaultPlayer.y;
        playerSprite.label = 'auto-player';
        worldContainerRef.current.addChild(playerSprite);
        spritesRef.current[defaultPlayer.id] = playerSprite;
        
        // Create behavior for the default player
        const gameObj = {
          id: defaultPlayer.id,
          type: defaultPlayer.type,
          x: defaultPlayer.x,
          y: defaultPlayer.y,
          width: defaultPlayer.width,
          height: defaultPlayer.height,
          sprite: playerSprite
        };
        
        behaviorManagerRef.current.rebuildForObject(gameObj, defaultPlayer.behaviors);
        console.log('[SceneView] Auto-created default player with TopDownMovementBehavior');
      } else {
        // Check if existing players have behaviors, add default ones if not
        const playerObjects = sceneObjectsRef.current.filter(obj => obj.type === 'player');
        playerObjects.forEach(playerObj => {
          if (!playerObj.behaviors || playerObj.behaviors.length === 0) {
            console.log('[SceneView] Player exists but has no behaviors, adding default movement');
            
            // Add default movement behavior to existing player
            const defaultBehaviors = [
              {
                type: 'topdown',
                enabled: true,
                config: {
                  speed: 200,
                  upKey: 'ArrowUp',
                  downKey: 'ArrowDown', 
                  leftKey: 'ArrowLeft',
                  rightKey: 'ArrowRight'
                }
              }
            ];
            
            // Update the object in the ref (temporarily for this play session)
            const updatedObjects = sceneObjectsRef.current.map(obj => 
              obj.id === playerObj.id ? { ...obj, behaviors: defaultBehaviors } : obj
            );
            sceneObjectsRef.current = updatedObjects;
            
            // Create behaviors for the existing player - use playerStart if available
            const playerSprite = spritesRef.current[playerObj.id];
            let fallbackX = playerSprite?.x ?? playerObj.x ?? 0;
            let fallbackY = playerSprite?.y ?? playerObj.y ?? 0;
            if (playerStart?.enabled && playerStart.x !== undefined && playerStart.y !== undefined) {
              fallbackX = playerStart.x;
              fallbackY = playerStart.y;
            }
            const gameObj = {
              id: playerObj.id,
              type: playerObj.type,
              x: fallbackX,
              y: fallbackY,
              width: playerObj.width ?? 32,
              height: playerObj.height ?? 32,
              sprite: playerSprite
            };
            
            behaviorManagerRef.current.rebuildForObject(gameObj, defaultBehaviors);
            console.log('[SceneView] Added default topdown behavior to player:', playerObj.id, 'at', fallbackX, fallbackY);
          }
        });
      }
      
      if (true) { // Always try to enable follow
        setFollowPlayer(true);
        
        // Find player and move to playerStart position if set
        const playerObj = sceneObjectsRef.current.find(obj => obj.type === 'player');
        if (playerObj && cameraRef.current) {
          const playerSprite = spritesRef.current[playerObj.id];
          
          // Determine player's actual position from multiple sources
          let playerX = playerSprite?.x ?? playerObj.x ?? (playerObj.gridX ?? 0) * 32;
          let playerY = playerSprite?.y ?? playerObj.y ?? (playerObj.gridY ?? 0) * 32;
          
          // If playerStart is set, move player to that position
          if (playerStart?.enabled && playerStart.x !== undefined && playerStart.y !== undefined) {
            playerX = playerStart.x;
            playerY = playerStart.y;
            if (playerSprite) {
              playerSprite.x = playerX;
              playerSprite.y = playerY;
            }
            // ALSO update the behavior object position so camera follow reads the correct coords
            if (behaviorManagerRef.current) {
              const objBehaviors = behaviorManagerRef.current._instances.get(playerObj.id);
              if (objBehaviors) {
                for (const [, behavior] of objBehaviors) {
                  if (behavior.object) {
                    behavior.object.x = playerX;
                    behavior.object.y = playerY;
                  }
                }
              }
            }
            // Also update physics body if it exists
            if (physicsRef.current) {
              const body = physicsRef.current.bodies[playerObj.id];
              if (body) {
                physicsRef.current.engine.world.bodies.forEach(b => {
                  if (b.label === body.label) {
                    physicsRef.current.Matter.Body.setPosition(b, { x: playerX, y: playerY });
                  }
                });
              }
            }
          }
          
          // DIRECTLY set camera position - bypass all smoothing/bounds
          const hw = (cameraRef.current.viewportWidth || 800) / 2 / (cameraRef.current.zoom || 1);
          const hh = (cameraRef.current.viewportHeight || 600) / 2 / (cameraRef.current.zoom || 1);
          cameraRef.current.x = playerX - hw;
          cameraRef.current.y = playerY - hh;
          cameraRef.current.targetX = cameraRef.current.x;
          cameraRef.current.targetY = cameraRef.current.y;
          // Also move the world container immediately
          if (worldContainerRef.current) {
            worldContainerRef.current.x = -cameraRef.current.x * cameraRef.current.zoom;
            worldContainerRef.current.y = -cameraRef.current.y * cameraRef.current.zoom;
            worldContainerRef.current.scale.set(cameraRef.current.zoom);
          }
          console.log('[SceneView] Play mode started. Player at:', playerX, playerY, 'Camera at:', Math.round(cameraRef.current.x), Math.round(cameraRef.current.y), 'playerStart used:', playerStart?.enabled ? 'YES' : 'NO');
        }
      }
    } else {
      // Exiting play mode - clear behaviors and reset
      behaviorManagerRef.current.clear();
      keysHeldRef.current.clear();
      
      // Clean up auto-created player
      if (spritesRef.current['auto-player']) {
        const autoPlayer = spritesRef.current['auto-player'];
        autoPlayer.parent?.removeChild(autoPlayer);
        delete spritesRef.current['auto-player'];
        
        // Remove from sceneObjects ref without affecting the actual project data
        sceneObjectsRef.current = sceneObjectsRef.current.filter(obj => obj.id !== 'auto-player');
      }
      
      // Set camera mode to 'edit' to disable bounds clamping
      if (cameraRef.current) {
        cameraRef.current.setMode('edit');
      }
      
      console.log('[SceneView] Behaviors cleared for edit mode');
    }
  }, [mode, sceneObjects, playerStart]);

  // Draw grid
  const drawGrid = (container, width, height) => {
    const gridSize = 32;
    const grid = new PIXI.Graphics();
    grid.label = 'grid';
    grid.visible = true; // Visible by default in edit mode

    // Offset to center the grid (so we can pan in all directions)
    const offsetX = -width / 2;
    const offsetY = -height / 2;

    // Minor grid lines
    grid.setStrokeStyle({ width: 1, color: 0x333344, alpha: 0.3 });
    for (let x = 0; x <= width; x += gridSize) {
      grid.moveTo(x + offsetX, offsetY);
      grid.lineTo(x + offsetX, height + offsetY);
    }
    for (let y = 0; y <= height; y += gridSize) {
      grid.moveTo(offsetX, y + offsetY);
      grid.lineTo(width + offsetX, y + offsetY);
    }
    grid.stroke();

    // Major grid lines (every 4 cells)
    grid.setStrokeStyle({ width: 1, color: 0x444466, alpha: 0.5 });
    for (let x = 0; x <= width; x += gridSize * 4) {
      grid.moveTo(x + offsetX, offsetY);
      grid.lineTo(x + offsetX, height + offsetY);
    }
    for (let y = 0; y <= height; y += gridSize * 4) {
      grid.moveTo(offsetX, y + offsetY);
      grid.lineTo(width + offsetX, y + offsetY);
    }
    grid.stroke();

    // Origin crosshair (thicker, different color)
    grid.setStrokeStyle({ width: 2, color: 0x666688, alpha: 0.8 });
    grid.moveTo(offsetX, 0);
    grid.lineTo(width + offsetX, 0);
    grid.moveTo(0, offsetY);
    grid.lineTo(0, height + offsetY);
    grid.stroke();
    
    // Ground line at y=500 (visual indicator for platformers)
    const groundY = 500;
    grid.setStrokeStyle({ width: 2, color: 0x44aa44, alpha: 0.7 });
    grid.moveTo(offsetX, groundY);
    grid.lineTo(width + offsetX, groundY);
    grid.stroke();
    
    // Ground label
    const groundLabel = new PIXI.Text({ 
      text: 'GROUND (y=500)', 
      style: { fontSize: 10, fill: 0x44aa44, fontFamily: 'monospace' } 
    });
    groundLabel.x = 10;
    groundLabel.y = groundY + 4;
    grid.addChild(groundLabel);

    container.addChildAt(grid, 0);
    return grid;
  };

  // Draw/update player start marker
  useEffect(() => {
    if (!appRef.current || !isInitialized || !worldContainerRef.current) return;
    
    const world = worldContainerRef.current;
    const scene = world.getChildByLabel('scene');
    if (!scene) return;
    
    // Remove existing player start marker
    if (playerStartSpriteRef.current) {
      playerStartSpriteRef.current.destroy();
      playerStartSpriteRef.current = null;
    }
    
    // Only show in edit mode and when playerStart exists
    if (mode !== 'edit' || !playerStart?.enabled) return;
    
    // Create player start marker
    const marker = new PIXI.Container();
    marker.label = 'playerStart';
    marker.x = playerStart.x || 0;
    marker.y = playerStart.y || 0;
    marker.zIndex = 1000; // Always on top
    
    // Draw marker graphics
    const graphics = new PIXI.Graphics();
    
    // Outer circle with pulsing effect
    graphics.circle(0, 0, 20);
    graphics.fill({ color: 0x22c55e, alpha: 0.3 });
    graphics.stroke({ width: 2, color: 0x22c55e });
    
    // Inner diamond/pin shape
    graphics.moveTo(0, -15);
    graphics.lineTo(10, 0);
    graphics.lineTo(0, 15);
    graphics.lineTo(-10, 0);
    graphics.closePath();
    graphics.fill({ color: 0x22c55e, alpha: 0.8 });
    graphics.stroke({ width: 2, color: 0xffffff });
    
    // Center dot
    graphics.circle(0, 0, 4);
    graphics.fill({ color: 0xffffff });
    
    marker.addChild(graphics);
    
    // Add label
    const label = new PIXI.Text({
      text: 'PLAYER START',
      style: { 
        fontSize: 10, 
        fill: 0x22c55e, 
        fontFamily: 'monospace',
        fontWeight: 'bold'
      }
    });
    label.anchor.set(0.5, 0);
    label.y = 25;
    marker.addChild(label);
    
    // Add coordinates
    const coords = new PIXI.Text({
      text: `(${playerStart.x}, ${playerStart.y})`,
      style: { 
        fontSize: 9, 
        fill: 0x888888, 
        fontFamily: 'monospace'
      }
    });
    coords.anchor.set(0.5, 0);
    coords.y = 38;
    marker.addChild(coords);
    
    scene.addChild(marker);
    playerStartSpriteRef.current = marker;
    
  }, [playerStart, mode, isInitialized]);

  // ── Sync camera bounds from current scene settings ──
  useEffect(() => {
    if (!cameraRef.current || !isInitialized) return;
    
    // Get current scene's camera settings
    const currentScene = project?.scenes?.find(s => s.id === currentSceneId);
    const cameraBounds = currentScene?.camera?.bounds;
    
    if (cameraBounds) {
      cameraRef.current.setBounds(
        cameraBounds.minX ?? -10000,
        cameraBounds.maxX ?? 10000,
        cameraBounds.minY ?? -10000,
        cameraBounds.maxY ?? 10000
      );
      console.log('[SceneView] Camera bounds updated:', cameraBounds);
    } else {
      // Default: very large bounds so camera can follow player anywhere
      cameraRef.current.setBounds(-10000, 10000, -10000, 10000);
      console.log('[SceneView] Camera bounds set to default: -10000 to 10000');
    }
  }, [currentSceneId, project, isInitialized]);

  // ── Apply camera configuration from scene (smoothing, zoom, follow mode) ──
  useEffect(() => {
    if (!isInitialized || !cameraRef.current) return;
    const currentScene = project?.scenes?.find(s => s.id === currentSceneId);
    const cfg = currentScene?.camera || {};
    sceneCameraRef.current = cfg;

    // Smoothing
    if (cfg.smoothing !== undefined) {
      cameraRef.current.smoothing = cfg.smoothing;
    }

    // Zoom and limits
    if (cfg.zoom !== undefined) {
      cameraRef.current.setZoom(cfg.zoom, true);
      setZoom(cfg.zoom);
    }
    if (cfg.minZoom !== undefined) cameraRef.current.minZoom = cfg.minZoom;
    if (cfg.maxZoom !== undefined) cameraRef.current.maxZoom = cfg.maxZoom;

    // Follow mode specifics
    const followMode = cfg.followMode || 'lerp';
    if (followMode === 'lookahead') {
      const la = cfg.lookAhead || {};
      cameraRef.current.lookAhead = la.enabled !== false;
      if (la.distance !== undefined) cameraRef.current.lookAheadDistance = la.distance;
      if (la.smoothing !== undefined) cameraRef.current.lookAheadSmoothing = la.smoothing;
    } else {
      cameraRef.current.lookAhead = false;
      cameraRef.current.currentLookAhead = 0;
    }

    if (followMode === 'deadzone') {
      const dz = cfg.deadZone || {};
      // Our camera uses thresholds, map width/height to half values
      cameraRef.current.deadZone = {
        x: (dz.width ?? 200) / 2,
        y: (dz.height ?? 100) / 2,
      };
    } else {
      cameraRef.current.deadZone = cameraRef.current.deadZone || { x: 100, y: 50 };
    }

    // Background / clear color
    if (cfg.clearColor && appRef.current) {
      try {
        const hex = typeof cfg.clearColor === 'string' && cfg.clearColor.startsWith('#')
          ? parseInt(cfg.clearColor.slice(1), 16)
          : cfg.clearColor;
        appRef.current.renderer.background.color = hex;
        if (cfg.clearAlpha !== undefined) appRef.current.renderer.background.alpha = cfg.clearAlpha;
      } catch {}
    }
  }, [currentSceneId, project, isInitialized]);

  // Clear all sprites when scene changes (to properly reload new scene)
  const previousSceneIdRef = useRef(currentSceneId);
  useEffect(() => {
    if (previousSceneIdRef.current !== currentSceneId && isInitialized) {
      console.log('[SceneView] Scene changed from', previousSceneIdRef.current, 'to', currentSceneId);
      
      // Clear all existing sprites
      Object.keys(spritesRef.current).forEach(id => {
        const sprite = spritesRef.current[id];
        if (sprite) {
          sprite.destroy();
        }
        delete spritesRef.current[id];
        
        // Also remove physics body
        if (physicsRef.current) {
          physicsRef.current.removeBody(id);
        }
      });
      
      // Clear selection when switching scenes
      onSelectObject?.(null);
      
      previousSceneIdRef.current = currentSceneId;
    }
  }, [currentSceneId, isInitialized, onSelectObject]);

  // Sync objects to PixiJS sprites
  useEffect(() => {
    console.log('[SceneView] Sync effect triggered. isInitialized:', isInitialized, 'appRef:', !!appRef.current);
    if (!appRef.current || !isInitialized) return;
    
    // Don't update sprite positions during play mode
    if (modeRef.current === 'play') return;

    const worldContainer = appRef.current.stage.getChildByLabel('world');
    const sceneContainer = worldContainer?.getChildByLabel('scene');
    console.log('[SceneView] worldContainer:', !!worldContainer, 'sceneContainer:', !!sceneContainer);
    if (!sceneContainer) return;

    console.log('[SceneView] Syncing sprites for', sceneObjects.length, 'objects, sceneId:', currentSceneId);
    console.log('[SceneView] Objects:', sceneObjects.map(o => ({ id: o.id, name: o.name, assetId: o.assetId })));
    
    // Update or create sprites for each object
    sceneObjects.forEach(obj => {
      let sprite = spritesRef.current[obj.id];
      console.log('[SceneView] Processing object:', obj.name, 'existing sprite:', !!sprite);

      if (!sprite) {
        // Create new sprite
        console.log('[SceneView] Creating NEW sprite for:', obj.name);
        sprite = createSprite(obj);
        sprite.label = `object-${obj.id}`;
        sprite.eventMode = 'static';
        sprite.cursor = 'pointer';
        
        // Set z-index based on object type (higher = rendered on top)
        // Use explicit zIndex from object, or default based on type
        const defaultZIndex = getDefaultZIndex(obj.type);
        sprite.zIndex = obj.zIndex ?? defaultZIndex;

        // Add click handler - store object ID not reference, use refs to avoid stale closures
        sprite.on('pointerdown', (e) => {
          if (modeRef.current === 'edit') {
            clickedOnObjectRef.current = true;
            
            if (activeTool === 'select' || activeTool === 'move') {
              // Find current object data from sceneObjects ref (always latest)
              const currentObj = sceneObjectsRef.current.find(o => o.id === obj.id);
              if (currentObj) {
                onSelectObjectRef.current?.(currentObj);
                
                // Start dragging - store ID and initial positions
                isDraggingRef.current = true;
                dragDataRef.current = {
                  objectId: obj.id,
                  startMouseX: e.global.x,
                  startMouseY: e.global.y,
                  startObjX: currentObj.x || 0,
                  startObjY: currentObj.y || 0
                };
              }
            }
            e.stopPropagation();
          }
        });
        
        // Global pointermove on stage for smoother dragging
        sprite.on('pointermove', (e) => {
          if (modeRef.current === 'edit' && isDraggingRef.current && dragDataRef.current.objectId === obj.id) {
            // Calculate delta from drag start in screen space
            const dx = e.global.x - dragDataRef.current.startMouseX;
            const dy = e.global.y - dragDataRef.current.startMouseY;
            
            // Account for camera zoom
            const zoom = cameraRef.current?.zoom || 1;
            const newX = Math.round(dragDataRef.current.startObjX + dx / zoom);
            const newY = Math.round(dragDataRef.current.startObjY + dy / zoom);
            
            // Update sprite position immediately for responsiveness (visual only)
            sprite.x = newX;
            sprite.y = newY;
            
            // Store current position in ref for committing on pointerup
            // Don't call onUpdateObject here - it causes too many re-renders
            dragDataRef.current.currentX = newX;
            dragDataRef.current.currentY = newY;
          }
        });
        
        sprite.on('pointerup', () => {
          if (dragDataRef.current.objectId === obj.id) {
            // Commit the final position to state
            if (dragDataRef.current.currentX !== undefined) {
              onUpdateObjectRef.current?.(obj.id, { 
                x: dragDataRef.current.currentX, 
                y: dragDataRef.current.currentY 
              });
            }
            isDraggingRef.current = false;
            dragDataRef.current = { objectId: null };
          }
        });
        
        sprite.on('pointerupoutside', () => {
          if (dragDataRef.current.objectId === obj.id) {
            // Commit the final position to state
            if (dragDataRef.current.currentX !== undefined) {
              onUpdateObjectRef.current?.(obj.id, { 
                x: dragDataRef.current.currentX, 
                y: dragDataRef.current.currentY 
              });
            }
            isDraggingRef.current = false;
            dragDataRef.current = { objectId: null };
          }
        });

        sceneContainer.addChild(sprite);
        spritesRef.current[obj.id] = sprite;
        console.log('[SceneView] Sprite added to container:', obj.name, 'container children:', sceneContainer.children.length, 'sprite visible:', sprite.visible, 'sprite parent:', sprite.parent?.label);

        // Create physics body for this object (if physics is enabled)
        if (physicsRef.current && obj.physics !== false) {
          const physicsOptions = {
            isStatic: obj.isStatic ?? false,
            friction: obj.friction ?? 0.1,
            restitution: obj.restitution ?? 0.3,
            density: obj.density ?? 0.001,
            isSensor: obj.isSensor ?? false,
            label: obj.name || obj.id
          };

          // Create body based on shape
          if (obj.shape === 'circle') {
            const radius = (obj.width || 40) / 2;
            physicsRef.current.createCircle(
              obj.id,
              obj.x || 0,
              obj.y || 0,
              radius,
              physicsOptions
            );
          } else {
            // Default to rectangle
            physicsRef.current.createRect(
              obj.id,
              (obj.x || 0) - (obj.width || 40) / 2,
              (obj.y || 0) - (obj.height || 40) / 2,
              obj.width || 40,
              obj.height || 40,
              physicsOptions
            );
          }
        }
      }

      // Update sprite properties
      // Skip position updates during drag OR during play mode (sprites move independently)
      const skipPositionUpdate = 
        (isDraggingRef.current && dragDataRef.current.objectId === obj.id) ||
        (modeRef.current === 'play');
      
      // Always update z-index when type changes
      const defaultZIndex = getDefaultZIndex(obj.type);
      sprite.zIndex = obj.zIndex ?? defaultZIndex;
      
      if (skipPositionUpdate) {
        // Only update non-position properties
        sprite.rotation = (obj.rotation || 0) * (Math.PI / 180);
        sprite.scale.set(obj.scale || 1);
        sprite.alpha = obj.alpha ?? 1;
        sprite.visible = obj.visible !== false;
      } else {
        updateSprite(sprite, obj);
      }

      // Selection indicator
      if (selectedObject?.id === obj.id && modeRef.current === 'edit') {
        drawSelectionBox(sprite, obj);
      } else {
        clearSelectionBox(sprite);
      }
    });

    // Remove sprites for deleted objects
    Object.keys(spritesRef.current).forEach(id => {
      if (!sceneObjects.find(o => o.id === id)) {
        const sprite = spritesRef.current[id];
        sprite.destroy();
        delete spritesRef.current[id];
        
        // Also remove physics body
        if (physicsRef.current) {
          physicsRef.current.removeBody(id);
        }
      }
    });
  }, [sceneObjects, selectedObject, isInitialized, mode, activeTool, currentSceneId, assets]);

  // ── Sync parallax layers from project scene ──
  useEffect(() => {
    if (!appRef.current || !isInitialized || !parallaxContainerRef.current) return;
    
    // Get current scene's parallax layers
    const currentScene = project?.scenes?.find(s => s.id === currentSceneId);
    const parallaxLayers = currentScene?.layers?.parallax || [];
    
    console.log('[SceneView] Syncing parallax layers:', parallaxLayers.length);
    
    // Clear existing parallax sprites
    parallaxContainerRef.current.removeChildren();
    parallaxSpritesRef.current = [];
    
    if (parallaxLayers.length === 0) return;
    
    // Sort by zOrder (lower = further back)
    const sorted = [...parallaxLayers].sort((a, b) => (a.zOrder || 0) - (b.zOrder || 0));
    
    sorted.forEach((layer, layerIndex) => {
      if (!layer.visible) return;
      
      // Find the asset for this layer
      let asset = assets.find(a => a.id === layer.assetId);
      
      // Fallback: try to use bundledImage URL directly if asset not found
      let imageSrc = asset?.base64;
      if (!imageSrc && layer.bundledImage) {
        imageSrc = layer.bundledImage;
        console.log('[SceneView] Using bundled image URL:', layer.name, layer.bundledImage);
      }
      
      if (!imageSrc) {
        console.log('[SceneView] Parallax layer missing asset:', layer.name, layer.assetId);
        return;
      }
      
      const layerData = { layer, sprites: [] };
      
      // Create image and load texture
      const img = new Image();
      img.crossOrigin = 'anonymous'; // Allow loading from public folder
      img.src = imageSrc;
      
      img.onload = () => {
        const texture = PIXI.Texture.from(img);
        const texWidth = (asset?.width || img.width) * (layer.scaleX || 1);
        const texHeight = (asset?.height || img.height) * (layer.scaleY || 1);
        
        // Calculate tiles needed for seamless scrolling
        const screenWidth = appRef.current.screen.width;
        const screenHeight = appRef.current.screen.height;
        const tilesX = layer.repeatX ? Math.ceil(screenWidth / texWidth) + 3 : 1;
        const tilesY = layer.repeatY ? Math.ceil(screenHeight / texHeight) + 3 : 1;
        
        // Base Y position for parallax - position above ground level for platformers
        // Ground is at y=500, so backgrounds should be visible from ~y=0 to y=500
        const baseY = layer.baseY ?? 0; // Allow custom offset per layer
        
        for (let ty = 0; ty < tilesY; ty++) {
          for (let tx = 0; tx < tilesX; tx++) {
            const sprite = new PIXI.Sprite(texture);
            sprite.scale.set(layer.scaleX || 1, layer.scaleY || 1);
            sprite.alpha = layer.alpha ?? 1;
            sprite.zIndex = layerIndex;
            
            // Store original position and texture size for parallax calculation
            sprite._originalX = tx * texWidth;
            sprite._originalY = baseY + ty * texHeight;
            sprite._texWidth = texWidth;
            sprite._texHeight = texHeight;
            
            // Apply tint
            if (layer.tintColor && layer.tintColor !== '#ffffff') {
              sprite.tint = layer.tintColor;
            }
            
            parallaxContainerRef.current.addChild(sprite);
            layerData.sprites.push(sprite);
          }
        }
        
        parallaxSpritesRef.current.push(layerData);
        console.log('[SceneView] Parallax layer created:', layer.name, 'with', layerData.sprites.length, 'tiles');
      };
    });
  }, [project, currentSceneId, assets, isInitialized]);

  // Create sprite based on object type
  const createSprite = (obj) => {
    const container = new PIXI.Container();
    
    // Check if this is an animated entity with animation data
    if (obj.animationData && obj.animationData.states) {
      console.log('[SceneView] Creating animated sprite for:', obj.name, obj.animationData);
      try {
        const animData = obj.animationData;
        const states = animData.states;
        const firstStateName = Object.keys(states)[0];
        const firstState = states[firstStateName];
        
        if (firstState && firstState.frames && firstState.frames.length > 0) {
          // Check for new format (frame indices + spriteSheet) vs old format (dataUrl frames)
          const isNewFormat = animData.spriteSheet?.src && typeof firstState.frames[0] === 'number';
          
          if (isNewFormat) {
            // NEW FORMAT: frames are indices, spriteSheet.src is the image
            console.log('[SceneView] Using NEW sprite sheet format');
            const sheet = animData.spriteSheet;
            const fw = sheet.frameWidth || 32;
            const fh = sheet.frameHeight || 32;
            
            // Load the sprite sheet
            const sheetImg = new Image();
            sheetImg.crossOrigin = 'anonymous';
            sheetImg.src = sheet.src;
            
            // Wait for image to load before creating texture
            sheetImg.onload = () => {
              const baseTexture = PIXI.Texture.from(sheetImg);
              const cols = Math.floor(sheetImg.width / fw);
              
              // Get the first frame index
              const frameIdx = firstState.frames[0];
              const col = frameIdx % cols;
              const row = Math.floor(frameIdx / cols);
              
              // Create cropped texture for first frame
              const frameRect = new PIXI.Rectangle(col * fw, row * fh, fw, fh);
              const frameTexture = new PIXI.Texture({ source: baseTexture.source, frame: frameRect });
              
              const animSprite = new PIXI.Sprite(frameTexture);
              animSprite.label = 'animated';
              animSprite.anchor.set(0.5);
              
              // Scale to object size
              const scaleX = (obj.width || fw) / fw;
              const scaleY = (obj.height || fh) / fh;
              animSprite.scale.set(scaleX, scaleY);
              
              // Store animation data on sprite
              animSprite._animationData = animData;
              animSprite._currentState = firstStateName;
              animSprite._currentFrame = 0;
              animSprite._frameTimer = 0;
              animSprite._baseTexture = baseTexture;
              animSprite._cols = cols;
              animSprite._fw = fw;
              animSprite._fh = fh;
              
              // Pre-create frame textures for all states
              animSprite._textures = {};
              Object.keys(states).forEach(stateName => {
                const state = states[stateName];
                animSprite._textures[stateName] = state.frames.map(idx => {
                  const c = idx % cols;
                  const r = Math.floor(idx / cols);
                  const rect = new PIXI.Rectangle(c * fw, r * fh, fw, fh);
                  return new PIXI.Texture({ source: baseTexture.source, frame: rect });
                });
              });
              
              container.addChild(animSprite);
              console.log('[SceneView] New-format animated sprite created');
            };
            
            sheetImg.onerror = () => {
              console.warn('[SceneView] Failed to load sprite sheet:', sheet.src);
              createFallbackSprite(container, obj);
            };
            
            // Return container immediately; sprite will be added async
            return container;
            
          } else {
            // OLD FORMAT: frames are dataUrls
            console.log('[SceneView] Using OLD dataUrl format');
            const firstFrameUrl = firstState.frames[0];
            const img = new Image();
            img.src = firstFrameUrl;
            
            const texture = PIXI.Texture.from(img);
            const animSprite = new PIXI.Sprite(texture);
            animSprite.label = 'animated';
            animSprite.anchor.set(0.5);
            
            // Store animation data on sprite for later updates
            animSprite._animationData = animData;
            animSprite._currentState = firstStateName;
            animSprite._currentFrame = 0;
            animSprite._frameTimer = 0;
            animSprite._textures = {}; // Cache for frame textures
            
            // Pre-load all frame textures
            Object.keys(states).forEach(stateName => {
              const state = states[stateName];
              animSprite._textures[stateName] = state.frames.map(frameUrl => {
                const frameImg = new Image();
                frameImg.src = frameUrl;
                return PIXI.Texture.from(frameImg);
              });
            });
            
            container.addChild(animSprite);
            console.log('[SceneView] Old-format animated sprite created with', firstState.frames.length, 'frames');
            return container;
          }
        }
      } catch (e) {
        console.warn('[SceneView] Failed to create animated sprite:', e);
        // Fall through to regular sprite creation
      }
    }
    
    // Check if this object has an asset image
    const asset = obj.assetId ? assets.find(a => a.id === obj.assetId) : null;
    console.log('[SceneView] createSprite for:', obj.name, 'assetId:', obj.assetId, 'found asset:', !!asset);
    
    if (asset && asset.base64) {
      // Create image sprite from asset using HTML Image for proper loading
      try {
        console.log('[SceneView] Creating image sprite from base64, asset size:', asset.width, 'x', asset.height);
        
        // Create an HTML Image element and load the base64 data
        const img = new Image();
        img.src = asset.base64;
        
        // Create texture from the image
        const texture = PIXI.Texture.from(img);
        
        const imageSprite = new PIXI.Sprite(texture);
        imageSprite.label = 'image';
        imageSprite.anchor.set(0.5);
        
        // Scale to fit the object dimensions (use actual asset size if obj dimensions are default)
        const targetWidth = obj.width || 100;
        const targetHeight = obj.height || 100;
        const scaleX = targetWidth / (asset.width || 40);
        const scaleY = targetHeight / (asset.height || 40);
        console.log('[SceneView] Image sprite scale:', scaleX, scaleY, 'target:', targetWidth, 'x', targetHeight);
        imageSprite.scale.set(scaleX, scaleY);
        
        container.addChild(imageSprite);
        console.log('[SceneView] Image sprite added to container. Container children:', container.children.length);
      } catch (e) {
        console.warn('[SceneView] Failed to create sprite from asset:', e);
        // Fall back to emoji
        createFallbackSprite(container, obj);
      }
    } else {
      // Use fallback emoji/shape sprite
      createFallbackSprite(container, obj);
    }

    return container;
  };
  
  // Create fallback sprite with shape and emoji
  const createFallbackSprite = (container, obj) => {
    // Background shape
    const graphics = new PIXI.Graphics();
    graphics.label = 'shape';
    container.addChild(graphics);

    // Icon/emoji text
    const text = new PIXI.Text({
      text: obj.icon || '?',
      style: {
        fontSize: Math.min(obj.width || 40, obj.height || 40) * 0.6,
        fill: '#ffffff',
      }
    });
    text.label = 'icon';
    text.anchor.set(0.5);
    container.addChild(text);
  };

  // Update sprite properties
  const updateSprite = (sprite, obj) => {
    if (!sprite) return;
    
    console.log('[SceneView] updateSprite for:', obj.name, 'position:', obj.x, obj.y, 'visible:', obj.visible);
    
    sprite.x = obj.x || 0;
    sprite.y = obj.y || 0;
    sprite.rotation = (obj.rotation || 0) * (Math.PI / 180);
    sprite.alpha = obj.alpha ?? 1;
    sprite.visible = obj.visible !== false;

    // Check if this has an animated sprite
    const animSprite = sprite.getChildByLabel('animated');
    if (animSprite) {
      // Update animated sprite scale based on object dimensions and frame size
      const animData = animSprite._animationData;
      const frameW = animData?.spriteSheet?.frameWidth || animSprite._fw || 32;
      const frameH = animData?.spriteSheet?.frameHeight || animSprite._fh || 32;
      const scaleX = (obj.width || frameW) / frameW;
      const scaleY = (obj.height || frameH) / frameH;
      // Preserve flip direction (negative scale.x means facing left)
      const flipSign = animSprite.scale.x < 0 ? -1 : 1;
      animSprite.scale.set(flipSign * Math.abs(scaleX) * (obj.scale || 1), scaleY * (obj.scale || 1));
    }
    // Check if this has an image sprite
    else {
      const imageSprite = sprite.getChildByLabel('image');
      if (imageSprite) {
        // Update image sprite scale based on object dimensions and asset dimensions
        const asset = obj.assetId ? assets.find(a => a.id === obj.assetId) : null;
        if (asset) {
          const baseScaleX = (obj.width || 40) / (asset.width || 40);
          const baseScaleY = (obj.height || 40) / (asset.height || 40);
          imageSprite.scale.set(baseScaleX * (obj.scale || 1), baseScaleY * (obj.scale || 1));
        } else {
          sprite.scale.set(obj.scale || 1);
        }
      } else {
        // Regular emoji sprite - apply scale to container
        sprite.scale.set(obj.scale || 1);
      }
    }

    // Update shape (only for fallback sprites)
    const graphics = sprite.getChildByLabel('shape');
    if (graphics) {
      graphics.clear();
      const w = obj.width || 50;
      const h = obj.height || 50;
      
      // Get color based on type
      const color = getObjectColor(obj.type);
      
      graphics.roundRect(-w/2, -h/2, w, h, 8);
      graphics.fill({ color, alpha: 0.8 });
      graphics.stroke({ width: 2, color: 0xffffff, alpha: 0.3 });
    }

    // Update icon position (only for fallback sprites)
    const icon = sprite.getChildByLabel('icon');
    if (icon) {
      icon.text = obj.icon || '?';
      icon.x = 0;
      icon.y = 0;
    }
  };

  // Get color based on object type
  const getObjectColor = (type) => {
    const colors = {
      player: 0x3b82f6,  // blue
      enemy: 0xef4444,   // red
      coin: 0xeab308,    // yellow
      platform: 0x78716c, // stone
      goal: 0x22c55e,    // green
      npc: 0x8b5cf6,     // purple
    };
    return colors[type] || 0x6b7280;
  };
  
  // Get default z-index based on object type (higher = rendered on top)
  const getDefaultZIndex = (type) => {
    const zIndices = {
      background: 0,     // Background images at the very back
      backdrop: 0,       // Alias for background
      floor: 5,          // Floor/ground images
      tilemap: 5,        // Tilemaps
      image: 10,         // Generic uploaded images (default low)
      sprite: 15,        // Generic sprites
      platform: 20,      // Platforms
      decoration: 25,    // Decorations
      coin: 30,          // Collectibles
      goal: 35,          // Goal/finish points  
      npc: 40,           // NPCs
      enemy: 50,         // Enemies
      player: 100,       // Player always on top
    };
    return zIndices[type] ?? 15; // Default for unknown types
  };

  // Draw selection box
  const drawSelectionBox = (sprite, obj) => {
    if (!sprite || !obj) return;
    
    let selectionBox = sprite.getChildByLabel('selection');
    if (!selectionBox) {
      selectionBox = new PIXI.Graphics();
      selectionBox.label = 'selection';
      sprite.addChild(selectionBox);
    }

    // Use object dimensions directly instead of getLocalBounds (which includes selection box)
    const w = obj.width || 40;
    const h = obj.height || 40;
    const padding = 4;
    
    selectionBox.clear();
    selectionBox.rect(-w/2 - padding, -h/2 - padding, w + padding * 2, h + padding * 2);
    selectionBox.stroke({ width: 2, color: 0x3b82f6 });

    // Corner handles
    const handleSize = 8;
    const corners = [
      { x: -w/2 - padding, y: -h/2 - padding },
      { x: w/2 + padding, y: -h/2 - padding },
      { x: -w/2 - padding, y: h/2 + padding },
      { x: w/2 + padding, y: h/2 + padding },
    ];
    corners.forEach(({ x, y }) => {
      selectionBox.rect(x - handleSize/2, y - handleSize/2, handleSize, handleSize);
      selectionBox.fill({ color: 0x3b82f6 });
      selectionBox.stroke({ width: 1, color: 0xffffff });
    });
  };

  // Clear selection box
  const clearSelectionBox = (sprite) => {
    if (!sprite) return;
    
    const selectionBox = sprite.getChildByLabel('selection');
    if (selectionBox) {
      selectionBox.clear();
    }
  };

  // Handle zoom
  const handleZoom = (delta) => {
    if (cameraRef.current) {
      if (delta > 0) {
        cameraRef.current.zoomIn(delta);
      } else {
        cameraRef.current.zoomOut(Math.abs(delta));
      }
    }
  };

  // Reset camera
  const handleResetCamera = () => {
    if (cameraRef.current) {
      cameraRef.current.setZoom(1, true);
      cameraRef.current.centerOn(canvasSize.width / 2, canvasSize.height / 2, true);
    }
  };

  // Center on selected object
  const handleCenterOnSelected = () => {
    if (cameraRef.current && selectedObject) {
      cameraRef.current.centerOn(selectedObject.x || 0, selectedObject.y || 0);
    }
  };

  // Handle panning with mouse (canvas-level handler does actual panning via isPanningRef)
  const handleMouseDown = (e) => {
    // Pan with middle mouse button OR when pan tool is active
    if (e.button === 1 || activeTool === 'pan') {
      e.preventDefault();
      // Update React state for cursor styling
      setIsPanning(true);
    }
  };

  const handleMouseMove = (e) => {
    // Calculate world position from screen position (use canvas rect, not container div)
    if (appRef.current && cameraRef.current) {
      const rect = appRef.current.canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      
      // Convert screen to world coordinates using camera utility
      const world = cameraRef.current.screenToWorld(screenX, screenY);
      setCursorWorldPos({ x: Math.round(world.x), y: Math.round(world.y) });
    }
    
    // Pan is handled by canvas-level mouseMove handler - no duplicate here
  };

  const handleMouseUp = (e) => {
    if (e.button === 1 || isPanning) {
      setIsPanning(false);
    }
  };

  // Wheel zoom is handled by canvas-level wheel handler - no duplicate here
  const handleWheel = useCallback((e) => {
    // Let the canvas-level handler do the work
  }, []);

  // Attach wheel listener with passive: false to allow preventDefault
  useEffect(() => {
    const canvas = containerRef.current;
    if (!canvas) return;
    
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  // State to track if space is held for temporary pan
  const [spaceHeld, setSpaceHeld] = useState(false);
  const previousToolRef = useRef(null);
  const [showInspector, setShowInspector] = useState(false);

  // Keyboard shortcuts (EDIT MODE ONLY - play mode keys handled by behavior system)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      // In play mode, don't intercept ANY keys - let the behavior system handle them
      if (modeRef.current === 'play') return;

      // Space key for temporary pan mode (edit mode only)
      if (e.code === 'Space' && !spaceHeld) {
        e.preventDefault();
        setSpaceHeld(true);
        previousToolRef.current = activeTool;
        setActiveTool('pan');
        if (onToolChange) onToolChange('pan');
        return;
      }

      // Tool shortcuts (edit mode only)
      const tool = tools.find(t => t.key === e.key.toLowerCase());
      if (tool) {
        setActiveTool(tool.id);
        if (onToolChange) onToolChange(tool.id);
        return;
      }

      // Camera shortcuts (edit mode only)
      switch (e.key.toLowerCase()) {
        case 'home':
          handleResetCamera();
          break;
        case 'f':
          if (selectedObject) handleCenterOnSelected();
          break;
        case '-':
        case '_':
          handleZoom(-0.25);
          break;
        case '=':
        case '+':
          handleZoom(0.25);
          break;
        case '0':
          handleResetCamera();
          break;
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'Space' && spaceHeld) {
        setSpaceHeld(false);
        if (previousToolRef.current) {
          setActiveTool(previousToolRef.current);
          if (onToolChange) onToolChange(previousToolRef.current);
          previousToolRef.current = null;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedObject, spaceHeld, activeTool, onToolChange]);

  return (
    <div className="h-full w-full min-h-0 min-w-0 overflow-hidden flex flex-col bg-zinc-900">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-zinc-700 bg-zinc-800">
        {/* Current Scene Indicator */}
        <div className="flex items-center gap-2 mr-4">
          <span className="text-lg">🎬</span>
          <span className="text-sm font-medium text-zinc-300">
            {currentSceneName || 'No Scene'}
          </span>
          <span className="text-xs text-zinc-500">
            ({sceneObjects.length} objects)
          </span>
        </div>

        {/* Tools */}
        <div className="flex items-center gap-1">
          {tools.map(tool => (
            <button
              key={tool.id}
              onClick={() => {
                setActiveTool(tool.id);
                if (onToolChange) onToolChange(tool.id);
              }}
              className={`p-2 rounded transition ${
                activeTool === tool.id
                  ? tool.id === 'playerStart' 
                    ? 'bg-green-600 text-white'
                    : 'bg-blue-600 text-white'
                  : 'hover:bg-zinc-700 text-zinc-400'
              }`}
              title={tool.label}
            >
              {tool.icon}
            </button>
          ))}

          <div className="w-px h-6 bg-zinc-700 mx-2" />

          {/* View Options */}
          <button
            onClick={() => onViewSettingsChange?.({ ...viewSettings, showGrid: !viewSettings?.showGrid })}
            className={`p-2 rounded transition ${
              viewSettings?.showGrid ? 'bg-zinc-700' : 'hover:bg-zinc-700'
            }`}
            title="Toggle Grid"
          >
            <Grid size={16} className={viewSettings?.showGrid ? 'text-white' : 'text-zinc-400'} />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleZoom(-0.25)}
            className="p-1.5 hover:bg-zinc-700 rounded transition"
            title="Zoom Out (-)"
          >
            <ZoomOut size={14} />
          </button>
          <span className="text-xs text-zinc-400 w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => handleZoom(0.25)}
            className="p-1.5 hover:bg-zinc-700 rounded transition"
            title="Zoom In (+)"
          >
            <ZoomIn size={14} />
          </button>
          
          <div className="w-px h-4 bg-zinc-700 mx-1" />
          
          <button
            onClick={handleResetCamera}
            className="p-1.5 hover:bg-zinc-700 rounded transition"
            title="Reset Camera (Home)"
          >
            <RotateCcw size={14} />
          </button>
          <button
            onClick={handleCenterOnSelected}
            disabled={!selectedObject}
            className={`p-1.5 rounded transition ${
              selectedObject ? 'hover:bg-zinc-700' : 'opacity-30 cursor-not-allowed'
            }`}
            title="Center on Selected (F)"
          >
            <Crosshair size={14} />
          </button>
          <button
            onClick={() => setFollowPlayer(!followPlayer)}
            className={`p-1.5 rounded transition ${
              followPlayer ? 'bg-green-600 text-white' : 'hover:bg-zinc-700 text-zinc-400'
            }`}
            title="Follow Player"
          >
            <Target size={14} />
          </button>
          
          <div className="w-px h-4 bg-zinc-700 mx-1" />
          
          {/* Physics Debug Toggle */}
          <button
            onClick={() => {
              setShowPhysicsDebug(!showPhysicsDebug);
              if (physicsRef.current) {
                physicsRef.current.toggleDebug();
              }
            }}
            className={`p-1.5 rounded transition text-xs font-mono ${
              showPhysicsDebug ? 'bg-orange-600 text-white' : 'hover:bg-zinc-700 text-zinc-400'
            }`}
            title="Toggle Physics Debug (shows collision shapes)"
          >
            <Zap size={14} />
          </button>

          {/* Camera Inspector Toggle */}
          <button
            onClick={() => setShowInspector(!showInspector)}
            className={`p-1.5 rounded transition text-xs font-mono ${
              showInspector ? 'bg-blue-600 text-white' : 'hover:bg-zinc-700 text-zinc-400'
            }`}
            title="Toggle Camera Inspector"
          >
            <Crosshair size={14} />
          </button>
          
          {/* Debug Sprites Button */}
          <button
            onClick={() => {
              console.log('=== SPRITE DEBUG ===');
              console.log('spritesRef:', Object.keys(spritesRef.current));
              console.log('sceneObjects:', sceneObjects.map(o => ({ id: o.id, name: o.name, x: o.x, y: o.y, assetId: o.assetId })));
              console.log('assets:', assets?.map(a => ({ id: a.id, name: a.name, hasBase64: !!a.base64 })));
              
              if (appRef.current) {
                const world = appRef.current.stage.getChildByLabel('world');
                const scene = world?.getChildByLabel('scene');
                console.log('world container:', world);
                console.log('scene container:', scene);
                console.log('scene children:', scene?.children?.length);
                scene?.children?.forEach((child, i) => {
                  console.log(`  Child ${i}:`, child.label, 'pos:', child.x, child.y, 'visible:', child.visible, 'alpha:', child.alpha);
                  child.children?.forEach((subChild, j) => {
                    console.log(`    SubChild ${j}:`, subChild.label, 'visible:', subChild.visible);
                  });
                });
              }
              console.log('Camera:', cameraRef.current?.x, cameraRef.current?.y, cameraRef.current?.zoom);
              console.log('===================');
            }}
            className="p-1.5 rounded transition hover:bg-zinc-700 text-yellow-400"
            title="Debug Sprites (check console)"
          >
            🔍
          </button>
        </div>

        {/* Mode Indicator */}
        <div className="flex items-center gap-2">
          {mode === 'play' && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-600 rounded text-white text-sm font-medium animate-pulse">
              <Play size={14} fill="currentColor" />
              PLAYING - Use WASD/Arrows to move
            </div>
          )}
          {mode === 'edit' && activeTool === 'playerStart' && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-600/80 rounded text-white text-sm font-medium">
              <MapPin size={14} />
              Click to set Player Start position
            </div>
          )}
        </div>
      </div>

      {/* Canvas Container */}
      <div className="flex-1 relative overflow-hidden">
        <div 
          ref={containerRef}
          className={`absolute inset-0 flex items-center justify-center ${
            isPanning 
              ? 'cursor-grabbing' 
              : activeTool === 'pan' 
                ? 'cursor-grab' 
                : activeTool === 'select' 
                  ? 'cursor-default' 
                  : activeTool === 'move' 
                    ? 'cursor-move' 
                    : activeTool === 'playerStart'
                      ? 'cursor-crosshair'
                      : 'cursor-crosshair'
          }`}
          onClick={(e) => {
            // Handle Player Start tool - use the actual PixiJS canvas rect, not the container div
            if (activeTool === 'playerStart' && onUpdatePlayerStart && cameraRef.current && appRef.current) {
              const canvas = appRef.current.canvas;
              const rect = canvas.getBoundingClientRect();
              const screenX = e.clientX - rect.left;
              const screenY = e.clientY - rect.top;
              
              // Convert screen to world coordinates using camera utility
              const world = cameraRef.current.screenToWorld(screenX, screenY);
              onUpdatePlayerStart({ x: Math.round(world.x), y: Math.round(world.y), enabled: true });
              return;
            }
            
            // Only deselect if we didn't click on an object
            if (activeTool === 'select' && !clickedOnObjectRef.current) {
              onSelectObject(null);
            }
            // Reset flag after a short delay (to handle event order)
            setTimeout(() => {
              clickedOnObjectRef.current = false;
            }, 0);
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* PixiJS canvas is appended here */}
        </div>

        {/* Canvas Size Indicator */}
        <div className="absolute bottom-2 left-2 text-xs text-zinc-500 bg-zinc-800/80 px-2 py-1 rounded">
          {canvasSize.width} × {canvasSize.height}
        </div>

        {/* Cursor World Position - Always visible for precise positioning */}
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs bg-zinc-800/90 border border-zinc-600 px-3 py-1.5 rounded-lg flex items-center gap-3 font-mono shadow-lg">
          <span className="text-zinc-400">Cursor:</span>
          <span className="text-blue-400 font-medium">X: {cursorWorldPos.x}</span>
          <span className="text-green-400 font-medium">Y: {cursorWorldPos.y}</span>
        </div>

        {/* Camera Position */}
        <div className="absolute top-2 right-2 text-xs text-zinc-500 bg-zinc-800/80 px-2 py-1 rounded flex items-center gap-2">
          <span>Camera: {Math.round(cameraPos.x)}, {Math.round(cameraPos.y)}</span>
          {gamepadConnected && (
            <span className="flex items-center gap-1 text-green-400" title="Gamepad connected">
              <Gamepad2 size={14} />
            </span>
          )}
        </div>

        {/* Camera Inspector (toggleable) */}
        {showInspector && (
          <div className="absolute top-2 left-2 text-xs bg-zinc-800/90 border border-blue-500/50 px-3 py-2 rounded-lg flex flex-col gap-1 font-mono shadow-lg">
            <span className="text-zinc-300">Mode: {mode}</span>
            <span className="text-zinc-300">Follow: {String(followPlayer)}</span>
            <span className="text-blue-400">Cam X: {Math.round(cameraPos.x)} Y: {Math.round(cameraPos.y)}</span>
            <span className="text-green-400">Zoom: {zoom.toFixed(2)}</span>
            {(() => {
              const playerObj = sceneObjects.find(o => o.type === 'player');
              const playerSprite = playerObj ? spritesRef.current[playerObj.id] : null;
              const px = playerSprite?.x ?? 0;
              const py = playerSprite?.y ?? 0;
              return <span className="text-orange-400">Player X: {Math.round(px)} Y: {Math.round(py)}</span>;
            })()}
          </div>
        )}

        {/* Selected Object Coordinates */}
        {selectedObject && (
          <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 text-xs bg-zinc-800/90 border border-orange-500/50 px-3 py-1.5 rounded-lg flex items-center gap-3 font-mono">
            <span className="text-orange-400">Selected:</span>
            <span className="text-blue-400 font-medium">X: {selectedObject.x || 0}</span>
            <span className="text-green-400 font-medium">Y: {selectedObject.y || 0}</span>
            <span className="text-zinc-400">({selectedObject.name || selectedObject.type})</span>
          </div>
        )}

        {/* Player Start Position Indicator */}
        {playerStart?.enabled && mode === 'edit' && (
          <div className="absolute top-2 left-2 text-xs bg-zinc-800/90 border border-green-500/50 px-2 py-1 rounded flex items-center gap-2">
            <MapPin size={12} className="text-green-400" />
            <span className="text-green-400 font-medium">Start: ({playerStart.x}, {playerStart.y})</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SceneView;
