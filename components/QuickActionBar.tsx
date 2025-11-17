'use client';

import { Search, Globe, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

export function QuickActionBar() {
  const [isVisible, setIsVisible] = useState(true);

  const openSearch = (engine: 'brave' | 'duckduckgo') => {
    const urls = {
      brave: 'https://search.brave.com',
      duckduckgo: 'https://duckduckgo.com',
    };
    window.open(urls[engine], '_blank', 'noopener,noreferrer');
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed bottom-28 right-4 sm:right-6 z-40 flex flex-col gap-3"
      >
        {/* Close Button */}
        <motion.button
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsVisible(false)}
          className="self-end p-2 bg-zinc-800/80 hover:bg-zinc-700 text-white/60 hover:text-white rounded-full shadow-lg transition backdrop-blur-sm"
          title="Hide quick actions"
        >
          <X className="w-4 h-4" />
        </motion.button>

        {/* Brave Search Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => openSearch('brave')}
          className="p-3 sm:p-4 bg-gradient-to-br from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white rounded-full shadow-[0_0_20px_rgba(255,153,0,0.4)] hover:shadow-[0_0_30px_rgba(255,153,0,0.6)] transition backdrop-blur-sm"
          title="Open Brave Search"
        >
          <Search className="w-5 h-5 sm:w-6 sm:h-6" />
        </motion.button>

        {/* DuckDuckGo Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => openSearch('duckduckgo')}
          className="p-3 sm:p-4 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-full shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] transition backdrop-blur-sm"
          title="Open DuckDuckGo"
        >
          <Globe className="w-5 h-5 sm:w-6 sm:h-6" />
        </motion.button>

        {/* Label */}
        <div className="text-center text-xs text-white/40 mt-1">
          Quick Search
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
