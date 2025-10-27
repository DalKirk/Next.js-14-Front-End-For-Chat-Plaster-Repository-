'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ServerStatus } from '@/components/ui/server-status';
import { apiClient } from '@/lib/api';
import { claudeAPI } from '@/lib/api/claude';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, oneDark, tomorrow, dracula } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { 
  SparklesIcon, 
  PaperAirplaneIcon,
  UserCircleIcon,
  ArrowRightIcon,
  Bars3Icon,
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { Copy, Check } from 'lucide-react';

interface User {
  id: string;
  username: string;
}

interface ClaudeMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function HomePage() {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  // Claude AI State
  const [claudeMessages, setClaudeMessages] = useState<ClaudeMessage[]>([]);
  const [claudeInput, setClaudeInput] = useState('');
  const [isClaudeTyping, setIsClaudeTyping] = useState(false);
  const [aiHealth, setAiHealth] = useState<{ ai_enabled: boolean } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [codeTheme, setCodeTheme] = useState<'vscDarkPlus' | 'oneDark' | 'tomorrow' | 'dracula'>('vscDarkPlus');
  const themeMap: Record<string, any> = { vscDarkPlus, oneDark, tomorrow, dracula };
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('chat-user');
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('chat-user');
      }
    }
    checkAIHealth();
  }, []);
  
  const checkAIHealth = async () => {
    try {
      const health = await claudeAPI.checkHealth();
      setAiHealth(health);
    } catch (error) {
      console.error('AI health check failed:', error);
      setAiHealth({ ai_enabled: false });
    }
  };
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [claudeMessages]);

  // Handle mobile keyboard overlap - lightweight approach
  useEffect(() => {
    const handleFocus = () => {
      // On mobile, when keyboard opens, ensure input is visible
      if (inputRef.current && window.innerWidth <= 768) {
        setTimeout(() => {
          inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 300);
      }
    };

    const inputElement = inputRef.current;
    inputElement?.addEventListener('focus', handleFocus);
    
    return () => {
      inputElement?.removeEventListener('focus', handleFocus);
    };
  }, []);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Preprocess content to ensure code blocks are properly formatted
  const preprocessContent = (content: string): string => {
    // Normalize non-breaking spaces to regular spaces
    content = content.replace(/\u00A0/g, ' ');

    // Helper: normalize lists/bullets outside of code fences
    const normalizeListsOutsideCode = (text: string): string => {
      const codeBlocks: string[] = [];
      // Temporarily protect fenced code blocks
      const stubbed = text.replace(/```[\s\S]*?```/g, (m: string) => {
        const i = codeBlocks.push(m) - 1;
        return `__CODEBLOCK_${i}__`;
      });

      let t = stubbed;
      // If the backend flattened newlines to multiple spaces, bring bullets back to new lines
      // Examples handled: "    - item", "    * item", "    • item", "    1. item", "    1) item"
      t = t.replace(/(\s{3,})([-*]|•|\d+[.)])\s/g, '\n$2 ');

      // If bullet/numbered markers appear mid-line without newline, move them to a new line
      t = t.replace(/([^\n])\s+([-*]|•|\d+[.)])\s/g, (_m, prev: string, marker: string) => `${prev}\n${marker} `);

      // Normalize unicode bullet to dash for consistent GFM handling
      t = t.replace(/(^|\n)[ \t]*•\s/g, '$1- ');

      // Ensure there is a blank line before the first bullet group to trigger list parsing
      t = t.replace(/([^\n])\n(- |\d+[.)] )/g, '$1\n\n$2');

      // Restore protected code blocks
      return t.replace(/__CODEBLOCK_(\d+)__/g, (_: string, i: string) => codeBlocks[Number(i)] || '');
    };

    content = normalizeListsOutsideCode(content);
    
    // If already has markdown code blocks, check if they need formatting
    if (content.includes('```')) {
      let fixed = content;
      
      // FIRST AND MOST CRITICAL: Fix malformed language tags (newline right after language)
      // Use a whitelist of common languages to avoid greedy captures like "pythonprint"
      fixed = fixed.replace(
        /```(javascript|js|jsx|typescript|ts|python|py|java|c\+\+|cpp|csharp|cs|bash|sh|shell|html|css|json|yaml|yml|go|rust|ruby|php|swift|kotlin|sql)(?=[^`\n\r])/gi,
        '```$1\n'
      );
      
  // Fix: Ensure there's a newline before code blocks (separate paragraphs from fences)
  // Keep this conservative; do NOT add a newline after opening ``` as it breaks ```language
  fixed = fixed.replace(/([^\n])```/g, '$1\n\n```');

      // Fix: Add proper indentation/newlines inside code blocks
      // Backend strips ALL newlines - code comes as single line with no spacing
      // Allow optional spaces/tabs after the language tag for robustness
      fixed = fixed.replace(/```(\w+)[ \t]*\n?([\s\S]*?)```/g, (match, lang, code) => {
        const originalLang = String(lang || '').toLowerCase();
        let cleanCode = code;
        cleanCode = cleanCode.trim();
        
        // AGGRESSIVE: Convert any sequence of 2+ spaces to newlines in JavaScript-like code
  if (originalLang === 'javascript' || originalLang === 'js' || originalLang === 'jsx' || originalLang === 'typescript' || originalLang === 'ts') {
          // Convert patterns like "function greetUser(name) {    const" to multi-line
          cleanCode = cleanCode.replace(/(\w+\s*\([^)]*\)\s*\{)\s{2,}(\w)/g, '$1\n    $2');
          // Convert "greeting;    return" to "greeting;\nreturn"
          cleanCode = cleanCode.replace(/([;}])\s{2,}(\w)/g, '$1\n$2');
          // Convert "} const" or "}// comment" 
          cleanCode = cleanCode.replace(/(\})\s{1,}([a-zA-Z\/])/g, '$1\n$2');
          // Convert between statements more aggressively
          cleanCode = cleanCode.replace(/([a-zA-Z\)]);\s{1,}([a-zA-Z\/])/g, '$1;\n$2');
        }
        
    // Python-specific reconstruction
  if (originalLang === 'python' || originalLang === 'py') {
          // Protect quoted strings to avoid inserting newlines inside them (e.g., "Hello from Python!")
          const strPlaceholders: string[] = [];
          cleanCode = cleanCode.replace(/(["'])(?:\\.|(?!\1)[^\n\r])*\1/g, (m: string) => {
            const idx = strPlaceholders.push(m) - 1;
            return `__STR${idx}__`;
          });

          // Convert backend's 4+ spaces to newlines after protecting strings
          cleanCode = cleanCode.replace(/\s{4,}/g, '\n    ');

          cleanCode = cleanCode
            // Add newline before comments (highest priority)
            .replace(/#/g, '\n#')
            // Add newline before print statements
            .replace(/print\(/g, '\nprint(')
            // Add newline before def
            .replace(/def\s/g, '\ndef ')
            // Add newline before class
            .replace(/class\s/g, '\nclass ')
            // Add newline before control structures
            .replace(/\b(if|elif|else|for|while|try|except|finally|with|import|from)\b\s/g, '\n$1 ')
            // Add newline and indent after colons (function/class definitions)
            .replace(/:\s*/g, ':\n    ')
            // Add newline before return
            .replace(/return\s/g, '\nreturn ')
            // Clean up multiple newlines
            .replace(/\n{3,}/g, '\n\n')
            // Remove newline at very start
            .replace(/^\n+/, '')
            .trim();

          // Restore protected strings
          cleanCode = cleanCode.replace(/__STR(\d+)__/g, (_: string, i: string) => strPlaceholders[Number(i)] || '');
    } 
    // JavaScript/JSX/TypeScript
  else if (originalLang === 'javascript' || originalLang === 'js' || originalLang === 'jsx' || originalLang === 'typescript' || originalLang === 'ts') {
          // Convert backend's 4+ spaces to newlines
          cleanCode = cleanCode.replace(/\s{4,}/g, '\n    ');

          // ALSO: Convert instances where there are spaces between statements
          // Look for patterns like "} const" or "; const" or ") {" etc.
          cleanCode = cleanCode.replace(/([;})]) +([a-zA-Z])/g, '$1\n$2');
          cleanCode = cleanCode.replace(/([;}]) +([a-zA-Z])/g, '$1\n$2');

          cleanCode = cleanCode
            // Add newline after semicolons
            .replace(/;/g, ';\n')
            // Add newline after opening braces
            .replace(/\{/g, '{\n  ')
            // Add newline before closing braces
            .replace(/\}/g, '\n}')
            // Add newline before let/const/var
            .replace(/(let|const|var)\s/g, '\n$1 ')
            // Add newline before function
            .replace(/function\s/g, '\nfunction ')
            // Fix comments
            .replace(/\/\//g, '\n//')
            // Clean up multiple newlines
            .replace(/\n{3,}/g, '\n\n')
            .replace(/^\n+/, '')
            .trim();
          // Final normalization: ensure no trailing excessive spaces on lines
          cleanCode = cleanCode.replace(/[ \t]+\n/g, '\n');
        }

        // C-like languages (java, c++, csharp, go, rust, php, swift, kotlin)
        else if (
          originalLang === 'java' || originalLang === 'c++' || originalLang === 'cpp' || originalLang === 'csharp' || originalLang === 'cs' ||
          originalLang === 'go' || originalLang === 'rust' || originalLang === 'php' || originalLang === 'swift' || originalLang === 'kotlin'
        ) {
          // Basic readability improvements similar to JS
          cleanCode = cleanCode
            .replace(/\s{4,}/g, '\n    ')
            .replace(/;/g, ';\n')
            .replace(/\{/g, '{\n  ')
            .replace(/\}/g, '\n}')
            .replace(/\b(if|else if|else|for|while|switch|case|try|catch|finally|return|class|interface|struct|enum|fn|func|package|import|using|namespace)\b/g, '\n$1')
            .replace(/\n{3,}/g, '\n\n')
            .replace(/^[\n\s]+/, '')
            .replace(/[ \t]+\n/g, '\n')
            .trim();
        }

        // SQL
        else if (originalLang === 'sql') {
          // Protect single-quoted strings
          const strPlaceholders: string[] = [];
          cleanCode = cleanCode.replace(/'(?:''|[^'\n\r])*'/g, (m: string) => {
            const idx = strPlaceholders.push(m) - 1;
            return `__SQLSTR${idx}__`;
          });

          cleanCode = cleanCode
            .replace(/\s{4,}/g, '\n    ')
            .replace(/,/g, ',\n')
            .replace(/;/g, ';\n')
            .replace(/\b(SELECT|FROM|WHERE|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|OUTER JOIN|GROUP BY|ORDER BY|HAVING|INSERT INTO|VALUES|UPDATE|SET|DELETE FROM|CREATE|ALTER|DROP|LIMIT|OFFSET)\b/gi, '\n$1')
            .replace(/\n{3,}/g, '\n\n')
            .replace(/^[\n\s]+/, '')
            .trim();

          cleanCode = cleanCode.replace(/__SQLSTR(\d+)__/g, (_: string, i: string) => strPlaceholders[Number(i)] || "");
        }

        // Bash/Shell
        else if (originalLang === 'bash' || originalLang === 'sh' || originalLang === 'shell') {
          cleanCode = cleanCode
            .replace(/\s{4,}/g, '\n    ')
            .replace(/\s;\s*/g, ';\n')
            .replace(/\s&&\s*/g, ' &&\n')
            .replace(/\s\|\|\s*/g, ' ||\n')
            .replace(/\s\|\s*/g, ' |\n')
            // Newline before common commands
            .replace(/\b(echo|cd|ls|cat|grep|awk|sed|curl|wget|npm|npx|node|python|pip|pip3|docker|kubectl|git|make)\b/g, '\n$1')
            .replace(/\n{3,}/g, '\n\n')
            .replace(/^[\n\s]+/, '')
            .trim();
        }

        // PowerShell
        else if (originalLang === 'powershell' || originalLang === 'ps1') {
          cleanCode = cleanCode
            .replace(/\s{4,}/g, '\n    ')
            .replace(/\s;\s*/g, ';\n')
            .replace(/\s\|\s*/g, ' |\n')
            .replace(/\b(function|param)\b/g, '\n$1')
            // Newline before common cmdlets like Get-*, Set-*, New-*
            .replace(/(^|[\s;])(Get|Set|New|Remove|Add|Update|Invoke|Start|Stop|Restart|Enable|Disable)-([A-Za-z]+)/g, '\n$2-$3')
            .replace(/\n{3,}/g, '\n\n')
            .replace(/^[\n\s]+/, '')
            .trim();
        }

        // HTML
        else if (originalLang === 'html') {
          cleanCode = cleanCode
            .replace(/>\s*</g, '>\n<')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
        }

        // CSS
        else if (originalLang === 'css') {
          cleanCode = cleanCode
            .replace(/\s{4,}/g, '\n    ')
            .replace(/;/g, ';\n')
            .replace(/\{/g, '{\n  ')
            .replace(/\}/g, '\n}')
            .replace(/\n{3,}/g, '\n\n')
            .replace(/^[\n\s]+/, '')
            .trim();
        }

        // JSON
        else if (originalLang === 'json') {
          // Try to pretty-print valid JSON first
          let pretty = '';
          try {
            // Some backends send flattened JSON without newlines
            const obj = JSON.parse(cleanCode);
            pretty = JSON.stringify(obj, null, 2);
          } catch {
            // Fallback heuristics
            pretty = cleanCode
              .replace(/\s{4,}/g, '\n    ')
              .replace(/,/g, ',\n')
              .replace(/\{/g, '{\n  ')
              .replace(/\}/g, '\n}')
              .replace(/\[/g, '[\n  ')
              .replace(/\]/g, '\n]')
              .replace(/\n{3,}/g, '\n\n')
              .trim();
          }
          cleanCode = pretty;
        }

        // YAML/YML (best-effort)
        else if (originalLang === 'yaml' || originalLang === 'yml') {
          cleanCode = cleanCode
            .replace(/\s-\s/g, '\n- ')
            .replace(/\s([A-Za-z0-9_-]+):\s/g, '\n$1: ')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
        }
        
        return '```' + originalLang + '\n' + cleanCode + '\n```';
      });

      // Normalize lists again on the result to ensure bullets render outside any non-code parts
      if (fixed !== content) {
        return normalizeListsOutsideCode(fixed);
      }

      return normalizeListsOutsideCode(content);
    }

    // Check if content has code-like patterns
    const hasImport = /import\s+.*from|import\s+\{/i.test(content);
    const hasFunction = /function\s+\w+|const\s+\w+\s*=|let\s+\w+\s*=/i.test(content);
    const hasJSX = /<[A-Z]\w+|<div|<span|<button|<h[1-6]|className=/i.test(content);
    const hasReact = /useState|useEffect|React\.|jsx/i.test(content);
    
    if (!hasImport && !hasFunction && !hasJSX && !hasReact) {
      return content;
    }

    // Detect language
    let language = 'jsx';
    if (/def\s+\w+\s*\(|print\(|if\s+__name__/.test(content)) {
      language = 'python';
    } else if (hasJSX || hasReact || /className=|onClick=/.test(content)) {
      language = 'jsx';
    } else if (hasFunction || hasImport) {
      language = 'javascript';
    }

    // Look for common markers where code might be prefixed with language name
    // Like "jsximport React" or "javascriptfunction test"
    const langPrefix = content.match(/^(jsx|javascript|python|typescript|java|c\+\+|csharp)(?=[a-z])/i);
    if (langPrefix) {
      // Remove the language prefix
      content = content.replace(/^(jsx|javascript|python|typescript|java|c\+\+|csharp)/i, '');
    }

    // Try to split intro text from code
    // Look for the first import or function declaration
    const codeStart = content.search(/^(import\s|export\s|function\s|const\s|let\s|var\s|class\s|def\s)/m);
    
    if (codeStart === -1) {
      // Code pattern exists but can't find start - wrap entire content
      console.log('⚠️ Code pattern found but no clear start, wrapping all');
      return '```' + language + '\n' + content + '\n```';
    }

    const beforeCode = content.substring(0, codeStart).trim();
    let afterCodeStart = codeStart;
    
    // Find where code ends - look for explanatory text after code
    // Usually starts with capital letter after some whitespace and not inside JSX
    const remainingContent = content.substring(codeStart);
    const codeEndMatch = remainingContent.search(/\n\n[A-Z][^<]*?:/);
    
    let codeContent, afterCode;
    if (codeEndMatch > 0) {
      codeContent = remainingContent.substring(0, codeEndMatch).trim();
      afterCode = remainingContent.substring(codeEndMatch).trim();
    } else {
      // Check for common endings like "Key Features:", "Note:", etc.
      const explanationStart = remainingContent.search(/\n\n(Key |Note|Remember|Important|Features|Why |How )/i);
      if (explanationStart > 0) {
        codeContent = remainingContent.substring(0, explanationStart).trim();
        afterCode = remainingContent.substring(explanationStart).trim();
      } else {
        codeContent = remainingContent.trim();
        afterCode = '';
      }
    }

    const result = [
      beforeCode,
      beforeCode ? '\n\n' : '',
      '```' + language,
      codeContent,
      '```',
      afterCode ? '\n\n' + afterCode : ''
    ].filter(s => s !== '').join('\n');
    
    return result;
  };

  const handleCreateUser = async () => {
    if (!username.trim()) {
      toast.error('Please enter a username');
      return;
    }

    setIsLoading(true);
    try {
      const user = await apiClient.createUser(username.trim());
      localStorage.setItem('chat-user', JSON.stringify(user));
      setCurrentUser(user);
      toast.success(`Welcome, ${user.username}! Let's set up your profile.`);
      router.push('/profile');
    } catch (error) {
      console.error('❌ User creation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create user', { duration: 6000 });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAskClaude = async () => {
    if (!claudeInput.trim() || !aiHealth?.ai_enabled) return;
    
    const userMessage: ClaudeMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: claudeInput.trim(),
      timestamp: new Date()
    };
    
    setClaudeMessages(prev => [...prev, userMessage]);
    const promptText = claudeInput.trim();
    setClaudeInput('');
    setIsClaudeTyping(true);
    
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: ClaudeMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    };
    setClaudeMessages(prev => [...prev, assistantMessage]);
    
    try {
      let fullContent = '';
      
      await claudeAPI.streamGenerate(
        promptText,
        (chunk: string) => {
          fullContent += chunk;
          setClaudeMessages(prev => 
            prev.map(msg => 
              msg.id === assistantMessageId
                ? { ...msg, content: fullContent }
                : msg
            )
          );
        },
        {
          maxTokens: 1000,
          temperature: 0.7
        }
      );
      
  // After streaming completes, preprocess the content if needed
  const processedContent = preprocessContent(fullContent);
      
      if (processedContent !== fullContent) {
        setClaudeMessages(prev => 
          prev.map(msg => 
            msg.id === assistantMessageId
              ? { ...msg, content: processedContent }
              : msg
          )
        );
      }
      
      toast.success('Response complete!');
    } catch (error) {
      console.error('Claude error:', error);
      toast.error('Failed to get response from Claude');
      
      setClaudeMessages(prev => 
        prev.map(msg => 
          msg.id === assistantMessageId
            ? { ...msg, content: 'Sorry, I encountered an error. Please try again.' }
            : msg
        )
      );
    } finally {
      setIsClaudeTyping(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-gradient-to-br from-[oklch(10%_0.02_280)] via-[oklch(15%_0.03_260)] to-[oklch(12%_0.02_240)]">
      {/* Top Navigation Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="fixed top-0 left-0 right-0 z-50 bg-[oklch(14.7%_0.004_49.25)] backdrop-blur-xl border-b border-[oklch(var(--color-primary)/0.2)] shadow-lg p-2 sm:p-3 md:p-4 flex items-center justify-between flex-wrap gap-2"
      >
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.5)]">
              <SparklesIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <h1 className="text-base sm:text-xl font-bold text-white truncate">CHATTER BOX</h1>
          </div>
          {aiHealth?.ai_enabled && (
            <span className="flex text-xs bg-[oklch(14.7%_0.004_49.25)] border border-cyan-400/30 text-cyan-400 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
              <span className="hidden sm:inline">Server Online</span>
              <span className="sm:hidden">Online</span>
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2 min-w-0">
          {currentUser ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="bg-transparent border-none p-2 cursor-pointer"
              >
                <div className="w-6 h-5 flex flex-col justify-between">
                  <div className="w-full h-0.5 bg-green-400 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
                  <div className="w-full h-0.5 bg-green-400 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
                  <div className="w-full h-0.5 bg-green-400 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
                </div>
              </button>
              
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute right-0 mt-2 bg-[oklch(14.7%_0.004_49.25)] backdrop-blur-xl border border-purple-600/30 rounded-xl p-3 space-y-2 min-w-[200px] shadow-[0_0_30px_rgba(147,51,234,0.3)]"
                >
                  <div className="px-3 py-2 border-b border-purple-600/20">
                    <div className="flex items-center gap-2">
                      <UserCircleIcon className="w-5 h-5 text-fuchsia-500" />
                      <span className="text-white font-medium text-sm">{currentUser.username}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      router.push('/profile');
                      setShowUserMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-purple-600/20 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <UserCircleIcon className="w-4 h-4" />
                    Profile
                  </button>
                  <button
                    onClick={() => {
                      router.push('/chat');
                      setShowUserMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-purple-600/20 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <ChatBubbleLeftRightIcon className="w-4 h-4" />
                    Rooms
                  </button>
                  <button
                    onClick={() => { router.push('/profile'); setShowUserMenu(false); }}
                    className="w-full text-left px-3 py-2 hover:bg-white/10 rounded-lg text-sm text-white/90"
                  >
                    Profile
                  </button>
                  <button
                    onClick={() => { router.push('/chat'); setShowUserMenu(false); }}
                    className="w-full text-left px-3 py-2 hover:bg-white/10 rounded-lg text-sm text-white/90"
                  >
                    Browse Rooms
                  </button>
                </motion.div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1 sm:gap-2">
              <Input
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateUser()}
                className="w-20 xs:w-24 sm:w-32 text-xs sm:text-sm bg-[oklch(14.7%_0.004_49.25)] border-cyan-400/30 text-white placeholder:text-white/40 focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(34,211,238,0.3)]"
                maxLength={20}
              />
              <Button
                onClick={handleCreateUser}
                disabled={isLoading || !username.trim()}
                className="text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3 bg-gradient-to-r from-cyan-400 to-fuchsia-500 hover:from-cyan-500 hover:to-fuchsia-600 text-white shadow-[0_0_20px_rgba(34,211,238,0.4)] hover:shadow-[0_0_25px_rgba(217,70,239,0.6)]"
              >
                {isLoading ? '...' : 'Join'}
                <ArrowRightIcon className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </motion.div>



      {/* Decorative floating bubbles layer (background, no scroll impact) */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="bubble-wobble bubble-cyan bubble-sm bubble-fast bubble-delay-1" style={{ left: '8%', ['--sway' as any]: '12px' }} />
        <div className="bubble-wobble bubble-fuchsia bubble-md bubble-normal bubble-delay-2" style={{ left: '22%', ['--sway' as any]: '18px' }} />
        <div className="bubble-wobble bubble-purple bubble-lg bubble-slow bubble-delay-3" style={{ left: '38%', ['--sway' as any]: '22px' }} />
        <div className="bubble-wobble bubble-cyan bubble-sm bubble-normal bubble-delay-4" style={{ left: '55%', ['--sway' as any]: '14px' }} />
        <div className="bubble-wobble bubble-fuchsia bubble-xl bubble-slow bubble-delay-5" style={{ left: '70%', ['--sway' as any]: '26px' }} />
        <div className="bubble-wobble bubble-purple bubble-md bubble-fast bubble-delay-2" style={{ left: '85%', ['--sway' as any]: '16px' }} />
      </div>

  {/* Chat Messages */}
  <div className="relative z-10 pt-16 sm:pt-20 pb-32 sm:pb-36 min-h-screen">
        <div className="max-w-4xl mx-auto px-2 sm:px-4 space-y-4 sm:space-y-6">
          <AnimatePresence>
            {claudeMessages.map((msg, index) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="flex justify-center min-w-0"
              >
                <motion.div 
                  whileHover={{ scale: 1.01 }}
                  transition={{ duration: 0.2 }}
                  className={`w-full sm:max-w-3xl min-w-0 rounded-xl sm:rounded-2xl px-3 sm:px-4 md:px-6 py-3 sm:py-4 backdrop-blur-sm ${
                    msg.role === 'user' 
                      ? 'bg-gradient-to-br from-[rgba(217,70,239,0.4)] to-[rgba(147,51,234,0.3)] border-2 sm:border-4 border-fuchsia-500 text-white shadow-[0_0_30px_rgba(217,70,239,0.5)] sm:shadow-[0_0_60px_rgba(217,70,239,0.7)]' 
                      : 'bg-gradient-to-br from-[rgba(0,255,255,0.4)] to-[rgba(0,200,255,0.2)] border-2 sm:border-4 border-cyan-400 text-white shadow-[0_0_30px_rgba(34,211,238,0.5)] sm:shadow-[0_0_60px_rgba(34,211,238,0.7)]'
                  }`}
                >
                  <div className="prose prose-invert max-w-full break-words overflow-hidden">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({className, children, ...props}: any) {
                          const match = /language-(\w+)/.exec(className || '');
                          const codeString = String(children).replace(/\n$/, '');
                          const codeId = `${msg.id}-${match?.[1] || 'code'}`;
                          const isInline = !className;
                          
                          return !isInline && match ? (
                            <div className="relative my-4 rounded-lg overflow-auto border border-purple-600/30 bg-[oklch(8%_0.02_280)] max-w-full shadow-[0_0_15px_rgba(147,51,234,0.2)]">
                              <div className="flex items-center justify-between bg-[oklch(14.7%_0.004_49.25)] px-3 py-1.5 border-b border-purple-600/20 flex-wrap gap-2">
                                <span className="font-mono text-purple-400 font-semibold" style={{fontSize: '0.625rem'}}>
                                  {match[1]}
                                </span>
                                <button
                                  onClick={() => copyCode(codeString, codeId)}
                                  className="flex items-center gap-2 hover:bg-white/10 px-2 py-1 rounded transition-colors text-white"
                                >
                                  {copiedCode === codeId ? (
                                    <>
                                      <Check className="w-3 h-3 text-green-400" />
                                      <span className="text-green-400" style={{fontSize: '0.625rem'}}>Copied!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span style={{fontSize: '0.625rem'}}>Copy</span>
                                    </>
                                  )}
                                </button>
                              </div>
                              <SyntaxHighlighter
                                style={(themeMap[codeTheme] || vscDarkPlus) as any}
                                language={match[1]}
                                PreTag="div"
                                showLineNumbers={true}
                                wrapLines={true}
                                wrapLongLines={true}
                                customStyle={{
                                  margin: 0,
                                  padding: '1rem',
                                  background: 'oklch(8% 0.02 280)',
                                  fontSize: '0.625rem',
                                  overflowX: 'auto',
                                  whiteSpace: 'pre-wrap',
                                  overflowWrap: 'anywhere',
                                  wordBreak: 'break-word',
                                }}
                                lineNumberStyle={{
                                  minWidth: '3em',
                                  paddingRight: '1em',
                                  color: '#6b7280',
                                  userSelect: 'none',
                                }}
                              >
                                {codeString}
                              </SyntaxHighlighter>
                            </div>
                          ) : (
                            <code className="bg-white/10 px-1 py-0.5 rounded font-mono break-words" style={{fontSize: '0.625rem'}} {...props}>
                              {children}
                            </code>
                          );
                        },
                        p: ({children}) => <p className="mb-2 last:mb-0 leading-relaxed text-xs break-words">{children}</p>,
                        ul: ({children}) => <ul className="list-disc list-inside mb-2 space-y-1 text-xs">{children}</ul>,
                        ol: ({children}) => <ol className="list-decimal list-inside mb-2 space-y-1 text-xs">{children}</ol>,
                        li: ({children}) => <li className="leading-relaxed text-xs">{children}</li>,
                        h1: ({children}) => <h1 className="text-base font-bold mb-2 mt-3">{children}</h1>,
                        h2: ({children}) => <h2 className="text-sm font-bold mb-2 mt-2">{children}</h2>,
                        h3: ({children}) => <h3 className="text-xs font-bold mb-1 mt-2">{children}</h3>,
                        a: ({children, href}) => <a href={href} className="text-cyan-400 hover:text-cyan-300 hover:underline break-words" target="_blank" rel="noopener noreferrer">{children}</a>,
                        img: ({...props}) => <img {...props} style={{maxWidth: '100%', height: 'auto'}} />,
                        table: ({children}) => (
                          <div className="w-full overflow-x-auto">
                            <table className="text-xs w-full min-w-max">{children}</table>
                          </div>
                        ),
                        blockquote: ({children}) => <blockquote className="border-l-4 border-fuchsia-500 pl-3 italic my-2 text-xs">{children}</blockquote>,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                  <p className="text-white/40 mt-2" style={{fontSize: '0.625rem'}}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </motion.div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isClaudeTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="flex justify-start"
            >
              <div className="flex gap-1">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                  className="w-2 h-2 bg-pink-500 rounded-full"
                />
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
                  className="w-2 h-2 bg-pink-500 rounded-full"
                />
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
                  className="w-2 h-2 bg-pink-500 rounded-full"
                />
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Fixed Input at Bottom */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="fixed bottom-0 left-0 right-0 bg-[oklch(14.7%_0.004_49.25)]/95 backdrop-blur-xl border-t border-purple-600/30 shadow-[0_-5px_30px_rgba(147,51,234,0.2)] z-50"
        style={{ 
          paddingBottom: 'max(env(safe-area-inset-bottom), 8px)'
        }}
      >
        <div className="max-w-4xl mx-auto px-2 sm:px-4 py-2 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
              <Cog6ToothIcon className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
            </motion.div>
            <input
              ref={inputRef}
              type="text"
              value={claudeInput}
              onChange={(e) => setClaudeInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAskClaude();
                }
              }}
              placeholder={aiHealth?.ai_enabled ? "Ask me anything..." : "AI is offline"}
              disabled={!aiHealth?.ai_enabled || isClaudeTyping}
              className="flex-1 min-w-0 bg-transparent outline-none text-white placeholder:text-white/40 transition-all duration-300 border-b border-cyan-400/30 focus:border-cyan-400 pb-1 sm:pb-2 text-base sm:text-lg"
            />
            <motion.button
              onClick={handleAskClaude}
              disabled={!claudeInput.trim() || !aiHealth?.ai_enabled || isClaudeTyping}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 sm:p-2.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-600 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(217,70,239,0.5)] hover:shadow-[0_0_25px_rgba(217,70,239,0.8)]"
            >
              <PaperAirplaneIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </motion.button>

            {/* Code theme selector */}
            <div className="ml-1 sm:ml-2 flex items-center gap-1 sm:gap-2">
              <label htmlFor="code-theme" className="text-xs text-white/70 hidden md:inline">Theme</label>
              <select
                id="code-theme"
                value={codeTheme}
                onChange={(e) => setCodeTheme(e.target.value as any)}
                className="bg-[oklch(14.7%_0.004_49.25)] text-white text-[10px] sm:text-xs border border-purple-600/30 rounded px-1.5 sm:px-2 py-0.5 sm:py-1 focus:outline-none focus:border-purple-600 focus:shadow-[0_0_10px_rgba(147,51,234,0.4)]"
              >
                <option value="vscDarkPlus">VS Code Dark+</option>
                <option value="oneDark">One Dark</option>
                <option value="tomorrow">Tomorrow</option>
                <option value="dracula">Dracula</option>
              </select>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
