'use client';

import { useState } from 'react';
import { getEngineLabel } from '@/lib/upload-utils';
import { EngineIcon } from '@/components/upload/EngineIcon';
import type { UploadResult } from '@/types/upload';

interface UploadSuccessProps {
  result: UploadResult;
  onUploadAnother: () => void;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">{label}</p>
      <p className="text-white font-medium">{value}</p>
    </div>
  );
}

export function UploadSuccess({ result, onUploadAnother }: UploadSuccessProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(result.play_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback: already shown in input */ }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'Check out my game!', url: result.play_url }); }
      catch { /* cancelled */ }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 overflow-hidden">
      {/* Success header */}
      <div className="relative px-6 py-8 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/10 border-b border-zinc-800">
        <div className="flex flex-col items-center text-center">
          <div className="relative w-20 h-20 mb-4">
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
            <div className="relative w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5"
                  style={{ strokeDasharray: 30, strokeDashoffset: 30, animation: 'gu-draw 0.5s ease-out forwards' }} />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">Game uploaded!</h2>
          <p className="text-zinc-400 text-sm">Your game is live and ready to play</p>
        </div>
      </div>

      {/* Details */}
      <div className="px-6 py-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <DetailRow label="Engine" value={
            <span className="inline-flex items-center gap-1.5">
              <EngineIcon engine={result.engine} size={15} />
              {getEngineLabel(result.engine)}
            </span>
          } />
          <DetailRow label="Size" value={`${result.file_size_mb} MB`} />
        </div>

        {/* Play URL */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Play URL</label>
          <div className="flex gap-2">
            <input
              readOnly
              value={result.play_url}
              onFocus={(e) => e.target.select()}
              className="flex-1 px-3 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 text-sm font-mono focus:outline-none focus:border-zinc-700 truncate"
            />
            <button
              onClick={handleCopyLink}
              className={[
                'px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200',
                copied ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white',
              ].join(' ')}
            >
              {copied ? (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                  Copied
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5A3.375 3.375 0 0 0 6.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0 0 15 2.25h-1.5a2.251 2.251 0 0 0-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 0 0-9-9Z" /></svg>
                  Copy
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 py-5 bg-zinc-950/50 border-t border-zinc-800 flex flex-col sm:flex-row gap-3">
        <a
          href={result.play_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white font-semibold text-sm text-center transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:scale-[1.02]"
        >
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            Play Now
          </span>
        </a>

        <button
          onClick={handleShare}
          className="px-5 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-sm transition-all"
        >
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" /></svg>
            Share
          </span>
        </button>

        <button
          onClick={onUploadAnother}
          className="px-5 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white font-medium text-sm transition-all"
        >
          Upload another
        </button>
      </div>

      <style jsx>{`
        @keyframes gu-draw { to { stroke-dashoffset: 0; } }
      `}</style>
    </div>
  );
}
