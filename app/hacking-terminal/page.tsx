'use client';

import dynamic from 'next/dynamic';

const HackingTerminal = dynamic(
  () => import('./HackingTerminal'),
  { ssr: false }
);

export default function HackingTerminalPage() {
  return <HackingTerminal />;
}
