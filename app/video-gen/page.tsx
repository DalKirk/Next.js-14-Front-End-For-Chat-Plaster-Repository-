'use client';

import VideoGenerator from '@/components/VideoGenerator';
import { AgeGate } from '@/components/AgeGate';

export default function VideoGenPage() {
  return (
    <AgeGate>
      <VideoGenerator />
    </AgeGate>
  );
}
