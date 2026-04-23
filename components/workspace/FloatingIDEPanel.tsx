'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { X, Minus, Maximize2, Minimize2, Code2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import type { StarIDEHandle } from './StarIDE';

const StarIDE = dynamic(() => import('@/components/workspace/StarIDE'), { ssr: false });

interface Props {
  ideRef: React.Ref<StarIDEHandle>;
  onClose: () => void;
}

const MIN_W = 400;
const MIN_H = 220;
const DEF_W = 700;
const DEF_H = 460;

const btn: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  color: '#525975',
  padding: '3px 5px',
  display: 'flex',
  alignItems: 'center',
  borderRadius: 4,
  lineHeight: 1,
  flexShrink: 0,
};

export function FloatingIDEPanel({ ideRef, onClose }: Props) {
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [pos,  setPos]  = useState({ x: 40, y: 80 });
  const [size, setSize] = useState({ w: DEF_W, h: DEF_H });

  const dragging    = useRef(false);
  const resizing    = useRef(false);
  const dragStart   = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const resizeStart = useRef({ mx: 0, my: 0, w: DEF_W, h: DEF_H });
  const posRef      = useRef(pos);
  const sizeRef     = useRef(size);
  posRef.current  = pos;
  sizeRef.current = size;

  // Position bottom-right after mount
  useEffect(() => {
    setPos({
      x: Math.max(16, window.innerWidth  - DEF_W - 16),
      y: Math.max(60, window.innerHeight - DEF_H - 60),
    });
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragging.current) {
        const dx = e.clientX - dragStart.current.mx;
        const dy = e.clientY - dragStart.current.my;
        setPos({
          x: Math.max(0, Math.min(window.innerWidth  - sizeRef.current.w, dragStart.current.px + dx)),
          y: Math.max(0, Math.min(window.innerHeight - 36,                 dragStart.current.py + dy)),
        });
      }
      if (resizing.current) {
        const dw = e.clientX - resizeStart.current.mx;
        const dh = e.clientY - resizeStart.current.my;
        setSize({
          w: Math.max(MIN_W, resizeStart.current.w + dw),
          h: Math.max(MIN_H, resizeStart.current.h + dh),
        });
      }
    };
    const onUp = () => { dragging.current = false; resizing.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',  onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',  onUp);
    };
  }, []);

  const onHeaderMouseDown = (e: React.MouseEvent) => {
    if (maximized) return;
    e.preventDefault();
    dragging.current = true;
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
  };

  const onResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizing.current = true;
    resizeStart.current = { mx: e.clientX, my: e.clientY, w: size.w, h: size.h };
  };

  const panelStyle: React.CSSProperties = maximized
    ? { position: 'fixed', inset: 8, zIndex: 900 }
    : { position: 'fixed', left: pos.x, top: pos.y, width: size.w, height: minimized ? 36 : size.h, zIndex: 900 };

  return (
    <div style={{
      ...panelStyle,
      display: 'flex',
      flexDirection: 'column',
      background: '#000000',
      border: '1px solid #1a1a2e',
      borderRadius: maximized ? 4 : 8,
      overflow: 'hidden',
      boxShadow: '0 16px 48px rgba(0,0,0,0.72), 0 0 0 1px rgba(128,203,196,0.07)',
    }}>

      {/* ── Title bar ─────────────────────────────────────── */}
      <div
        onMouseDown={onHeaderMouseDown}
        style={{
          height: 36,
          flexShrink: 0,
          background: '#0a0a0f',
          borderBottom: minimized ? 'none' : '1px solid #1a1a2e',
          display: 'flex',
          alignItems: 'center',
          padding: '0 8px 0 12px',
          gap: 6,
          cursor: maximized ? 'default' : 'move',
          userSelect: 'none',
        }}
      >
        <Code2 size={13} color="#80cbc4" style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: '#8f93a2', fontFamily: 'system-ui', display: 'flex', alignItems: 'center', gap: 6 }}>
          Star IDE
          <span style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.06em',
            color: '#aaff00',
            textShadow: '0 0 6px #aaff00, 0 0 12px #aaff0088',
            animation: 'ide-beta-blink 1.2s ease-in-out infinite',
            lineHeight: 1,
          }}>BETA</span>
          <style>{`
            @keyframes ide-beta-blink {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.15; }
            }
          `}</style>
        </span>

        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={() => setMinimized(m => !m)}
          style={btn}
          title={minimized ? 'Restore' : 'Minimize'}
        >
          <Minus size={11} />
        </button>
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={() => { setMaximized(m => !m); setMinimized(false); }}
          style={btn}
          title={maximized ? 'Restore' : 'Maximise'}
        >
          {maximized ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
        </button>
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={onClose}
          style={{ ...btn, color: '#ff5370' }}
          title="Close IDE"
        >
          <X size={11} />
        </button>
      </div>

      {/* ── IDE body ──────────────────────────────────────── */}
      {!minimized && (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden', position: 'relative' }}>
          <Suspense fallback={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#525975', fontSize: 13 }}>
              Loading IDE…
            </div>
          }>
            <StarIDE ref={ideRef} />
          </Suspense>

          {/* Resize grip — bottom-right corner */}
          {!maximized && (
            <div
              onMouseDown={onResizeMouseDown}
              style={{ position: 'absolute', bottom: 0, right: 0, width: 18, height: 18, cursor: 'nwse-resize' }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" style={{ position: 'absolute', bottom: 4, right: 4 }}>
                <path d="M8 2L2 8M8 5.5L5.5 8" stroke="#3b3f51" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
