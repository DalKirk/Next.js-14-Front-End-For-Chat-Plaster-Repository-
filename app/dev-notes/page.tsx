'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon, DocumentTextIcon, CogIcon } from '@heroicons/react/24/outline';

export default function DevNotesPage() {
  const router = useRouter();

  const updates = [
    {
      version: 'v1.0.0',
      date: 'October 29, 2025',
      title: 'Initial Release - Mango Box',
      notes: [
        'Working on improvements with AI conversational memory. Create new conversation to clear current conversational memory.',
        'Consistent updates are made to improve AI responses and interactions.',
        'Evolving AI learning: Continuous improvements to response quality.',
        '********* More updates soon to come. **********',
        'Spinning gear icon',
      ]
    },
    {
      version: 'v0.9.0',
      date: 'October 28, 2025',
      title: 'Navigation & Layout Updates',
      notes: []
    },
    {
      version: 'v0.8.0',
      date: 'October 27, 2025',
      title: 'Color Scheme Transformation',
      notes: []
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-black">
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-50 mx-2 sm:mx-4 mb-2 sm:mb-4 p-2 sm:p-4 bg-gradient-to-br from-black/60 via-slate-900/60 to-black/60 backdrop-blur-xl border border-slate-700/50 rounded-b-lg shadow-[0_4px_30px_rgba(0,0,0,0.9)] flex items-center gap-2 sm:gap-4"
      >
        <Button
          onClick={() => router.push('/')}
          variant="ghost"
          className="flex items-center gap-1 sm:gap-2 text-white hover:text-cyan-300 transition-colors px-2 sm:px-3 py-1 sm:py-2"
        >
          <ArrowLeftIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">Back</span>
        </Button>
        <DocumentTextIcon className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
        <h1 className="text-base sm:text-2xl font-bold bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 bg-clip-text text-transparent">
          Developer Notes & Updates
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
          <div className="bg-gradient-to-br from-cyan-400/10 to-blue-500/10 border border-cyan-400/30 rounded-xl p-6">
            <h2 className="text-xl sm:text-2xl font-bold text-cyan-300 mb-4">🚀 Welcome to Atlas</h2>
            <p className="text-slate-300 leading-relaxed">
              This page documents all the updates, improvements, and changes made to Atlas. 
              Stay up to date with the latest features and enhancements!
            </p>
          </div>

          {/* Updates Timeline */}
          <div className="space-y-6">
            {updates.map((update, index) => (
              <motion.div
                key={update.version}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-gradient-to-br from-black/60 via-slate-900/60 to-black/60 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6 hover:border-cyan-400/60 transition-all shadow-black/50"
              >
                {/* Version Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-bold text-sm rounded-full">
                      {update.version}
                    </span>
                    <h3 className="text-lg sm:text-xl font-bold text-white">{update.title}</h3>
                  </div>
                  <span className="text-sm text-slate-400">{update.date}</span>
                </div>

                {/* Notes List */}
                <ul className="space-y-2">
                  {update.notes.map((note, noteIndex) => (
                    <li key={noteIndex} className="flex items-start gap-3 text-slate-300">
                      <span className="text-cyan-400 mt-1">•</span>
                      {note === 'Spinning gear icon' ? (
                        <span className="flex items-center gap-2">
                          <CogIcon className="w-5 h-5 text-cyan-400" style={{ animation: 'spin 3s linear infinite' }} />
                          <span className="sr-only">Loading indicator</span>
                        </span>
                      ) : (
                        <span>{note}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          {/* Footer Info */}
          <div className="bg-gradient-to-br from-black/60 via-slate-900/60 to-black/60 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6 text-center">
            <p className="text-slate-400">
              Have questions or suggestions?
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
