'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
}

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  direction: number;
  alive: boolean;
  type: 'boss' | 'normal';
}

interface Bullet {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
}

interface Explosion {
  x: number;
  y: number;
  frame: number;
}

interface GameState {
  player: Player;
  bullets: Bullet[];
  enemies: Enemy[];
  explosions: Explosion[];
  enemyBullets: Bullet[];
  lastEnemyShot: number;
  lastBullet: number;
  waveNumber: number;
  canvasWidth: number;
  canvasHeight: number;
}

export default function SpaceShooter() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameOver'>('start');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const gameLoopRef = useRef<number | null>(null);
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const touchRef = useRef({ active: false, startX: 0, currentX: 0 });
  
  const gameRef = useRef<GameState>({
    player: { x: 175, y: 260, width: 30, height: 30, speed: 5 },
    bullets: [],
    enemies: [],
    explosions: [],
    enemyBullets: [],
    lastEnemyShot: 0,
    lastBullet: 0,
    waveNumber: 1,
    canvasWidth: 400,
    canvasHeight: 300
  });

  useEffect(() => {
    const checkMobile = () => {
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
      setIsMobile(mobile);
      
      if (mobile) {
        gameRef.current.canvasWidth = Math.min(window.innerWidth - 32, 400);
        gameRef.current.canvasHeight = Math.min(window.innerHeight * 0.6, 500);
      } else {
        gameRef.current.canvasWidth = 800;
        gameRef.current.canvasHeight = 600;
      }
      
      gameRef.current.player.x = gameRef.current.canvasWidth / 2 - gameRef.current.player.width / 2;
      gameRef.current.player.y = gameRef.current.canvasHeight - 60;
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    const stored = localStorage.getItem('spaceShooterHighScore');
    if (stored) setHighScore(parseInt(stored));
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const spawnEnemies = useCallback((wave: number): Enemy[] => {
    const enemies: Enemy[] = [];
    // Reserved for future game state reference
    // const game = gameRef.current;
    const cols = isMobile ? Math.min(5 + Math.floor(wave / 2), 6) : Math.min(6 + Math.floor(wave / 2), 10);
    const rows = Math.min(3 + Math.floor(wave / 3), 5);
    const enemySize = isMobile ? 25 : 40;
    const spacing = isMobile ? 50 : 70;
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        enemies.push({
          x: col * spacing + 30,
          y: row * 45 + 30,
          width: enemySize,
          height: enemySize,
          speed: 0.3 + wave * 0.1,
          direction: 1,
          alive: true,
          type: row === 0 ? 'boss' : 'normal'
        });
      }
    }
    return enemies;
  }, [isMobile]);

  const startGame = useCallback(() => {
    const game = gameRef.current;
    setScore(0);
    gameRef.current = {
      player: { 
        x: game.canvasWidth / 2 - 20, 
        y: game.canvasHeight - 60, 
        width: isMobile ? 25 : 40, 
        height: isMobile ? 25 : 40, 
        speed: 5 
      },
      bullets: [],
      enemies: spawnEnemies(1),
      explosions: [],
      enemyBullets: [],
      lastEnemyShot: 0,
      lastBullet: 0,
      waveNumber: 1,
      canvasWidth: game.canvasWidth,
      canvasHeight: game.canvasHeight
    };
    setGameState('playing');
  }, [spawnEnemies, isMobile]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key] = true;
      if (e.key === ' ' && gameState === 'playing') {
        e.preventDefault();
        const now = Date.now();
        if (now - gameRef.current.lastBullet > 250) {
          const p = gameRef.current.player;
          gameRef.current.bullets.push({
            x: p.x + p.width / 2 - 2,
            y: p.y,
            width: 4,
            height: 15,
            speed: 7
          });
          gameRef.current.lastBullet = now;
        }
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
  }, [gameState]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (gameState !== 'playing') return;
    const touch = e.touches[0];
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    touchRef.current = {
      active: true,
      startX: touch.clientX - rect.left,
      currentX: touch.clientX - rect.left
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (gameState !== 'playing' || !touchRef.current.active) return;
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    touchRef.current.currentX = touch.clientX - rect.left;
    
    const game = gameRef.current;
    const targetX = touchRef.current.currentX - game.player.width / 2;
    game.player.x = Math.max(0, Math.min(game.canvasWidth - game.player.width, targetX));
  };

  const handleTouchEnd = () => {
    touchRef.current.active = false;
  };

  const handleShoot = () => {
    if (gameState !== 'playing') return;
    const now = Date.now();
    if (now - gameRef.current.lastBullet > 250) {
      const p = gameRef.current.player;
      gameRef.current.bullets.push({
        x: p.x + p.width / 2 - 2,
        y: p.y,
        width: 4,
        height: 15,
        speed: 7
      });
      gameRef.current.lastBullet = now;
    }
  };

  const moveLeft = () => {
    if (gameState === 'playing') {
      keysRef.current['ArrowLeft'] = true;
    }
  };

  const moveRight = () => {
    if (gameState === 'playing') {
      keysRef.current['ArrowRight'] = true;
    }
  };

  const stopMove = () => {
    keysRef.current['ArrowLeft'] = false;
    keysRef.current['ArrowRight'] = false;
  };

  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const game = gameRef.current;

    const gameLoop = () => {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#fff';
      const starCount = isMobile ? 30 : 50;
      for (let i = 0; i < starCount; i++) {
        const x = (i * 37) % canvas.width;
        const y = (i * 53 + Date.now() * 0.02) % canvas.height;
        ctx.fillRect(x, y, 2, 2);
      }

      if (keysRef.current['ArrowLeft'] && game.player.x > 0) {
        game.player.x -= game.player.speed;
      }
      if (keysRef.current['ArrowRight'] && game.player.x < canvas.width - game.player.width) {
        game.player.x += game.player.speed;
      }

      ctx.fillStyle = '#0f0';
      ctx.beginPath();
      ctx.moveTo(game.player.x + game.player.width / 2, game.player.y);
      ctx.lineTo(game.player.x, game.player.y + game.player.height);
      ctx.lineTo(game.player.x + game.player.width, game.player.y + game.player.height);
      ctx.closePath();
      ctx.fill();

      game.bullets = game.bullets.filter(b => {
        b.y -= b.speed;
        ctx.fillStyle = '#ff0';
        ctx.fillRect(b.x, b.y, b.width, b.height);
        return b.y > 0;
      });

      const now = Date.now();
      if (now - game.lastEnemyShot > 1000) {
        const aliveEnemies = game.enemies.filter(e => e.alive);
        if (aliveEnemies.length > 0) {
          const shooter = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
          game.enemyBullets.push({
            x: shooter.x + shooter.width / 2 - 2,
            y: shooter.y + shooter.height,
            width: 4,
            height: 15,
            speed: 4
          });
          game.lastEnemyShot = now;
        }
      }

      game.enemyBullets = game.enemyBullets.filter(b => {
        b.y += b.speed;
        ctx.fillStyle = '#f00';
        ctx.fillRect(b.x, b.y, b.width, b.height);

        if (b.x < game.player.x + game.player.width &&
            b.x + b.width > game.player.x &&
            b.y < game.player.y + game.player.height &&
            b.y + b.height > game.player.y) {
          setGameState('gameOver');
          setHighScore(prev => Math.max(prev, score));
          localStorage.setItem('spaceShooterHighScore', Math.max(score, highScore).toString());
          return false;
        }
        return b.y < canvas.height;
      });

      let moveDown = false;
      game.enemies.forEach(enemy => {
        if (!enemy.alive) return;

        enemy.x += enemy.speed * enemy.direction;

        if (enemy.x <= 0 || enemy.x >= canvas.width - enemy.width) {
          enemy.direction *= -1;
          moveDown = true;
        }

        ctx.fillStyle = enemy.type === 'boss' ? '#f0f' : '#f00';
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        
        const eyeSize = isMobile ? 4 : 8;
        const eyeOffset = isMobile ? 6 : 10;
        ctx.fillStyle = '#000';
        ctx.fillRect(enemy.x + eyeOffset, enemy.y + eyeOffset, eyeSize, eyeSize);
        ctx.fillRect(enemy.x + enemy.width - eyeOffset - eyeSize, enemy.y + eyeOffset, eyeSize, eyeSize);
      });

      if (moveDown) {
        game.enemies.forEach(e => e.y += 20);
      }

      game.bullets.forEach(bullet => {
        game.enemies.forEach(enemy => {
          if (enemy.alive &&
              bullet.x < enemy.x + enemy.width &&
              bullet.x + bullet.width > enemy.x &&
              bullet.y < enemy.y + enemy.height &&
              bullet.y + bullet.height > enemy.y) {
            enemy.alive = false;
            bullet.y = -100;
            game.explosions.push({ x: enemy.x, y: enemy.y, frame: 0 });
            setScore(s => s + (enemy.type === 'boss' ? 50 : 10));
          }
        });
      });

      game.explosions = game.explosions.filter(exp => {
        ctx.fillStyle = `rgba(255, ${200 - exp.frame * 20}, 0, ${1 - exp.frame / 10})`;
        ctx.beginPath();
        ctx.arc(exp.x + 20, exp.y + 20, 15 + exp.frame * 2, 0, Math.PI * 2);
        ctx.fill();
        exp.frame++;
        return exp.frame < 10;
      });

      if (game.enemies.every(e => !e.alive)) {
        game.waveNumber++;
        game.enemies = spawnEnemies(game.waveNumber);
      }

      if (game.enemies.some(e => e.alive && e.y + e.height > game.player.y)) {
        setGameState('gameOver');
        setHighScore(prev => Math.max(prev, score));
        localStorage.setItem('spaceShooterHighScore', Math.max(score, highScore).toString());
      }

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState, score, spawnEnemies, isMobile, highScore]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-fuchsia-950 p-4">
      <div className="mb-2 text-center">
        <h1 className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent mb-2`}>
          Space Shooter
        </h1>
        <div className={`flex ${isMobile ? 'flex-col gap-1' : 'gap-8 justify-center'} ${isMobile ? 'text-base' : 'text-xl'}`}>
          <p className="text-cyan-400">Score: {score}</p>
          <p className="text-fuchsia-400">High Score: {highScore}</p>
          <p className="text-purple-400">Wave: {gameRef.current.waveNumber}</p>
        </div>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={gameRef.current.canvasWidth}
          height={gameRef.current.canvasHeight}
          className="border-4 border-purple-500/50 rounded-lg shadow-[0_0_30px_rgba(147,51,234,0.5)] touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />

        {gameState === 'start' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-lg">
            <div className="text-center px-4">
              <h2 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-cyan-400 mb-4`}>Ready to Play?</h2>
              <p className={`text-purple-300 mb-4 ${isMobile ? 'text-sm' : ''}`}>
                {isMobile ? 'Touch canvas to move, tap button to shoot' : 'Arrow Keys to move, Space to shoot'}
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
        <div className="mt-4 flex gap-4 items-center">
          <button
            onTouchStart={moveLeft}
            onTouchEnd={stopMove}
            className="w-16 h-16 bg-cyan-600/80 active:bg-cyan-700 text-white font-bold rounded-lg text-2xl border-2 border-cyan-400/50 shadow-[0_0_15px_rgba(34,211,238,0.5)]"
          >
            ←
          </button>
          <button
            onTouchStart={handleShoot}
            className="w-20 h-20 bg-fuchsia-600/80 active:bg-fuchsia-700 text-white font-bold rounded-full text-xl border-2 border-fuchsia-400/50 shadow-[0_0_20px_rgba(217,70,239,0.5)]"
          >
            FIRE
          </button>
          <button
            onTouchStart={moveRight}
            onTouchEnd={stopMove}
            className="w-16 h-16 bg-cyan-600/80 active:bg-cyan-700 text-white font-bold rounded-lg text-2xl border-2 border-cyan-400/50 shadow-[0_0_15px_rgba(34,211,238,0.5)]"
          >
            →
          </button>
        </div>
      )}

      <div className={`mt-4 text-purple-300 text-center max-w-md ${isMobile ? 'text-xs' : 'text-sm'}`}>
        <p>
          <span className="font-bold text-cyan-400">Controls:</span> {isMobile ? 'Touch canvas to move ship, tap FIRE to shoot' : '← → Arrow keys to move, Space to shoot'}
        </p>
        <p className="text-xs mt-2 text-purple-400">
          Defeat all enemies to advance to the next wave. Watch out for enemy fire!
        </p>
      </div>
    </div>
  );
}
