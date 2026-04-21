'use client';

import ImageGenerator from '@/components/ImageGenerator';
import { AgeGate } from '@/components/AgeGate';

export default function ImageGenPage() {
  return (
    <AgeGate>
      <ImageGenerator />
    </AgeGate>
  );
}
