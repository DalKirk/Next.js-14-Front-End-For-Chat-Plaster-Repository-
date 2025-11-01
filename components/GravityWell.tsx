'use client';

import React, { useState, useEffect, useRef } from 'react';

interface Position {
  x: number;
  y: number;
}

interface Planet {
  x: number;
  y: number;
  mass: number;
  radius: number;
}

interface Level {
  planets: Planet[];
  start: Position;
  goal: Position;
}

export default function GravityWell() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'aiming' | 'flying' | 'success' | 'failed'>('aiming');
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [shipPos, setShipPos] = useState<Position>({ x: 50, y: 50 });
  const [shipVel, setShipVel] = useState<Position>({ x: 0, y: 0 });
  const [aimAngle, setAimAngle] = useState(0);
  const [aimPower, setAimPower] = useState(50);
  const [trailPoints, setTrailPoints] = useState<Position[]>([]);
  const [dimensions, setDimensions] = useState({ width: 600, height: 600 });
  
  const animationRef = useRef<number | null>(null);

  const levels: Level[] = [
    {
      planets: [{ x: 300, y: 300, mass: 5000, radius: 30 }],
      start: { x: 100, y: 100 },
      goal: { x: 500, y: 500 }
    },
    {
      planets: [
        { x: 250, y: 250, mass: 4000, radius: 25 },
        { x: 350, y: 350, mass: 4000, radius: 25 }
      ],
      start: { x: 100, y: 100 },
      goal: { x: 500, y: 500 }
    },
    {
      planets: [
        { x: 200, y: 300, mass: 6000, radius: 35 },
        { x: 400, y: 300, mass: 4000, radius: 25 },
        { x: 300, y: 150, mass: 3000, radius: 20 }
      ],
      start: { x: 100, y: 500 },
      goal: { x: 500, y: 100 }
    },
    {
      planets: [
        { x: 300, y: 200, mass: 5000, radius: 30 },
        { x: 200, y: 400, mass: 4000, radius: 25 },
        { x: 400, y: 400, mass: 4000, radius: 25 }
      ],
      start: { x: 100, y: 100 },
      goal: { x: 550, y: 550 }
    },
    {
      planets: [
        { x: 300, y: 300, mass: 8000, radius: 40 },
        { x: 150, y: 150, mass: 2000, radius: 15 },
        { x: 450, y: 150, mass: 2000, radius: 15 },
        { x: 150, y: 450, mass: 2000, radius: 15 },
        { x: 450, y: 450, mass: 2000, radius: 15 }
      ],
      start: { x: 50, y: 300 },
      goal: { x: 550, y: 300 }
    }
  ];

  const currentLevel = levels[Math.min(level - 1, levels.length - 1)];

  useEffect(() => {
    const updateDimensions = () => {
      const size = Math.min(window.innerWidth - 32, window.innerHeight - 250, 600);
      setDimensions({ width: size, height: size });
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const resetLevel = () => {
    const scaleX = dimensions.width / 600;
    const scaleY = dimensions.height / 600;
    setShipPos({ 
      x: currentLevel.start.x * scaleX, 
      y: currentLevel.start.y * scaleY 
    });
    setShipVel({ x: 0, y: 0 });
    setTrailPoints([]);
    setGameState('aiming');
    setAimAngle(0);
    setAimPower(50);
  };

  useEffect(() => {
    resetLevel();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, dimensions]);

  const launch = () => {
    const speed = aimPower / 10;
    setShipVel({
      x: Math.cos(aimAngle) * speed,
      y: Math.sin(aimAngle) * speed
    });
    setGameState('flying');
    setTrailPoints([{ x: shipPos.x, y: shipPos.y }]);
  };

  const handleCanvasTouch = (e: React.TouchEvent) => {
    if (gameState !== 'aiming') return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    const dx = x - shipPos.x;
    const dy = y - shipPos.y;
    const angle = Math.atan2(dy, dx);
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    setAimAngle(angle);
    setAimPower(Math.min(Math.max(distance / 2, 10), 100));
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (gameState !== 'aiming') return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const dx = x - shipPos.x;
    const dy = y - shipPos.y;
    const angle = Math.atan2(dy, dx);
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    setAimAngle(angle);
    setAimPower(Math.min(Math.max(distance / 2, 10), 100));
  };

  useEffect(() => {
    if (gameState !== 'flying') return;

    const gameLoop = () => {
      setShipPos(pos => {
        let newVel = { ...shipVel };
        const scaleX = dimensions.width / 600;
        const scaleY = dimensions.height / 600;

        currentLevel.planets.forEach(planet => {
          const scaledPlanet = {
            x: planet.x * scaleX,
            y: planet.y * scaleY,
            radius: planet.radius * Math.min(scaleX, scaleY),
            mass: planet.mass
          };

          const dx = scaledPlanet.x - pos.x;
          const dy = scaledPlanet.y - pos.y;
          const distSq = dx * dx + dy * dy;
          const dist = Math.sqrt(distSq);

          if (dist < scaledPlanet.radius + 5) {
            setGameState('failed');
            return pos;
          }

          const force = scaledPlanet.mass / distSq;
          const forceX = (dx / dist) * force;
          const forceY = (dy / dist) * force;

          newVel.x += forceX * 0.01;
          newVel.y += forceY * 0.01;
        });

        setShipVel(newVel);

        const newPos = {
          x: pos.x + newVel.x,
          y: pos.y + newVel.y
        };

        if (newPos.x < 0 || newPos.x > dimensions.width || 
            newPos.y < 0 || newPos.y > dimensions.height) {
          setGameState('failed');
          return pos;
        }

        const goalX = currentLevel.goal.x * scaleX;
        const goalY = currentLevel.goal.y * scaleY;
        const goalDist = Math.sqrt(
          Math.pow(newPos.x - goalX, 2) + 
          Math.pow(newPos.y - goalY, 2)
        );

        if (goalDist < 20) {
          setGameState('success');
          setScore(s => s + level * 100);
        }

        setTrailPoints(trail => {
          const newTrail = [...trail, { x: newPos.x, y: newPos.y }];
          return newTrail.slice(-100);
        });

        return newPos;
      });

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState, shipVel, currentLevel, level, dimensions]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    const scaleX = dimensions.width / 600;
    const scaleY = dimensions.height / 600;

    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    for (let i = 0; i < 50; i++) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillRect(
        Math.random() * dimensions.width,
        Math.random() * dimensions.height,
        1, 1
      );
    }

    currentLevel.planets.forEach(planet => {
      const x = planet.x * scaleX;
      const y = planet.y * scaleY;
      const radius = Math.max(planet.radius * Math.min(scaleX, scaleY), 1);

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, Math.max(radius, 1));
      gradient.addColorStop(0, '#ff6b00');
      gradient.addColorStop(0.5, '#ff4400');
      gradient.addColorStop(1, '#880000');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 100, 0, 0.1)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(radius * 2, 2), 0, Math.PI * 2);
      ctx.stroke();
    });

    if (trailPoints.length > 1) {
      ctx.strokeStyle = 'rgba(100, 200, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(trailPoints[0].x, trailPoints[0].y);
      trailPoints.forEach(point => ctx.lineTo(point.x, point.y));
      ctx.stroke();
    }

    const goalX = currentLevel.goal.x * scaleX;
    const goalY = currentLevel.goal.y * scaleY;
    ctx.fillStyle = '#00ff00';
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(goalX, goalY, 15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(goalX, goalY, 8, 0, Math.PI * 2);
    ctx.fill();

    if (gameState === 'aiming') {
      const aimLength = aimPower * 2;
      const endX = shipPos.x + Math.cos(aimAngle) * aimLength;
      const endY = shipPos.y + Math.sin(aimAngle) * aimLength;
      
      ctx.strokeStyle = `rgba(255, 255, 0, ${aimPower / 100})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(shipPos.x, shipPos.y);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      ctx.fillStyle = '#ffff00';
      ctx.beginPath();
      ctx.arc(endX, endY, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#00ccff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(shipPos.x, shipPos.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

  }, [shipPos, trailPoints, gameState, aimAngle, aimPower, currentLevel, dimensions]);

  const nextLevel = () => {
    if (level < levels.length) {
      setLevel(l => l + 1);
    } else {
      setLevel(1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-fuchsia-950 flex items-center justify-center p-2 sm:p-4 select-none">
      <div className="w-full max-w-3xl">
        <div className="bg-black/40 backdrop-blur-sm border border-purple-500/30 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🚀</span>
              <h1 className="text-cyan-400 text-lg sm:text-2xl font-bold">GRAVITY WELL</h1>
            </div>
            <div className="flex gap-4 text-purple-300 text-sm sm:text-base">
              <div>Level: {level}</div>
              <div>Score: {score}</div>
            </div>
          </div>
        </div>

        <div className="bg-black/40 backdrop-blur-sm border border-purple-500/30 rounded-lg p-3 sm:p-4">
          <canvas
            ref={canvasRef}
            width={dimensions.width}
            height={dimensions.height}
            className="w-full border-2 border-purple-500/50 rounded cursor-crosshair touch-none shadow-[0_0_30px_rgba(147,51,234,0.5)]"
            onClick={handleCanvasClick}
            onTouchMove={handleCanvasTouch}
            onTouchStart={handleCanvasTouch}
          />

          <div className="mt-3 sm:mt-4 flex flex-wrap gap-2 sm:gap-3">
            {gameState === 'aiming' && (
              <>
                <button
                  onClick={launch}
                  className="flex-1 bg-gradient-to-r from-cyan-400 to-fuchsia-500 hover:from-cyan-500 hover:to-fuchsia-600 text-white py-2 sm:py-3 px-4 sm:px-6 rounded-lg flex items-center justify-center gap-2 font-bold text-sm sm:text-base shadow-[0_0_20px_rgba(34,211,238,0.5)] transition-all"
                >
                  ▶ LAUNCH
                </button>
                <button
                  onClick={resetLevel}
                  className="bg-purple-600/80 hover:bg-purple-700 text-white py-2 sm:py-3 px-4 rounded-lg flex items-center justify-center transition-colors border border-purple-400/50"
                >
                  🔄
                </button>
              </>
            )}
            
            {gameState === 'flying' && (
              <div className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-2 sm:py-3 px-4 sm:px-6 rounded-lg flex items-center justify-center gap-2 font-bold text-sm sm:text-base shadow-[0_0_20px_rgba(234,179,8,0.5)]">
                ⏸ IN FLIGHT
              </div>
            )}

            {gameState === 'success' && (
              <>
                <button
                  onClick={nextLevel}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-2 sm:py-3 px-4 sm:px-6 rounded-lg font-bold text-sm sm:text-base shadow-[0_0_20px_rgba(34,197,94,0.5)] transition-all"
                >
                  {level < levels.length ? 'NEXT LEVEL' : 'RESTART'}
                </button>
                <button
                  onClick={resetLevel}
                  className="bg-purple-600/80 hover:bg-purple-700 text-white py-2 sm:py-3 px-4 rounded-lg flex items-center justify-center transition-colors border border-purple-400/50"
                >
                  🔄
                </button>
              </>
            )}

            {gameState === 'failed' && (
              <>
                <button
                  onClick={resetLevel}
                  className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white py-2 sm:py-3 px-4 sm:px-6 rounded-lg font-bold text-sm sm:text-base shadow-[0_0_20px_rgba(239,68,68,0.5)] transition-all"
                >
                  TRY AGAIN
                </button>
              </>
            )}
          </div>

          <div className="mt-3 sm:mt-4 text-purple-300 text-xs sm:text-sm text-center space-y-1">
            {gameState === 'aiming' && (
              <>
                <p className="font-bold text-cyan-400">Tap/Click to aim your ship</p>
                <p>Use planetary gravity to slingshot to the green target</p>
                <p className="text-xs text-purple-400">Avoid crashing into planets (orange) or leaving the boundary</p>
              </>
            )}
            {gameState === 'success' && (
              <p className="text-green-400 font-bold text-base sm:text-lg">🎯 TARGET REACHED! +{level * 100} points</p>
            )}
            {gameState === 'failed' && (
              <p className="text-red-400 font-bold text-base sm:text-lg">💥 MISSION FAILED</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
