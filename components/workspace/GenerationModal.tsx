'use client';

import React, { useEffect, Suspense } from 'react';
import { X } from 'lucide-react';
import type { GenerationTool, GalleryItem } from '@/app/(app)/workspace/page';
import type { StarIDEHandle } from '@/components/workspace/StarIDE';
import dynamic from 'next/dynamic';

/* Lazy-load generators — they are large components.
   This keeps the workspace shell fast on initial load. */
const VideoGenerator = dynamic(() => import('@/components/VideoGenerator'), { ssr: false });
const ImageGenerator = dynamic(() => import('@/components/ImageGenerator'), { ssr: false });
const IdeogramGenerator = dynamic(() => import('@/components/IdeogramGenerator'), { ssr: false });
const ImageTo3DGenerator = dynamic(() => import('@/components/3d/ImageTo3DGenerator'), { ssr: false });
const ImageAnalyzer = dynamic(() => import('@/components/ImageAnalyzer'), { ssr: false });
const TransparencyTool = dynamic(() => import('@/components/TransparencyTool'), { ssr: false });
const StarIDE = dynamic(() => import('@/components/workspace/StarIDE'), { ssr: false });

const TITLE: Record<Exclude<GenerationTool, null>, string> = {
  video: 'Video Generator',
  image: 'Image Generator',
  ideogram: 'Logo Generator',
  '3d': '3D Model Generator',
  'image-analysis': 'Image Analysis',
  'transparency': 'Background Removal',
  'ide': 'IDE',
};

interface Props {
  tool: Exclude<GenerationTool, null>;
  onClose: () => void;
  addToGallery: (item: GalleryItem) => void;
  ideRef?: React.Ref<StarIDEHandle>;
}

export function GenerationModal({ tool, onClose, addToGallery, ideRef }: Props) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const renderTool = () => {
    switch (tool) {
      case 'video':
        return <VideoGenerator />;
      case 'image':
        return <ImageGenerator />;
      case 'ideogram':
        return <IdeogramGenerator />;
      case '3d':
        return <ImageTo3DGenerator />;
      case 'image-analysis':
        return <ImageAnalyzer />;
      case 'transparency':
        return <TransparencyTool />;
      case 'ide':
        return null; // rendered separately below
      default:
        return null;
    }
  };

  return (
    <div className="ws-modal-backdrop" onClick={onClose}>
      <div className="ws-modal" style={tool === 'ide' ? { height: '85vh' } : undefined} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="ws-modal-header">
          <span className="ws-modal-title">{TITLE[tool]}</span>
          <button className="ws-modal-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        {tool === 'ide' ? (
          <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
            <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--ws-text-muted)', fontSize: 13 }}>Loading IDE…</div>}>
              <StarIDE ref={ideRef} />
            </Suspense>
          </div>
        ) : (
          <div className="ws-modal-body">
            <Suspense
              fallback={
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 60,
                  color: 'var(--ws-text-muted)',
                  fontSize: 13,
                }}>
                  Loading...
                </div>
              }
            >
              {renderTool()}
            </Suspense>
          </div>
        )}
      </div>
    </div>
  );
}
