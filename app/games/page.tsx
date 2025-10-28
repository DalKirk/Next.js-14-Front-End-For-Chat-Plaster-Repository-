'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import SpaceShooter from '@/components/SpaceShooter';
import BurgerTime from '@/components/BurgerTime';
import GravityWell from '@/components/GravityWell';

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
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-fuchsia-950">
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-50 m-2 sm:m-4 p-2 sm:p-4 bg-black/30 backdrop-blur-md border border-purple-500/30 rounded-lg shadow-lg flex items-center gap-2 sm:gap-4"
      >
        <Button
          onClick={() => selectedGame ? setSelectedGame(null) : router.push('/')}
          variant="ghost"
          className="flex items-center gap-1 sm:gap-2 text-cyan-300 hover:text-cyan-200 px-2 sm:px-3 py-1 sm:py-2"
        >
          <ArrowLeftIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">{selectedGame ? 'Back to Games' : 'Back'}</span>
        </Button>
        <h1 className="text-base sm:text-2xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
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
      ) : selectedGame ? (
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-purple-300 text-xl">Coming Soon!</p>
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
                  className="bg-black/40 backdrop-blur-sm border border-purple-500/30 rounded-lg p-6 cursor-pointer hover:border-cyan-400/50 transition-all shadow-lg hover:shadow-cyan-400/20"
                >
                  <div className="text-4xl mb-4 text-center">{game.icon}</div>
                  <h3 className="text-xl font-bold text-cyan-300 mb-2 text-center">
                    {game.title}
                  </h3>
                  <p className="text-purple-300 text-sm text-center">
                    {game.description}
                  </p>
                  <div className="mt-4 text-center">
                    {game.available ? (
                      <span className="text-xs text-green-400 font-semibold">
                        ✓ Available
                      </span>
                    ) : (
                      <span className="text-xs text-fuchsia-400 font-semibold">
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
              className="mt-8 p-6 bg-black/40 backdrop-blur-sm border border-purple-500/30 rounded-lg"
            >
              <h2 className="text-lg sm:text-xl font-bold text-cyan-300 mb-3">
                🎯 About Mini Games
              </h2>
              <p className="text-purple-200 text-sm sm:text-base mb-4">
                Take a break and enjoy some quick games! More games will be added soon.
                Each game is designed to be fun, simple, and playable in just a few minutes.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-purple-600/30 text-purple-200 rounded-full text-xs border border-purple-500/30">
                  Single Player
                </span>
                <span className="px-3 py-1 bg-cyan-600/30 text-cyan-200 rounded-full text-xs border border-cyan-500/30">
                  Quick Games
                </span>
                <span className="px-3 py-1 bg-fuchsia-600/30 text-fuchsia-200 rounded-full text-xs border border-fuchsia-500/30">
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
