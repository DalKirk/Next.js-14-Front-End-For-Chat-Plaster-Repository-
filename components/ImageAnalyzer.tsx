'use client';

import React, { useState, ChangeEvent, useEffect } from 'react';
import Image from 'next/image';
import { 
  Upload, FileImage, FileText, MessageSquare, Loader2, AlertCircle,
  History, Download, Copy, Trash2, Clock, Globe, CheckCircle, ChevronDown
} from 'lucide-react';
import { ImageAnalysisService } from '@/services/image-analysis.service';
import { AnalysisTab, QuickPrompt, HistoryEntry, Language } from '@/types/image-analysis';

const LANGUAGES: Language[] = [
  { code: 'English', name: 'English', flag: '🇺🇸' },
  { code: 'Spanish', name: 'Español', flag: '🇪🇸' },
  { code: 'French', name: 'Français', flag: '🇫🇷' },
  { code: 'German', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'Italian', name: 'Italiano', flag: '🇮🇹' },
  { code: 'Portuguese', name: 'Português', flag: '🇵🇹' },
  { code: 'Russian', name: 'Русский', flag: '🇷🇺' },
  { code: 'Japanese', name: '日本語', flag: '🇯🇵' },
  { code: 'Korean', name: '한국어', flag: '🇰🇷' },
  { code: 'Chinese', name: '中文', flag: '🇨🇳' },
  { code: 'Arabic', name: 'العربية', flag: '🇸🇦' },
  { code: 'Hindi', name: 'हिन्दी', flag: '🇮🇳' },
];

export default function ImageAnalyzer() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [compressedPreview, setCompressedPreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [response, setResponse] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AnalysisTab>('describe');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('English');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState<boolean>(false);
  const [showAncientDropdown, setShowAncientDropdown] = useState<boolean>(false);
  
  // History feature
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  
  // Copy success notification
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  
  // Progressive loading
  const [imageLoading, setImageLoading] = useState<boolean>(false);

  const prompts: Record<AnalysisTab, string> = {
    describe: 'Describe this image in detail.',
    ocr: 'Extract all text from this image. Maintain the original formatting as much as possible.',
    translate: 'Extract all text from this image, identify the language(s), and translate to English. If it\'s an ancient or historical language, provide context about the era and meaning.',
    qa: ''
  };

  const quickPrompts: QuickPrompt[] = [
    { id: '1', text: "What objects are in this image?", category: 'description' },
    { id: '2', text: "What's the mood or atmosphere of this image?", category: 'description' },
    { id: '3', text: "What colors are dominant in this image?", category: 'description' },
    { id: '4', text: "Is there any text visible? What does it say?", category: 'ocr' },
    { id: '5', text: "What's happening in this image?", category: 'qa' }
  ];

  const ancientLanguagePrompts = [
    {
      id: 'latin',
      text: 'Translate this Latin text to English',
      icon: '🏛️'
    },
    {
      id: 'greek',
      text: 'Translate this Ancient Greek text to English',
      icon: '🏺'
    },
    {
      id: 'sanskrit',
      text: 'Translate this Sanskrit text to English',
      icon: '🕉️'
    },
    {
      id: 'hieroglyphics',
      text: 'Describe and translate these hieroglyphics',
      icon: '𓀀'
    },
    {
      id: 'classical-chinese',
      text: 'Translate this Classical Chinese text to English',
      icon: '📜'
    }
  ];

  // Load history on mount
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    const loaded = ImageAnalysisService.getHistory();
    setHistory(loaded);
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = ImageAnalysisService.validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setImageLoading(true);
    setSelectedImage(file);
    setResponse('');
    setError(null);
    
    try {
      // Create compressed preview first for instant feedback
      const compressed = await ImageAnalysisService.compressImage(file, 400, 0.6);
      const compressedPreviewUrl = await ImageAnalysisService.createImagePreview(compressed);
      setCompressedPreview(compressedPreviewUrl);
      
      // Then load full quality in background
      const fullPreview = await ImageAnalysisService.createImagePreview(file);
      setImagePreview(fullPreview);
      setCompressedPreview(null); // Clear compressed once full is loaded
    } catch (err) {
      setError('Failed to create image preview');
    } finally {
      setImageLoading(false);
    }
  };

  const analyzeImage = async () => {
    if (!selectedImage) return;

    const currentPrompt = activeTab === 'qa' ? prompt : prompts[activeTab];
    
    if (!currentPrompt.trim()) {
      setError('Please enter a prompt or question');
      return;
    }

    setLoading(true);
    setResponse('');
    setError(null);

    try {
      // Use streaming for better UX
      let fullResponse = '';
      
      await ImageAnalysisService.analyzeImageStreaming(
        selectedImage,
        currentPrompt,
        selectedLanguage !== 'English' ? selectedLanguage : undefined,
        (chunk) => {
          fullResponse += chunk;
          setResponse(fullResponse);
        }
      );

      // Save to history after successful analysis
      const historyEntry: HistoryEntry = {
        id: Date.now().toString(),
        image: imagePreview || '',
        prompt: currentPrompt,
        response: fullResponse,
        timestamp: new Date(),
        language: selectedLanguage,
        tab: activeTab
      };
      
      ImageAnalysisService.saveToHistory(historyEntry);
      loadHistory();
      
    } catch (err) {
      // Fallback to non-streaming if streaming fails
      try {
        const result = await ImageAnalysisService.analyzeImage(
          selectedImage,
          currentPrompt,
          selectedLanguage !== 'English' ? selectedLanguage : undefined
        );
        setResponse(result.response);
        
        // Save to history
        const historyEntry: HistoryEntry = {
          id: Date.now().toString(),
          image: imagePreview || '',
          prompt: currentPrompt,
          response: result.response,
          timestamp: new Date(),
          language: selectedLanguage,
          tab: activeTab
        };
        
        ImageAnalysisService.saveToHistory(historyEntry);
        loadHistory();
      } catch (fallbackErr) {
        const errorMessage = fallbackErr instanceof Error ? fallbackErr.message : 'An unexpected error occurred';
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: AnalysisTab) => {
    setActiveTab(tab);
    setResponse('');
    setError(null);
    if (tab !== 'qa') {
      setPrompt('');
    }
  };

  const handleQuickPromptClick = (promptText: string) => {
    setPrompt(promptText);
    if (activeTab !== 'qa') {
      setActiveTab('qa');
    }
  };

  const loadFromHistory = (entry: HistoryEntry) => {
    setImagePreview(entry.image);
    setPrompt(entry.prompt);
    setResponse(entry.response);
    setActiveTab(entry.tab);
    setSelectedLanguage(entry.language);
    setShowHistory(false);
  };

  const deleteHistory = (id: string) => {
    ImageAnalysisService.deleteHistoryEntry(id);
    loadHistory();
  };

  const exportAsJSON = () => {
    if (!response || !imagePreview) return;
    
    const entry: HistoryEntry = {
      id: Date.now().toString(),
      image: imagePreview,
      prompt: activeTab === 'qa' ? prompt : prompts[activeTab],
      response,
      timestamp: new Date(),
      language: selectedLanguage,
      tab: activeTab
    };
    
    ImageAnalysisService.exportAsJSON(entry);
  };

  const exportAsText = () => {
    if (!response || !imagePreview) return;
    
    const entry: HistoryEntry = {
      id: Date.now().toString(),
      image: imagePreview,
      prompt: activeTab === 'qa' ? prompt : prompts[activeTab],
      response,
      timestamp: new Date(),
      language: selectedLanguage,
      tab: activeTab
    };
    
    ImageAnalysisService.exportAsText(entry);
  };

  const copyResponseToClipboard = async () => {
    if (!response) return;
    
    try {
      await ImageAnalysisService.copyToClipboard(response);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-black p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-4 sm:mb-6 md:mb-8 pt-12 sm:pt-0">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-green-500 via-emerald-400 to-green-400 bg-clip-text text-transparent mb-2">Snapshots Analyzer</h1>
          <p className="text-sm sm:text-base text-slate-400">Analyze images, extract text, and ask questions</p>
        </div>

        {/* History Button */}
        <div className="mb-3 sm:mb-4 flex justify-end">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base bg-gradient-to-br from-black/60 via-slate-900/60 to-black/60 backdrop-blur-xl border border-slate-700/50 text-white rounded-lg shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:border-green-500/50 hover:shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all"
            type="button"
          >
            <History className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
            <span className="hidden xs:inline">History</span> ({history.length})
          </button>
        </div>

        {/* History Panel */}
        {showHistory && (
          <div className="mb-4 sm:mb-6 bg-gradient-to-br from-black/60 via-slate-900/60 to-black/60 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-lg sm:text-xl font-semibold text-white">Analysis History</h3>
              <button
                onClick={() => {
                  ImageAnalysisService.clearHistory();
                  loadHistory();
                }}
                className="text-sm text-red-400 hover:text-red-300 transition-colors"
                type="button"
              >
                Clear All
              </button>
            </div>
            
            {history.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No history yet</p>
            ) : (
              <div className="space-y-2 sm:space-y-3 max-h-64 sm:max-h-96 overflow-y-auto">
                {history.map((entry) => (
                  <div key={entry.id} className="flex gap-2 sm:gap-3 p-2 sm:p-3 bg-gradient-to-br from-black/40 via-slate-900/40 to-black/40 backdrop-blur-md border border-slate-700/50 rounded-lg hover:border-green-500/50 hover:shadow-[0_0_15px_rgba(34,197,94,0.2)] transition-all">
                    <Image src={entry.image} alt="History" width={80} height={80} unoptimized className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded border border-slate-700/50" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-green-400 uppercase">{entry.tab}</span>
                        <span className="text-xs text-slate-500">{entry.language}</span>
                      </div>
                      <p className="text-sm text-slate-300 truncate">{entry.prompt}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span className="text-xs text-slate-500">
                          {entry.timestamp.toLocaleDateString()} {entry.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => loadFromHistory(entry)}
                        className="px-3 py-1 text-sm bg-gradient-to-r from-green-500 to-emerald-500 text-black rounded hover:shadow-[0_0_15px_rgba(34,197,94,0.4)] transition-all"
                        type="button"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => deleteHistory(entry.id)}
                        className="p-1 text-red-400 hover:text-red-300 transition-colors"
                        type="button"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
          {/* Left Panel - Image Upload */}
          <div className="bg-gradient-to-br from-black/60 via-slate-900/60 to-black/60 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 flex items-center gap-2 text-white">
              <FileImage className="w-5 h-5 text-green-500" />
              Upload Image
            </h2>

            <div className="mb-3 sm:mb-4">
              <label className="block w-full">
                <div className={`border-2 border-dashed rounded-lg p-4 sm:p-6 md:p-8 text-center cursor-pointer transition-all ${
                  imagePreview || compressedPreview ? 'border-green-500 bg-slate-800/50 shadow-[0_0_20px_rgba(34,197,94,0.4)]' : 'border-slate-700/50 hover:border-green-500/50 hover:bg-slate-800/30 hover:shadow-[0_0_15px_rgba(34,197,94,0.2)]'
                }`}>
                  {compressedPreview || imagePreview ? (
                    <div className="relative">
                      <Image 
                        src={compressedPreview || imagePreview || ''} 
                        alt="Preview" 
                        width={400}
                        height={256}
                        unoptimized
                        className={`max-h-64 mx-auto rounded ${imageLoading ? 'opacity-50' : ''}`} 
                        style={{ width: 'auto', height: 'auto', maxHeight: '16rem' }}
                      />
                      {imageLoading && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Loader2 className="w-8 h-8 animate-spin text-green-500" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 mx-auto text-green-500 mb-2" />
                      <p className="text-sm sm:text-base text-white">Click to upload an image</p>
                      <p className="text-xs sm:text-sm text-slate-500 mt-1">PNG, JPG, GIF, or WebP (Max 5MB)</p>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Language Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-white mb-2">
                <Globe className="w-4 h-4 inline mr-1 text-green-500" />
                Response Language
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                  className="w-full px-4 py-2 text-left bg-gradient-to-br from-black/40 via-slate-900/40 to-black/40 backdrop-blur-md border border-slate-700/50 text-white rounded-lg hover:border-green-500/50 transition-all flex items-center justify-between"
                  type="button"
                >
                  <span className="flex items-center gap-2">
                    <span>{LANGUAGES.find(l => l.code === selectedLanguage)?.flag}</span>
                    <span>{selectedLanguage}</span>
                  </span>
                  <span className="text-slate-500">▼</span>
                </button>
                
                {showLanguageDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-gradient-to-br from-black/80 via-slate-900/80 to-black/80 backdrop-blur-xl border border-slate-700/50 rounded-lg shadow-[0_0_20px_rgba(0,0,0,0.5)] max-h-60 overflow-y-auto">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setSelectedLanguage(lang.code);
                          setShowLanguageDropdown(false);
                        }}
                        className="w-full px-4 py-2 text-left text-white hover:bg-slate-800/50 hover:border-l-2 hover:border-green-500 flex items-center gap-2 transition-all"
                        type="button"
                      >
                        <span>{lang.flag}</span>
                        <span>{lang.name}</span>
                        {lang.code === selectedLanguage && (
                          <CheckCircle className="w-4 h-4 ml-auto text-green-500" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-4 p-3 bg-red-950 border border-red-800 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            {/* Analysis Type Tabs */}
            <div className="mb-3 sm:mb-4">
              <div className="flex gap-1 sm:gap-2 mb-3 sm:mb-4">
                <button
                  onClick={() => handleTabChange('describe')}
                  className={`flex-1 py-1.5 px-2 sm:py-2 sm:px-4 rounded-lg text-xs sm:text-sm md:text-base font-medium transition-all ${
                    activeTab === 'describe' 
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-black shadow-[0_0_20px_rgba(34,197,94,0.4)]' 
                      : 'bg-gradient-to-br from-black/40 via-slate-900/40 to-black/40 backdrop-blur-md text-slate-400 hover:bg-slate-800/50 border border-slate-700/50'
                  }`}
                  type="button"
                >
                  <FileImage className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                  <span className="hidden xs:inline">Describe</span>
                  <span className="xs:hidden">Desc</span>
                </button>
                <button
                  onClick={() => handleTabChange('ocr')}
                  className={`flex-1 py-1.5 px-2 sm:py-2 sm:px-4 rounded-lg text-xs sm:text-sm md:text-base font-medium transition-all ${
                    activeTab === 'ocr' 
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-black shadow-[0_0_20px_rgba(34,197,94,0.4)]' 
                      : 'bg-gradient-to-br from-black/40 via-slate-900/40 to-black/40 backdrop-blur-md text-slate-400 hover:bg-slate-800/50 border border-slate-700/50'
                  }`}
                  type="button"
                >
                  <FileText className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                  OCR
                </button>
                <button
                  onClick={() => handleTabChange('translate')}
                  className={`flex-1 py-1.5 px-2 sm:py-2 sm:px-4 rounded-lg text-xs sm:text-sm md:text-base font-medium transition-all ${
                    activeTab === 'translate' 
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-black shadow-[0_0_20px_rgba(34,197,94,0.4)]' 
                      : 'bg-gradient-to-br from-black/40 via-slate-900/40 to-black/40 backdrop-blur-md text-slate-400 hover:bg-slate-800/50 border border-slate-700/50'
                  }`}
                  type="button"
                >
                  <Globe className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                  <span className="hidden xs:inline">Translate</span>
                  <span className="xs:hidden">Trans</span>
                </button>
                <button
                  onClick={() => handleTabChange('qa')}
                  className={`flex-1 py-1.5 px-2 sm:py-2 sm:px-4 rounded-lg text-xs sm:text-sm md:text-base font-medium transition-all ${
                    activeTab === 'qa' 
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-black shadow-[0_0_20px_rgba(34,197,94,0.4)]' 
                      : 'bg-gradient-to-br from-black/40 via-slate-900/40 to-black/40 backdrop-blur-md text-slate-400 hover:bg-slate-800/50 border border-slate-700/50'
                  }`}
                  type="button"
                >
                  <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                  Q&A
                </button>
              </div>

              {activeTab === 'translate' && (
                <div className="mb-3 sm:mb-4">
                  <label className="block text-sm font-medium text-white mb-2">
                    Ancient Language Presets
                  </label>
                  <div className="relative">
                    <button
                      onClick={() => setShowAncientDropdown(!showAncientDropdown)}
                      className="w-full px-4 py-2 bg-gradient-to-br from-black/40 via-slate-900/40 to-black/40 backdrop-blur-md border border-slate-700/50 rounded-lg text-left text-white hover:border-green-500/50 transition-colors flex items-center justify-between"
                      type="button"
                    >
                      <span className="text-slate-400">Select an ancient language...</span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showAncientDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {showAncientDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-gradient-to-br from-black/80 via-slate-900/80 to-black/80 backdrop-blur-xl border border-slate-700/50 rounded-lg shadow-lg overflow-hidden">
                        {ancientLanguagePrompts.map((preset) => (
                          <button
                            key={preset.id}
                            onClick={() => {
                              setActiveTab('qa');
                              setPrompt(preset.text);
                              setShowAncientDropdown(false);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-slate-800/50 transition-colors flex items-center gap-2 border-b border-slate-700/50 last:border-b-0"
                            type="button"
                          >
                            <span className="text-xl">{preset.icon}</span>
                            <span className="text-sm text-slate-300">{preset.text}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'qa' && (
                <div>
                  <textarea
                    value={prompt}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value)}
                    placeholder="Ask a question about the image..."
                    className="w-full p-3 bg-gradient-to-br from-black/40 via-slate-900/40 to-black/40 backdrop-blur-md border border-slate-700/50 text-white placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {quickPrompts.map((q) => (
                      <button
                        key={q.id}
                        onClick={() => handleQuickPromptClick(q.text)}
                        className="text-xs bg-gradient-to-br from-black/40 via-slate-900/40 to-black/40 backdrop-blur-md hover:bg-gradient-to-r hover:from-green-500 hover:to-emerald-500 text-slate-400 hover:text-black border border-slate-700/50 px-3 py-1 rounded-full transition-all"
                        type="button"
                      >
                        {q.text}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={analyzeImage}
              disabled={!selectedImage || loading || (activeTab === 'qa' && !prompt.trim())}
              className={`w-full font-semibold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2 ${
                !selectedImage || loading || (activeTab === 'qa' && !prompt.trim())
                  ? 'bg-gradient-to-br from-black/40 via-slate-900/40 to-black/40 backdrop-blur-md text-slate-600 cursor-not-allowed border border-slate-700/50'
                  : 'bg-gradient-to-r from-green-500 to-emerald-500 text-black shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:shadow-[0_0_30px_rgba(34,197,94,0.6)]'
              }`}
              type="button"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>Analyze Image</>
              )}
            </button>
          </div>

          {/* Right Panel - Results */}
          <div className="bg-gradient-to-br from-black/60 via-slate-900/60 to-black/60 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-white">Results</h2>
              
              {response && (
                <div className="flex gap-2">
                  <button
                    onClick={copyResponseToClipboard}
                    className="p-2 text-slate-400 hover:text-green-400 hover:bg-slate-800/50 rounded transition-colors relative"
                    title="Copy to clipboard"
                    type="button"
                  >
                    {copySuccess ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                  
                  <div className="relative group">
                    <button
                      className="p-2 text-slate-400 hover:text-green-400 hover:bg-slate-800/50 rounded transition-colors"
                      title="Export"
                      type="button"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    
                    <div className="absolute right-0 mt-2 w-40 bg-gradient-to-br from-black/80 via-slate-900/80 to-black/80 backdrop-blur-xl rounded-lg shadow-lg border border-slate-700/50 hidden group-hover:block z-10">
                      <button
                        onClick={exportAsJSON}
                        className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-800/50 hover:text-green-400 rounded-t-lg"
                        type="button"
                      >
                        Export as JSON
                      </button>
                      <button
                        onClick={exportAsText}
                        className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-800/50 hover:text-green-400 rounded-b-lg"
                        type="button"
                      >
                        Export as Text
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {response ? (
              <div className="bg-gradient-to-br from-black/40 via-slate-900/40 to-black/40 backdrop-blur-md border border-slate-700/50 rounded-lg p-3 sm:p-4 max-h-[300px] sm:max-h-[400px] md:max-h-[500px] overflow-y-auto">
                <p className="text-sm sm:text-base text-white whitespace-pre-wrap">{response}</p>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-black/40 via-slate-900/40 to-black/40 backdrop-blur-md border border-slate-700/50 rounded-lg p-4 sm:p-6 md:p-8 text-center text-slate-500 h-[300px] sm:h-[400px] md:h-[500px] flex items-center justify-center">
                <div>
                  <MessageSquare className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 mx-auto mb-3 sm:mb-4 opacity-50 text-green-500" />
                  <p className="text-sm sm:text-base">Upload an image and click analyze to see results</p>
                  {loading && (
                    <div className="mt-4">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-green-500" />
                      <p className="mt-2 text-sm">Analyzing image...</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-4 sm:mt-6 bg-gradient-to-br from-black/60 via-slate-900/60 to-black/60 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] p-4 sm:p-6">
          <h3 className="font-semibold text-base sm:text-lg mb-3 text-white">Supported Use Cases:</h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-gradient-to-br from-black/40 via-slate-900/40 to-black/40 backdrop-blur-md border border-slate-700/50 p-3 sm:p-4 rounded-lg hover:border-green-500/50 transition-all">
              <h4 className="font-semibold text-sm sm:text-base text-green-400 mb-2">Image Description</h4>
              <p className="text-xs sm:text-sm text-slate-400">Get detailed descriptions of scenes, objects, people, and activities in images</p>
            </div>
            <div className="bg-gradient-to-br from-black/40 via-slate-900/40 to-black/40 backdrop-blur-md border border-slate-700/50 p-3 sm:p-4 rounded-lg hover:border-green-500/50 transition-all">
              <h4 className="font-semibold text-sm sm:text-base text-emerald-400 mb-2">Text Extraction (OCR)</h4>
              <p className="text-xs sm:text-sm text-slate-400">Extract text from screenshots, documents, signs, handwriting, and more</p>
            </div>
            <div className="bg-gradient-to-br from-black/40 via-slate-900/40 to-black/40 backdrop-blur-md border border-slate-700/50 p-3 sm:p-4 rounded-lg hover:border-green-500/50 transition-all sm:col-span-2 md:col-span-1">
              <h4 className="font-semibold text-sm sm:text-base text-green-400 mb-2">Visual Q&A</h4>
              <p className="text-xs sm:text-sm text-slate-400">Ask specific questions about image content, context, or details</p>
            </div>
          </div>
          
          <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg">
            <h4 className="font-semibold text-sm sm:text-base text-black mb-2 flex items-center gap-2">
              <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
              Multi-Language Support
            </h4>
            <p className="text-xs sm:text-sm text-black">
              Analyze images and receive responses in 12+ languages including Spanish, French, German, Japanese, Chinese, and more!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
