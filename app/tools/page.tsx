'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline';

export default function ToolsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-[#1a1a1a]">
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-50 mx-2 sm:mx-4 mb-2 sm:mb-4 p-2 sm:p-4 bg-zinc-900 backdrop-blur-md border-0 rounded-b-lg shadow-lg shadow-black/50 flex items-center gap-2 sm:gap-4"
      >
        <Button
          onClick={() => router.push('/')}
          variant="ghost"
          className="flex items-center gap-1 sm:gap-2 text-white hover:text-[#FF9900] transition-colors px-2 sm:px-3 py-1 sm:py-2"
        >
          <ArrowLeftIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">Back</span>
        </Button>
        <WrenchScrewdriverIcon className="w-5 h-5 sm:w-6 sm:h-6 text-[#FF9900]" />
        <h1 className="text-base sm:text-2xl font-bold bg-gradient-to-r from-[#FF9900] via-[#FFB84D] to-yellow-400 bg-clip-text text-transparent">
          Tools & Settings
        </h1>
      </motion.div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Welcome Section */}
          <div className="bg-gradient-to-br from-[#FF9900]/10 to-yellow-400/10 border border-[#FF9900]/30 rounded-xl p-6">
            <h2 className="text-xl sm:text-2xl font-bold text-[#FF9900] mb-4">🔧 Developer Tools</h2>
            <p className="text-zinc-300 leading-relaxed">
              Access developer tools, settings, and utilities to customize your Mango Box experience.
            </p>
          </div>

          {/* Tools Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* API Settings */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-[#FF9900]/50 transition-all shadow-black/50"
            >
              <h3 className="text-lg font-bold text-white mb-3">⚙️ API Settings</h3>
              <p className="text-zinc-400 text-sm mb-4">
                Configure backend API endpoints and connection settings.
              </p>
              <Button
                variant="primary"
                className="w-full"
                onClick={() => {/* Add functionality */}}
              >
                Configure API
              </Button>
            </motion.div>

            {/* Debug Mode */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-[#FF9900]/50 transition-all shadow-black/50"
            >
              <h3 className="text-lg font-bold text-white mb-3">🐛 Debug Mode</h3>
              <p className="text-zinc-400 text-sm mb-4">
                Enable debug logging and developer console tools.
              </p>
              <Button
                variant="primary"
                className="w-full"
                onClick={() => {/* Add functionality */}}
              >
                Toggle Debug
              </Button>
            </motion.div>

            {/* Theme Customization */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-[#FF9900]/50 transition-all shadow-black/50"
            >
              <h3 className="text-lg font-bold text-white mb-3">🎨 Theme Settings</h3>
              <p className="text-zinc-400 text-sm mb-4">
                Customize colors, code themes, and visual preferences.
              </p>
              <Button
                variant="primary"
                className="w-full"
                onClick={() => {/* Add functionality */}}
              >
                Customize Theme
              </Button>
            </motion.div>

            {/* Clear Cache */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-[#FF9900]/50 transition-all shadow-black/50"
            >
              <h3 className="text-lg font-bold text-white mb-3">🗑️ Clear Cache</h3>
              <p className="text-zinc-400 text-sm mb-4">
                Clear local storage, cache, and conversation history.
              </p>
              <Button
                variant="primary"
                className="w-full"
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
              >
                Clear All Data
              </Button>
            </motion.div>
          </div>

          {/* System Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-6"
          >
            <h3 className="text-lg font-bold text-white mb-4">📊 System Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">Version:</span>
                <span className="text-white font-mono">v1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Environment:</span>
                <span className="text-white font-mono">{process.env.NODE_ENV}</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
