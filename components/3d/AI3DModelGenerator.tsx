'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import Model3DViewer from './Model3DViewer';
import toast from 'react-hot-toast';
import { HomeIcon } from '@heroicons/react/24/outline';

export default function AI3DModelGenerator() {
  const router = useRouter();
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
    <div className="w-full h-screen flex flex-col bg-[#0a0a0a]">
      {/* Input Section */}
      <div className="p-4 sm:p-6 bg-[oklch(0.15_0.02_160/0.08)] backdrop-blur-[20px] border-b border-[oklch(0.85_0.2_160/0.15)]">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-3">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the 3D model..."
              className="w-full px-3 py-2.5 sm:px-4 sm:py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm sm:text-base placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[oklch(0.85_0.2_160)]"
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              disabled={isGenerating}
            />
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-[oklch(0.85_0.2_160)] text-black font-semibold text-sm sm:text-base rounded-lg hover:bg-[oklch(0.9_0.2_160)] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_oklch(0.85_0.2_160/0.3)] active:scale-95"
              >
                {isGenerating ? 'Generating...' : 'Generate'}
              </button>
              {/* Home Button */}
              <button
                onClick={() => router.push('/')}
                className="px-4 sm:px-6 py-2.5 sm:py-3 bg-[oklch(0.15_0.02_160/0.08)] border border-[oklch(0.85_0.2_160/0.15)] text-[oklch(0.85_0.2_160)] font-semibold text-sm sm:text-base rounded-lg hover:bg-[oklch(0.85_0.2_160/0.15)] hover:border-[oklch(0.85_0.2_160/0.3)] transition-all flex items-center justify-center gap-2 group active:scale-95"
                title="Back to Home"
              >
                <HomeIcon className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
                <span>Home</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Viewer Section */}
      <div className="flex-1 relative">
        {modelUrl ? (
          <Model3DViewer modelUrl={modelUrl} className="w-full h-full" />
        ) : (
          <div className="w-full h-full flex items-center justify-center px-4">
            <div className="text-center">
              <p className="text-lg sm:text-xl mb-2 text-[oklch(0.85_0.2_160/0.7)]">No model loaded</p>
              <p className="text-xs sm:text-sm text-[oklch(0.85_0.2_160/0.4)]">Enter a prompt above to generate a 3D model</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
