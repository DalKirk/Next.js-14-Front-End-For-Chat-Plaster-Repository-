'use client';

import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from 'react';
import { validateGameFile, getEngineLabel } from '@/lib/upload-utils';
import { EngineIcon } from '@/components/upload/EngineIcon';

interface DropZoneProps {
  onFileSelected: (file: File) => void;
  maxSizeMB?: number;
  disabled?: boolean;
}

export function DropZone({ onFileSelected, maxSizeMB = 100, disabled = false }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    const v = validateGameFile(file, maxSizeMB);
    if (!v.valid) { setError(v.error ?? 'Invalid file'); return; }
    setError(null);
    onFileSelected(file);
  }, [maxSizeMB, onFileSelected]);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) { setError('No files dropped'); return; }
    if (files.length > 1) { setError('Please drop only one zip file at a time'); return; }
    handleFile(files[0]);
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleClick = () => { if (!disabled) inputRef.current?.click(); };

  return (
    <div className="w-full">
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Upload game file"
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}
        className={[
          'relative overflow-hidden rounded-2xl border-2 border-dashed cursor-pointer',
          'transition-all duration-300 ease-out',
          disabled ? 'cursor-not-allowed opacity-50' : '',
          isDragging
            ? 'border-emerald-400 bg-emerald-500/10 scale-[1.01]'
            : 'border-zinc-700 bg-zinc-900/50 hover:border-zinc-500 hover:bg-zinc-900',
        ].join(' ')}
      >
        {/* Grid texture */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)',
          backgroundSize: '32px 32px',
        }} />

        {/* Drag glow */}
        {isDragging && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-transparent to-cyan-500/20 animate-pulse" />
          </div>
        )}

        <div className="relative px-8 py-16 sm:py-20 flex flex-col items-center justify-center text-center">
          {/* Upload icon */}
          <div className={[
            'mb-6 w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-500',
            isDragging ? 'bg-emerald-500 scale-110 rotate-3' : 'bg-zinc-800',
          ].join(' ')}>
            <svg className={`w-10 h-10 transition-transform duration-300 ${isDragging ? 'scale-110' : ''}`} fill="none" stroke={isDragging ? 'white' : 'currentColor'} strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 7.5h-.75A2.25 2.25 0 0 0 4.5 9.75v7.5a2.25 2.25 0 0 0 2.25 2.25h7.5a2.25 2.25 0 0 0 2.25-2.25v-7.5a2.25 2.25 0 0 0-2.25-2.25h-.75m-6 3.75 3-3m0 0 3 3m-3-3v11.25m6-2.25h.75a2.25 2.25 0 0 0 2.25-2.25v-7.5a2.25 2.25 0 0 0-2.25-2.25h-.75" />
            </svg>
          </div>

          <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight">
            {isDragging ? 'Drop it!' : 'Upload your game'}
          </h3>
          <p className="text-zinc-400 text-sm sm:text-base mb-6 max-w-md">
            Drag and drop a <span className="text-emerald-400 font-mono">.zip</span> file, or click to browse
          </p>

          {/* Engine badges */}
          <div className="flex flex-wrap gap-2 justify-center mb-6 max-w-lg">
            {(['unity', 'godot', 'html5', 'phaser', 'gamemaker', 'construct'] as const).map((engine) => (
              <span key={engine} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800/80 text-zinc-300 text-xs font-medium border border-zinc-700">
                <EngineIcon engine={engine} size={13} />
                {getEngineLabel(engine)}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <span>Max {maxSizeMB} MB</span>
            <span className="text-zinc-700">·</span>
            <span>ZIP format</span>
            <span className="text-zinc-700">·</span>
            <span>Must contain index.html</span>
          </div>
        </div>

        <input ref={inputRef} type="file" accept=".zip,application/zip" onChange={handleFileInput} disabled={disabled} className="hidden" />
      </div>

      {error && (
        <div className="mt-3 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-2">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
