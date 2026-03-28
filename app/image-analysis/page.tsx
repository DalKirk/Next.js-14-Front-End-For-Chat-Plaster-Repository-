'use client';

import React from 'react';
import ImageAnalyzer from '@/components/ImageAnalyzer';
import { AgeGate } from '@/components/AgeGate';

export default function ImageAnalysisPage() {
  return (
    <AgeGate>
      <div className="min-h-screen w-full p-4 sm:p-6">
        <ImageAnalyzer />
      </div>
    </AgeGate>
  );
}
