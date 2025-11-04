'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import SpaceShooter from '@/components/SpaceShooter';
import BurgerTime from '@/components/BurgerTime';
import GravityWell from '@/components/GravityWell';
import HackingGame from '@/components/HackingGame';

export default function GamesPage() {
  const router = useRouter();
  const [selectedGame, setSelectedGame] = useState<string | null>(null);

  const games = [
    {
      id: 'space-attack',
      title: 'Space Attack',
      description: 'Shoot enemies and survive waves',
      icon: '🚀',
      available: true,
    },
    {
      id: 'burger-smash',
      title: 'Burger Smash DEMO',
      description: 'Drop burger parts to complete orders',
      icon: '🍔',
      available: true,
    },
    {
      id: 'gravity-well',
      title: 'Gravity Well',
      description: 'Use gravity to reach the target',
      icon: '🌌',
      available: true,
    },
    {
      id: 'hacking-game',
      title: 'Terminal Hacker',
      description: 'Crack the password like Fallout',
      icon: '💻',
      available: true,
    },
    {
      id: 'tic-tac-toe',
      title: 'Tic Tac Toe',
      description: 'Classic X and O game',
      icon: '⭕❌',
      available: false,
    },
    {
      id: 'memory',
      title: 'Memory Match',
      description: 'Find matching pairs',
      icon: '�',
      available: false,
    },
    {
      id: 'rock-paper-scissors',
      title: 'Rock Paper Scissors',
      description: 'Play against the computer',
      icon: '✊✋✌️',
      available: false,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-black">
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-50 mx-2 sm:mx-4 mb-2 sm:mb-4 p-2 sm:p-4 bg-gradient-to-br from-black/60 via-slate-900/60 to-black/60 backdrop-blur-xl border-0 rounded-b-lg shadow-[0_20px_60px_rgba(0,0,0,0.9)] border-b border-slate-700/50 flex items-center gap-2 sm:gap-4"
      >
        <Button
          onClick={() => selectedGame ? setSelectedGame(null) : router.push('/')}
          variant="ghost"
          className="flex items-center gap-1 sm:gap-2 text-slate-300 hover:text-green-400 transition-colors px-2 sm:px-3 py-1 sm:py-2"
        >
          <ArrowLeftIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">{selectedGame ? 'Back to Games' : 'Back'}</span>
        </Button>
        <h1 className="text-base sm:text-2xl font-bold bg-gradient-to-r from-green-500 via-emerald-400 to-green-400 bg-clip-text text-transparent">
          {selectedGame ? games.find(g => g.id === selectedGame)?.title : '🎮 Mini Games'}
        </h1>
      </motion.div>

      {/* Game View */}
      {selectedGame === 'space-attack' ? (
        <SpaceShooter />
      ) : selectedGame === 'burger-smash' ? (
        <BurgerTime />
      ) : selectedGame === 'gravity-well' ? (
        <GravityWell />
      ) : selectedGame === 'hacking-game' ? (
        <HackingGame />
      ) : selectedGame ? (
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-zinc-400 text-xl">Coming Soon!</p>
        </div>
      ) : (
        <>
          {/* Games Grid */}
          <div className="container mx-auto px-4 py-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
            >
              {games.map((game, index) => (
                <motion.div
                  key={game.id}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 * index }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedGame(game.id)}
                  className="bg-gradient-to-br from-black/60 via-slate-900/60 to-black/60 backdrop-blur-xl border border-slate-700/50 rounded-lg p-6 cursor-pointer hover:border-green-500/50 hover:shadow-lg hover:shadow-[rgba(34,197,94,0.4)] transition-all"
                >
                  <div className="text-4xl mb-4 text-center">{game.icon}</div>
                  <h3 className="text-xl font-bold text-slate-200 mb-2 text-center">
                    {game.title}
                  </h3>
                  <p className="text-slate-400 text-sm text-center">
                    {game.description}
                  </p>
                  <div className="mt-4 text-center">
                    {game.available ? (
                      <span className="text-xs text-green-400 font-semibold">
                        ✓ Available
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500 font-semibold">
                        Coming Soon
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Info Section */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-8 p-6 bg-gradient-to-br from-black/60 via-slate-900/60 to-black/60 backdrop-blur-xl border border-slate-700/50 rounded-lg shadow-[0_20px_60px_rgba(0,0,0,0.9)]"
            >
              <h2 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-green-500 to-emerald-400 bg-clip-text text-transparent mb-3">
                🎯 About Mini Games
              </h2>
              <p className="text-slate-400 text-sm sm:text-base mb-4">
                Take a break and enjoy some quick games! More games will be added soon.
                Each game is designed to be fun, simple, and playable in just a few minutes.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-green-500/20 text-slate-300 rounded-full text-xs border border-green-500/30">
                  Single Player
                </span>
                <span className="px-3 py-1 bg-green-500/20 text-slate-300 rounded-full text-xs border border-green-500/30">
                  Quick Games
                </span>
                <span className="px-3 py-1 bg-green-500/20 text-slate-300 rounded-full text-xs border border-green-500/30">
                  More Coming Soon
                </span>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}
