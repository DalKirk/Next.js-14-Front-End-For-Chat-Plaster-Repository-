'use client';

import { Search, ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';

interface WebSearchButtonProps {
  query?: string;
  className?: string;
}

export default function WebSearchButton({ query = '', className = '' }: WebSearchButtonProps) {
  const [searchEngine, setSearchEngine] = useState<'brave' | 'duckduckgo' | 'google'>('brave');

  // Load saved preference
  useEffect(() => {
    const saved = localStorage.getItem('preferredSearchEngine');
    if (saved) {
      setSearchEngine(saved as 'brave' | 'duckduckgo' | 'google');
    }
  }, []);

  // Save preference when changed
  const handleEngineChange = (engine: 'brave' | 'duckduckgo' | 'google') => {
    setSearchEngine(engine);
    localStorage.setItem('preferredSearchEngine', engine);
  };

  const handleSearch = () => {
    const encodedQuery = encodeURIComponent(query || '');
    const urls = {
      brave: `https://search.brave.com/search?q=${encodedQuery}`,
      duckduckgo: `https://duckduckgo.com/?q=${encodedQuery}`,
      google: `https://www.google.com/search?q=${encodedQuery}`,
    };
    
    // Open in new tab
    window.open(urls[searchEngine], '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-2 ${className}`}>
      {/* Search Engine Selector */}
      <select
        value={searchEngine}
        onChange={(e) => handleEngineChange(e.target.value as 'brave' | 'duckduckgo' | 'google')}
        className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-[#FF9900] transition"
        style={{ fontSize: '16px' }}
      >
        <option value="brave">🦁 Brave Search</option>
        <option value="duckduckgo">🦆 DuckDuckGo</option>
        <option value="google">🔍 Google</option>
      </select>

      {/* Search Button */}
      <button
        onClick={handleSearch}
        className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#FF9900] to-orange-600 hover:from-[#FFB84D] hover:to-orange-700 text-white font-medium rounded-lg transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(255,153,0,0.4)] hover:shadow-[0_0_25px_rgba(255,153,0,0.6)]"
      >
        <Search className="w-4 h-4" />
        Search Web
        <ExternalLink className="w-3 h-3" />
      </button>
    </div>
  );
}
