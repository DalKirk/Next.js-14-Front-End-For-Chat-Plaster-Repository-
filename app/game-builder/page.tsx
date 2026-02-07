'use client';

import dynamic from 'next/dynamic';

const PlutoEditor = dynamic(() => import('@/components/editor/PlutoEditor'), { ssr: false });

export default function GameBuilderPage() {
  return <PlutoEditor />;
}
