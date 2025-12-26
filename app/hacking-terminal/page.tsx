'use client';

import dynamic from 'next/dynamic';

const HackingTerminal = dynamic(
  () => import('../3d-generator/hacking-terminal-sidebyside'),
  { ssr: false }
);

export default function HackingTerminalPage() {
  return <HackingTerminal />;
}
