'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Sparkles } from 'lucide-react';

/* ─── Mini waveform (fewer bars than desktop) ─── */
const BAR_COUNT = 14;

function MiniWaveform({ active, color }: { active: boolean; color: string }) {
  const [heights, setHeights] = useState<number[]>(Array(BAR_COUNT).fill(3));
  const ivRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (active) {
      ivRef.current = setInterval(() => {
        setHeights(Array.from({ length: BAR_COUNT }, () =>
          Math.max(2, Math.floor(Math.random() * 14) + 3)
        ));
      }, 100);
    } else {
      if (ivRef.current) clearInterval(ivRef.current);
      ivRef.current = null;
      setHeights(Array(BAR_COUNT).fill(3));
    }
    return () => { if (ivRef.current) clearInterval(ivRef.current); };
  }, [active]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 20, flex: 1, minWidth: 0 }}>
      {heights.map((h, i) => (
        <div key={i} style={{
          width: 2, height: h, borderRadius: 1, flexShrink: 0,
          background: active ? color : 'rgba(255,255,255,0.08)',
          transition: active ? 'height 80ms ease' : 'height 300ms ease',
        }} />
      ))}
    </div>
  );
}

/* ─── Props: all voice state comes from parent (RightRail owns the hooks) ─── */
export interface MobileVoiceFABProps {
  voiceStatus: string;
  isProcessing: boolean;
  isActive: boolean;
  isMobile: boolean;
  activated: boolean;
  statusLabel: string;
  statusColor: string;
  micRecording: boolean;
  micSpeaking: boolean;
  onMicClick: () => void;
}

export function MobileVoiceFAB({
  voiceStatus,
  isProcessing,
  isActive,
  isMobile,
  activated,
  statusLabel,
  statusColor,
  micRecording,
  micSpeaking,
  onMicClick,
}: MobileVoiceFABProps) {
  return (
    <div className="ws-mobile-voice-strip">
      {/* Left: "hey star" label */}
      <span style={{
        fontSize: 11, fontWeight: 600, letterSpacing: '0.03em', flexShrink: 0,
        color: isActive ? statusColor : 'rgba(255,255,255,0.45)',
        transition: 'color 0.2s',
      }}>
        {isActive ? statusLabel : 'hey star'}
      </span>

      {/* Center: waveform visualizer */}
      <MiniWaveform active={isActive} color={statusColor} />

      {/* Right: mic button */}
      <button
        className="ws-mobile-voice-mic"
        onClick={onMicClick}
        style={{
          background: micRecording ? 'var(--ws-cyan, #22d3ee)'
            : micSpeaking ? 'var(--ws-purple, #a78bfa)'
            : '#ff10f0',
          boxShadow: isActive ? `0 0 10px ${statusColor}40` : '0 0 8px rgba(255,16,240,0.3)',
        }}
      >
        {micRecording ? (
          <MicOff size={16} style={{ color: '#fff' }} />
        ) : micSpeaking ? (
          <Volume2 size={16} style={{ color: '#fff' }} />
        ) : isProcessing ? (
          <Sparkles size={14} className="ws-spinner" style={{ color: '#fff' }} />
        ) : (
          <Mic size={16} style={{ color: '#fff' }} />
        )}
      </button>
    </div>
  );
}
