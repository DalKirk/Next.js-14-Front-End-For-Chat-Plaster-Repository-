'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { checkServerHealth } from '@/lib/api';
import Link from 'next/link';

export default function TroubleshootingPage() {
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [apiUrl, setApiUrl] = useState('');
  const [wsUrl, setWsUrl] = useState('');

  useEffect(() => {
    setApiUrl(process.env.NEXT_PUBLIC_API_URL || 'Not configured');
    setWsUrl(process.env.NEXT_PUBLIC_WS_URL || 'Not configured');
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setServerStatus('checking');
    const isOnline = await checkServerHealth();
    setServerStatus(isOnline ? 'online' : 'offline');
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-4">
            Troubleshooting Guide
          </h1>
          <p className="text-white/60">
            Having connection issues? This page will help you diagnose the problem.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <h2 className="text-2xl font-semibold text-white mb-4">Server Status</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div>
                <p className="text-white font-medium">Backend API</p>
                <code className="text-sm text-white/60 break-all">{apiUrl}</code>
              </div>
              <div className="flex items-center gap-2">
                {serverStatus === 'checking' && (
                  <span className="text-yellow-400">Checking...</span>
                )}
                {serverStatus === 'online' && (
                  <span className="text-green-400">Online</span>
                )}
                {serverStatus === 'offline' && (
                  <span className="text-red-400">Offline</span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div>
                <p className="text-white font-medium">WebSocket</p>
                <code className="text-sm text-white/60 break-all">{wsUrl}</code>
              </div>
            </div>

            <Button onClick={checkStatus} variant="secondary" className="w-full">
              Recheck Server Status
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6"
        >
          <h2 className="text-2xl font-semibold text-white mb-4">Common Issues</h2>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-white">
                502 Bad Gateway
              </h3>
              <p className="text-white/70">
                The Railway backend service is not responding. Usually happens when the free-tier service has gone to sleep.
              </p>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mt-2">
                <p className="text-blue-300 text-sm font-medium mb-2">Solution:</p>
                <ul className="text-white/70 text-sm space-y-1">
                  <li>Wait 30-60 seconds and try again</li>
                  <li>The first request will wake up the service</li>
                  <li>Subsequent requests will be faster</li>
                </ul>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-medium text-white">
                Network Connection Failed
              </h3>
              <p className="text-white/70">
                Cannot reach the backend server at all.
              </p>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mt-2">
                <p className="text-blue-300 text-sm font-medium mb-2">Solution:</p>
                <ul className="text-white/70 text-sm space-y-1">
                  <li>Check your internet connection</li>
                  <li>Verify the backend URL in environment variables</li>
                  <li>Try accessing the API URL directly in your browser</li>
                </ul>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <h2 className="text-2xl font-semibold text-white mb-4">Configuration</h2>
          
          <div className="space-y-3">
            <div>
              <p className="text-white/60 text-sm">Node Environment</p>
              <code className="text-white">{process.env.NODE_ENV || 'development'}</code>
            </div>
            <div>
              <p className="text-white/60 text-sm">API URL</p>
              <code className="text-white break-all">{apiUrl}</code>
            </div>
            <div>
              <p className="text-white/60 text-sm">WebSocket URL</p>
              <code className="text-white break-all">{wsUrl}</code>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex gap-4"
        >
          <Link href="/" className="flex-1">
            <Button variant="primary" className="w-full">
              Back to Home
            </Button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}