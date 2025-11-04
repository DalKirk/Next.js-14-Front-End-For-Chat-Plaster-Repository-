'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import GameBuilder to avoid SSR issues with canvas
const GameBuilder = dynamic(() => import('@/components/GameBuilder'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-black flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4">🎮</div>
        <p className="text-xl font-semibold text-slate-300">Loading Game Builder...</p>
      </div>
    </div>
  )
});

export default function GameBuilderPage() {
  return <GameBuilder />;
}
