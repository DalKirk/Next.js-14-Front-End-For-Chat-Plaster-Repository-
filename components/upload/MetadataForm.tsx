'use client';

import { useState, useRef, type ChangeEvent } from 'react';
import { validateThumbnail } from '@/lib/upload-utils';

interface MetadataFormProps {
  title: string;
  description: string;
  thumbnail: File | null;
  onTitleChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onThumbnailChange: (v: File | null) => void;
  disabled?: boolean;
}

export function MetadataForm({
  title, description, thumbnail,
  onTitleChange, onDescriptionChange, onThumbnailChange,
  disabled = false,
}: MetadataFormProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [thumbError, setThumbError] = useState<string | null>(null);
  const thumbRef = useRef<HTMLInputElement>(null);

  const handleThumb = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const v = validateThumbnail(file);
    if (!v.valid) { setThumbError(v.error ?? 'Invalid image'); return; }
    setThumbError(null);
    onThumbnailChange(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const removeThumbnail = () => {
    onThumbnailChange(null);
    setPreview(null);
    setThumbError(null);
    if (thumbRef.current) thumbRef.current.value = '';
  };

  const inputCls = `
    w-full px-4 py-3 rounded-xl
    bg-zinc-900/80 border border-zinc-800
    text-white placeholder-zinc-500
    focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20
    disabled:opacity-50 disabled:cursor-not-allowed
    transition-all
  `;

  return (
    <div className="space-y-5">
      {/* Title */}
      <div>
        <label htmlFor="game-title" className="block text-sm font-semibold text-white mb-2">
          Game Title <span className="text-emerald-400">*</span>
        </label>
        <input
          id="game-title"
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          disabled={disabled}
          placeholder="e.g. Space Dash"
          maxLength={100}
          className={inputCls}
        />
        <div className="mt-1 flex justify-between text-xs text-zinc-500">
          <span>How players will see your game</span>
          <span className="font-mono">{title.length}/100</span>
        </div>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="game-desc" className="block text-sm font-semibold text-white mb-2">
          Description <span className="text-zinc-500 text-xs font-normal">(optional)</span>
        </label>
        <textarea
          id="game-desc"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          disabled={disabled}
          placeholder="What's your game about? Controls? Tips?"
          maxLength={2000}
          rows={4}
          className={inputCls + ' resize-none'}
        />
        <div className="mt-1 flex justify-end text-xs text-zinc-500">
          <span className="font-mono">{description.length}/2000</span>
        </div>
      </div>

      {/* Thumbnail */}
      <div>
        <label className="block text-sm font-semibold text-white mb-2">
          Thumbnail <span className="text-zinc-500 text-xs font-normal">(optional · JPG/PNG/WebP)</span>
        </label>

        {!thumbnail ? (
          <button
            type="button"
            onClick={() => thumbRef.current?.click()}
            disabled={disabled}
            className="
              w-full px-4 py-8 rounded-xl
              bg-zinc-900/50 border-2 border-dashed border-zinc-800
              text-zinc-400 hover:text-white hover:border-zinc-700 hover:bg-zinc-900
              focus:outline-none focus:border-emerald-500
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all flex flex-col items-center justify-center gap-2 group
            "
          >
            <svg className="w-8 h-8 text-zinc-600 group-hover:text-emerald-400 transition-colors" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
            <span className="text-sm font-medium">Add a thumbnail image</span>
            <span className="text-xs text-zinc-600">Recommended: 1280×720 · under 5 MB</span>
          </button>
        ) : (
          <div className="rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800">
            {preview && (
              <div className="aspect-video bg-zinc-950">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Thumbnail preview" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-white text-sm font-medium truncate">{thumbnail.name}</p>
                <p className="text-zinc-500 text-xs">{(thumbnail.size / 1024).toFixed(0)} KB</p>
              </div>
              <button
                type="button"
                onClick={removeThumbnail}
                disabled={disabled}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-red-500/20 hover:text-red-400 text-zinc-400 text-xs font-medium disabled:opacity-50 transition-all"
              >
                Remove
              </button>
            </div>
          </div>
        )}

        <input ref={thumbRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleThumb} disabled={disabled} className="hidden" />
        {thumbError && <p className="mt-2 text-sm text-red-400">{thumbError}</p>}
      </div>
    </div>
  );
}
