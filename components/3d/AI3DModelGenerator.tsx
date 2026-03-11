'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api';
import Model3DViewer from './Model3DViewer';
import toast from 'react-hot-toast';

export default function AI3DModelGenerator() {
  const [prompt, setPrompt] = useState('');
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await apiClient.generate3DModel({
        prompt: prompt.trim(),
        style: 'realistic',
        complexity: 'medium'
      });

      if (response.status === 'completed') {
        // Construct full URL
        const fullUrl = `${process.env.NEXT_PUBLIC_API_URL || 'https://api.starcyeed.com'}${response.model_url}`;
        setModelUrl(fullUrl);
        toast.success('3D model generated!');
      } else if (response.status === 'processing') {
        toast.loading('Model is being generated... Check back in a moment.', { duration: 5000 });
      }
    } catch (error) {
      console.error('Generation failed:', error);
      toast.error('Failed to generate 3D model');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Input Section */}
      <div className="rounded-2xl p-3 sm:p-5" style={{ background: 'rgba(249,115,22,0.03)', border: '1px solid rgba(249,115,22,0.08)' }}>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the 3D model..."
            className="flex-1 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl text-sm text-white placeholder-white/25 outline-none transition-all"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(249,115,22,0.1)' }}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            disabled={isGenerating}
          />
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-6 py-2.5 sm:py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shrink-0"
            style={{ background: '#f97316', color: '#000', boxShadow: '0 0 20px rgba(249,115,22,0.25)' }}
          >
            {isGenerating ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </div>

      {/* Viewer Section */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(249,115,22,0.06)', minHeight: 300 }}>
        {modelUrl ? (
          <Model3DViewer modelUrl={modelUrl} className="w-full h-[300px] sm:h-[500px]" />
        ) : (
          <div className="w-full h-[300px] sm:h-[500px] flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center" style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.1)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-5 h-5" style={{ color: 'rgba(249,115,22,0.3)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                </svg>
              </div>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.2)' }}>Enter a prompt to generate a 3D model</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
