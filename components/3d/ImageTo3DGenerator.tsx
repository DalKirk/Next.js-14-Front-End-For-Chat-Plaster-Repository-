'use client';

import { useState, useRef, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import type { GPUGenerationJob } from '@/lib/api';
import Model3DViewer from './Model3DViewer';

interface ImageTo3DGeneratorProps {
  userId?: string;
  roomId?: string;
  onModelGenerated?: (job: GPUGenerationJob) => void;
}

export default function ImageTo3DGenerator({
  userId,
  roomId,
  onModelGenerated,
}: ImageTo3DGeneratorProps) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>('');
  const [currentJob, setCurrentJob] = useState<GPUGenerationJob | null>(null);
  const [error, setError] = useState<string>('');
  const [dragOver, setDragOver] = useState(false);
  const [scanLine, setScanLine] = useState(0);

  const textureResolution = 2048;
  const mcResolution = 384;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const scanRef = useRef<NodeJS.Timeout | null>(null);

  // Animated scan line during generation
  useEffect(() => {
    if (isGenerating) {
      scanRef.current = setInterval(() => {
        setScanLine(p => (p + 1) % 100);
      }, 30);
    } else {
      if (scanRef.current) clearInterval(scanRef.current);
      setScanLine(0);
    }
    return () => { if (scanRef.current) clearInterval(scanRef.current); };
  }, [isGenerating]);

  const handleImageSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, etc.)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be smaller than 10MB');
      return;
    }
    setSelectedImage(file);
    setError('');
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageSelect(file);
  };

  const pollJobStatus = async (jobId: string) => {
    try {
      const job = await apiClient.checkGPUJobStatus(jobId);
      setCurrentJob(job);
      if (job.status === 'processing') {
        const elapsed = Date.now() - new Date(job.created_at).getTime();
        const processingProgress = Math.min(90, 20 + (elapsed / 45000) * 70);
        setProgress(Math.round(processingProgress));
        setStatus('Reconstructing geometry');
      } else if (job.status === 'complete') {
        setProgress(100);
        setStatus('Asset ready');
        setIsGenerating(false);
        if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; }
        if (onModelGenerated) onModelGenerated(job);
      } else if (job.status === 'failed') {
        setError(job.error || 'Generation failed');
        setIsGenerating(false);
        setStatus('');
        if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; }
      }
    } catch (err) {
      console.error('Error polling status:', err);
      setError('Failed to check generation status');
      setIsGenerating(false);
      if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; }
    }
  };

  const handleGenerate = async () => {
    if (!selectedImage) return;
    setIsGenerating(true);
    setError('');
    setProgress(0);
    setStatus('Uploading image');
    setCurrentJob(null);
    try {
      const job = await apiClient.generateModelFromImage(
        { image: selectedImage, texture_resolution: textureResolution, mc_resolution: mcResolution, user_id: userId, room_id: roomId },
        (percent) => setProgress(percent)
      );
      setCurrentJob(job);
      setStatus('Queued for processing');
      setProgress(20);
      pollIntervalRef.current = setInterval(() => pollJobStatus(job.job_id), 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start generation';
      setError(msg);
      setIsGenerating(false);
      setStatus('');
    }
  };

  const handleDownload = async () => {
    if (!currentJob?.job_id) return;
    try {
      setStatus('Packaging files');
      const blob = await apiClient.downloadGPUModel(currentJob.job_id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trellis2_${currentJob.job_id}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setStatus('Download complete');
      setTimeout(() => setStatus(''), 3000);
    } catch {
      setError('Failed to download model');
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setImagePreview('');
    setCurrentJob(null);
    setProgress(0);
    setStatus('');
    setError('');
    setIsGenerating(false);
    if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isDone = currentJob?.status === 'complete';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');

        .t3d-root {
          font-family: 'Syne', sans-serif;
          position: relative;
          width: 100%;
          color: #e5e7eb;
          padding: 0 0 60px;
          box-sizing: border-box;
          overflow: hidden;
        }

        /* Background grid */
        .t3d-grid {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
          background-size: 60px 60px;
          mask-image: radial-gradient(ellipse 100% 50% at 50% 0%, black 20%, transparent 100%);
        }

        /* Ambient glow */
        .t3d-root::before {
          content: '';
          position: absolute;
          top: -200px;
          left: 50%;
          transform: translateX(-50%);
          width: 600px;
          height: 400px;
          background: radial-gradient(ellipse, rgba(255,255,255,0.07) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        .t3d-header,
        .t3d-specs,
        .t3d-layout {
          position: relative;
          z-index: 1;
        }

        /* Header */
        .t3d-header {
          position: relative;
          text-align: center;
          padding: 12px 0 28px;
          overflow: hidden;
        }

        .t3d-eyebrow {
          font-family: 'JetBrains Mono', monospace;
          font-size: 15px;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.62);
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .t3d-eyebrow::before,
        .t3d-eyebrow::after {
          content: '';
          display: block;
          width: 32px;
          height: 1px;
          background: rgba(255,255,255,0.24);
        }

        .t3d-title {
          font-size: clamp(14px, 2.5vw, 24px);
          font-weight: 800;
          line-height: 0.95;
          letter-spacing: -0.03em;
          margin-bottom: 12px;
          background: linear-gradient(135deg, #ffffff 0%, #d1d5db 58%, #8f949b 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .t3d-subtitle {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: rgba(255,255,255,0.5);
          letter-spacing: 0.05em;
        }

        /* Specs strip */
        .t3d-specs {
          display: flex;
          justify-content: center;
          gap: 0;
          margin: 0 0 32px;
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 12px;
          overflow: hidden;
        }

        .t3d-spec {
          flex: 1;
          padding: 14px 16px;
          text-align: center;
          border-right: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.025);
          transition: background 0.2s;
        }

        .t3d-spec:last-child { border-right: none; }
        .t3d-spec:hover { background: rgba(255,255,255,0.05); }

        .t3d-spec-val {
          font-size: 18px;
          font-weight: 700;
          color: #f3f4f6;
          line-height: 1;
          margin-bottom: 4px;
        }

        .t3d-spec-key {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.68);
        }

        /* Main layout */
        .t3d-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          align-items: start;
        }

        @media (max-width: 768px) {
          .t3d-layout { grid-template-columns: 1fr; }
        }

        /* Panel base */
        .t3d-panel {
          position: relative;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.10);
          background: #0b0b0d;
        }

        .t3d-panel-header {
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(255,255,255,0.025);
        }

        .t3d-panel-title {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.86);
        }

        .t3d-panel-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(255,255,255,0.24);
        }

        .t3d-panel-dot.active {
          background: #ff4fd8;
          box-shadow: 0 0 12px rgba(255,79,216,1), 0 0 28px rgba(157,78,255,0.95), 0 0 40px rgba(255,79,216,0.7);
          animation: dotPulse 1.5s ease-in-out infinite;
        }

        @keyframes dotPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.8); }
        }

        /* Drop zone */
        .t3d-dropzone {
          padding: 20px;
        }

        .t3d-drop-target {
          position: relative;
          border: 1.5px dashed rgba(255,255,255,0.18);
          border-radius: 12px;
          padding: 40px 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.25s;
          background: rgba(255,255,255,0.015);
          overflow: hidden;
        }

        .t3d-drop-target:hover,
        .t3d-drop-target.drag-over {
          border-color: rgba(255,255,255,0.42);
          background: rgba(255,255,255,0.05);
        }

        .t3d-drop-target:hover .t3d-upload-icon,
        .t3d-drop-target.drag-over .t3d-upload-icon {
          transform: translateY(-4px);
          color: rgba(255,255,255,0.95);
        }

        .t3d-drop-target::before,
        .t3d-drop-target::after {
          content: '';
          position: absolute;
          width: 16px;
          height: 16px;
          border-color: rgba(255,255,255,0.22);
          border-style: solid;
          transition: border-color 0.2s;
        }
        .t3d-drop-target::before { top: 8px; left: 8px; border-width: 1px 0 0 1px; }
        .t3d-drop-target::after  { bottom: 8px; right: 8px; border-width: 0 1px 1px 0; }

        .t3d-drop-target:hover::before,
        .t3d-drop-target:hover::after {
          border-color: rgba(255,255,255,0.45);
        }

        .t3d-upload-icon {
          width: 40px;
          height: 40px;
          margin: 0 auto 12px;
          color: rgba(255,255,255,0.76);
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .t3d-upload-label {
          font-size: 14px;
          font-weight: 600;
          color: rgba(255,255,255,0.82);
          margin-bottom: 4px;
        }

        .t3d-upload-sub {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: rgba(255,255,255,0.58);
          letter-spacing: 0.08em;
        }

        /* Image preview */
        .t3d-preview-wrap {
          position: relative;
          border-radius: 12px;
          overflow: hidden;
          background: #000;
        }

        .t3d-preview-img {
          width: 100%;
          max-height: 320px;
          object-fit: contain;
          display: block;
        }

        .t3d-scanline {
          position: absolute;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(255,79,216,0.2), rgba(255,79,216,0.95), rgba(157,78,255,0.9), transparent);
          box-shadow: 0 0 12px rgba(255,79,216,0.9), 0 0 20px rgba(157,78,255,0.65);
          pointer-events: none;
          transition: top 0.03s linear;
        }

        .t3d-preview-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.8) 100%);
          pointer-events: none;
        }

        .t3d-clear-btn {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 28px;
          height: 28px;
          border-radius: 8px;
          background: rgba(0,0,0,0.7);
          border: 1px solid rgba(255,255,255,0.18);
          color: rgba(255,255,255,0.82);
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          backdrop-filter: blur(8px);
          transition: all 0.15s;
        }

        .t3d-clear-btn:hover { background: rgba(255,255,255,0.16); border-color: rgba(255,255,255,0.34); color: #fff; }

        /* Config row */
        .t3d-config {
          display: flex;
          gap: 8px;
          padding: 12px 20px;
          border-top: 1px solid rgba(255,255,255,0.08);
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }

        .t3d-config-tag {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 4px 10px;
          border-radius: 6px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.18);
          color: rgba(255,255,255,0.82);
        }

        /* Generate button */
        .t3d-generate-btn {
          display: block;
          width: calc(100% - 40px);
          margin: 16px 20px 20px;
          padding: 14px;
          border-radius: 12px;
          border: none;
          font-family: 'Syne', sans-serif;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: all 0.2s;
          background: linear-gradient(135deg, #ffffff, #c7ccd1);
          color: #050505;
          box-shadow: 0 4px 24px rgba(255,255,255,0.18), 0 0 0 1px rgba(255,255,255,0.14);
        }

        .t3d-generate-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%);
          opacity: 0;
          transition: opacity 0.2s;
        }

        .t3d-generate-btn:hover::before { opacity: 1; }
        .t3d-generate-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 32px rgba(255,255,255,0.22); }
        .t3d-generate-btn:active { transform: translateY(0); }
        .t3d-generate-btn:disabled { opacity: 0.3; cursor: not-allowed; transform: none; box-shadow: none; }

        .t3d-generate-btn .btn-shimmer {
          position: absolute;
          top: 0;
          left: -100%;
          width: 60%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          animation: shimmer 2s ease-in-out infinite;
        }

        @keyframes shimmer {
          0% { left: -60%; }
          100% { left: 120%; }
        }

        /* Progress */
        .t3d-progress-wrap {
          padding: 24px 20px;
        }

        .t3d-progress-label {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 10px;
        }

        .t3d-progress-status {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: rgba(255,255,255,0.82);
          letter-spacing: 0.06em;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .t3d-progress-status::before {
          content: '';
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #ff4fd8;
          box-shadow: 0 0 10px rgba(255,79,216,1), 0 0 24px rgba(157,78,255,0.9), 0 0 32px rgba(255,79,216,0.65);
          animation: dotPulse 1s ease-in-out infinite;
          flex-shrink: 0;
        }

        .t3d-progress-pct {
          font-family: 'JetBrains Mono', monospace;
          font-size: 20px;
          font-weight: 500;
          color: #ffffff;
        }

        .t3d-progress-track {
          width: 100%;
          height: 3px;
          background: rgba(255,255,255,0.12);
          border-radius: 2px;
          overflow: hidden;
          position: relative;
          margin-bottom: 24px;
        }

        .t3d-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #5b3df5, #ff4fd8, #ff9af0);
          border-radius: 2px;
          transition: width 0.5s ease-out;
          position: relative;
          box-shadow: 0 0 16px rgba(255,79,216,0.35);
        }

        .t3d-progress-fill::after {
          content: '';
          position: absolute;
          right: 0;
          top: -2px;
          width: 6px;
          height: 7px;
          background: #ff9af0;
          border-radius: 50%;
          box-shadow: 0 0 10px rgba(255,79,216,1), 0 0 20px rgba(157,78,255,0.95);
        }

        /* Stage indicators */
        .t3d-stages {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .t3d-stage {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.08em;
          color: rgba(255,255,255,0.58);
          transition: color 0.3s;
        }

        .t3d-stage.active { color: rgba(255,255,255,0.92); }
        .t3d-stage.done { color: rgba(255,255,255,0.78); }

        .t3d-stage-icon {
          width: 18px;
          height: 18px;
          border-radius: 5px;
          border: 1px solid rgba(255,255,255,0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          flex-shrink: 0;
          transition: all 0.3s;
        }

        .t3d-stage.active .t3d-stage-icon {
          border-color: rgba(255,79,216,0.85);
          background: rgba(255,79,216,0.16);
          color: #ffd3f7;
          box-shadow: 0 0 12px rgba(255,79,216,0.45), 0 0 22px rgba(157,78,255,0.28);
        }

        .t3d-stage.done .t3d-stage-icon {
          border-color: rgba(255,255,255,0.22);
          background: rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.82);
        }

        /* Empty output state */
        .t3d-empty-output {
          padding: 60px 20px;
          text-align: center;
        }

        .t3d-empty-icon {
          width: 64px;
          height: 64px;
          margin: 0 auto 16px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(255,255,255,0.03);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .t3d-empty-icon::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.10) 0%, transparent 60%);
        }

        .t3d-empty-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.58);
        }

        /* 3D viewer section */
        .t3d-viewer-wrap {
          position: relative;
          background: #000;
        }

        .t3d-viewer-controls {
          position: absolute;
          bottom: 12px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 4px;
          z-index: 10;
        }

        .t3d-viewer-hint {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          letter-spacing: 0.08em;
          padding: 4px 10px;
          border-radius: 20px;
          background: rgba(0,0,0,0.6);
          border: 1px solid rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.68);
          backdrop-filter: blur(8px);
          white-space: nowrap;
        }

        /* Result actions */
        .t3d-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          padding: 16px 20px 20px;
        }

        .t3d-action-btn {
          padding: 12px;
          border-radius: 10px;
          font-family: 'Syne', sans-serif;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.04em;
          cursor: pointer;
          transition: all 0.15s;
          text-align: center;
        }

        .t3d-action-primary {
          background: linear-gradient(135deg, #ffffff, #c7ccd1);
          border: none;
          color: #050505;
          box-shadow: 0 4px 16px rgba(255,255,255,0.18);
        }

        .t3d-action-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(255,255,255,0.22);
        }

        .t3d-action-secondary {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.14);
          color: rgba(255,255,255,0.82);
        }

        .t3d-action-secondary:hover {
          background: rgba(255,255,255,0.10);
          border-color: rgba(255,255,255,0.24);
          color: rgba(255,255,255,0.95);
        }

        /* Result meta */
        .t3d-result-meta {
          padding: 12px 20px;
          border-top: 1px solid rgba(255,255,255,0.08);
          display: flex;
          gap: 16px;
        }

        .t3d-meta-item {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.68);
        }

        .t3d-meta-item span {
          color: rgba(255,255,255,0.88);
          margin-right: 4px;
        }

        /* Downloads info */
        .t3d-downloads {
          margin: 0 20px 20px;
          padding: 14px;
          border-radius: 10px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
        }

        .t3d-downloads-title {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.68);
          margin-bottom: 8px;
        }

        .t3d-download-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: rgba(255,255,255,0.72);
          padding: 3px 0;
        }

        .t3d-download-item::before {
          content: '▸';
          color: rgba(255,255,255,0.42);
          font-size: 8px;
        }

        /* Error */
        .t3d-error {
          margin: 0 20px 16px;
          padding: 12px 14px;
          border-radius: 10px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.14);
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: rgba(255,255,255,0.78);
          letter-spacing: 0.02em;
        }

        /* Success badge */
        .t3d-success-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          margin: 16px 20px 0;
          border-radius: 10px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.14);
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.08em;
          color: rgba(255,255,255,0.82);
        }

        .t3d-success-badge::before {
          content: '✓';
          font-size: 12px;
          color: rgba(255,255,255,0.92);
        }

        /* Job ID chip */
        .t3d-job-chip {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          padding: 2px 8px;
          border-radius: 4px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.62);
          letter-spacing: 0.06em;
        }
      `}</style>

      <div className="t3d-root">
        <div className="t3d-grid" />

        {/* Header */}
        <div className="t3d-header">
          <div className="t3d-eyebrow">Image to 3D</div>
          <p className="t3d-subtitle">O-Voxel · Sparse 3D VAE · Flow Matching Transformer</p>
        </div>

        {/* Specs strip */}
        <div className="t3d-specs">
          {[
            { val: '~3s', key: '512³ res' },
            { val: '2048px', key: 'Texture' },
            { val: 'PBR', key: 'Material' },
            { val: 'GLB', key: 'Export' },
          ].map(s => (
            <div key={s.key} className="t3d-spec">
              <div className="t3d-spec-val">{s.val}</div>
              <div className="t3d-spec-key">{s.key}</div>
            </div>
          ))}
        </div>

        {/* Main layout */}
        <div className="t3d-layout">

          {/* Left — input */}
          <div className="t3d-panel">
            <div className="t3d-panel-header">
              <span className="t3d-panel-title">Source Image</span>
              <div className={`t3d-panel-dot ${selectedImage ? 'active' : ''}`} />
            </div>

            <div className="t3d-dropzone">
              {imagePreview ? (
                <div className="t3d-preview-wrap">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="Preview" className="t3d-preview-img" />
                  {isGenerating && (
                    <div className="t3d-scanline" style={{ top: `${scanLine}%` }} />
                  )}
                  <div className="t3d-preview-overlay" />
                  <button className="t3d-clear-btn" onClick={handleReset}>✕</button>
                </div>
              ) : (
                <div
                  className={`t3d-drop-target ${dragOver ? 'drag-over' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                >
                  <svg className="t3d-upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <p className="t3d-upload-label">Drop image or click to upload</p>
                  <p className="t3d-upload-sub">PNG · JPG · WEBP · max 10MB</p>
                </div>
              )}
            </div>

            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

            {selectedImage && (
              <>
                <div className="t3d-config">
                  <div className="t3d-config-tag">Texture {textureResolution}px</div>
                  <div className="t3d-config-tag">Mesh {mcResolution}</div>
                  <div className="t3d-config-tag">GLB Export</div>
                </div>

                {error && <div className="t3d-error">{error}</div>}

                <button
                  className="t3d-generate-btn"
                  onClick={handleGenerate}
                  disabled={isGenerating || isDone}
                >
                  <span className="btn-shimmer" />
                  {isGenerating ? 'Generating...' : isDone ? 'Generated ✓' : 'Generate 3D Asset →'}
                </button>
              </>
            )}

            {!selectedImage && error && <div className="t3d-error">{error}</div>}
          </div>

          {/* Right — output */}
          <div className="t3d-panel t3d-output-panel">
            <div className="t3d-panel-header">
              <span className="t3d-panel-title">3D Output</span>
              <div className={`t3d-panel-dot ${isGenerating ? 'active' : isDone ? 'active' : ''}`} />
            </div>

            {/* Empty state */}
            {!isGenerating && !isDone && (
              <div className="t3d-empty-output">
                <div className="t3d-empty-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.58)" strokeWidth={1}>
                    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
                    <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
                    <line x1="12" y1="22.08" x2="12" y2="12"/>
                  </svg>
                </div>
                <p className="t3d-empty-label">Awaiting input</p>
              </div>
            )}

            {/* Generating state */}
            {isGenerating && currentJob && (
              <div className="t3d-progress-wrap">
                <div className="t3d-progress-label">
                  <span className="t3d-progress-status">{status}</span>
                  <span className="t3d-progress-pct">{progress}%</span>
                </div>
                <div className="t3d-progress-track">
                  <div className="t3d-progress-fill" style={{ width: `${progress}%` }} />
                </div>

                <div className="t3d-stages">
                  {[
                    { label: 'Upload & queue', threshold: 0 },
                    { label: 'Shape reconstruction', threshold: 30 },
                    { label: 'Texture synthesis', threshold: 65 },
                    { label: 'PBR material pass', threshold: 85 },
                    { label: 'Mesh export', threshold: 95 },
                  ].map((stage, i) => (
                    <div
                      key={stage.label}
                      className={`t3d-stage ${
                        progress >= stage.threshold + 15 ? 'done' :
                        progress >= stage.threshold ? 'active' : ''
                      }`}
                    >
                      <div className="t3d-stage-icon">
                        {progress >= stage.threshold + 15 ? '✓' : i + 1}
                      </div>
                      {stage.label}
                    </div>
                  ))}
                </div>

                {currentJob.job_id && (
                  <div style={{ marginTop: 16 }}>
                    <span className="t3d-job-chip">JOB {currentJob.job_id.slice(0, 12)}…</span>
                  </div>
                )}
              </div>
            )}

            {/* Complete state */}
            {isDone && currentJob?.glb_url && (() => {
              const fullUrl = currentJob.glb_url.startsWith('http')
                ? currentJob.glb_url
                : `https://api.starcyeed.com${currentJob.glb_url}`;
              return (
                <>
                  <div className="t3d-success-badge">
                    Asset generated successfully
                    {currentJob.generation_time && (
                      <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.68)' }}>
                        {currentJob.generation_time.toFixed(1)}s
                      </span>
                    )}
                  </div>

                  <div className="t3d-viewer-wrap">
                    <Model3DViewer
                      modelUrl={fullUrl}
                      className="w-full h-[340px]"
                      autoRotate={true}
                      showControls={true}
                    />
                    <div className="t3d-viewer-controls">
                      <span className="t3d-viewer-hint">Drag to rotate · Scroll to zoom · Right-click to pan</span>
                    </div>
                  </div>

                  <div className="t3d-result-meta">
                    <div className="t3d-meta-item"><span>RES</span>2048 × 2048</div>
                    <div className="t3d-meta-item"><span>FMT</span>GLB + OBJ + MTL</div>
                    <div className="t3d-meta-item"><span>MAT</span>PBR</div>
                  </div>

                  <div className="t3d-actions">
                    <button className="t3d-action-btn t3d-action-primary" onClick={handleDownload}>
                      Download .zip
                    </button>
                    <button className="t3d-action-btn t3d-action-secondary" onClick={handleReset}>
                      New Asset
                    </button>
                  </div>

                  <div className="t3d-downloads">
                    <div className="t3d-downloads-title">Archive contents</div>
                    <div className="t3d-download-item">model.glb — Binary 3D asset</div>
                    <div className="t3d-download-item">model.obj — Wavefront mesh</div>
                    <div className="t3d-download-item">texture.png — {textureResolution}×{textureResolution} PBR map</div>
                    <div className="t3d-download-item">model.mtl — Material definition</div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </>
  );
}
