import React, { useState, useEffect, useRef } from 'react';
import { Play, Settings, Save, Grid, User, Box, Flag, Coins, Zap, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

const GameBuilder = () => {
  const router = useRouter();
  const [mode, setMode] = useState('edit'); // 'edit' or 'play'
  const [selectedTool, setSelectedTool] = useState('player');
  const [aboutOpen, setAboutOpen] = useState(false);
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

  const canvasRef = useRef(null);
  const gameStateRef = useRef(null);

  // Game state for playing
  const initGameState = () => ({
    playerPos: { x: level.player.x * config.gridSize, y: level.player.y * config.gridSize },
    playerVel: { x: 0, y: 0 },
    coins: [...level.coins],
    score: 0,
    gameWon: false,
    onGround: false,
    enemies: level.enemies.map(e => ({
      x: e.x * config.gridSize,
      y: e.y * config.gridSize,
      direction: e.direction,
      range: e.range * config.gridSize,
      startX: e.startX * config.gridSize
    }))
  });

  const drawGame = (ctx, gameState = null) => {
    const gs = config.gridSize;
    ctx.fillStyle = config.backgroundColor;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

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
    ctx.fillText(config.playerSprite, px + gs/2, py + gs/2);

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
  };

  const handleCanvasClick = (e) => {
    if (mode !== 'edit') return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / config.gridSize);
    const y = Math.floor((e.clientY - rect.top) / config.gridSize);

    if (selectedTool === 'player') {
      setLevel(prev => ({ ...prev, player: { x, y } }));
    } else if (selectedTool === 'platform') {
      setLevel(prev => ({
        ...prev,
        platforms: [...prev.platforms, { x, y, width: 2, height: 1 }]
      }));
    } else if (selectedTool === 'coin') {
      setLevel(prev => ({
        ...prev,
        coins: [...prev.coins, { x, y }]
      }));
    } else if (selectedTool === 'enemy') {
      setLevel(prev => ({
        ...prev,
        enemies: [...prev.enemies, { x, y, direction: 1, range: 3, startX: x }]
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
  };

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
      if (e.key === ' ') e.preventDefault();
    };
    
    const handleKeyUp = (e) => {
      keys[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const gameLoop = () => {
      const state = gameStateRef.current;
      if (state.gameWon) {
        drawGame(ctx, state);
        return;
      }

      const gs = config.gridSize;
      
      // Player movement
      if (keys['ArrowLeft'] || keys['a']) state.playerVel.x = -config.playerSpeed;
      else if (keys['ArrowRight'] || keys['d']) state.playerVel.x = config.playerSpeed;
      else state.playerVel.x = 0;

      if ((keys['ArrowUp'] || keys[' '] || keys['w']) && state.onGround) {
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

      drawGame(ctx, state);
      animationId = requestAnimationFrame(gameLoop);
    };

    let animationId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [mode, config, level]);

  const handlePlayTest = () => {
    gameStateRef.current = initGameState();
    setMode('play');
  };

  const handleBackToEdit = () => {
    gameStateRef.current = null;
    setMode('edit');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-[#1a1a1a] p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <span className="text-4xl">🫐</span>
              <span className="bg-gradient-to-r from-[#FF9900] via-[#FFB84D] to-yellow-400 bg-clip-text text-transparent">Berry - Platformer</span>
            </h1>
            <p className="text-zinc-400 text-lg mt-2">Build Games With Berry</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-[#FF9900]/50 text-white px-4 py-2 rounded-lg transition-all shadow-black/50"
          >
            <Home size={18} />
            <span className="hidden sm:inline">Back to Home</span>
          </button>
        </div>

        {/* About Berry Dropdown */}
        <div className="mb-6">
          <button
            onClick={() => setAboutOpen(!aboutOpen)}
            className="w-full bg-zinc-900 border border-zinc-800 hover:border-[#FF9900]/50 rounded-lg p-4 flex items-center justify-between transition-all shadow-black/50"
          >
            <span className="text-white font-semibold flex items-center gap-2">
              <span className="text-xl">ℹ️</span>
              About Berry
            </span>
            <span className={`text-[#FF9900] transition-transform ${aboutOpen ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
          {aboutOpen && (
            <div className="mt-2 bg-zinc-900 border border-zinc-800 rounded-lg p-6 shadow-black/50">
              <p className="text-zinc-300 leading-relaxed">
                Berry is a tiny drag and drop game engine still in development. New features will be added in future updates. Enjoy Building with Berry!
              </p>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Canvas */}
          <div className="lg:col-span-3">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg shadow-black/50 p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">
                  {mode === 'edit' ? '✏️ Edit Mode' : '🎮 Play Mode'}
                </h2>
                <div className="flex gap-2">
                  {mode === 'edit' ? (
                    <button
                      onClick={handlePlayTest}
                      className="flex items-center gap-2 bg-gradient-to-r from-[#FF9900] to-yellow-400 hover:from-[#FFB84D] hover:to-yellow-400 text-black font-semibold px-4 py-2 rounded-lg shadow-[0_0_20px_rgba(255,153,0,0.4)] hover:shadow-[0_0_25px_rgba(255,153,0,0.6)] transition-all"
                    >
                      <Play size={18} /> Play Test
                    </button>
                  ) : (
                    <button
                      onClick={handleBackToEdit}
                      className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-[#FF9900]/30 text-white px-4 py-2 rounded-lg transition-all"
                    >
                      <Settings size={18} /> Back to Edit
                    </button>
                  )}
                </div>
              </div>
              
              <canvas
                ref={canvasRef}
                width={config.levelWidth * config.gridSize}
                height={config.levelHeight * config.gridSize}
                onClick={handleCanvasClick}
                className="border-4 border-zinc-800 rounded cursor-crosshair shadow-black/50"
                style={{ imageRendering: 'pixelated' }}
              />
              
              {mode === 'play' && (
                <div className="mt-4 p-3 bg-[#FF9900]/10 border border-[#FF9900]/30 rounded">
                  <p className="font-semibold text-[#FF9900]">Controls:</p>
                  <p className="text-sm text-zinc-300">Arrow Keys or WASD to move • Space or Up Arrow to jump</p>
                </div>
              )}
            </div>
          </div>

          {/* Toolbox */}
          <div className="lg:col-span-1">
            {mode === 'edit' && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg shadow-black/50 p-4">
                <h3 className="text-lg font-semibold mb-4 text-[#FF9900]">🛠️ Tools</h3>
                
                <div className="space-y-2 mb-6">
                  {[
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
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded transition ${
                        selectedTool === tool.id
                          ? 'bg-gradient-to-r from-[#FF9900] to-yellow-400 text-black font-semibold shadow-[0_0_15px_rgba(255,153,0,0.4)]'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 hover:border-[#FF9900]/50'
                      }`}
                    >
                      <tool.icon size={18} />
                      {tool.label}
                    </button>
                  ))}
                </div>

                <h3 className="text-lg font-semibold mb-4 text-[#FF9900]">⚙️ Settings</h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-zinc-300">Player Speed</label>
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
                    <label className="text-sm font-medium text-zinc-300">Jump Height</label>
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
                    <label className="text-sm font-medium text-zinc-300">Gravity</label>
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
                    <label className="text-sm font-medium text-zinc-300">Background</label>
                    <input
                      type="color"
                      value={config.backgroundColor}
                      onChange={(e) => setConfig({...config, backgroundColor: e.target.value})}
                      className="w-full h-10 rounded bg-zinc-800 border border-zinc-700"
                    />
                  </div>
                </div>

                <button
                  onClick={() => {
                    console.log('Game configuration:', { config, level });
                    alert('Game saved! (Check console for configuration)');
                  }}
                  className="w-full mt-6 flex items-center justify-center gap-2 bg-gradient-to-r from-[#FF9900] to-yellow-400 hover:from-[#FFB84D] hover:to-yellow-400 text-black font-semibold px-4 py-2 rounded-lg shadow-[0_0_20px_rgba(255,153,0,0.4)] hover:shadow-[0_0_25px_rgba(255,153,0,0.6)] transition-all"
                >
                  <Save size={18} /> Save Game
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameBuilder;
