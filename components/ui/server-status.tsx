'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '@/lib/api';

interface ServerStatusProps {
  apiUrl?: string;
}

export function ServerStatus({ apiUrl }: ServerStatusProps) {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline' | 'error'>('checking');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showDetails, setShowDetails] = useState(false);

  const checkServerStatus = useCallback(async () => {
    try {
      setStatus('checking');
      const healthy = await apiClient.checkHealth();
      if (healthy) {
        setStatus('online');
        setErrorMessage('');
      } else {
        setStatus('offline');
        setErrorMessage('Server responded but reported unhealthy');
      }
    } catch (err) {
      const error = err as Error;
      setStatus('offline');
      setErrorMessage(error?.message || 'Unable to connect to backend server');
    }
  }, []);

  useEffect(() => {
    checkServerStatus();
    const interval = setInterval(checkServerStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [apiUrl, checkServerStatus]);

  const getStatusConfig = () => {
    switch (status) {
      case 'checking':
        return {
          bg: 'bg-yellow-500/20',
          border: 'border-yellow-500/50',
          text: 'text-yellow-300',
          icon: '??',
          label: 'Checking server...',
        };
      case 'online':
        return {
          bg: 'bg-cyan-400/20',
          border: 'border-cyan-400/50',
          text: 'text-cyan-200',
          icon: '?',
          label: 'Server Online',
        };
      case 'offline':
        return {
          bg: 'bg-red-500/20',
          border: 'border-red-500/50',
          text: 'text-red-300',
          icon: '?',
          label: 'Server Offline',
        };
      case 'error':
        return {
          bg: 'bg-orange-500/20',
          border: 'border-orange-500/50',
          text: 'text-orange-300',
          icon: '??',
          label: 'Server Error',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-4 right-4 z-50"
    >
      <div
        className={`${config.bg} ${config.border} border backdrop-blur-md rounded-lg p-3 cursor-pointer`}
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{config.icon}</span>
          <span className={`text-sm font-medium ${config.text}`}>
            {config.label}
          </span>
          {status !== 'checking' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                checkServerStatus();
              }}
              className="ml-2 text-xs text-white/60 hover:text-white/90 transition-colors"
            >
              ??
            </button>
          )}
        </div>

        <AnimatePresence>
          {showDetails && (status === 'offline' || status === 'error') && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-2 pt-2 border-t border-white/10"
            >
              <p className="text-xs text-white/70 mb-2">{errorMessage}</p>
              <div className="text-xs text-white/60 space-y-1">
                <p>?? <strong>Possible reasons:</strong></p>
                <ul className="list-disc list-inside ml-2 space-y-0.5">
                  <li>Railway service is sleeping (free tier)</li>
                  <li>Server is restarting or updating</li>
                  <li>Network connectivity issue</li>
                  <li>Backend URL has changed</li>
                </ul>
                <p className="mt-2">
                  <strong>Current URL:</strong>
                  <br />
                  <code className="text-xs bg-black/30 px-1 rounded">
                    {apiUrl || process.env.NEXT_PUBLIC_API_URL || 'Not configured'}
                  </code>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
