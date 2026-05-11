'use client';

import { formatFileSize, guessEngineFromFilename, getEngineLabel } from '@/lib/upload-utils';
import { EngineIcon } from '@/components/upload/EngineIcon';
import type { GameEngine } from '@/types/upload';

interface FilePreviewProps {
  file: File;
  detectedEngine?: GameEngine;
  onRemove: () => void;
  disabled?: boolean;
}

export function FilePreview({ file, detectedEngine, onRemove, disabled = false }: FilePreviewProps) {
  const engine = detectedEngine ?? guessEngineFromFilename(file.name);
  const isLarge = file.size > 90 * 1024 * 1024;

  return (
    <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 overflow-hidden">
      <div className="p-5 flex items-start gap-4">
        {/* Icon */}
        <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776" />
          </svg>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="text-white font-semibold text-base truncate">{file.name}</h4>
            {!disabled && (
              <button onClick={onRemove} className="flex-shrink-0 w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors group" aria-label="Remove file">
                <svg className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 text-sm flex-wrap">
            <span className="text-zinc-400 font-mono">{formatFileSize(file.size)}</span>
            <span className="text-zinc-700">·</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-700">
              <EngineIcon engine={engine} size={12} />
              {getEngineLabel(engine)}
            </span>
            {isLarge && (
              <>
                <span className="text-zinc-700">·</span>
                <span className="inline-flex items-center gap-1 text-amber-400 text-xs">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" />
                  </svg>
                  Large file
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
