'use client';

import { useState } from 'react';
import AI3DModelGenerator from '@/components/3d/AI3DModelGenerator';
import ImageTo3DGenerator from '@/components/3d/ImageTo3DGenerator';
import Link from 'next/link';

export default function ThreeDGeneratorPage() {
  const [activeTab, setActiveTab] = useState<'text' | 'image'>('text');

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white relative">
      {/* Home Button */}
      <Link
        href="/"
        className="fixed top-4 left-4 z-50 glass-panel p-2 sm:p-3 rounded-xl border-2 border-white/10 hover:border-[oklch(0.85_0.2_160)] transition-all duration-300 hover:scale-110 group"
        title="Back to Home"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-5 h-5 sm:w-6 sm:h-6 text-white/70 group-hover:text-[oklch(0.85_0.2_160)] transition-colors"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
          />
        </svg>
      </Link>

      {/* Info Note - Top Left */}
      <div className="fixed top-20 left-4 z-40 max-w-xs sm:max-w-sm">
        <div className="glass-panel p-3 sm:p-4 rounded-xl border-2 border-yellow-500/30 bg-yellow-500/5">
          <p className="text-yellow-200/90 text-xs sm:text-sm leading-relaxed">
            Updates still underway test the image generation section of this page model output is still being optimized. The software will be pushed to the new GPU server with higher VRAM in the near future. Also try to upload images that are clean and visible with quality resolution. Try it out!
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 pt-20">
        {/* Title */}
        <div className="text-center mb-8 space-y-2">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-[oklch(0.85_0.2_160)] to-[oklch(0.75_0.2_160)] bg-clip-text text-transparent">
            Gen-3D
          </h1>
          <p className="text-white/60 text-sm sm:text-base">
            Create 3D models from text descriptions or upload images
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="glass-panel inline-flex rounded-xl p-1 border-2 border-white/10">
            <button
              onClick={() => setActiveTab('text')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                activeTab === 'text'
                  ? 'bg-[oklch(0.85_0.2_160)] text-black shadow-lg shadow-[oklch(0.85_0.2_160)]/30'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              ✍️ Text to 3D
            </button>
            <button
              onClick={() => setActiveTab('image')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                activeTab === 'image'
                  ? 'bg-[oklch(0.85_0.2_160)] text-black shadow-lg shadow-[oklch(0.85_0.2_160)]/30'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              📸 Image to 3D
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="max-w-6xl mx-auto">
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
