'use client';

import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues with PixiJS
const PlutoEditor = dynamic(
  () => import('../../components/editor/PlutoEditor'),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🎮</div>
          <p className="text-white text-xl">Loading Pluto Engine...</p>
          <p className="text-zinc-500 mt-2">Initializing WebGL renderer</p>
        </div>
      </div>
    )
  }
);

export default function GamePixiPage() {
  return <PlutoEditor />;
}
