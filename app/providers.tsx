'use client';

import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { GenerationStoreProvider } from '@/lib/generation-store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  /* Suppress Next.js dev-overlay "releasePointerCapture" noise */
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    const handler = (e: ErrorEvent) => {
      if (e.message?.includes('releasePointerCapture')) e.preventDefault();
    };
    window.addEventListener('error', handler);
    return () => window.removeEventListener('error', handler);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GenerationStoreProvider>
      {children}
      </GenerationStoreProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: 'white',
            borderRadius: '12px',
          },
          success: {
            iconTheme: {
              primary: '#00ff88',
              secondary: 'white',
            },
          },
          error: {
            iconTheme: {
              primary: '#ff4757',
              secondary: 'white',
            },
          },
        }}
      />
    </QueryClientProvider>
  );
}