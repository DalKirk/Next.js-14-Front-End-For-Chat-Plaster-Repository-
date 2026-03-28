'use client';

import dynamic from 'next/dynamic';
import { AgeGate } from '@/components/AgeGate';

const PlutoEditor = dynamic(() => import('@/components/editor/PlutoEditor'), { ssr: false });

export default function GameBuilderPage() {
  return (
    <AgeGate>
      <PlutoEditor />
    </AgeGate>
  );
}
