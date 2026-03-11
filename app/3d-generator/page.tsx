'use client';

import { useState } from 'react';
import AI3DModelGenerator from '@/components/3d/AI3DModelGenerator';
import ImageTo3DGenerator from '@/components/3d/ImageTo3DGenerator';
import Link from 'next/link';

export default function ThreeDGeneratorPage() {
  const [activeTab, setActiveTab] = useState<'text' | 'image'>('text');

  return (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(249,115,22,0.06) 0%, transparent 70%)' }} />

      {/* Home Button */}
      <Link
        href="/"
        className="fixed top-3 left-3 sm:top-5 sm:left-5 z-50 w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-110 group"
        style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.15)' }}
        title="Back to Home"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-orange-400/60 group-hover:text-orange-400 transition-colors">
          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      </Link>

      {/* Main Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-8 pt-16 sm:pt-20">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-10 space-y-2 sm:space-y-3">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight" style={{ letterSpacing: '-0.04em' }}>
            <span className="text-white">Gen</span>
            <span style={{ color: '#f97316' }}>-3D</span>
          </h1>
          <p className="text-xs sm:text-sm tracking-widest uppercase" style={{ color: 'rgba(249,115,22,0.4)' }}>
            Text & Image to 3D Model
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-6 sm:mb-10">
          <div className="inline-flex rounded-full p-1 w-full sm:w-auto" style={{ background: 'rgba(249,115,22,0.04)', border: '1px solid rgba(249,115,22,0.1)' }}>
            <button
              onClick={() => setActiveTab('text')}
              className="flex-1 sm:flex-none px-5 sm:px-7 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium tracking-wide transition-all duration-300"
              style={activeTab === 'text' ? { background: '#f97316', color: '#000', boxShadow: '0 0 20px rgba(249,115,22,0.3)' } : { color: 'rgba(255,255,255,0.4)' }}
            >
              Text to 3D
            </button>
            <button
              onClick={() => setActiveTab('image')}
              className="flex-1 sm:flex-none px-5 sm:px-7 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium tracking-wide transition-all duration-300"
              style={activeTab === 'image' ? { background: '#f97316', color: '#000', boxShadow: '0 0 20px rgba(249,115,22,0.3)' } : { color: 'rgba(255,255,255,0.4)' }}
            >
              Image to 3D
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'text' ? (
            <AI3DModelGenerator />
          ) : (
            <ImageTo3DGenerator />
          )}
        </div>
      </div>
    </div>
  );
}
