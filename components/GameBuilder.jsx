'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Settings, Save, Grid, User, Box, Flag, Coins, Zap, Home, Image as ImageIcon, MousePointer2, AlignLeft, AlignRight, AlignCenter, Copy, Trash2, Layers, Brush, Wand2, Upload, Palette } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ParallaxBackground from './ParallaxBackground';
import { backgroundPresets } from './BackgroundPresets';
// Use alias imports to resolve to TypeScript implementations and avoid JS shim recursion
import TileSystem from '@systems/TileSystem';
import BrushTool from '@systems/BrushTool';
import LayerSystem from '@systems/LayerSystem';
import BrushControls from './BrushControls';
import LayerPanel from './LayerPanel';

const GameBuilder = () => {
  const router = useRouter();
  const [mode, setMode] = useState('edit'); // 'edit' or 'play'
  const [selectedTool, setSelectedTool] = useState('player');
  const [aboutOpen, setAboutOpen] = useState(false);
  const [selectedBackground, setSelectedBackground] = useState('solid');
  const [showBackgroundPanel, setShowBackgroundPanel] = useState(false);
  const parallaxBgRef = useRef(null);
  const cameraXRef = useRef(0);
  const mobileControlsRef = useRef({
    left: false,
    right: false,
    jump: false
  });

  // Enhanced Drag and Drop System
  const [selectedObjects, setSelectedObjects] = useState([]);
  const [selectionBox, setSelectionBox] = useState(null);
  const [dragStart, setDragStart] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isMultiSelecting, setIsMultiSelecting] = useState(false);
  const [selectionMode] = useState('single'); // 'single', 'multi', 'box' - reserved for future use
  // const [transformMode, setTransformMode] = useState('move'); // 'move', 'rotate', 'scale' - reserved for future use
  const [clipboard, setClipboard] = useState([]);
  const [groups, setGroups] = useState([]);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  
  // Config must be defined BEFORE using it in other state initializers
  const [config, setConfig] = useState({
    playerSpeed: 5,
    jumpHeight: 12,
    gravity: 0.6,
    gridSize: 40,
    levelWidth: 20,
    levelHeight: 12,
    playerSprite: '😊',
    platformSprite: '🟫',
    coinSprite: '🪙',
    enemySprite: '👾',
    goalSprite: '🏁',
    backgroundColor: '#87CEEB'
  });
  
  // Advanced Features State - initialized AFTER config
  const [tileSystem] = useState(() => new TileSystem(40)); // Use hardcoded gridSize
  const [brushTool] = useState(() => new BrushTool());
  const [layerSystem] = useState(() => new LayerSystem());
  const [showBrushControls, setShowBrushControls] = useState(false);
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [showTilePalette, setShowTilePalette] = useState(false);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [selectedTile, setSelectedTile] = useState(0);
  const brushToolRef = useRef(brushTool);
  const layerSystemRef = useRef(layerSystem);
  const tileSystemRef = useRef(tileSystem);

  const [level, setLevel] = useState({
    platforms: [
      { x: 0, y: 11, width: 20, height: 1 }, // Ground
      { x: 3, y: 9, width: 3, height: 1 },
      { x: 8, y: 7, width: 3, height: 1 },
      { x: 13, y: 9, width: 3, height: 1 }
    ],
    player: { x: 1, y: 10 },
    coins: [
      { x: 4, y: 8 },
      { x: 9, y: 6 },
      { x: 14, y: 8 }
    ],
    enemies: [
      { x: 6, y: 10, direction: 1, range: 3, startX: 6 }
    ],
    goal: { x: 18, y: 10 }
  });

  // Animation support for player character (imported JSON)
  const [animationsList, setAnimationsList] = useState([]); // { id, name }
  const [animationsMap, setAnimationsMap] = useState({}); // id/name -> raw animation JSON
  const [selectedAnimationId, setSelectedAnimationId] = useState('');
  const [animationRaw, setAnimationRaw] = useState(null); // raw JSON object for save/load
  const playerAnimationRef = useRef(null); // parsed animation with Image objects
  const animSMRef = useRef(null); // animation state machine instance
  const [animateOnInput, setAnimateOnInput] = useState(true);

  const canvasRef = useRef(null);
  const gameStateRef = useRef(null);
  // Developer debug handles removed; not attached to window by default
  
  const [notification, setNotification] = useState('');
  const showNotification = (msg, ms = 3000) => {
    setNotification(msg);
    if (ms) setTimeout(() => setNotification(''), ms);
  }

  // Game state for playing
  const initGameState = () => ({
    playerPos: { x: level.player.x * config.gridSize, y: level.player.y * config.gridSize },
    playerVel: { x: 0, y: 0 },
    coins: [...level.coins],
    score: 0,
    gameWon: false,
    onGround: false,
    playerAnimState: 'idle',
    playerAnimFrame: 0,
    playerAnimElapsed: 0,
    enemies: level.enemies.map(e => ({
      x: e.x * config.gridSize,
      y: e.y * config.gridSize,
      direction: e.direction,
      range: e.range * config.gridSize,
      startX: e.startX * config.gridSize
    }))
  });

  // Helper to find a usable animation state (e.g., if 'idle' missing, fall back to another)
  const getStateAnim = (a, stateKey) => {
    if (!a || !a.states) return null;
    if (stateKey && a.states[stateKey] && a.states[stateKey].frames && a.states[stateKey].frames.length > 0) return a.states[stateKey];
    const candidates = ['idle', 'walk', 'run', 'jump'];
    for (const k of candidates) {
      if (a.states[k] && a.states[k].frames && a.states[k].frames.length > 0) return a.states[k];
    }
    const keys = Object.keys(a.states);
    for (const k of keys) {
      if (a.states[k] && a.states[k].frames && a.states[k].frames.length > 0) return a.states[k];
    }
    return null;
  };

  // Evaluate a transition condition object (simple JSON-based conditions)
  const evaluateCondition = (cond, input, gState, cfg) => {
    if (!cond) return false;
    // Allow shorthand boolean or simple predicates
    if (typeof cond === 'boolean') return cond;
    if (typeof cond === 'string' && cond === 'always') return true;
    // If cond is an array treat as OR
    if (Array.isArray(cond)) return cond.some(c => evaluateCondition(c, input, gState, cfg));
    // cond is object with known keys
    if (typeof cond === 'object') {
      if (cond.always) return true;
      if (typeof cond.minHorizontal === 'number') {
        return Math.abs(input.horizontal || 0) >= cond.minHorizontal;
      }
      if (typeof cond.maxHorizontal === 'number') {
        return Math.abs(input.horizontal || 0) <= cond.maxHorizontal;
      }
      if (typeof cond.jumpPressed === 'boolean') return !!input.jumpPressed === !!cond.jumpPressed;
      if (typeof cond.isGrounded === 'boolean') return !!gState.onGround === !!cond.isGrounded;
      if (typeof cond.velocityYLessThan === 'number') return (gState.playerVel?.y || 0) < cond.velocityYLessThan;
      if (typeof cond.velocityYGreaterThan === 'number') return (gState.playerVel?.y || 0) > cond.velocityYGreaterThan;
      // Allow custom property checks
      if (typeof cond.property === 'string' && typeof cond.op === 'string') {
        const val = (gState[cond.property] !== undefined) ? gState[cond.property] : (input[cond.property] !== undefined ? input[cond.property] : null);
        if (val === null) return false;
        switch (cond.op) {
          case 'eq': return val === cond.value;
          case 'ne': return val !== cond.value;
          case 'lt': return val < cond.value;
          case 'gt': return val > cond.value;
          case 'lte': return val <= cond.value;
          case 'gte': return val >= cond.value;
        }
      }
    }
    return false;
  };

  // Animation State Machine class - controls state transitions & frame timing
  class AnimationStateMachine {
    constructor(anim, opts = {}) {
      this.setAnimation(anim);
      this.opts = opts;
      this.currentState = 'idle';
      this.frameIndex = 0;
      this.frameElapsed = 0; // ms
    }

    setAnimation(anim) {
      this.anim = anim || null;
      this.currentState = 'idle';
      this.frameIndex = 0;
      this.frameElapsed = 0;
    }

    // Determine desired state from input & game state (basic rules)
    chooseState(input, gState, cfg) {
      if (!this.anim || !this.anim.states) return 'idle';
      const speed = Math.abs(gState.playerVel.x || 0);
      // Evaluate global transitions first (anim.transitions)
      if (this.anim.transitions) {
        for (const [next, cond] of Object.entries(this.anim.transitions)) {
          if (evaluateCondition(cond, input, gState, cfg)) return next;
        }
      }
      // Evaluate transitions defined on the current state
      if (this.currentState && this.anim.states[this.currentState] && this.anim.states[this.currentState].transitions) {
        for (const [next, cond] of Object.entries(this.anim.states[this.currentState].transitions)) {
          if (evaluateCondition(cond, input, gState, cfg)) return next;
        }
      }
      // Priority: jump if not grounded (unless transitions override)
      if (!gState.onGround) return 'jump';
      // run, walk thresholds
      if (speed > (cfg.playerSpeed || 5) * 0.7) return 'run';
      if (speed > 0.1) return 'walk';
      return 'idle';
    }

    update(dt, input, gState, opts = {}) {
      if (!this.anim) return { state: 'idle', frameIndex: 0 };
      const cfg = opts.config || { playerSpeed: 5 };
      const desiredState = this.chooseState(input, gState, cfg);
      // If desired state doesn't exist on animation, pick fallback
      const stateToUse = getStateAnim(this.anim, desiredState) ? desiredState : (getStateAnim(this.anim, 'idle') ? 'idle' : (Object.keys(this.anim.states)[0] || desiredState));
      if (this.currentState !== stateToUse) {
        this.currentState = stateToUse;
        this.frameIndex = 0;
        this.frameElapsed = 0;
      }

      // Get the state anim and frame duration
      const sAnim = getStateAnim(this.anim, this.currentState);
      if (!sAnim || !sAnim.frames || sAnim.frames.length === 0) {
        return { state: this.currentState, frameIndex: 0 };
      }

      // Should we animate? If opts.animateOnInput is true, require movement input
      let shouldAnimate = true;
      if (opts.animateOnInput) {
        const movingInput = (input && input.horizontal && Math.abs(input.horizontal) > 0.05) || ((gState && gState.playerVel && Math.abs(gState.playerVel.x) > 0.05));
        shouldAnimate = !!movingInput;
      }

      if (shouldAnimate) {
        this.frameElapsed += dt;
        const dur = (sAnim.frameDuration || 100);
        while (this.frameElapsed >= dur) {
          this.frameElapsed -= dur;
          this.frameIndex = this.frameIndex + 1;
          if (sAnim.loop) {
            this.frameIndex = this.frameIndex % sAnim.frames.length;
          } else {
            if (this.frameIndex >= sAnim.frames.length) this.frameIndex = sAnim.frames.length - 1;
          }
        }
      } else {
        this.frameElapsed = 0;
        this.frameIndex = 0;
      }

      return { state: this.currentState, frameIndex: this.frameIndex };
    }
  }

  const drawGame = (ctx, gameState = null) => {
    const gs = config.gridSize;
    
    // Draw parallax background if available
    const preset = backgroundPresets[selectedBackground];
    if (parallaxBgRef.current && preset.layers.length > 0) {
      parallaxBgRef.current.draw(ctx, ctx.canvas.width);
    } else {
      // Fallback to solid color
      ctx.fillStyle = preset.backgroundColor || config.backgroundColor;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }

    // Draw grid in edit mode
    if (mode === 'edit') {
      ctx.strokeStyle = '#ddd';
      ctx.lineWidth = 1;
      for (let x = 0; x <= config.levelWidth; x++) {
        ctx.beginPath();
        ctx.moveTo(x * gs, 0);
        ctx.lineTo(x * gs, config.levelHeight * gs);
        ctx.stroke();
      }
      for (let y = 0; y <= config.levelHeight; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * gs);
        ctx.lineTo(config.levelWidth * gs, y * gs);
        ctx.stroke();
      }
      
      // Draw tile system with colored tiles
      if (tileSystemRef.current) {
        // Define tile colors (matching TilePalette colors)
        const tileColors = [
          '#FF0000', '#FF7F00', '#FFFF00', '#00FF00',
          '#0000FF', '#4B0082', '#9400D3', '#FFFFFF',
          '#808080', '#000000', '#FF69B4', '#00FFFF'
        ];
        
        // Draw all tiles
        for (const [, tile] of tileSystemRef.current.tiles) {
          const color = tileColors[tile.tileId % tileColors.length];
          ctx.fillStyle = color;
          ctx.fillRect(tile.x * gs, tile.y * gs, gs, gs);
          
          // Draw border for visibility
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
          ctx.lineWidth = 1;
          ctx.strokeRect(tile.x * gs, tile.y * gs, gs, gs);
        }
      }
    }

    // Draw platforms
    ctx.font = `${gs}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    level.platforms.forEach(p => {
      for (let x = 0; x < p.width; x++) {
        for (let y = 0; y < p.height; y++) {
          ctx.fillText(config.platformSprite, (p.x + x) * gs + gs/2, (p.y + y) * gs + gs/2);
        }
      }
    });

    // Draw coins
    const activeCoinsList = gameState ? gameState.coins : level.coins;
    activeCoinsList.forEach(c => {
      ctx.fillText(config.coinSprite, c.x * gs + gs/2, c.y * gs + gs/2);
    });

    // Draw enemies
    const enemyList = gameState ? gameState.enemies : level.enemies;
    enemyList.forEach(e => {
      const ex = gameState ? e.x : e.x * gs;
      const ey = gameState ? e.y : e.y * gs;
      ctx.fillText(config.enemySprite, ex + gs/2, ey + gs/2);
    });

    // Draw goal
    ctx.fillText(config.goalSprite, level.goal.x * gs + gs/2, level.goal.y * gs + gs/2);

    // Draw player
    const px = gameState ? gameState.playerPos.x : level.player.x * gs;
    const py = gameState ? gameState.playerPos.y : level.player.y * gs;

    // Draw animated player if available
    const anim = playerAnimationRef.current;
    const currentState = gameState ? gameState.playerAnimState : 'idle';
    const stateAnim = getStateAnim(anim, currentState);
    if (anim && stateAnim) {
      const frameIndex = (gameState && gameState.playerAnimFrame != null) ? gameState.playerAnimFrame : 0;
      const img = stateAnim.frames[frameIndex];
      if (img && img.complete) {
        // Draw image centered in grid cell
        const drawW = gs;
        const drawH = gs;
        ctx.drawImage(img, px, py, drawW, drawH);
      } else {
        // Fallback to emoji while image loads
        ctx.fillText(config.playerSprite, px + gs/2, py + gs/2);
      }
    } else {
      ctx.fillText(config.playerSprite, px + gs/2, py + gs/2);
    }

    // Draw layers
    if (mode === 'edit' && layerSystemRef.current) {
      layerSystemRef.current.draw(ctx, 0, 0, (obj) => {
        // Custom draw function for layer objects
        if (obj.type === 'sprite') {
          ctx.fillStyle = obj.color || '#FF9900';
          ctx.fillRect(obj.x, obj.y, obj.width || gs, obj.height || gs);
        }
      });
    }
    
    // Draw score in play mode
    if (gameState) {
      ctx.fillStyle = '#000';
      ctx.font = '20px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`Score: ${gameState.score}`, 10, 30);
      
      if (gameState.gameWon) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.fillStyle = '#FFD700';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🎉 YOU WIN! 🎉', ctx.canvas.width/2, ctx.canvas.height/2);
        ctx.font = '24px Arial';
        ctx.fillText(`Final Score: ${gameState.score}`, ctx.canvas.width/2, ctx.canvas.height/2 + 50);
      }
    }
    
    // Draw brush preview in edit mode
    if (mode === 'edit' && selectedTool === 'brush' && cursorPos.x > 0 && cursorPos.y > 0) {
      brushToolRef.current.drawPreview(ctx, cursorPos.x, cursorPos.y, gs, 0, 0);
    }
    
    // Draw selection highlights in edit mode
    if (mode === 'edit' && selectedObjects.length > 0) {
      ctx.strokeStyle = '#FF9900';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      
      selectedObjects.forEach(obj => {
        ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
      });
      
      ctx.setLineDash([]);
    }
    
    // Draw selection box
    if (selectionBox && isMultiSelecting) {
      const minX = Math.min(selectionBox.startX, selectionBox.endX);
      const minY = Math.min(selectionBox.startY, selectionBox.endY);
      const width = Math.abs(selectionBox.endX - selectionBox.startX);
      const height = Math.abs(selectionBox.endY - selectionBox.startY);
      
      ctx.fillStyle = 'rgba(255, 153, 0, 0.1)';
      ctx.fillRect(minX, minY, width, height);
      ctx.strokeStyle = '#FF9900';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(minX, minY, width, height);
      ctx.setLineDash([]);
    }
  };

  // Helper function to generate unique IDs
  const generateId = () => `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Helper function to get all objects as a flat array
  const getAllObjects = () => {
    const objects = [];
    
    // Add platforms
    level.platforms.forEach((p, i) => {
      objects.push({ 
        ...p, 
        id: p.id || `platform_${i}`, 
        type: 'platform',
        width: p.width * config.gridSize,
        height: p.height * config.gridSize,
        x: p.x * config.gridSize,
        y: p.y * config.gridSize
      });
    });
    
    // Add coins
    level.coins.forEach((c, i) => {
      objects.push({ 
        ...c, 
        id: c.id || `coin_${i}`, 
        type: 'coin',
        width: config.gridSize,
        height: config.gridSize,
        x: c.x * config.gridSize,
        y: c.y * config.gridSize
      });
    });
    
    // Add enemies
    level.enemies.forEach((e, i) => {
      objects.push({ 
        ...e, 
        id: e.id || `enemy_${i}`, 
        type: 'enemy',
        width: config.gridSize,
        height: config.gridSize,
        x: e.x * config.gridSize,
        y: e.y * config.gridSize
      });
    });
    
    // Add player
    objects.push({
      ...level.player,
      id: 'player',
      type: 'player',
      width: config.gridSize,
      height: config.gridSize,
      x: level.player.x * config.gridSize,
      y: level.player.y * config.gridSize
    });
    
    // Add goal if exists
    if (level.goal) {
      objects.push({
        ...level.goal,
        id: 'goal',
        type: 'goal',
        width: config.gridSize,
        height: config.gridSize,
        x: level.goal.x * config.gridSize,
        y: level.goal.y * config.gridSize
      });
    }
    
    return objects;
  };

  // Snapping helpers - reserved for future use
  // const snapToGrid = (x, y, gridSize = config.gridSize) => {
  //   return {
  //     x: Math.round(x / gridSize) * gridSize,
  //     y: Math.round(y / gridSize) * gridSize
  //   };
  // };

  // Alignment tools
  const alignSelected = (alignment) => {
    if (selectedObjects.length < 2) return;
    
    const gs = config.gridSize;
    let updates = {};
    
    switch(alignment) {
      case 'left':
        const leftMost = Math.min(...selectedObjects.map(o => o.x));
        selectedObjects.forEach(obj => {
          updates[obj.id] = { x: Math.floor(leftMost / gs) };
        });
        break;
        
      case 'right':
        const rightMost = Math.max(...selectedObjects.map(o => o.x + o.width));
        selectedObjects.forEach(obj => {
          updates[obj.id] = { x: Math.floor((rightMost - obj.width) / gs) };
        });
        break;
        
      case 'top':
        const topMost = Math.min(...selectedObjects.map(o => o.y));
        selectedObjects.forEach(obj => {
          updates[obj.id] = { y: Math.floor(topMost / gs) };
        });
        break;
        
      case 'bottom':
        const bottomMost = Math.max(...selectedObjects.map(o => o.y + o.height));
        selectedObjects.forEach(obj => {
          updates[obj.id] = { y: Math.floor((bottomMost - obj.height) / gs) };
        });
        break;
        
      case 'centerHorizontal':
        const avgX = selectedObjects.reduce((sum, o) => sum + o.x + o.width/2, 0) / selectedObjects.length;
        selectedObjects.forEach(obj => {
          updates[obj.id] = { x: Math.floor((avgX - obj.width/2) / gs) };
        });
        break;
        
      case 'centerVertical':
        const avgY = selectedObjects.reduce((sum, o) => sum + o.y + o.height/2, 0) / selectedObjects.length;
        selectedObjects.forEach(obj => {
          updates[obj.id] = { y: Math.floor((avgY - obj.height/2) / gs) };
        });
        break;
    }
    
    applyObjectUpdates(updates);
  };

  // Apply updates to objects
  const applyObjectUpdates = (updates) => {
    setLevel(prev => {
      const newLevel = { ...prev };
      
      Object.entries(updates).forEach(([id, changes]) => {
        const obj = getAllObjects().find(o => o.id === id);
        if (!obj) return;
        
        if (obj.type === 'platform') {
          const index = prev.platforms.findIndex(p => (p.id || `platform_${prev.platforms.indexOf(p)}`) === id);
          if (index !== -1) {
            newLevel.platforms = [...prev.platforms];
            newLevel.platforms[index] = { ...newLevel.platforms[index], ...changes };
          }
        } else if (obj.type === 'coin') {
          const index = prev.coins.findIndex(c => (c.id || `coin_${prev.coins.indexOf(c)}`) === id);
          if (index !== -1) {
            newLevel.coins = [...prev.coins];
            newLevel.coins[index] = { ...newLevel.coins[index], ...changes };
          }
        } else if (obj.type === 'enemy') {
          const index = prev.enemies.findIndex(e => (e.id || `enemy_${prev.enemies.indexOf(e)}`) === id);
          if (index !== -1) {
            newLevel.enemies = [...prev.enemies];
            newLevel.enemies[index] = { ...newLevel.enemies[index], ...changes };
          }
        } else if (obj.type === 'player') {
          newLevel.player = { ...prev.player, ...changes };
        } else if (obj.type === 'goal') {
          newLevel.goal = { ...prev.goal, ...changes };
        }
      });
      
      return newLevel;
    });
  };

  // Grouping functions
  const createGroup = (objects) => {
    const groupId = generateId();
    const group = {
      id: groupId,
      objects: objects.map(o => o.id),
      locked: false
    };
    
    setGroups([...groups, group]);
    
    // Mark objects as grouped
    const updates = {};
    objects.forEach(obj => {
      updates[obj.id] = { groupId };
    });
    applyObjectUpdates(updates);
  };

  const ungroupSelected = () => {
    const groupIds = new Set(selectedObjects.map(o => o.groupId).filter(Boolean));
    
    // Remove groups
    setGroups(groups.filter(g => !groupIds.has(g.id)));
    
    // Unmark objects
    const updates = {};
    selectedObjects.forEach(obj => {
      if (obj.groupId) {
        updates[obj.id] = { groupId: null };
      }
    });
    applyObjectUpdates(updates);
  };

  // Reserved for future group selection feature
  // const selectGroup = (groupId) => {
  //   const group = groups.find(g => g.id === groupId);
  //   if (group) {
  //     const objects = getAllObjects();
  //     const groupObjects = objects.filter(o => o.groupId === groupId);
  //     setSelectedObjects(groupObjects);
  //   }
  // };

  // Enhanced mouse down handler with selection support and brush tool
  const handleCanvasMouseDown = (e) => {
    if (mode !== 'edit') return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = clickX * scaleX;
    const canvasY = clickY * scaleY;
    
    const x = Math.floor(canvasX / config.gridSize);
    const y = Math.floor(canvasY / config.gridSize);
    const pixelX = canvasX;
    const pixelY = canvasY;
    
    setIsMouseDown(true);
    
    // Handle brush tool
    if (selectedTool === 'brush') {
      handleBrushPaint(x, y);
      return;
    }
    
    // Check if clicking on existing object (for select tool)
    const objects = getAllObjects();
    const clickedObject = objects.find(obj => 
      pixelX >= obj.x && pixelX < obj.x + obj.width &&
      pixelY >= obj.y && pixelY < obj.y + obj.height
    );
    
    if (selectedTool === 'select' || e.shiftKey) {
      if (clickedObject) {
        // Clicked on object
        if (e.shiftKey || selectionMode === 'multi') {
          // Multi-select
          if (selectedObjects.some(o => o.id === clickedObject.id)) {
            setSelectedObjects(selectedObjects.filter(o => o.id !== clickedObject.id));
          } else {
            setSelectedObjects([...selectedObjects, clickedObject]);
          }
        } else {
          // Single select
          if (!selectedObjects.some(o => o.id === clickedObject.id)) {
            setSelectedObjects([clickedObject]);
          }
          setDragStart({ x: e.clientX, y: e.clientY, objX: pixelX, objY: pixelY });
          setIsDragging(true);
        }
      } else {
        // Clicked on empty space
        if (e.shiftKey || selectionMode === 'box') {
          // Start box selection
          setSelectionBox({ startX: pixelX, startY: pixelY, endX: pixelX, endY: pixelY });
          setIsMultiSelecting(true);
        } else {
          // Deselect all
          setSelectedObjects([]);
        }
      }
    } else {
      // Place new object with current tool
      if (selectedTool === 'player') {
        setLevel(prev => ({ ...prev, player: { x, y } }));
      } else if (selectedTool === 'platform') {
        setLevel(prev => ({
          ...prev,
          platforms: [...prev.platforms, { x, y, width: 2, height: 1, id: generateId() }]
        }));
      } else if (selectedTool === 'coin') {
        setLevel(prev => ({
          ...prev,
          coins: [...prev.coins, { x, y, id: generateId() }]
        }));
      } else if (selectedTool === 'enemy') {
        setLevel(prev => ({
          ...prev,
          enemies: [...prev.enemies, { x, y, direction: 1, range: 3, startX: x, id: generateId() }]
        }));
      } else if (selectedTool === 'goal') {
        setLevel(prev => ({ ...prev, goal: { x, y } }));
      } else if (selectedTool === 'eraser') {
        setLevel(prev => ({
          ...prev,
          platforms: prev.platforms.filter(p => !(x >= p.x && x < p.x + p.width && y >= p.y && y < p.y + p.height)),
          coins: prev.coins.filter(c => !(c.x === x && c.y === y)),
          enemies: prev.enemies.filter(e => !(e.x === x && e.y === y))
        }));
      }
    }
  };

  // Brush paint handler
  const handleBrushPaint = (gridX, gridY) => {
    if (!tileSystemRef.current || !brushToolRef.current) return;
    
    const brush = brushToolRef.current;
    const mode = brush.mode;
    
    if (mode === 'eyedropper') {
      // Pick tile from tile system
      const tile = tileSystemRef.current.getTile(gridX, gridY);
      if (tile) {
        setSelectedTile(tile.tileId || 0);
        brush.setMode('paint'); // Switch back to paint mode
      }
    } else if (mode === 'erase') {
      // Erase tiles
      const affectedTiles = brush.getAffectedTiles(gridX, gridY);
      affectedTiles.forEach(pos => {
        tileSystemRef.current.removeTile(pos.x, pos.y);
      });
    } else if (mode === 'fill') {
      // Flood fill
      tileSystemRef.current.setTile(gridX, gridY, 'default', selectedTile);
    } else {
      // Paint mode - apply brush with current tile
      const affectedTiles = brush.getAffectedTiles(gridX, gridY);
      affectedTiles.forEach(pos => {
        tileSystemRef.current.setTile(pos.x, pos.y, 'default', selectedTile);
      });
    }
    
    // Redraw canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      drawGame(ctx);
    }
  };
  
  // Mouse move handler for dragging and brush painting
  const handleCanvasMouseMove = (e) => {
    if (mode !== 'edit') return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = clickX * scaleX;
    const canvasY = clickY * scaleY;
    
    setCursorPos({ x: canvasX, y: canvasY });
    
    const x = Math.floor(canvasX / config.gridSize);
    const y = Math.floor(canvasY / config.gridSize);
    
    // Handle brush painting while dragging
    if (isMouseDown && selectedTool === 'brush') {
      handleBrushPaint(x, y);
      return;
    }
    
    if (isDragging && dragStart && selectedObjects.length > 0) {
      // Drag selected objects
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      
      const pixelDx = dx * scaleX;
      const pixelDy = dy * scaleY;
      
      const gridDx = Math.floor(pixelDx / config.gridSize);
      const gridDy = Math.floor(pixelDy / config.gridSize);
      
      if (gridDx !== 0 || gridDy !== 0) {
        const updates = {};
        selectedObjects.forEach(obj => {
          const gridX = Math.floor(obj.x / config.gridSize);
          const gridY = Math.floor(obj.y / config.gridSize);
          updates[obj.id] = { 
            x: gridX + gridDx, 
            y: gridY + gridDy 
          };
        });
        
        applyObjectUpdates(updates);
        setDragStart({ x: e.clientX, y: e.clientY });
      }
    }
    
    if (isMultiSelecting && selectionBox) {
      // Update selection box
      setSelectionBox({
        ...selectionBox,
        endX: canvasX,
        endY: canvasY
      });
    }
  };

  // Mouse up handler
  const handleCanvasMouseUp = () => {
    if (mode !== 'edit') return;
    
    setIsMouseDown(false);
    
    // Reset brush line state
    if (selectedTool === 'brush' && brushToolRef.current) {
      brushToolRef.current.reset();
    }
    
    if (isMultiSelecting && selectionBox) {
      // Select all objects in box
      const minX = Math.min(selectionBox.startX, selectionBox.endX);
      const maxX = Math.max(selectionBox.startX, selectionBox.endX);
      const minY = Math.min(selectionBox.startY, selectionBox.endY);
      const maxY = Math.max(selectionBox.startY, selectionBox.endY);
      
      const objects = getAllObjects();
      const selected = objects.filter(obj =>
        obj.x >= minX && obj.x + obj.width <= maxX &&
        obj.y >= minY && obj.y + obj.height <= maxY
      );
      
      setSelectedObjects(selected);
      setSelectionBox(null);
      setIsMultiSelecting(false);
    }
    
    setIsDragging(false);
    setDragStart(null);
  };

  // Legacy support - keep for backward compatibility
  // const handleCanvasClick = () => {
  //   // This is now handled by mouseDown/mouseUp
  // };

  // Save level with all features
  const saveLevel = () => {
    const levelData = {
      config,
      level,
      tiles: tileSystemRef.current.export(),
      layers: layerSystemRef.current.export(),
      background: selectedBackground
      ,
      // Include imported animation raw JSON if present
      playerAnimation: animationRaw || null,
      // Persist animation playback preference
      animateOnInput: !!animateOnInput
    };
    
    const dataStr = JSON.stringify(levelData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'pluto-level-' + Date.now() + '.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };
  
  // Load level with all features
  const loadLevel = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const levelData = JSON.parse(event.target.result);
        
        if (levelData.config) setConfig(levelData.config);
        if (levelData.level) setLevel(levelData.level);
        if (levelData.tiles && tileSystemRef.current) {
          tileSystemRef.current.import(levelData.tiles);
        }
        if (levelData.layers && layerSystemRef.current) {
          layerSystemRef.current.import(levelData.layers);
        }
        if (levelData.background) setSelectedBackground(levelData.background);
        // Restore imported animation if present
        if (levelData.playerAnimation) {
          try {
            setAnimationRaw(levelData.playerAnimation);
            // parse and load into playerAnimationRef
            parseAnimationJSON(levelData.playerAnimation);
            setSelectedAnimationId(levelData.playerAnimation.name || 'imported');
          } catch (err) {
            console.warn('Failed to restore player animation:', err);
          }
        }
        if (typeof levelData.animateOnInput !== 'undefined') {
          setAnimateOnInput(!!levelData.animateOnInput);
        }
        
        showNotification('Level loaded successfully!');
      } catch (err) {
        showNotification('Error loading level: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  // Parse animation JSON and populate playerAnimationRef with Image objects
  const parseAnimationJSON = (animJson) => {
    if (!animJson) return;
    // Backwards compatibility: support top-level `frames` shape by converting to a simple `states.idle`.
    if (!animJson.states && Array.isArray(animJson.frames)) {
      animJson = {
        ...animJson,
        states: {
          idle: {
            frames: animJson.frames,
            frameDuration: animJson.frameDuration || animJson.speed || 100,
            loop: typeof animJson.loop === 'boolean' ? animJson.loop : true,
            transitions: animJson.transitions || {}
          }
        }
      };
    }
    // If there are states but no top-level frames, ensure frames metadata is available (for legacy consumers)
    if (!animJson.frames && animJson.states) {
      if (animJson.states.idle && Array.isArray(animJson.states.idle.frames)) {
        animJson.frames = animJson.states.idle.frames;
      } else {
        const firstKey = Object.keys(animJson.states)[0];
        if (firstKey) animJson.frames = animJson.states[firstKey].frames || [];
      }
    }
    console.log('GameBuilder: parseAnimationJSON called for:', animJson && animJson.name, 'states:', animJson && Object.keys(animJson.states).length);
    const parsed = { name: animJson.name || 'imported', states: {}, _meta: { loaded: 0, failed: 0, total: 0 } };
    Object.entries(animJson.states).forEach(([stateName, stateObj]) => {
      const framesRaw = stateObj.frames || [];
      const frames = framesRaw.map((f, idx) => {
        let src = null;
        // Support multiple frame formats: string (data URL or filename), object with src/dataUrl
        if (typeof f === 'string') {
          src = f;
        } else if (f && typeof f === 'object') {
          src = f.dataUrl || f.src || f.url || f.filename || null;
        }

        // Resolve non-data-URL strings to likely public path or localStorage-stored assets
        if (src && typeof src === 'string' && !src.startsWith('data:') && !src.startsWith('http') && !src.startsWith('/')) {
          // Attempt to look up cached frame data saved by sprite editor
          try {
            const cached = localStorage.getItem('sprite-editor.frame.' + src);
            if (cached) {
              src = cached;
            } else {
              // Fallback to public path (common pattern); we can't guarantee this path exists
              src = '/sprites/' + src;
            }
          } catch (err) {
            // If localStorage isn't available or lookup fails, keep original src
          }
        }

        const img = new Image();
        // Show an example frame src in console for quick debugging
        if (idx === 0) {
          console.log(`GameBuilder: example frame [${stateName}][0] src:`, src);
        }
        try { img.crossOrigin = 'anonymous'; } catch (e) {}
        let loaded = false;
        if (src) {
          img.src = src;
        }
        img.onload = () => {
          parsed._meta.loaded += 1;
          console.log('GameBuilder: loaded frame', { src, state: stateName, idx });
        };
        img.onerror = (err) => {
          parsed._meta.failed += 1;
          console.warn('GameBuilder: Failed to load animation frame', { src, state: stateName, idx, err });
        };
        return img;
      });
      parsed.states[stateName] = {
        frames,
        frameDuration: stateObj.frameDuration || (stateObj.frameDurationMs ? stateObj.frameDurationMs : 100),
        loop: typeof stateObj.loop === 'boolean' ? stateObj.loop : true,
        transitions: stateObj.transitions || {}
      };
      parsed._meta.total += frames.length;
    });
    playerAnimationRef.current = parsed;
    // Initialize or update the animation state machine instance
    try {
      if (!animSMRef.current) animSMRef.current = new AnimationStateMachine(parsed);
      else animSMRef.current.setAnimation(parsed);
    } catch (e) {
      console.warn('GameBuilder: Failed to initialize AnimationStateMachine', e);
    }
    // Expose a debug handle in window for quick verification when running tests
    // Dev debug handle not attached to window by default; keep parsing info via console
    // keep a copy of the raw JSON for saving/export
    setAnimationRaw(animJson);
    // store raw by name/id so we can switch between imported animations
    const id = animJson.name || `anim_${Date.now()}`;
    setAnimationsMap(prev => ({ ...prev, [id]: animJson }));
    // also attach raw to the parsed ref for convenience
    try { playerAnimationRef.current.raw = animJson; } catch (e) {}
    // add to list for selection
    setAnimationsList(prev => {
      const id = parsed.name || `anim_${Date.now()}`;
      if (prev.some(a => a.id === id)) return prev;
      return [...prev, { id, name: parsed.name }];
    });
    // Debug: log how many frames succeeded/failed to load after a short wait
    setTimeout(() => {
      try {
        console.info('GameBuilder: parsed animation', parsed.name, parsed._meta || {});
        if (parsed._meta.total > 0 && parsed._meta.loaded === 0) {
          showNotification('Warning: Animation frames did not load (check data URLs or sprite frame paths)');
        }
      } catch (e) {}
    }, 1000);
  };

  // Handle importing animation JSON file
  const handleImportAnimation = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target.result);
        parseAnimationJSON(json);
        setSelectedAnimationId(json.name || 'imported');
        try {
          localStorage.setItem('gamebuilder.playerAnimation', JSON.stringify(json));
        } catch (err) {
          console.warn('Could not persist imported animation to localStorage', err);
        }
        showNotification('Animation imported successfully');
      } catch (err) {
        showNotification('Failed to import animation JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  // Listen for programmatic imports (BroadcastChannel + CustomEvent)
  useEffect(() => {
    // Load persisted animation from localStorage if present
    try {
      const saved = localStorage.getItem('gamebuilder.playerAnimation');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.states) {
          parseAnimationJSON(parsed);
          setSelectedAnimationId(parsed.name || 'imported');
        }
      }
    } catch (err) {
      console.warn('Failed to load saved player animation from localStorage', err);
    }

    // BroadcastChannel listener for cross-tab exports
    let bc;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel('gamebuilder-animations');
        bc.onmessage = (ev) => {
          try {
            const anim = ev.data;
            if (anim && anim.states) {
              console.log('GameBuilder: received animation via BroadcastChannel', anim && anim.name);
              parseAnimationJSON(anim);
              setSelectedAnimationId(anim.name || 'imported');
              try { localStorage.setItem('gamebuilder.playerAnimation', JSON.stringify(anim)); } catch (e) {}
              // friendly UI feedback
              showNotification('Animation imported from sprite editor');
            }
          } catch (err) {
            console.warn('Error handling BroadcastChannel message', err);
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel initialization failed', err);
      }
    }

    // CustomEvent fallback for same-page SPA export
    const customHandler = (e) => {
      try {
        const anim = e?.detail;
        if (anim && anim.states) {
          console.log('GameBuilder: received animation via CustomEvent', anim && anim.name);
          parseAnimationJSON(anim);
          setSelectedAnimationId(anim.name || 'imported');
          try { localStorage.setItem('gamebuilder.playerAnimation', JSON.stringify(anim)); } catch (e) {}
          showNotification('Animation imported from sprite editor');
        }
      } catch (err) {
        console.warn('Error handling custom import event', err);
      }
    };
    window.addEventListener('gamebuilder:importAnimation', customHandler);

    return () => {
      try { if (bc) bc.close(); } catch (e) {}
      window.removeEventListener('gamebuilder:importAnimation', customHandler);
    };
  }, []);
  
  // Keyboard shortcuts handler
  const handleKeyDown = (e) => {
    if (mode !== 'edit') return;
    
    // Don't interfere with input fields
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }
    
    // Allow Page Up/Down/Home/End for scrolling - don't handle these at all
    if (e.key === 'PageUp' || e.key === 'PageDown' || e.key === 'Home' || e.key === 'End') {
      return;
    }
    
    // Brush tool shortcuts
    if (selectedTool === 'brush' && brushToolRef.current) {
      const brush = brushToolRef.current;
      
      // B: Paint mode
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        brush.setMode('paint');
        return;
      }
      
      // E: Erase mode
      if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        brush.setMode('erase');
        return;
      }
      
      // F: Fill mode
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        brush.setMode('fill');
        return;
      }
      
      // I: Eyedropper mode
      if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        brush.setMode('eyedropper');
        return;
      }
      
      // [: Decrease brush size
      if (e.key === '[') {
        e.preventDefault();
        const info = brush.getInfo();
        brush.setSize(Math.max(1, info.size - 1));
        return;
      }
      
      // ]: Increase brush size
      if (e.key === ']') {
        e.preventDefault();
        const info = brush.getInfo();
        brush.setSize(Math.min(10, info.size + 1));
        return;
      }
    }
    
    // Ctrl/Cmd + A: Select all
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
      e.preventDefault();
      setSelectedObjects(getAllObjects());
    }
    
    // Ctrl/Cmd + C: Copy
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
      e.preventDefault();
      if (selectedObjects.length > 0) {
        setClipboard([...selectedObjects]);
      }
    }
    
    // Ctrl/Cmd + V: Paste
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      e.preventDefault();
      if (clipboard.length > 0) {
        const gs = config.gridSize;
        setLevel(prev => {
          const newLevel = { ...prev };
          const pasted = [];
          
          clipboard.forEach(obj => {
            const newObj = {
              ...obj,
              id: generateId(),
              x: Math.floor(obj.x / gs) + 1,
              y: Math.floor(obj.y / gs) + 1
            };
            delete newObj.groupId; // Remove group when pasting
            
            if (obj.type === 'platform') {
              newLevel.platforms = [...(newLevel.platforms || []), newObj];
            } else if (obj.type === 'coin') {
              newLevel.coins = [...(newLevel.coins || []), newObj];
            } else if (obj.type === 'enemy') {
              newLevel.enemies = [...(newLevel.enemies || []), { ...newObj, startX: newObj.x }];
            }
            
            pasted.push({ ...newObj, x: newObj.x * gs, y: newObj.y * gs, width: obj.width, height: obj.height });
          });
          
          setSelectedObjects(pasted);
          return newLevel;
        });
      }
    }
    
    // Ctrl/Cmd + D: Duplicate
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
      e.preventDefault();
      if (selectedObjects.length > 0) {
        const gs = config.gridSize;
        setLevel(prev => {
          const newLevel = { ...prev };
          const duplicated = [];
          
          selectedObjects.forEach(obj => {
            const newObj = {
              ...obj,
              id: generateId(),
              x: Math.floor(obj.x / gs) + 1,
              y: Math.floor(obj.y / gs) + 1
            };
            delete newObj.groupId;
            
            if (obj.type === 'platform') {
              newLevel.platforms = [...(newLevel.platforms || []), newObj];
            } else if (obj.type === 'coin') {
              newLevel.coins = [...(newLevel.coins || []), newObj];
            } else if (obj.type === 'enemy') {
              newLevel.enemies = [...(newLevel.enemies || []), { ...newObj, startX: newObj.x }];
            }
            
            duplicated.push({ ...newObj, x: newObj.x * gs, y: newObj.y * gs, width: obj.width, height: obj.height });
          });
          
          setSelectedObjects(duplicated);
          return newLevel;
        });
      }
    }
    
    // Delete/Backspace: Delete selected
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      if (selectedObjects.length > 0) {
        const selectedIds = new Set(selectedObjects.map(o => o.id));
        setLevel(prev => ({
          ...prev,
          platforms: prev.platforms.filter(p => !selectedIds.has(p.id)),
          coins: prev.coins.filter(c => !selectedIds.has(c.id)),
          enemies: prev.enemies.filter(e => !selectedIds.has(e.id))
        }));
        setSelectedObjects([]);
      }
    }
    
    // Arrow keys: Move selected objects
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      if (selectedObjects.length > 0) {
        const step = e.shiftKey ? 1 : 0.25; // Fine control with shift
        const updates = {};
        
        selectedObjects.forEach(obj => {
          const gridX = Math.floor(obj.x / config.gridSize);
          const gridY = Math.floor(obj.y / config.gridSize);
          
          updates[obj.id] = {
            x: gridX + (e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0),
            y: gridY + (e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0)
          };
        });
        
        applyObjectUpdates(updates);
      }
    }
    
    // G: Group selected objects
    if (e.key === 'g' && selectedObjects.length > 1) {
      e.preventDefault();
      createGroup(selectedObjects);
    }
    
    // U: Ungroup selected
    if (e.key === 'u' && selectedObjects.length > 0) {
      e.preventDefault();
      ungroupSelected();
    }
    
    // Escape: Deselect all
    if (e.key === 'Escape') {
      setSelectedObjects([]);
      setSelectionBox(null);
      setIsMultiSelecting(false);
    }
  };

  // Add keyboard event listener - only when canvas is focused to avoid blocking page scrolling
  useEffect(() => {
    if (mode === 'edit') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      canvas.addEventListener('keydown', handleKeyDown);
      return () => canvas.removeEventListener('keydown', handleKeyDown);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selectedObjects, clipboard, config.gridSize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (mode === 'edit') {
      drawGame(ctx);
      return;
    }

    // Play mode - game loop
    if (!gameStateRef.current) {
      gameStateRef.current = initGameState();
    }

    const keys = {};
    
    const handleKeyDown = (e) => {
      keys[e.key] = true;
      // Prevent page scrolling when using arrow keys or space
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
      }
    };
    
    const handleKeyUp = (e) => {
      keys[e.key] = false;
      // Prevent page scrolling when using arrow keys
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    let lastTime = performance.now();
    const gameLoop = () => {
      const nowTick = performance.now();
      const dt = nowTick - lastTime;
      lastTime = nowTick;
      const state = gameStateRef.current;
      if (state.gameWon) {
        drawGame(ctx, state);
        return;
      }

      const gs = config.gridSize;
      const mobile = mobileControlsRef.current;
      
      // Player movement (keyboard or mobile controls)
      if (keys['ArrowLeft'] || keys['a'] || mobile.left) state.playerVel.x = -config.playerSpeed;
      else if (keys['ArrowRight'] || keys['d'] || mobile.right) state.playerVel.x = config.playerSpeed;
      else state.playerVel.x = 0;

      if ((keys['ArrowUp'] || keys[' '] || keys['w'] || mobile.jump) && state.onGround) {
        state.playerVel.y = -config.jumpHeight;
        state.onGround = false;
      }

      // Gravity
      state.playerVel.y += config.gravity;

      // Update position
      state.playerPos.x += state.playerVel.x;
      state.playerPos.y += state.playerVel.y;

      // Collision with platforms
      state.onGround = false;
      level.platforms.forEach(p => {
        const pLeft = p.x * gs;
        const pRight = (p.x + p.width) * gs;
        const pTop = p.y * gs;
        const pBottom = (p.y + p.height) * gs;

        if (state.playerPos.x + gs > pLeft && state.playerPos.x < pRight &&
            state.playerPos.y + gs > pTop && state.playerPos.y < pBottom) {
          
          // Landing on top
          if (state.playerVel.y > 0 && state.playerPos.y < pTop) {
            state.playerPos.y = pTop - gs;
            state.playerVel.y = 0;
            state.onGround = true;
          }
          // Hitting from below
          else if (state.playerVel.y < 0 && state.playerPos.y > pBottom - gs) {
            state.playerPos.y = pBottom;
            state.playerVel.y = 0;
          }
          // Side collision
          else if (state.playerVel.x > 0) {
            state.playerPos.x = pLeft - gs;
          } else if (state.playerVel.x < 0) {
            state.playerPos.x = pRight;
          }
        }
      });

      // Collect coins
      state.coins = state.coins.filter(c => {
        if (Math.abs(state.playerPos.x - c.x * gs) < gs &&
            Math.abs(state.playerPos.y - c.y * gs) < gs) {
          state.score += 10;
          return false;
        }
        return true;
      });

      // Move enemies
      state.enemies.forEach(e => {
        e.x += e.direction * 2;
        if (e.x > e.startX + e.range || e.x < e.startX) {
          e.direction *= -1;
        }
      });

      // Check enemy collision
      state.enemies.forEach(e => {
        if (Math.abs(state.playerPos.x - e.x) < gs &&
            Math.abs(state.playerPos.y - e.y) < gs) {
          // Reset player
          state.playerPos = { x: level.player.x * gs, y: level.player.y * gs };
          state.playerVel = { x: 0, y: 0 };
          state.score = Math.max(0, state.score - 5);
        }
      });

      // Check goal
      if (Math.abs(state.playerPos.x - level.goal.x * gs) < gs &&
          Math.abs(state.playerPos.y - level.goal.y * gs) < gs) {
        state.gameWon = true;
      }

      // Bounds
      if (state.playerPos.y > config.levelHeight * gs) {
        state.playerPos = { x: level.player.x * gs, y: level.player.y * gs };
        state.playerVel = { x: 0, y: 0 };
      }

      // Update camera position and parallax background
      cameraXRef.current = state.playerPos.x - (canvas.width / 2);
      if (parallaxBgRef.current) {
        parallaxBgRef.current.update(cameraXRef.current);
      }

      // --- Player animation state machine & frame advance ---
      try {
        const animSM = animSMRef.current;
        if (animSM) {
          // Build input object for state machine; include mobile controls so touch controls animate properly
          const movingInput = keys['ArrowLeft'] || keys['a'] || keys['ArrowRight'] || keys['d'] || mobile.left || mobile.right;
          const jumpInput = keys[' '] || keys['ArrowUp'] || keys['w'] || mobile.jump;
          const horizontalInput = (keys['ArrowLeft'] || keys['a'] || mobile.left) ? -1 : (keys['ArrowRight'] || keys['d'] || mobile.right) ? 1 : 0;
          const inputObj = {
            horizontal: horizontalInput,
            jumpPressed: !!jumpInput,
            isGrounded: !!state.onGround,
            velocityY: state.playerVel.y || 0
          };
          const result = animSM.update(dt, inputObj, state, { animateOnInput, config });
          state.playerAnimState = result.state;
          state.playerAnimFrame = result.frameIndex;
          // If animation doesn't change and we have at least one state and frames, output debug info so Playwright can assert
          try {
            const dbg = document.getElementById('pluto-debug');
            if (dbg) {
              dbg.setAttribute('data-player-frame', String(state.playerAnimFrame));
              dbg.setAttribute('data-player-state', String(state.playerAnimState));
              // Provide the first frame src as extra debug info
              const anim = playerAnimationRef.current;
              let firstFrameSrc = '';
              if (anim && anim.states && anim.states[state.playerAnimState] && anim.states[state.playerAnimState].frames && anim.states[state.playerAnimState].frames[0]) {
                const f = anim.states[state.playerAnimState].frames[0];
                firstFrameSrc = f && (f.currentSrc || f.src) ? (f.currentSrc || f.src) : (typeof f === 'string' ? f : '');
              }
              dbg.setAttribute('data-player-frame-src', String(firstFrameSrc));
            }
          } catch (e) {}
          try {
            const dbg = document.getElementById('pluto-debug');
            if (dbg) {
              dbg.setAttribute('data-player-frame', String(state.playerAnimFrame));
              dbg.setAttribute('data-player-state', String(state.playerAnimState));
            }
          } catch (e) {}
        }
      } catch (err) {
        // swallow animation errors to avoid breaking game loop
        console.warn('Animation update error', err);
      }

      drawGame(ctx, state);
      animationId = requestAnimationFrame(gameLoop);
    };

    let animationId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, config, level]);

  // Initialize parallax background when selectedBackground changes
  useEffect(() => {
    const preset = backgroundPresets[selectedBackground];
    if (preset.layers.length > 0) {
      const bg = new ParallaxBackground();
      preset.layers.forEach(layer => {
        bg.addLayer(layer.src, layer.speed, layer.yOffset);
      });
      parallaxBgRef.current = bg;
    } else {
      parallaxBgRef.current = null;
    }
  }, [selectedBackground]);

  const handlePlayTest = () => {
    gameStateRef.current = initGameState();
    setMode('play');
  };

  const handleBackToEdit = () => {
    gameStateRef.current = null;
    setMode('edit');
  };

  // Simple Tile Palette Component (inline)
  const SimpleTilePalette = ({ selectedTile, onSelectTile }) => {
    const tileColors = [
      { id: 0, color: '#FF0000', name: 'Red' },
      { id: 1, color: '#FF7F00', name: 'Orange' },
      { id: 2, color: '#FFFF00', name: 'Yellow' },
      { id: 3, color: '#00FF00', name: 'Green' },
      { id: 4, color: '#0000FF', name: 'Blue' },
      { id: 5, color: '#4B0082', name: 'Indigo' },
      { id: 6, color: '#9400D3', name: 'Violet' },
      { id: 7, color: '#FFFFFF', name: 'White' },
      { id: 8, color: '#808080', name: 'Gray' },
      { id: 9, color: '#000000', name: 'Black' },
      { id: 10, color: '#FF69B4', name: 'Pink' },
      { id: 11, color: '#00FFFF', name: 'Cyan' },
    ];

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-6 gap-2">
          {tileColors.map((tile) => (
            <button
              key={tile.id}
              onClick={() => onSelectTile(tile.id)}
              className={`w-12 h-12 rounded border-2 transition-all ${
                selectedTile === tile.id
                  ? 'border-[#FF9900] ring-2 ring-[#FF9900] scale-110'
                  : 'border-zinc-700 hover:border-zinc-500'
              }`}
              style={{ backgroundColor: tile.color }}
              title={tile.name}
            />
          ))}
        </div>
        <div className="text-xs text-zinc-400 text-center">
          Selected: <span className="text-white font-semibold">{tileColors[selectedTile]?.name || 'None'}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-[#1a1a1a] p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {notification && (
          <div className="fixed top-4 right-4 z-50 bg-cyan-400 text-black px-3 py-2 rounded shadow-sm">{notification}</div>
        )}
        {/* Hidden debug element for integration tests (keeps tests decoupled from global handles) */}
        <div id="pluto-debug" className="hidden" data-player-frame="0" data-player-state="idle" />
        {/* Header with Back Button */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold flex items-center gap-2 sm:gap-3">
              <span className="text-2xl sm:text-3xl md:text-4xl"></span>
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">Pluto<span className="hidden xs:inline"> - Platformer</span></span>
            </h1>
            <p className="text-zinc-400 text-sm sm:text-base md:text-lg mt-1 sm:mt-2">Build Games With Pluto</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/advanced-features-demo')}
              className="flex items-center gap-1 sm:gap-2 bg-purple-600 hover:bg-purple-700 border border-purple-500 hover:border-purple-400 text-white px-2 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base rounded-lg transition-all shadow-black/50"
              title="Open Sprite Editor & Advanced Tools"
            >
              <Wand2 size={16} className="sm:w-[18px] sm:h-[18px]" />
              <span className="hidden md:inline">Sprite Editor</span>
              <span className="hidden sm:inline md:hidden">Editor</span>
              <span className="sm:hidden">✨</span>
            </button>
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-1 sm:gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-[#FF9900]/50 text-white px-2 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base rounded-lg transition-all shadow-black/50"
            >
              <Home size={16} className="sm:w-[18px] sm:h-[18px]" />
              <span className="hidden sm:inline">Back to Home</span>
              <span className="sm:hidden">Home</span>
            </button>
          </div>
        </div>

        {/* About Pluto Dropdown */}
        <div className="mb-4 sm:mb-6">
          <button
            onClick={() => setAboutOpen(!aboutOpen)}
            className="w-full bg-zinc-900 border border-zinc-800 hover:border-cyan-500/50 rounded-lg p-3 sm:p-4 flex items-center justify-between transition-all shadow-black/50"
          >
            <span className="text-white text-sm sm:text-base font-semibold flex items-center gap-2">
              <span className="text-lg sm:text-xl">ℹ️</span>
              About Pluto
            </span>
            <span className={`text-cyan-400 transition-transform ${aboutOpen ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
          {aboutOpen && (
            <div className="mt-2 bg-zinc-900 border border-zinc-800 rounded-lg p-4 sm:p-6 shadow-black/50">
              <p className="text-zinc-300 text-sm sm:text-base leading-relaxed">
                Pluto is a tiny drag and drop game engine still in development. New features will be added in future updates. Enjoy Building with Pluto!
              </p>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Canvas */}
          <div className="lg:col-span-3">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg shadow-black/50 p-3 sm:p-4">
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <h2 className="text-base sm:text-lg md:text-xl font-semibold text-white">
                  {mode === 'edit' ? '✏️ Edit Mode' : '🎮 Play Mode'}
                </h2>
                <div className="flex gap-1 sm:gap-2">
                  {mode === 'edit' ? (
                    <button
                      onClick={handlePlayTest}
                      className="flex items-center gap-1 sm:gap-2 bg-gradient-to-r from-[#FF9900] to-yellow-400 hover:from-[#FFB84D] hover:to-yellow-400 text-black font-semibold px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base rounded-lg shadow-[0_0_20px_rgba(255,153,0,0.4)] hover:shadow-[0_0_25px_rgba(255,153,0,0.6)] transition-all"
                    >
                      <Play size={16} className="sm:w-[18px] sm:h-[18px]" /> <span className="hidden xs:inline">Play Test</span><span className="xs:hidden">Play</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleBackToEdit}
                      className="flex items-center gap-1 sm:gap-2 bg-zinc-800 hover:bg-zinc-700 border border-[#FF9900]/30 text-white px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base rounded-lg transition-all"
                    >
                      <Settings size={16} className="sm:w-[18px] sm:h-[18px]" /> <span className="hidden xs:inline">Back to Edit</span><span className="xs:hidden">Edit</span>
                    </button>
                  )}
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <canvas
                  ref={canvasRef}
                  width={config.levelWidth * config.gridSize}
                  height={config.levelHeight * config.gridSize}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                  tabIndex={0}
                  className="border-2 sm:border-4 border-zinc-800 rounded cursor-crosshair shadow-black/50 max-w-full outline-none"
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>

              {/* Player Animation Import / Selection (under the game level window) */}
              <div className="mt-4 p-3 bg-zinc-900 border border-zinc-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-zinc-300">Player Animation</div>
                  <div className="text-xs text-zinc-500">Import .json animation (frames as data URLs)</div>
                </div>

                <div className="flex gap-2 items-center">
                  <select
                    value={selectedAnimationId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedAnimationId(val);
                      const anim = animationsMap[val] || (animationRaw && (animationRaw.name === val ? animationRaw : null));
                      if (anim) {
                        parseAnimationJSON(anim);
                      }
                    }}
                    className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white"
                  >
                    <option value="">Default</option>
                    {animationsList.map(anim => (
                      <option key={anim.id} value={anim.id}>{anim.name}</option>
                    ))}
                    {animationRaw && <option value={animationRaw.name || 'imported'}>{animationRaw.name || 'Imported'}</option>}
                  </select>

                  <label className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white px-3 py-2 rounded cursor-pointer">
                    Import JSON
                    <input type="file" accept="application/json" onChange={handleImportAnimation} className="hidden" />
                  </label>

                  <div className="text-xs text-zinc-400">
                    Preview: {selectedAnimationId || (animationRaw ? animationRaw.name : 'Default')}
                    {playerAnimationRef.current && playerAnimationRef.current._meta ? (
                      <span className="ml-2 text-[10px] text-zinc-500">(loaded {playerAnimationRef.current._meta.loaded} / failed {playerAnimationRef.current._meta.failed})</span>
                    ) : null}
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs text-zinc-400">
                    <input
                      type="checkbox"
                      checked={animateOnInput}
                      onChange={(e) => setAnimateOnInput(e.target.checked)}
                      className="accent-[#FF9900]"
                    />
                    Animate on input
                  </label>
                  <div className="text-xs text-zinc-500">(If off, animations will loop continuously)</div>
                </div>
              </div>

              {mode === 'play' && (
                <>
                  <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-[#FF9900]/10 border border-[#FF9900]/30 rounded">
                    <p className="text-sm sm:text-base font-semibold text-[#FF9900]">Controls:</p>
                    <p className="text-xs sm:text-sm text-zinc-300">
                      <span className="hidden sm:inline">Arrow Keys or WASD to move • Space or Up Arrow to jump</span>
                      <span className="sm:hidden">Use on-screen buttons below to play</span>
                    </p>
                  </div>
                  
                  {/* Mobile Touch Controls */}
                  <div className="mt-4 flex justify-between items-center gap-4 lg:hidden">
                    {/* Left/Right Controls */}
                    <div className="flex gap-2">
                      <button
                        onTouchStart={() => mobileControlsRef.current.left = true}
                        onTouchEnd={() => mobileControlsRef.current.left = false}
                        onMouseDown={() => mobileControlsRef.current.left = true}
                        onMouseUp={() => mobileControlsRef.current.left = false}
                        onMouseLeave={() => mobileControlsRef.current.left = false}
                        className="w-16 h-16 bg-zinc-800 hover:bg-zinc-700 active:bg-gradient-to-r active:from-[#FF9900] active:to-yellow-400 border-2 border-zinc-700 active:border-[#FF9900] rounded-lg flex items-center justify-center text-2xl transition-all shadow-lg touch-none select-none"
                        type="button"
                      >
                        ←
                      </button>
                      <button
                        onTouchStart={() => mobileControlsRef.current.right = true}
                        onTouchEnd={() => mobileControlsRef.current.right = false}
                        onMouseDown={() => mobileControlsRef.current.right = true}
                        onMouseUp={() => mobileControlsRef.current.right = false}
                        onMouseLeave={() => mobileControlsRef.current.right = false}
                        className="w-16 h-16 bg-zinc-800 hover:bg-zinc-700 active:bg-gradient-to-r active:from-[#FF9900] active:to-yellow-400 border-2 border-zinc-700 active:border-[#FF9900] rounded-lg flex items-center justify-center text-2xl transition-all shadow-lg touch-none select-none"
                        type="button"
                      >
                        →
                      </button>
                    </div>
                    
                    {/* Jump Button */}
                    <button
                      onTouchStart={() => mobileControlsRef.current.jump = true}
                      onTouchEnd={() => mobileControlsRef.current.jump = false}
                      onMouseDown={() => mobileControlsRef.current.jump = true}
                      onMouseUp={() => mobileControlsRef.current.jump = false}
                      onMouseLeave={() => mobileControlsRef.current.jump = false}
                      className="w-20 h-16 bg-gradient-to-r from-[#FF9900] to-yellow-400 hover:from-[#FFB84D] hover:to-yellow-400 active:scale-95 border-2 border-[#FF9900] rounded-lg flex items-center justify-center font-bold text-black text-lg transition-all shadow-[0_0_20px_rgba(255,153,0,0.4)] touch-none select-none"
                      type="button"
                    >
                      JUMP
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Toolbox */}
          <div className="lg:col-span-1">
            {mode === 'edit' && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg shadow-black/50 p-3 sm:p-4">
                <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-[#FF9900]">🛠️ Tools</h3>
                
                <div className="space-y-1.5 sm:space-y-2 mb-4 sm:mb-6">
                  {[
                    { id: 'select', icon: MousePointer2, label: 'Select' },
                    { id: 'brush', icon: Brush, label: 'Brush' },
                    { id: 'player', icon: User, label: 'Player' },
                    { id: 'platform', icon: Box, label: 'Platform' },
                    { id: 'coin', icon: Coins, label: 'Coin' },
                    { id: 'enemy', icon: Zap, label: 'Enemy' },
                    { id: 'goal', icon: Flag, label: 'Goal' },
                    { id: 'eraser', icon: Grid, label: 'Eraser' }
                  ].map(tool => (
                    <button
                      key={tool.id}
                      onClick={() => setSelectedTool(tool.id)}
                      className={`w-full flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base rounded transition ${
                        selectedTool === tool.id
                          ? 'bg-gradient-to-r from-[#FF9900] to-yellow-400 text-black font-semibold shadow-[0_0_15px_rgba(255,153,0,0.4)]'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 hover:border-[#FF9900]/50'
                      }`}
                    >
                      <tool.icon size={16} className="sm:w-[18px] sm:h-[18px]" />
                      {tool.label}
                    </button>
                  ))}
                </div>
                
                {/* Advanced Features Toggles */}
                <div className="mb-4 sm:mb-6 space-y-1.5">
                  <button
                    onClick={() => setShowBrushControls(!showBrushControls)}
                    className={`w-full flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base rounded transition ${
                      showBrushControls
                        ? 'bg-[#FF9900] text-black font-semibold'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700'
                    }`}
                  >
                    <Brush size={16} />
                    Brush Controls
                  </button>
                  
                  <button
                    onClick={() => setShowLayerPanel(!showLayerPanel)}
                    className={`w-full flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base rounded transition ${
                      showLayerPanel
                        ? 'bg-[#FF9900] text-black font-semibold'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700'
                    }`}
                  >
                    <Layers size={16} />
                    Layer Panel
                  </button>
                  
                  <button
                    onClick={() => setShowTilePalette(!showTilePalette)}
                    className={`w-full flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base rounded transition ${
                      showTilePalette
                        ? 'bg-[#FF9900] text-black font-semibold'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700'
                    }`}
                  >
                    <Palette size={16} />
                    Tile Palette
                  </button>
                </div>
                
                {/* Quick Help for Brush Tool */}
                {selectedTool === 'brush' && (
                  <div className="mb-4 sm:mb-6 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                    <h3 className="text-sm font-semibold mb-2 text-blue-400 flex items-center gap-2">
                      💡 Brush Tool Quick Guide
                    </h3>
                    <div className="text-xs text-zinc-300 space-y-1">
                      <p>1. Open <strong>Tile Palette</strong> to select colors</p>
                      <p>2. Open <strong>Brush Controls</strong> to adjust size</p>
                      <p>3. <strong>Drag</strong> on canvas to paint</p>
                      <p className="text-blue-400 mt-2">Keyboard Shortcuts:</p>
                      <p>• <kbd className="bg-zinc-700 px-1 rounded">B</kbd> Paint mode</p>
                      <p>• <kbd className="bg-zinc-700 px-1 rounded">E</kbd> Erase mode</p>
                      <p>• <kbd className="bg-zinc-700 px-1 rounded">[</kbd> <kbd className="bg-zinc-700 px-1 rounded">]</kbd> Change size</p>
                    </div>
                  </div>
                )}

                {/* Selection Tools - shown when objects are selected */}
                {selectedObjects.length > 0 && (
                  <div className="mb-4 sm:mb-6 p-3 bg-zinc-800/50 border border-[#FF9900]/30 rounded-lg">
                    <h3 className="text-sm font-semibold mb-2 text-[#FF9900]">
                      📦 Selected: {selectedObjects.length} object{selectedObjects.length !== 1 ? 's' : ''}
                    </h3>
                    
                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 gap-1.5 mb-2">
                      <button
                        onClick={() => {
                          setClipboard([...selectedObjects]);
                        }}
                        className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 text-white rounded transition"
                        title="Copy (Ctrl+C)"
                      >
                        <Copy size={12} />
                        Copy
                      </button>
                      <button
                        onClick={() => {
                          const selectedIds = new Set(selectedObjects.map(o => o.id));
                          setLevel(prev => ({
                            ...prev,
                            platforms: prev.platforms.filter(p => !selectedIds.has(p.id)),
                            coins: prev.coins.filter(c => !selectedIds.has(c.id)),
                            enemies: prev.enemies.filter(e => !selectedIds.has(e.id))
                          }));
                          setSelectedObjects([]);
                        }}
                        className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition"
                        title="Delete (Del)"
                      >
                        <Trash2 size={12} />
                        Delete
                      </button>
                    </div>
                    
                    {/* Alignment Tools - only show for 2+ objects */}
                    {selectedObjects.length >= 2 && (
                      <>
                        <div className="text-xs text-zinc-400 mb-1.5">Align:</div>
                        <div className="grid grid-cols-3 gap-1.5 mb-2">
                          <button
                            onClick={() => alignSelected('left')}
                            className="flex items-center justify-center px-2 py-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 text-white rounded transition"
                            title="Align Left"
                          >
                            <AlignLeft size={14} />
                          </button>
                          <button
                            onClick={() => alignSelected('centerHorizontal')}
                            className="flex items-center justify-center px-2 py-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 text-white rounded transition"
                            title="Center Horizontal"
                          >
                            <AlignCenter size={14} />
                          </button>
                          <button
                            onClick={() => alignSelected('right')}
                            className="flex items-center justify-center px-2 py-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 text-white rounded transition"
                            title="Align Right"
                          >
                            <AlignRight size={14} />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 mb-2">
                          <button
                            onClick={() => alignSelected('top')}
                            className="px-2 py-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 text-white rounded transition"
                            title="Align Top"
                          >
                            Top
                          </button>
                          <button
                            onClick={() => alignSelected('bottom')}
                            className="px-2 py-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 text-white rounded transition"
                            title="Align Bottom"
                          >
                            Bottom
                          </button>
                        </div>
                        
                        {/* Group Controls */}
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            onClick={() => createGroup(selectedObjects)}
                            className="px-2 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition"
                            title="Group (G)"
                          >
                            Group
                          </button>
                          <button
                            onClick={() => ungroupSelected()}
                            className="px-2 py-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 text-white rounded transition"
                            title="Ungroup (U)"
                          >
                            Ungroup
                          </button>
                        </div>
                      </>
                    )}
                    
                    <div className="mt-2 text-[10px] text-zinc-500">
                      Shift+Click: Multi-select • Arrow keys: Move • Del: Delete
                    </div>
                  </div>
                )}

                <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-[#FF9900]">⚙️ Settings</h3>
                
                <div className="space-y-2 sm:space-y-3">
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-zinc-300">Player Speed</label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={config.playerSpeed}
                      onChange={(e) => setConfig({...config, playerSpeed: Number(e.target.value)})}
                      className="w-full accent-[#FF9900]"
                    />
                    <span className="text-xs text-zinc-400">{config.playerSpeed}</span>
                  </div>

                  <div>
                    <label className="text-xs sm:text-sm font-medium text-zinc-300">Jump Height</label>
                    <input
                      type="range"
                      min="5"
                      max="20"
                      value={config.jumpHeight}
                      onChange={(e) => setConfig({...config, jumpHeight: Number(e.target.value)})}
                      className="w-full accent-[#FF9900]"
                    />
                    <span className="text-xs text-zinc-400">{config.jumpHeight}</span>
                  </div>

                  <div>
                    <label className="text-xs sm:text-sm font-medium text-zinc-300">Gravity</label>
                    <input
                      type="range"
                      min="0.1"
                      max="1.5"
                      step="0.1"
                      value={config.gravity}
                      onChange={(e) => setConfig({...config, gravity: Number(e.target.value)})}
                      className="w-full accent-[#FF9900]"
                    />
                    <span className="text-xs text-zinc-400">{config.gravity.toFixed(1)}</span>
                  </div>

                  <div>
                    <label className="text-xs sm:text-sm font-medium text-zinc-300">Background</label>
                    <input
                      type="color"
                      value={config.backgroundColor}
                      onChange={(e) => setConfig({...config, backgroundColor: e.target.value})}
                      className="w-full h-8 sm:h-10 rounded bg-zinc-800 border border-zinc-700"
                    />
                  </div>

                  {/* Parallax Background Selection */}
                  <div>
                    <button
                      onClick={() => setShowBackgroundPanel(!showBackgroundPanel)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 hover:border-[#FF9900]/50 rounded transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <ImageIcon size={16} />
                        <span className="font-medium text-zinc-300">Parallax Background</span>
                      </div>
                      <span className={`text-[#FF9900] transition-transform ${showBackgroundPanel ? 'rotate-180' : ''}`}>▼</span>
                    </button>
                    
                    {showBackgroundPanel && (
                      <div className="mt-2 space-y-1.5 max-h-64 overflow-y-auto">
                        {Object.keys(backgroundPresets).map(bgKey => {
                          const preset = backgroundPresets[bgKey];
                          return (
                            <button
                              key={bgKey}
                              onClick={() => setSelectedBackground(bgKey)}
                              className={`w-full text-left px-3 py-2 text-xs rounded transition ${
                                selectedBackground === bgKey
                                  ? 'bg-gradient-to-r from-[#FF9900] to-yellow-400 text-black font-semibold'
                                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
                              }`}
                            >
                              {preset.name}
                              <span className="block text-[10px] opacity-70 mt-0.5">
                                {preset.layers.length > 0 ? `${preset.layers.length} layers` : 'Solid color'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 sm:mt-6 space-y-2">
                  <button
                    onClick={saveLevel}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#FF9900] to-yellow-400 hover:from-[#FFB84D] hover:to-yellow-400 text-black font-semibold px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base rounded-lg shadow-[0_0_20px_rgba(255,153,0,0.4)] hover:shadow-[0_0_25px_rgba(255,153,0,0.6)] transition-all"
                  >
                    <Save size={16} className="sm:w-[18px] sm:h-[18px]" /> Save Level
                  </button>
                  
                  <button
                    onClick={() => document.getElementById('load-level-input').click()}
                    className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-[#FF9900]/50 text-white px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base rounded-lg transition-all"
                  >
                    <Upload size={16} className="sm:w-[18px] sm:h-[18px]" /> Load Level
                  </button>
                  <input
                    id="load-level-input"
                    type="file"
                    accept=".json"
                    onChange={loadLevel}
                    className="hidden"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Advanced Features Overlay Panels */}
        {mode === 'edit' && (
          <>
            {/* Brush Controls Overlay */}
            {showBrushControls && (
              <div className="fixed top-20 right-4 z-50 bg-zinc-900 border-2 border-[#FF9900]/50 rounded-lg shadow-2xl shadow-black/50 p-4 max-w-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-[#FF9900] flex items-center gap-2">
                    <Brush size={20} />
                    Brush Controls
                  </h3>
                  <button
                    onClick={() => setShowBrushControls(false)}
                    className="text-zinc-400 hover:text-white transition"
                  >
                    ✕
                  </button>
                </div>
                <BrushControls
                  brush={brushToolRef.current}
                  onChange={() => {
                    const canvas = canvasRef.current;
                    if (canvas) {
                      const ctx = canvas.getContext('2d');
                      drawGame(ctx);
                    }
                  }}
                />
              </div>
            )}
            
            {/* Layer Panel Overlay */}
            {showLayerPanel && (
              <div className="fixed top-20 right-4 z-50 bg-zinc-900 border-2 border-[#FF9900]/50 rounded-lg shadow-2xl shadow-black/50 p-4 max-w-sm max-h-[70vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-[#FF9900] flex items-center gap-2">
                    <Layers size={20} />
                    Layer Panel
                  </h3>
                  <button
                    onClick={() => setShowLayerPanel(false)}
                    className="text-zinc-400 hover:text-white transition"
                  >
                    ✕
                  </button>
                </div>
                <LayerPanel
                  layerSystem={layerSystemRef.current}
                  onChange={() => {
                    const canvas = canvasRef.current;
                    if (canvas) {
                      const ctx = canvas.getContext('2d');
                      drawGame(ctx);
                    }
                  }}
                  onClose={() => setShowLayerPanel(false)}
                />
              </div>
            )}
            
            {/* Tile Palette Overlay */}
            {showTilePalette && (
              <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 bg-zinc-900 border-2 border-[#FF9900]/50 rounded-lg shadow-2xl shadow-black/50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-[#FF9900] flex items-center gap-2">
                    <Palette size={20} />
                    Tile Palette
                  </h3>
                  <button
                    onClick={() => setShowTilePalette(false)}
                    className="text-zinc-400 hover:text-white transition"
                  >
                    ✕
                  </button>
                </div>
                <SimpleTilePalette
                  selectedTile={selectedTile}
                  onSelectTile={(tileId) => {
                    setSelectedTile(tileId);
                    if (brushToolRef.current.mode !== 'paint') {
                      brushToolRef.current.setMode('paint');
                    }
                  }}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default GameBuilder;
