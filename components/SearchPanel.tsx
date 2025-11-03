'use client';

import { Search, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

export function SearchPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchEngine, setSearchEngine] = useState<'brave' | 'duckduckgo' | 'google'>('brave');

  useEffect(() => {
    const saved = localStorage.getItem('preferredSearchEngine');
    if (saved) {
      setSearchEngine(saved as 'brave' | 'duckduckgo' | 'google');
    }
  }, []);

  const handleEngineChange = (engine: 'brave' | 'duckduckgo' | 'google') => {
    setSearchEngine(engine);
    localStorage.setItem('preferredSearchEngine', engine);
  };

  const openSearch = (engine: 'brave' | 'duckduckgo' | 'google') => {
    const urls = {
      brave: 'https://search.brave.com',
      duckduckgo: 'https://duckduckgo.com',
      google: 'https://www.google.com',
    };
    window.open(urls[engine], '_blank', 'noopener,noreferrer');
  };

  const searchEngineConfig = {
    brave: { icon: '🦁', color: 'from-orange-600 to-orange-700', hoverColor: 'from-orange-500 to-orange-600' },
    duckduckgo: { icon: '🦆', color: 'from-blue-600 to-blue-700', hoverColor: 'from-blue-500 to-blue-600' },
    google: { icon: '🔍', color: 'from-green-600 to-green-700', hoverColor: 'from-green-500 to-green-600' },
  };

  return (
    <div className="relative">
      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 bg-gradient-to-r from-[#FF9900] to-orange-600 hover:from-[#FFB84D] hover:to-orange-700 rounded-lg transition-all shadow-[0_0_15px_rgba(255,153,0,0.4)]"
        title="Web Search"
      >
        <Search className="w-5 h-5 text-white" />
      </motion.button>

      {/* Slide-out Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10000]"
            />

            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-80 bg-zinc-900/95 backdrop-blur-xl border-l border-zinc-800 shadow-[-20px_0_60px_rgba(0,0,0,0.5)] z-[10001]"
            >
              {/* Header */}
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Search className="w-6 h-6 text-[#FF9900]" />
                  <h2 className="text-xl font-bold text-white">Web Search</h2>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition"
                >
                  <X className="w-5 h-5 text-white/60 hover:text-white" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-3">
                {/* Quick Launch Buttons */}
                {(['brave', 'duckduckgo', 'google'] as const).map((engine) => {
                  const config = searchEngineConfig[engine];
                  return (
                    <motion.button
                      key={engine}
                      whileHover={{ scale: 1.02, x: 5 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => openSearch(engine)}
                      className={`w-full flex items-center justify-between p-4 bg-gradient-to-r ${config.color} hover:${config.hoverColor} rounded-lg transition-all shadow-lg text-white group`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{config.icon}</span>
                        <div className="text-left">
                          <div className="font-medium">
                            {engine === 'brave' && 'Brave Search'}
                            {engine === 'duckduckgo' && 'DuckDuckGo'}
                            {engine === 'google' && 'Google'}
                          </div>
                          <div className="text-xs text-white/70">
                            {engine === 'brave' && 'Privacy-focused'}
                            {engine === 'duckduckgo' && 'Anonymous'}
                            {engine === 'google' && 'Most popular'}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
