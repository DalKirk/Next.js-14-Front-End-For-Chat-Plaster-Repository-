'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  onLadder: boolean;
}

interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Ladder {
  x: number;
  y: number;
  height: number;
}

interface BurgerPart {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'bun' | 'patty' | 'lettuce' | 'bunBottom';
  stepped: number;
  falling: boolean;
  col: number;
  landed: boolean;
  layer: number;
  steppedOn: boolean;
}

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  dir: number;
  onLadder: boolean;
}

interface GameState {
  player: Player;
  platforms: Platform[];
  ladders: Ladder[];
  burgerParts: BurgerPart[];
  enemies: Enemy[];
  canvasWidth: number;
  canvasHeight: number;
  level: number;
}

export default function BurgerTime() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameOver'>('start');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [isMobile, setIsMobile] = useState(false);
  const gameLoopRef = useRef<number | null>(null);
  const keysRef = useRef<{ [key: string]: boolean }>({});
  
  const gameRef = useRef<GameState>({
    player: { x: 100, y: 450, width: 25, height: 25, speed: 3, onLadder: false },
    platforms: [],
    ladders: [],
    burgerParts: [],
    enemies: [],
    canvasWidth: 400,
    canvasHeight: 500,
    level: 1
  });

  useEffect(() => {
    const checkMobile = () => {
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
      setIsMobile(mobile);
      
      if (mobile) {
        gameRef.current.canvasWidth = Math.min(window.innerWidth - 32, 400);
        gameRef.current.canvasHeight = Math.min(window.innerHeight * 0.7, 550);
      } else {
        gameRef.current.canvasWidth = 600;
        gameRef.current.canvasHeight = 700;
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const initLevel = useCallback(() => {
    const game = gameRef.current;
    const w = game.canvasWidth;
    const h = game.canvasHeight;
    
    game.platforms = [
      { x: 0, y: h - 30, width: w, height: 10 },
      { x: 0, y: h - 150, width: w, height: 10 },
      { x: 0, y: h - 270, width: w, height: 10 },
      { x: 0, y: h - 390, width: w, height: 10 },
      { x: 0, y: 50, width: w, height: 10 }
    ];
    
    const ladderPositions = [
      w / 4,
      w / 2,
      (w * 3) / 4
    ];
    
    game.ladders = [
      { x: ladderPositions[0] - 15, y: h - 150, height: 120 },
      { x: ladderPositions[2] - 15, y: h - 150, height: 120 },
      { x: ladderPositions[1] - 15, y: h - 270, height: 120 },
      { x: ladderPositions[0] - 15, y: h - 390, height: 120 },
      { x: ladderPositions[2] - 15, y: h - 390, height: 120 },
      { x: ladderPositions[1] - 15, y: 50, height: 340 }
    ];
    
    const platformCenters = [
      w / 4,
      w / 2,
      (w * 3) / 4
    ];
    
    game.burgerParts = [];
    
    platformCenters.forEach((centerX, col) => {
      const partWidth = isMobile ? 50 : 70;
      const x = centerX - partWidth / 2;
      
      game.burgerParts.push({ 
        x, y: h - 395, width: partWidth, height: 15, 
        type: 'bun', stepped: 0, falling: false, col, landed: false, layer: 0, steppedOn: false 
      });
      game.burgerParts.push({ 
        x, y: h - 275, width: partWidth, height: 15, 
        type: 'patty', stepped: 0, falling: false, col, landed: false, layer: 1, steppedOn: false 
      });
      game.burgerParts.push({ 
        x, y: h - 155, width: partWidth, height: 15, 
        type: 'lettuce', stepped: 0, falling: false, col, landed: false, layer: 2, steppedOn: false 
      });
      game.burgerParts.push({ 
        x, y: h - 45, width: partWidth, height: 15, 
        type: 'bunBottom', stepped: 0, falling: false, col, landed: true, layer: 3, steppedOn: false 
      });
    });
    
    game.enemies = [
      { x: 100, y: 35, width: 20, height: 20, speed: 0.675, dir: 1, onLadder: false },
      { x: 250, y: 35, width: 20, height: 20, speed: 0.54, dir: -1, onLadder: false },
      { x: w - 120, y: 35, width: 20, height: 20, speed: 0.675, dir: 1, onLadder: false }
    ];
    
    game.player.x = 100;
    game.player.y = h - 55;
  }, [isMobile]);

  const startGame = useCallback(() => {
    setScore(0);
    setLives(3);
    gameRef.current.level = 1;
    initLevel();
    setGameState('playing');
  }, [initLevel]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key] = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const movePlayer = (direction: string) => {
    keysRef.current[direction] = true;
  };

  const stopPlayer = () => {
    keysRef.current['ArrowLeft'] = false;
    keysRef.current['ArrowRight'] = false;
    keysRef.current['ArrowUp'] = false;
    keysRef.current['ArrowDown'] = false;
  };

  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const game = gameRef.current;

    const isOnPlatform = (obj: { x: number; y: number; width: number; height: number }) => {
      return game.platforms.some(p => 
        obj.y + obj.height >= p.y - 2 &&
        obj.y + obj.height <= p.y + p.height + 2 &&
        obj.x + obj.width > p.x &&
        obj.x < p.x + p.width
      );
    };

    const isOnLadder = (obj: { x: number; y: number; width: number; height: number }) => {
      return game.ladders.some(l =>
        obj.x + obj.width / 2 > l.x - 5 &&
        obj.x + obj.width / 2 < l.x + 35 &&
        obj.y + obj.height >= l.y - 5 &&
        obj.y <= l.y + l.height + 5
      );
    };

    const checkCollision = (a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) => {
      return a.x < b.x + b.width &&
             a.x + a.width > b.x &&
             a.y < b.y + b.height &&
             a.y + a.height > b.y;
    };

    const gameLoop = () => {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      game.platforms.forEach(p => {
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(p.x, p.y, p.width, p.height);
      });

      game.ladders.forEach(l => {
        ctx.strokeStyle = '#cd853f';
        ctx.lineWidth = 3;
        for (let i = 0; i < l.height; i += 15) {
          ctx.beginPath();
          ctx.moveTo(l.x, l.y + i);
          ctx.lineTo(l.x + 30, l.y + i);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(l.x + 5, l.y);
        ctx.lineTo(l.x + 5, l.y + l.height);
        ctx.moveTo(l.x + 25, l.y);
        ctx.lineTo(l.x + 25, l.y + l.height);
        ctx.stroke();
      });

      const p = game.player;
      p.onLadder = isOnLadder(p);

      if (keysRef.current['ArrowLeft'] && p.x > 0) {
        p.x -= p.speed;
      }
      if (keysRef.current['ArrowRight'] && p.x < canvas.width - p.width) {
        p.x += p.speed;
      }
      if (keysRef.current['ArrowUp'] && p.onLadder) {
        p.y -= p.speed;
      }
      if (keysRef.current['ArrowDown']) {
        if (p.onLadder) {
          p.y += p.speed;
        }
      }

      if (!p.onLadder && !isOnPlatform(p)) {
        p.y += 3;
      }

      game.platforms.forEach(plat => {
        if (p.x + p.width > plat.x && p.x < plat.x + plat.width) {
          if (p.y + p.height > plat.y && p.y + p.height < plat.y + plat.height + 5 && !p.onLadder) {
            p.y = plat.y - p.height;
          }
        }
      });

      ctx.fillStyle = '#fff';
      ctx.fillRect(p.x, p.y, p.width, p.height);
      ctx.fillStyle = '#ff6b6b';
      ctx.fillRect(p.x + 5, p.y, p.width - 10, 8);
      ctx.fillStyle = '#000';
      ctx.fillRect(p.x + 8, p.y + 12, 4, 4);
      ctx.fillRect(p.x + 13, p.y + 12, 4, 4);

      game.burgerParts.forEach(part => {
        if (!part.falling && part.type !== 'bunBottom') {
          const playerOnBurger = p.y + p.height >= part.y - 2 && 
                                 p.y + p.height <= part.y + part.height + 2 &&
                                 p.x + p.width > part.x + 5 && 
                                 p.x < part.x + part.width - 5;
          
          if (playerOnBurger && !part.steppedOn) {
            part.stepped++;
            part.steppedOn = true;
            setScore(s => s + 10);
          }
          
          if (!playerOnBurger) {
            part.steppedOn = false;
          }
        }

        if (part.stepped >= 1 && !part.falling && !part.landed && part.type !== 'bunBottom') {
          part.falling = true;
        }

        if (part.falling && !part.landed) {
          part.y += 5;
          
          const hitBurger = game.burgerParts.find(other => 
            other !== part && 
            other.col === part.col &&
            other.layer > part.layer &&
            Math.abs(part.y + part.height - other.y) < 5
          );

          if (hitBurger) {
            part.falling = false;
            part.landed = true;
            part.y = hitBurger.y - part.height;
            setScore(s => s + 50);
            
            if (!hitBurger.landed && hitBurger.type !== 'bunBottom') {
              hitBurger.falling = true;
            }
          }
        }

        const colors = {
          bun: '#d4a574',
          patty: '#8b4513',
          lettuce: '#90ee90',
          bunBottom: '#d4a574'
        };
        ctx.fillStyle = colors[part.type];
        ctx.fillRect(part.x, part.y, part.width, part.height);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(part.x, part.y, part.width, part.height);
        
        if (part.type === 'bun' || part.type === 'bunBottom') {
          ctx.fillStyle = '#fff';
          for (let i = 0; i < 5; i++) {
            ctx.fillRect(part.x + 10 + i * 10, part.y + 5, 2, 2);
          }
        }
      });

      game.enemies.forEach(enemy => {
        const oldX = enemy.x;
        enemy.onLadder = isOnLadder(enemy);
        
        const dx = p.x - enemy.x;
        const dy = p.y - enemy.y;
        
        if (Math.abs(dy) > 50 && enemy.onLadder && Math.random() > 0.3) {
          if (dy > 0) {
            enemy.y += enemy.speed;
          } else {
            enemy.y -= enemy.speed;
          }
        } else {
          if (Math.abs(dx) > 10) {
            if (dx > 0) {
              enemy.x += enemy.speed;
              enemy.dir = 1;
            } else {
              enemy.x -= enemy.speed;
              enemy.dir = -1;
            }
          }
          
          if (Math.abs(dy) > 80 && !enemy.onLadder) {
            const nearbyLadder = game.ladders.find(l => 
              Math.abs(enemy.x + enemy.width / 2 - l.x - 15) < 30
            );
            if (nearbyLadder) {
              const ladderCenter = nearbyLadder.x + 15;
              if (enemy.x + enemy.width / 2 < ladderCenter) {
                enemy.x += enemy.speed;
              } else if (enemy.x + enemy.width / 2 > ladderCenter) {
                enemy.x -= enemy.speed;
              }
            }
          }
        }
        
        if (enemy.x <= 0 || enemy.x >= canvas.width - enemy.width) {
          enemy.x = oldX;
          enemy.dir *= -1;
        }

        if (!enemy.onLadder && !isOnPlatform(enemy)) {
          enemy.y += 2;
        }

        game.platforms.forEach(plat => {
          if (enemy.x + enemy.width > plat.x && enemy.x < plat.x + plat.width) {
            if (enemy.y + enemy.height > plat.y && enemy.y + enemy.height < plat.y + plat.height + 5) {
              enemy.y = plat.y - enemy.height;
            }
          }
        });

        ctx.fillStyle = '#ff4444';
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        ctx.fillStyle = '#ffeb3b';
        ctx.fillRect(enemy.x + 2, enemy.y + 8, enemy.width - 4, 4);
        ctx.fillStyle = '#000';
        ctx.fillRect(enemy.x + 4, enemy.y + 4, 3, 3);
        ctx.fillRect(enemy.x + 13, enemy.y + 4, 3, 3);

        if (checkCollision(p, enemy)) {
          setLives(l => {
            const newLives = l - 1;
            if (newLives <= 0) {
              setGameState('gameOver');
              setHighScore(prev => Math.max(prev, score));
            } else {
              p.x = 100;
              p.y = canvas.height - 55;
            }
            return newLives;
          });
        }
      });

      const allLanded = game.burgerParts.every(part => part.landed);
      if (allLanded) {
        game.level++;
        setScore(s => s + 500);
        initLevel();
      }

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState, score, initLevel]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-fuchsia-950 p-4">
      <div className="mb-2 text-center">
        <h1 className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent mb-2`}>
          BurgerTime
        </h1>
        <div className={`flex ${isMobile ? 'flex-col gap-1' : 'gap-6 justify-center'} ${isMobile ? 'text-sm' : 'text-xl'}`}>
          <p className="text-cyan-400">Score: {score}</p>
          <p className="text-fuchsia-400">High Score: {highScore}</p>
          <p className="text-red-400">Lives: {'❤️'.repeat(lives)}</p>
          <p className="text-purple-400">Level: {gameRef.current.level}</p>
        </div>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={gameRef.current.canvasWidth}
          height={gameRef.current.canvasHeight}
          className="border-4 border-purple-500/50 rounded-lg shadow-[0_0_30px_rgba(147,51,234,0.5)] bg-gray-900"
        />

        {gameState === 'start' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-lg">
            <div className="text-center px-4">
              <h2 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-cyan-400 mb-4`}>Ready to Cook?</h2>
              <p className={`text-purple-300 mb-2 ${isMobile ? 'text-sm' : ''}`}>
                Walk over burger parts to drop them!
              </p>
              <p className={`text-purple-400 mb-4 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                {isMobile ? 'Use buttons to move' : 'Arrow Keys to move'}
              </p>
              <button
                onClick={startGame}
                className="px-8 py-3 bg-gradient-to-r from-cyan-400 to-fuchsia-500 hover:from-cyan-500 hover:to-fuchsia-600 text-white font-bold rounded-lg shadow-[0_0_20px_rgba(34,211,238,0.5)] transition-all"
              >
                Start Game
              </button>
            </div>
          </div>
        )}

        {gameState === 'gameOver' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-lg">
            <div className="text-center px-4">
              <h2 className={`${isMobile ? 'text-3xl' : 'text-4xl'} font-bold text-red-400 mb-4`}>Game Over!</h2>
              <p className={`${isMobile ? 'text-xl' : 'text-2xl'} text-white mb-2`}>Final Score: {score}</p>
              <p className={`${isMobile ? 'text-lg' : 'text-xl'} text-fuchsia-400 mb-6`}>High Score: {highScore}</p>
              <button
                onClick={startGame}
                className="px-8 py-3 bg-gradient-to-r from-cyan-400 to-fuchsia-500 hover:from-cyan-500 hover:to-fuchsia-600 text-white font-bold rounded-lg shadow-[0_0_20px_rgba(34,211,238,0.5)] transition-all"
              >
                Play Again
              </button>
            </div>
          </div>
        )}
      </div>

      {isMobile && gameState === 'playing' && (
        <div className="mt-4">
          <div className="flex gap-3 mb-3 justify-center">
            <button
              onTouchStart={() => movePlayer('ArrowUp')}
              onTouchEnd={stopPlayer}
              className="w-16 h-16 bg-cyan-600/80 active:bg-cyan-700 text-white font-bold rounded-lg text-2xl border-2 border-cyan-400/50 shadow-[0_0_15px_rgba(34,211,238,0.5)]"
            >
              ↑
            </button>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onTouchStart={() => movePlayer('ArrowLeft')}
              onTouchEnd={stopPlayer}
              className="w-16 h-16 bg-cyan-600/80 active:bg-cyan-700 text-white font-bold rounded-lg text-2xl border-2 border-cyan-400/50 shadow-[0_0_15px_rgba(34,211,238,0.5)]"
            >
              ←
            </button>
            <button
              onTouchStart={() => movePlayer('ArrowDown')}
              onTouchEnd={stopPlayer}
              className="w-16 h-16 bg-cyan-600/80 active:bg-cyan-700 text-white font-bold rounded-lg text-2xl border-2 border-cyan-400/50 shadow-[0_0_15px_rgba(34,211,238,0.5)]"
            >
              ↓
            </button>
            <button
              onTouchStart={() => movePlayer('ArrowRight')}
              onTouchEnd={stopPlayer}
              className="w-16 h-16 bg-cyan-600/80 active:bg-cyan-700 text-white font-bold rounded-lg text-2xl border-2 border-cyan-400/50 shadow-[0_0_15px_rgba(34,211,238,0.5)]"
            >
              →
            </button>
          </div>
        </div>
      )}

      <div className={`mt-4 text-purple-300 text-center max-w-md ${isMobile ? 'text-xs' : 'text-sm'}`}>
        <p className="mb-2">
          <span className="font-bold text-cyan-400">Goal:</span> Walk over burger ingredients to make them fall. Complete all burgers to win!
        </p>
        <p className="text-xs text-purple-400">
          Avoid the hot dogs! Use ladders to climb between platforms.
        </p>
      </div>
    </div>
  );
}
