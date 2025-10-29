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
        <DocumentTextIcon className="w-5 h-5 sm:w-6 sm:h-6 text-[#FF9900]" />
        <h1 className="text-base sm:text-2xl font-bold bg-gradient-to-r from-[#FF9900] via-[#FFB84D] to-yellow-400 bg-clip-text text-transparent">
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
          <div className="bg-gradient-to-br from-[#FF9900]/10 to-yellow-400/10 border border-[#FF9900]/30 rounded-xl p-6">
            <h2 className="text-xl sm:text-2xl font-bold text-[#FF9900] mb-4">🥭 Welcome to Mango Box</h2>
            <p className="text-zinc-300 leading-relaxed">
              This page documents all the updates, improvements, and changes made to Mango Box. 
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
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-[#FF9900]/50 transition-all shadow-black/50"
              >
                {/* Version Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-gradient-to-r from-[#FF9900] to-yellow-400 text-black font-bold text-sm rounded-full">
                      {update.version}
                    </span>
                    <h3 className="text-lg sm:text-xl font-bold text-white">{update.title}</h3>
                  </div>
                  <span className="text-sm text-zinc-400">{update.date}</span>
                </div>

                {/* Notes List */}
                <ul className="space-y-2">
                  {update.notes.map((note, noteIndex) => (
                    <li key={noteIndex} className="flex items-start gap-3 text-zinc-300">
                      <span className="text-[#FF9900] mt-1">•</span>
                      {note === 'Spinning gear icon' ? (
                        <span className="flex items-center gap-2">
                          <CogIcon className="w-5 h-5 text-[#FF9900]" style={{ animation: 'spin 3s linear infinite' }} />
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
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
            <p className="text-zinc-400">
              Have questions or suggestions?
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
