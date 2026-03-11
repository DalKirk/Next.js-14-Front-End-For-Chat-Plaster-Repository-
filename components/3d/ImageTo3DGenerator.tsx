'use client';

import { useState, useRef } from 'react';
import { Settings } from 'lucide-react';
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
  // High-quality settings optimized for RTX 3050 Ti (4GB VRAM)
  // Safe and reliable - will scale to RTX 5080 (16GB) in future
  const textureResolution = 2048;
  const mcResolution = 384;
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Poll job status
  const pollJobStatus = async (jobId: string) => {
    try {
      const job = await apiClient.checkGPUJobStatus(jobId);
      setCurrentJob(job);
      
      if (job.status === 'processing') {
        const elapsed = Date.now() - new Date(job.created_at).getTime();
        const estimatedTotal = 45000;
        const processingProgress = Math.min(90, 20 + (elapsed / estimatedTotal) * 70);
        setProgress(Math.round(processingProgress));
        setStatus('Generating');
      } else if (job.status === 'complete') {
        setProgress(100);
        setStatus('Model generated successfully!');
        setIsGenerating(false);
        
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        
        if (onModelGenerated) {
          onModelGenerated(job);
        }
      } else if (job.status === 'failed') {
        setError(job.error || 'Generation failed');
        setIsGenerating(false);
        setStatus('');
        
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      }
    } catch (err) {
      console.error('Error polling status:', err);
      setError('Failed to check generation status');
      setIsGenerating(false);
      
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }
  };

  // Start generation
  const handleGenerate = async () => {
    if (!selectedImage) return;

    setIsGenerating(true);
    setError('');
    setProgress(0);
    setStatus('Uploading image...');
    setCurrentJob(null);

    try {
      const job = await apiClient.generateModelFromImage(
        {
          image: selectedImage,
          texture_resolution: textureResolution,
          mc_resolution: mcResolution,
          user_id: userId,
          room_id: roomId,
        },
        (percent) => {
          setProgress(percent);
        }
      );

      setCurrentJob(job);
      setStatus('Queued for processing...');
      setProgress(20);

      pollIntervalRef.current = setInterval(() => {
        pollJobStatus(job.job_id);
      }, 2000);

    } catch (err: any) {
      console.error('Generation error:', err);
      setError(err.message || 'Failed to start generation');
      setIsGenerating(false);
      setStatus('');
    }
  };

  // Handle download
  const handleDownload = async () => {
    if (!currentJob || !currentJob.job_id) return;

    try {
      setStatus('Downloading model...');
      const blob = await apiClient.downloadGPUModel(currentJob.job_id);
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `3d_model_${currentJob.job_id}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setStatus('Download complete!');
      setTimeout(() => setStatus(''), 3000);
    } catch (err: any) {
      console.error('Download error:', err);
      setError('Failed to download model');
    }
  };

  // Reset
  const handleReset = () => {
    setSelectedImage(null);
    setImagePreview('');
    setCurrentJob(null);
    setProgress(0);
    setStatus('');
    setError('');
    setIsGenerating(false);
    
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      {/* Upload Section */}
      {!currentJob && (
        <div className="rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-5" style={{ background: 'rgba(249,115,22,0.03)', border: '1px solid rgba(249,115,22,0.08)' }}>
          <div className="space-y-4">
            {imagePreview ? (
              <div className="relative rounded-xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)' }}>
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full max-h-96 object-contain"
                />
                <button
                  onClick={handleReset}
                  className="absolute top-3 right-3 w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white transition-colors text-sm"
                  style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl p-8 sm:p-16 text-center cursor-pointer transition-all duration-300 hover:border-orange-500/40"
                style={{ border: '1.5px dashed rgba(249,115,22,0.15)', background: 'rgba(249,115,22,0.02)' }}
              >
                <div className="space-y-3">
                  <div className="w-10 h-10 mx-auto rounded-full flex items-center justify-center" style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.12)' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4" style={{ color: 'rgba(249,115,22,0.4)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                    </svg>
                  </div>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>Click to upload an image</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.15)' }}>PNG, JPG up to 10MB</p>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
          </div>

          {selectedImage && (
            <div className="space-y-4 pt-4" style={{ borderTop: '1px solid rgba(249,115,22,0.06)' }}>
              <div className="rounded-xl p-3.5 text-sm" style={{ background: 'rgba(249,115,22,0.04)', border: '1px solid rgba(249,115,22,0.1)', color: 'rgba(249,115,22,0.6)' }}>
                Texture 2048px &middot; Mesh 384 resolution
              </div>

              <button
                onClick={handleGenerate}
                disabled={!selectedImage || isGenerating}
                className="w-full py-3 px-6 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
                style={{ background: '#f97316', color: '#000', boxShadow: '0 0 20px rgba(249,115,22,0.25)' }}
              >
                {isGenerating ? (<span className="flex items-center justify-center gap-2"><Settings className="w-4 h-4 animate-spin" style={{ color: '#fff' }} />Generating</span>) : 'Generate 3D Model'}
              </button>
            </div>
          )}

          {error && (
            <div className="rounded-xl p-4 text-sm" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', color: 'rgba(248,113,113,0.8)' }}>
              {error}
            </div>
          )}
        </div>
      )}

      {/* Progress Section */}
      {isGenerating && currentJob && (
        <div className="rounded-2xl p-4 sm:p-6 space-y-3 sm:space-y-4" style={{ background: 'rgba(249,115,22,0.03)', border: '1px solid rgba(249,115,22,0.08)' }}>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-sm flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.5)' }}><Settings className="w-3.5 h-3.5 animate-spin" style={{ color: '#fff' }} />{status}</p>
              <p className="text-sm font-mono" style={{ color: '#f97316' }}>{progress}%</p>
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(249,115,22,0.08)' }}>
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #f97316, #fb923c)' }}
              />
            </div>
          </div>
          <div className="text-xs space-y-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
            <p>Job: {currentJob.job_id}</p>
            {currentJob.estimated_time && <p>Est. {currentJob.estimated_time}s</p>}
          </div>
        </div>
      )}

      {/* Result Section */}
      {currentJob?.status === 'complete' && currentJob.glb_url && (
        <div className="space-y-5">
          <div className="rounded-2xl p-4" style={{ background: 'rgba(249,115,22,0.04)', border: '1px solid rgba(249,115,22,0.12)' }}>
            <p className="text-sm font-medium" style={{ color: '#f97316' }}>Model generated successfully</p>
            {currentJob.generation_time && (
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
                {currentJob.generation_time.toFixed(1)}s
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
            <button
              onClick={handleDownload}
              className="flex-1 py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
              style={{ background: '#f97316', color: '#000', boxShadow: '0 0 20px rgba(249,115,22,0.25)' }}
            >
              Download Model (.zip)
            </button>
            <button
              onClick={handleReset}
              className="flex-1 py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl text-sm font-medium transition-all"
              style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.12)', color: 'rgba(249,115,22,0.7)' }}
            >
              Generate Another
            </button>
          </div>

          {/* 3D Preview */}
          <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(249,115,22,0.06)' }}>
            <div className="px-3.5 sm:px-5 py-3 sm:py-3.5 flex flex-col sm:flex-row sm:justify-between gap-1 sm:items-center" style={{ borderBottom: '1px solid rgba(249,115,22,0.06)' }}>
              <div>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>3D Preview</p>
                <p className="text-xs hidden sm:block" style={{ color: 'rgba(255,255,255,0.15)' }}>
                  Rotate &middot; Scroll to zoom &middot; Right-click to pan
                </p>
              </div>
              <span className="text-xs" style={{ color: 'rgba(249,115,22,0.3)' }}>
                GLB &middot; {currentJob.generation_time?.toFixed(1)}s
              </span>
            </div>
            {(() => {
              const fullUrl = currentJob.glb_url.startsWith('http')
                ? currentJob.glb_url
                : `https://api.starcyeed.com${currentJob.glb_url}`;
              return (
                <Model3DViewer
                  modelUrl={fullUrl}
                  className="w-full h-[300px] sm:h-[500px]"
                  autoRotate={true}
                  showControls={true}
                />
              );
            })()}
          </div>

          {/* Download Info */}
          <div className="rounded-xl p-3 sm:p-4 text-xs" style={{ background: 'rgba(249,115,22,0.02)', border: '1px solid rgba(249,115,22,0.06)', color: 'rgba(255,255,255,0.25)' }}>
            <p className="font-medium mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>Download includes:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>model.obj &mdash; 3D mesh</li>
              <li>texture.png &mdash; {textureResolution}x{textureResolution} texture map</li>
              <li>model.mtl &mdash; Material file</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
