'use client';

import type { UploadProgress as Progress, UploadPhase } from '@/types/upload';

interface UploadProgressProps {
  phase: UploadPhase;
  progress: Progress | null;
  fileName: string;
}

function formatMB(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1.5 mb-1">
        <div className="w-3.5 h-3.5 text-zinc-500">{icon}</div>
        <p className="text-zinc-500 text-xs uppercase tracking-wider font-medium">{label}</p>
      </div>
      <p className="text-white font-mono text-sm tabular-nums">{value}</p>
    </div>
  );
}

export function UploadProgress({ phase, progress, fileName }: UploadProgressProps) {
  const isProcessing = phase === 'processing';
  const percent = progress?.percent ?? 0;
  const display = isProcessing ? 100 : percent;

  return (
    <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-5 h-5">
            <div className="absolute inset-0 rounded-full border-2 border-zinc-700" />
            <div className="absolute inset-0 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">
              {isProcessing ? 'Processing your game…' : 'Uploading'}
            </p>
            <p className="text-zinc-500 text-xs truncate max-w-xs">{fileName}</p>
          </div>
        </div>
        <p className="text-2xl font-bold text-white tabular-nums">
          {display.toFixed(0)}<span className="text-zinc-500 text-lg">%</span>
        </p>
      </div>

      {/* Progress bar */}
      <div className="px-5 pt-4">
        <div className="h-2.5 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className={[
              'h-full rounded-full transition-all duration-300 ease-out',
              isProcessing
                ? 'bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 animate-pulse'
                : 'bg-gradient-to-r from-emerald-500 to-cyan-500',
            ].join(' ')}
            style={{ width: `${display}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="px-5 py-4 grid grid-cols-3 gap-4">
        <Stat label="Speed" value={isProcessing ? '—' : (progress?.speedDisplay ?? '—')}
          icon={<svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
        />
        <Stat label="Uploaded" value={progress ? `${formatMB(progress.loaded)} / ${formatMB(progress.total)}` : '—'}
          icon={<svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>}
        />
        <Stat label="Time left" value={isProcessing ? '—' : (progress?.etaDisplay ?? '—')}
          icon={<svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
      </div>

      {isProcessing && (
        <div className="px-5 pb-4">
          <div className="px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm flex items-start gap-2">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V10a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>Extracting your game files and uploading to CDN. This usually takes 10–30 seconds.</span>
          </div>
        </div>
      )}
    </div>
  );
}
