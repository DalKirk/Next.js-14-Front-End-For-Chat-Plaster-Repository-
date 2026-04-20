'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Grid, Upload, Download, Image as ImageIcon, RefreshCw, X, Trash2,
} from 'lucide-react';
import { useBackgroundRemoval } from '@/hooks/useBackgroundRemoval';

interface UploadedImage {
  id: string;
  name: string;
  originalUrl: string;
  transparentUrl: string | null;
  showTransparent: boolean;
}

export default function TransparencyTool() {
  const { removeBg, isProcessing, progress, error, reset: resetBg } = useBackgroundRemoval();
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = selectedId ? images.find(i => i.id === selectedId) ?? null : null;

  /* ─── Add files ─── */
  const addFiles = useCallback((files: FileList | File[]) => {
    const newImgs: UploadedImage[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      const url = URL.createObjectURL(file);
      newImgs.push({
        id: crypto.randomUUID(),
        name: file.name,
        originalUrl: url,
        transparentUrl: null,
        showTransparent: false,
      });
    }
    if (newImgs.length) {
      setImages(prev => [...newImgs, ...prev]);
      setSelectedId(newImgs[0].id);
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addFiles(e.target.files);
    e.target.value = '';
  }, [addFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  /* ─── Remove background ─── */
  const handleRemoveBg = useCallback(async () => {
    if (!selected || isProcessing) return;
    if (selected.transparentUrl) {
      setImages(prev => prev.map(i => i.id === selected.id ? { ...i, showTransparent: !i.showTransparent } : i));
      return;
    }
    const blob = await removeBg(selected.originalUrl);
    if (blob) {
      const url = URL.createObjectURL(blob);
      setImages(prev => prev.map(i => i.id === selected.id ? { ...i, transparentUrl: url, showTransparent: true } : i));
    }
  }, [selected, isProcessing, removeBg]);

  /* ─── Download ─── */
  const handleDownload = useCallback(() => {
    if (!selected) return;
    const url = selected.showTransparent && selected.transparentUrl ? selected.transparentUrl : selected.originalUrl;
    const a = document.createElement('a');
    a.href = url;
    a.download = selected.showTransparent ? `${selected.name.replace(/\.[^.]+$/, '')}_transparent.png` : selected.name;
    a.click();
  }, [selected]);

  /* ─── Delete ─── */
  const handleDelete = useCallback((id: string) => {
    const img = images.find(i => i.id === id);
    if (img) {
      URL.revokeObjectURL(img.originalUrl);
      if (img.transparentUrl) URL.revokeObjectURL(img.transparentUrl);
    }
    setImages(prev => prev.filter(i => i.id !== id));
    if (selectedId === id) setSelectedId(images.find(i => i.id !== id)?.id ?? null);
  }, [images, selectedId]);

  /* ─── Paste handler ─── */
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length) addFiles(files);
  }, [addFiles]);

  return (
    <div
      className="transparency-tool"
      onPaste={handlePaste}
      tabIndex={0}
    >
      {/* ═══ Left — Preview area ═══ */}
      <div className="transparency-preview-col">
        {/* Preview */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflow: 'hidden' }}>
          {selected ? (
            <div style={{
              position: 'relative', maxWidth: '100%', maxHeight: '100%', borderRadius: 12, overflow: 'hidden',
              background: selected.showTransparent && selected.transparentUrl
                ? 'repeating-conic-gradient(#282828 0% 25%, #1a1a1a 0% 50%)'
                : 'rgba(255,255,255,0.03)',
              backgroundSize: selected.showTransparent && selected.transparentUrl ? '16px 16px' : 'auto',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <img
                src={selected.showTransparent && selected.transparentUrl ? selected.transparentUrl : selected.originalUrl}
                alt={selected.name}
                className="transparency-preview-img"
              />
              {/* Badge */}
              <div style={{
                position: 'absolute', top: 10, left: 10, padding: '3px 10px', borderRadius: 6,
                fontSize: 10, fontWeight: 600, letterSpacing: '0.06em',
                background: selected.showTransparent ? 'rgba(168,85,247,0.25)' : 'rgba(0,0,0,0.55)',
                color: selected.showTransparent ? '#c084fc' : 'rgba(255,255,255,0.6)',
                border: `1px solid ${selected.showTransparent ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.1)'}`,
                backdropFilter: 'blur(8px)',
              }}>
                {selected.showTransparent ? 'TRANSPARENT' : 'ORIGINAL'}
              </div>
            </div>
          ) : (
            /* Drop zone */
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className="transparency-dropzone"
              style={{
                border: `2px dashed ${dragOver ? 'rgba(168,85,247,0.5)' : 'rgba(255,255,255,0.12)'}`,
                background: dragOver ? 'rgba(168,85,247,0.06)' : 'rgba(255,255,255,0.02)',
              }}
            >
              <Upload size={36} color={dragOver ? '#c084fc' : 'rgba(255,255,255,0.25)'} style={{ margin: '0 auto 16px', display: 'block' }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.8)', margin: '0 0 6px' }}>
                Drop images here or click to upload
              </p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                PNG, JPG, WebP — or paste from clipboard
              </p>
            </div>
          )}
        </div>

        {/* Thumbnail strip */}
        {images.length > 0 && (
          <div style={{
            display: 'flex', gap: 8, padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)',
            overflowX: 'auto', flexShrink: 0,
          }}>
            {images.map(img => (
              <div
                key={img.id}
                onClick={() => setSelectedId(img.id)}
                style={{
                  position: 'relative', width: 48, height: 48, borderRadius: 8, overflow: 'hidden',
                  border: img.id === selectedId ? '2px solid #a855f7' : '2px solid rgba(255,255,255,0.08)',
                  cursor: 'pointer', flexShrink: 0, transition: 'border 0.15s',
                }}
              >
                <img src={img.originalUrl} alt={img.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                {img.transparentUrl && (
                  <div style={{ position: 'absolute', bottom: 2, right: 2, width: 8, height: 8, borderRadius: '50%', background: '#a855f7', border: '1px solid #0a0a0a' }} />
                )}
              </div>
            ))}
            {/* Add more button */}
            <button
              onClick={() => inputRef.current?.click()}
              style={{
                width: 48, height: 48, borderRadius: 8, flexShrink: 0, cursor: 'pointer',
                border: '2px dashed rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.02)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)',
                transition: 'all 0.15s',
              }}
            >
              <Upload size={16} />
            </button>
          </div>
        )}
      </div>

      {/* ═══ Right — Controls sidebar ═══ */}
      <div className="transparency-controls-col">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <Grid size={18} color="#c084fc" />
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em' }}>Background Removal</span>
        </div>

        {/* Upload button */}
        <button
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '14px 0', borderRadius: 10, border: `2px dashed ${dragOver ? 'rgba(168,85,247,0.5)' : 'rgba(255,255,255,0.12)'}`,
            background: dragOver ? 'rgba(168,85,247,0.06)' : 'rgba(255,255,255,0.03)',
            color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            marginBottom: 16, transition: 'all 0.2s',
          }}
        >
          <Upload size={15} />
          Upload Image
        </button>

        <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleFileChange} style={{ display: 'none' }} />

        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '0 0 16px' }} />

        {/* Selected image info + actions */}
        {selected ? (
          <div style={{ borderRadius: 10, overflow: 'hidden', background: 'rgba(168,85,247,0.04)', border: '1px solid rgba(168,85,247,0.18)' }}>
            {/* Mini preview */}
            <div style={{
              position: 'relative', aspectRatio: '16/10', overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: selected.showTransparent && selected.transparentUrl
                ? 'repeating-conic-gradient(#282828 0% 25%, #1a1a1a 0% 50%)'
                : 'rgba(255,255,255,0.03)',
              backgroundSize: selected.showTransparent && selected.transparentUrl ? '16px 16px' : 'auto',
            }}>
              <img
                src={selected.showTransparent && selected.transparentUrl ? selected.transparentUrl : selected.originalUrl}
                alt={selected.name}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
              <div style={{
                position: 'absolute', top: 6, left: 6, padding: '2px 7px', borderRadius: 5,
                fontSize: 9, fontWeight: 600, letterSpacing: '0.06em',
                background: selected.showTransparent ? 'rgba(168,85,247,0.25)' : 'rgba(0,0,0,0.5)',
                color: selected.showTransparent ? '#c084fc' : 'rgba(255,255,255,0.6)',
                border: `1px solid ${selected.showTransparent ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.1)'}`,
              }}>
                {selected.showTransparent ? 'TRANSPARENT' : 'ORIGINAL'}
              </div>
            </div>

            {/* File name */}
            <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(168,85,247,0.10)' }}>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selected.name}
              </p>
            </div>

            {/* Progress */}
            {isProcessing && (
              <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(168,85,247,0.10)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <RefreshCw size={11} color="#c084fc" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: 'rgba(192,132,252,0.8)' }}>{progress || 'Processing...'}</span>
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 10, color: '#f87171' }}>{error}</span>
                <button onClick={resetBg} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(239,68,68,0.5)', display: 'flex', padding: 2 }}><X size={11} /></button>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ padding: '10px 12px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {!selected.transparentUrl ? (
                <button
                  onClick={handleRemoveBg}
                  disabled={isProcessing}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '9px 0', borderRadius: 8, border: 'none', fontSize: 11, fontWeight: 600,
                    letterSpacing: '0.04em', color: '#fff', cursor: isProcessing ? 'wait' : 'pointer',
                    background: isProcessing ? 'rgba(168,85,247,0.12)' : 'linear-gradient(135deg,#a855f7,#7c3aed)',
                    boxShadow: !isProcessing ? '0 0 20px rgba(168,85,247,0.2)' : 'none',
                    opacity: isProcessing ? 0.7 : 1, transition: 'all 0.3s',
                  }}
                >
                  {isProcessing
                    ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />Processing...</>
                    : <><Grid size={12} />Remove Background</>}
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setImages(prev => prev.map(i => i.id === selected.id ? { ...i, showTransparent: !i.showTransparent } : i))}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      padding: '8px 0', borderRadius: 8, fontSize: 10, fontWeight: 600, cursor: 'pointer',
                      background: selected.showTransparent ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${selected.showTransparent ? 'rgba(168,85,247,0.35)' : 'rgba(255,255,255,0.12)'}`,
                      color: selected.showTransparent ? '#c084fc' : 'rgba(255,255,255,0.65)',
                      transition: 'all 0.2s',
                    }}
                  >
                    {selected.showTransparent ? <><ImageIcon size={11} />Original</> : <><Grid size={11} />Transparent</>}
                  </button>
                  <button
                    onClick={handleDownload}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      padding: '8px 0', borderRadius: 8, fontSize: 10, fontWeight: 600, cursor: 'pointer',
                      background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.18)',
                      color: '#22d3ee', transition: 'all 0.2s',
                    }}
                  >
                    <Download size={11} />Download {selected.showTransparent ? 'PNG' : ''}
                  </button>
                </>
              )}
            </div>

            {/* Delete */}
            <div style={{ padding: '0 12px 10px' }}>
              <button
                onClick={() => handleDelete(selected.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  padding: '7px 0', borderRadius: 8, fontSize: 10, fontWeight: 600, cursor: 'pointer',
                  background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)',
                  color: 'rgba(239,68,68,0.6)', transition: 'all 0.2s',
                }}
              >
                <Trash2 size={11} />Remove
              </button>
            </div>
          </div>
        ) : (
          <div style={{ borderRadius: 10, padding: 20, background: 'rgba(168,85,247,0.04)', border: '1px dashed rgba(168,85,247,0.18)', textAlign: 'center' }}>
            <Grid size={24} color="rgba(168,85,247,0.3)" style={{ margin: '0 auto 10px' }} />
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: '0 0 6px' }}>Upload an image to get started</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>
              Drag & drop, paste, or click upload above
            </p>
          </div>
        )}

        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '18px 0' }} />

        {/* Tips */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>TIPS</div>
          {[
            'Works best with clear subject/background separation',
            'High contrast images produce cleaner results',
            'Processed images download as transparent PNG',
            'All processing happens locally in your browser',
          ].map((tip, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(168,85,247,0.4)', marginTop: 5, flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>{tip}</span>
            </div>
          ))}
        </div>

        {/* Branding */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 'auto', padding: '16px 0' }}>
          <img src="/icon.png" alt="Starcyeed" style={{ width: 24, height: 24, borderRadius: 6 }} />
          <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: '-0.02em', color: 'rgba(255,255,255,0.6)' }}>starcyeed</span>
        </div>
      </div>
    </div>
  );
}
