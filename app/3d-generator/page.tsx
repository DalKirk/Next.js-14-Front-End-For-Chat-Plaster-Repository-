'use client';

import ImageTo3DGenerator from '@/components/3d/ImageTo3DGenerator';
import Link from 'next/link';

export default function ThreeDGeneratorPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(255,255,255,0.08) 0%, transparent 70%)' }} />

      <div className="flex items-center justify-between px-3 sm:px-5 py-3" style={{ position: 'relative', zIndex: 2, borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link
            href="/"
            aria-label="Back"
            title="Back"
            style={{ display: 'flex', alignItems: 'center', color: 'rgba(255,255,255,0.6)', padding: 0 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 16, height: 16 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </Link>
          <img src="/icon.png" alt="Starcyeed" style={{ width: 28, height: 28, borderRadius: 7, flexShrink: 0 }} />
          <span className="hidden sm:inline" style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em' }}>starcyeed</span>
          <span className="hidden sm:inline" style={{ fontSize: 11, color: 'rgba(255,255,255,0.62)' }}>/</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.60)' }}>Image to 3D</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-8 pt-10 sm:pt-12">
        <ImageTo3DGenerator />
      </div>
    </div>
  );
}
