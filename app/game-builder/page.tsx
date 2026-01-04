'use client';

import dynamic from 'next/dynamic';

const GameBuilder = dynamic(() => import('@/components/GameBuilder'), { ssr: false });

export default function GameBuilderPage() {
  return <GameBuilder />;
}
