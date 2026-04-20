'use client';

import { useState, useCallback, useRef } from 'react';

interface UseBackgroundRemovalReturn {
  removeBg: (source: string | Blob) => Promise<Blob | null>;
  isProcessing: boolean;
  progress: string;
  error: string | null;
  reset: () => void;
}

export function useBackgroundRemoval(): UseBackgroundRemovalReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const removeBg = useCallback(
    async (source: string | Blob): Promise<Blob | null> => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
      abortRef.current = new AbortController();

      setIsProcessing(true);
      setError(null);
      setProgress('Loading model...');

      try {
        const { removeBackground } = await import('@imgly/background-removal');

        setProgress('Processing...');

        const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

        const result: Blob = await removeBackground(source, {
          publicPath: `${base}/api/bg-removal-assets/`,
          model: 'isnet_fp16',
          device: 'gpu',
          proxyToWorker: true,
          output: { format: 'image/png', quality: 1 },
          progress: (key: string, current: number, total: number) => {
            if (key === 'fetch:model') {
              const pct = total > 0 ? Math.round((current / total) * 100) : 0;
              setProgress(`Downloading model... ${pct}%`);
            } else if (key === 'compute:inference') {
              setProgress('Removing background...');
            }
          },
        });

        setProgress('Done');
        return result;
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          return null;
        }
        const msg = err instanceof Error ? err.message : 'Background removal failed';
        setError(msg);
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setError(null);
    setProgress('');
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  return { removeBg, isProcessing, progress, error, reset };
}
