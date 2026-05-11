'use client';

import {
  SiUnity,
  SiGodotengine,
  SiHtml5,
  SiWebassembly,
  SiGamemaker,
  SiConstruct3,
} from 'react-icons/si';
import type { GameEngine } from '@/types/upload';

// Official brand colors
const BRAND_COLORS: Record<GameEngine, string> = {
  unity:       '#CCCCCC', // Unity silver/white
  godot:       '#478CBF', // Godot blue
  html5:       '#E34F26', // HTML5 orange-red
  webassembly: '#654FF0', // WebAssembly purple
  phaser:      '#2CCA8F', // Phaser teal
  gamemaker:   '#FAAF17', // GameMaker orange-yellow (brand accent)
  construct:   '#00FFDA', // Construct 3 cyan-green
  unknown:     '#6B7280', // gray
};

interface EngineIconProps {
  engine: GameEngine;
  size?: number;
  className?: string;
}

// Phaser — custom bold "P" letterform (not in Simple Icons)
function PhaserIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      {/* Outer P shape */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        fill={color}
        d="M3 2h11a6 6 0 010 12H7v8H3V2zm4 2v8h7a4 4 0 000-8H7z"
      />
    </svg>
  );
}

export function EngineIcon({ engine, size = 16, className }: EngineIconProps) {
  const color = BRAND_COLORS[engine] ?? BRAND_COLORS.unknown;
  const siProps = { size, style: { color }, className };

  switch (engine) {
    case 'unity':       return <SiUnity {...siProps} />;
    case 'godot':       return <SiGodotengine {...siProps} />;
    case 'html5':       return <SiHtml5 {...siProps} />;
    case 'webassembly': return <SiWebassembly {...siProps} />;
    case 'phaser':      return <PhaserIcon size={size} color={color} />;
    case 'gamemaker':   return <SiGamemaker {...siProps} />;
    case 'construct':   return <SiConstruct3 {...siProps} />;
    default:            return <SiHtml5 {...siProps} />;
  }
}

