'use client';

import { useState, useRef } from 'react';
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
        setStatus('Generating 3D model with TripoSR...');
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
    <div className="w-full max-w-6xl mx-auto p-4 space-y-6">
      {/* Upload Section */}
      {!currentJob && (
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 space-y-4">
          <div className="space-y-4">
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full max-h-96 object-contain rounded-lg bg-gray-800"
                />
                <button
                  onClick={handleReset}
                  className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-600 text-white p-2 rounded-lg transition-colors"
                >
                  ✕ Remove
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-600 rounded-lg p-12 text-center cursor-pointer hover:border-blue-500 transition-colors"
              >
                <div className="space-y-2">
                  <div className="text-4xl">📸</div>
                  <p className="text-gray-300">Click to upload an image</p>
                  <p className="text-gray-500 text-sm">PNG, JPG up to 10MB</p>
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
            <div className="space-y-4 border-t border-gray-700 pt-4">
              <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4 text-blue-300">
                <p className="font-semibold">⚡ High Quality Mode</p>
                <p className="text-sm mt-1">
                  Optimized settings: Texture 2048px, Mesh 384 resolution
                </p>
              </div>

              <button
                onClick={handleGenerate}
                disabled={!selectedImage || isGenerating}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {isGenerating ? '⏳ Generating...' : '🚀 Generate 3D Model'}
              </button>
            </div>
          )}

          {error && (
            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 text-red-400">
              <p className="font-semibold">❌ Error</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}
        </div>
      )}

      {/* Progress Section */}
      {isGenerating && currentJob && (
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-gray-300 font-medium">{status}</p>
              <p className="text-blue-400 font-mono">{progress}%</p>
            </div>
            <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="text-sm text-gray-400 space-y-1">
            <p>🔹 Job ID: {currentJob.job_id}</p>
            {currentJob.estimated_time && (
              <p>⏱️ Estimated time: {currentJob.estimated_time}s</p>
            )}
          </div>
        </div>
      )}

      {/* Result Section WITH 3D PREVIEW! */}
      {currentJob?.status === 'complete' && currentJob.glb_url && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-cyan-900/20 to-blue-900/20 border border-cyan-500/50 rounded-xl p-4">
            <p className="text-cyan-300 font-semibold">✅ Model Generated Successfully!</p>
            {currentJob.generation_time && (
              <p className="text-sm text-gray-400 mt-1">
                Generated in {currentJob.generation_time.toFixed(1)}s
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleDownload}
              className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              📥 Download Full Model (.zip)
            </button>
            <button
              onClick={handleReset}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              🔄 Generate Another
            </button>
          </div>

          {/* 3D PREVIEW - THIS IS THE KEY PART! */}
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <div>
                <p className="text-gray-300 font-medium">🎨 3D Model Preview</p>
                <p className="text-sm text-gray-500">
                  Rotate with mouse • Scroll to zoom • Right-click to pan
                </p>
              </div>
              <div className="text-xs text-gray-500">
                GLB Format • {currentJob.generation_time?.toFixed(1)}s
              </div>
            </div>
            {(() => {
              const fullUrl = currentJob.glb_url.startsWith('http')
                ? currentJob.glb_url
                : `https://web-production-3ba7e.up.railway.app${currentJob.glb_url}`;
              console.log('🔍 Loading 3D model from:', fullUrl);
              return (
                <Model3DViewer
                  modelUrl={fullUrl}
                  className="w-full h-[500px]"
                  autoRotate={true}
                  showControls={true}
                />
              );
            })()}
          </div>

          {/* Download Info */}
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 text-sm text-gray-300">
            <p className="font-semibold mb-2">📦 Download includes:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li>model.obj - 3D mesh (import into Blender, Maya, etc.)</li>
              <li>texture.png - {textureResolution}x{textureResolution} texture map</li>
              <li>model.mtl - Material file</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
