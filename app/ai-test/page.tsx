'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { claudeAPI } from '@/lib/api/claude';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import toast from 'react-hot-toast';

export default function AITestPage() {
  const [prompt, setPrompt] = useState('Say hello!');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiHealth, setAiHealth] = useState<{ ai_enabled: boolean } | null>(null);

  const testGenerate = async () => {
    setLoading(true);
    try {
      const result = await claudeAPI.generate(prompt, {
        maxTokens: 100,
        temperature: 0.7
      });
      setResponse(result);
      toast.success('AI response generated!');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('Bad Gateway') || errorMsg.includes('502')) {
        toast.error('AI service not configured on backend');
        setResponse('⚠️ AI Service Not Available\n\nThe Railway backend needs AI endpoints configured.\n\nTo fix this:\n1. Add Claude API key to Railway environment variables\n2. Implement /ai/generate endpoint in backend\n3. Deploy backend changes\n\nError: ' + errorMsg);
      } else {
        toast.error('Failed to generate response');
        setResponse(`Error: ${errorMsg}`);
      }
      console.error('Generation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const testModeration = async () => {
    setLoading(true);
    try {
      const result = await claudeAPI.moderate(prompt);
      setResponse(JSON.stringify(result, null, 2));
      toast.success('Content moderation complete!');
    } catch (error) {
      toast.error('Moderation failed');
      console.error('Moderation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const testSpamDetection = async () => {
    setLoading(true);
    try {
      const isSpam = await claudeAPI.detectSpam(prompt);
      setResponse(`Is spam: ${isSpam}`);
      toast.success('Spam detection complete!');
    } catch (error) {
      toast.error('Spam detection failed');
      console.error('Spam detection error:', error);
    } finally {
      setLoading(false);
    }
  };

  const testSuggestReply = async () => {
    setLoading(true);
    try {
      const suggestion = await claudeAPI.suggestReply(
        'Previous conversation context',
        prompt
      );
      setResponse(suggestion || 'No suggestion available');
      toast.success('Reply suggestion generated!');
    } catch (error) {
      toast.error('Reply suggestion failed');
      console.error('Reply suggestion error:', error);
    } finally {
      setLoading(false);
    }
  };

  const testSummarize = async () => {
    setLoading(true);
    try {
      const summary = await claudeAPI.summarize([
        { username: 'Alice', content: 'Hello everyone!' },
        { username: 'Bob', content: 'Hi Alice, how are you?' },
        { username: 'Alice', content: 'I\'m doing great, working on a React project.' },
      ]);
      setResponse(summary || 'No summary available');
      toast.success('Conversation summarized!');
    } catch (error) {
      toast.error('Summarization failed');
      console.error('Summarization error:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkHealth = async () => {
    setLoading(true);
    try {
      const health = await claudeAPI.checkHealth();
      setAiHealth(health);
      setResponse(JSON.stringify(health, null, 2));
      if (health.ai_enabled) {
        toast.success('AI services are available!');
      } else {
        toast.error('AI services are unavailable');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setAiHealth({ ai_enabled: false });
      
      if (errorMsg.includes('Bad Gateway') || errorMsg.includes('502')) {
        setResponse('❌ AI Service Not Configured\n\nThe Railway backend does not have AI endpoints available.\n\n📝 To enable AI features:\n\n1. Add ANTHROPIC_API_KEY to Railway environment variables\n2. Implement AI endpoints in backend:\n   - /ai/health\n   - /ai/generate\n   - /ai/moderate\n   - /ai/detect-spam\n   - /ai/suggest-reply\n   - /ai/summarize\n3. Deploy backend with AI integration\n\nCurrent Status: Backend running, but AI endpoints return 502');
        toast.error('AI endpoints not configured');
      } else {
        setResponse(`Health Check Failed\n\nError: ${errorMsg}\n\nThe backend may be offline or unreachable.`);
        toast.error('Health check failed');
      }
      console.error('Health check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const testDirectAPI = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://web-production-3ba7e.up.railway.app/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          prompt: prompt,
          max_tokens: 50
        })
      });
      
      const data = await response.json();
      setResponse(JSON.stringify(data, null, 2));
      toast.success('Direct API test complete!');
    } catch (error) {
      toast.error('Direct API test failed');
      console.error('Direct API error:', error);
      setResponse(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl font-bold text-white bitcount-prop-double-ink text-center mb-4">
            🤖 Claude API Test Suite
          </h1>
          <p className="text-white/70 text-center">
            Test all AI-powered features for CHATTER BOX
          </p>
        </motion.div>

        {/* Health Status */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">AI Service Health</h2>
            <Button onClick={checkHealth} disabled={loading} variant="glass">
              Check Health
            </Button>
          </div>
          {aiHealth && (
            <div className={`p-3 rounded-lg ${aiHealth.ai_enabled ? 'bg-green-500/20 border border-green-500/40' : 'bg-red-500/20 border border-red-500/40'}`}>
              <p className={aiHealth.ai_enabled ? 'text-green-300' : 'text-red-300'}>
                Status: {aiHealth.ai_enabled ? '✅ Available' : '❌ Unavailable'}
              </p>
            </div>
          )}
        </motion.div>

        {/* Input Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="glass-card p-6 space-y-4"
        >
          <h2 className="text-xl font-semibold text-white">Test Input</h2>
          <Textarea
            label="Prompt / Content to Test"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder="Enter your test prompt here..."
          />
        </motion.div>

        {/* Test Buttons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="glass-card p-6 space-y-4"
        >
          <h2 className="text-xl font-semibold text-white mb-4">Test Functions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button onClick={testGenerate} disabled={loading} variant="primary" className="w-full">
              🎨 Generate Response
            </Button>
            <Button onClick={testModeration} disabled={loading} variant="secondary" className="w-full">
              🛡️ Moderate Content
            </Button>
            <Button onClick={testSpamDetection} disabled={loading} variant="glass" className="w-full">
              🚫 Detect Spam
            </Button>
            <Button onClick={testSuggestReply} disabled={loading} variant="primary" className="w-full">
              💡 Suggest Reply
            </Button>
            <Button onClick={testSummarize} disabled={loading} variant="secondary" className="w-full">
              📝 Summarize Chat
            </Button>
            <Button onClick={testDirectAPI} disabled={loading} variant="glass" className="w-full">
              🔗 Direct API Test
            </Button>
          </div>
        </motion.div>

        {/* Response Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="glass-card p-6 space-y-4"
        >
          <h2 className="text-xl font-semibold text-white">Response</h2>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            </div>
          ) : (
            <div className="bg-black/30 rounded-lg p-4 min-h-[200px] max-h-[400px] overflow-auto">
              <pre className="text-white/90 text-sm whitespace-pre-wrap font-mono">
                {response || 'No response yet. Click a test button above.'}
              </pre>
            </div>
          )}
        </motion.div>

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="glass-card p-6 space-y-3"
        >
          <h3 className="text-lg font-semibold text-white">📖 Instructions</h3>
          <ul className="text-white/70 text-sm space-y-2 list-disc list-inside">
            <li>First, check AI service health to ensure the backend is available</li>
            <li>Enter your test prompt in the input field</li>
            <li>Click any test button to try different AI features</li>
            <li>View the response in the output section below</li>
            <li>Check browser console (F12) for detailed logs</li>
          </ul>
        </motion.div>
      </div>
    </div>
  );
}
