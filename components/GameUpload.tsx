'use client';

import { useState, useEffect, useCallback } from 'react';
import { DropZone } from '@/components/upload/DropZone';
import { FilePreview } from '@/components/upload/FilePreview';
import { MetadataForm } from '@/components/upload/MetadataForm';
import { UploadProgress } from '@/components/upload/UploadProgress';
import { UploadSuccess } from '@/components/upload/UploadSuccess';
import { uploadGame } from '@/lib/upload-service';
import { guessEngineFromFilename } from '@/lib/upload-utils';
import type { UploadPhase, UploadProgress as Progress, UploadResult, GameEngine } from '@/types/upload';

// Re-export so existing consumers don't need to change their import
export type { UploadResult as GameUploadResult };

interface GameUploadProps {
  userId: string;
  onSuccess?: (result: UploadResult) => void;
  className?: string;
}

const STEPS = ['Select', 'Details', 'Publish'] as const;

function stepIndex(phase: UploadPhase): number {
  if (phase === 'idle') return 0;
  if (phase === 'selected') return 1;
  return 2;
}

function StepIndicator({ phase }: { phase: UploadPhase }) {
  const current = stepIndex(phase);
  const allDone = phase === 'complete' || phase === 'error';
  return (
    <div className="flex items-center w-full max-w-xs mx-auto mb-8">
      {STEPS.map((step, i) => {
        const done = allDone || i < current;
        const active = !allDone && i === current;
        return (
          <div key={step} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div className={[
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300',
                done ? 'bg-emerald-500 text-white' :
                active ? 'bg-zinc-700 text-white ring-2 ring-emerald-500 ring-offset-2 ring-offset-zinc-950' :
                'bg-zinc-800 text-zinc-500',
              ].join(' ')}>
                {done
                  ? <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                  : i + 1}
              </div>
              <span className={`text-[10px] mt-1 font-semibold uppercase tracking-wider ${active ? 'text-emerald-400' : done ? 'text-emerald-500' : 'text-zinc-600'}`}>{step}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mb-4 transition-colors duration-500 ${i < current ? 'bg-emerald-500' : 'bg-zinc-800'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function toTitleCase(str: string): string {
  return str.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

export function GameUpload({ userId, onSuccess, className = '' }: GameUploadProps) {
  const [phase, setPhase] = useState<UploadPhase>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [detectedEngine, setDetectedEngine] = useState<GameEngine | undefined>(undefined);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Warn before leaving mid-upload
  useEffect(() => {
    const busy = phase === 'uploading' || phase === 'processing';
    if (!busy) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [phase]);

  const handleFileSelected = useCallback((f: File) => {
    setFile(f);
    setDetectedEngine(guessEngineFromFilename(f.name));
    setTitle(toTitleCase(f.name.replace(/\.zip$/i, '')));
    setError(null);
    setPhase('selected');
  }, []);

  const handleRemoveFile = () => {
    setFile(null); setDetectedEngine(undefined);
    setTitle(''); setDescription(''); setThumbnail(null);
    setError(null); setPhase('idle');
  };

  const handleUpload = async () => {
    if (!file) return;
    if (!title.trim() || title.trim().length < 2) {
      setError('Please enter a title (at least 2 characters).');
      return;
    }
    setError(null); setProgress(null);
    try {
      const res = await uploadGame({
        userId, file,
        title: title.trim(),
        description: description.trim(),
        thumbnail: thumbnail ?? undefined,
        onProgress: setProgress,
        onPhaseChange: setPhase,
      });
      setResult(res);
      setPhase('complete');
      onSuccess?.(res);
    } catch (err) {
      setPhase('error');
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    }
  };

  const handleUploadAnother = () => {
    setPhase('idle'); setFile(null); setDetectedEngine(undefined);
    setTitle(''); setDescription(''); setThumbnail(null);
    setProgress(null); setResult(null); setError(null);
  };

  return (
    <div className={`w-full ${className}`}>
      <StepIndicator phase={phase} />

      <div className="space-y-5">
        {phase === 'idle' && (
          <DropZone onFileSelected={handleFileSelected} maxSizeMB={100} />
        )}

        {phase === 'selected' && file && (
          <>
            <FilePreview file={file} detectedEngine={detectedEngine} onRemove={handleRemoveFile} />
            <MetadataForm
              title={title} description={description} thumbnail={thumbnail}
              onTitleChange={setTitle} onDescriptionChange={setDescription} onThumbnailChange={setThumbnail}
            />
            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>
            )}
            <button
              onClick={handleUpload}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white font-bold text-base transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:scale-[1.01]"
            >
              Publish Game
            </button>
          </>
        )}

        {(phase === 'uploading' || phase === 'processing') && file && (
          <UploadProgress phase={phase} progress={progress} fileName={file.name} />
        )}

        {phase === 'complete' && result && (
          <UploadSuccess result={result} onUploadAnother={handleUploadAnother} />
        )}

        {phase === 'error' && (
          <div className="rounded-2xl bg-zinc-900/80 border border-red-500/30 p-6 text-center space-y-4">
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
                <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold">Upload failed</p>
                {error && <p className="text-zinc-400 text-sm mt-1">{error}</p>}
              </div>
            </div>
            <div className="flex gap-3 justify-center">
              <button onClick={handleUploadAnother} className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-sm transition-all">Start over</button>
              {file && (
                <button onClick={() => { setPhase('selected'); setError(null); }} className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-medium text-sm transition-all">Try again</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
