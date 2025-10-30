'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import GameBuilder to avoid SSR issues with canvas
const GameBuilder = dynamic(() => import('@/components/GameBuilder'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4">🎮</div>
        <p className="text-xl font-semibold text-gray-700">Loading Game Builder...</p>
      </div>
    </div>
  )
});

export default function GameBuilderPage() {
  return <GameBuilder />;
}
