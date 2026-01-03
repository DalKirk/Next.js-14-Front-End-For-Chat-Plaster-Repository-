// Claude API Client for AI-powered features
// Connects to Railway backend AI endpoints

// Reserved for potential direct API calls in the future
// const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://web-production-3ba7e.up.railway.app';

// Always use Next.js API proxy to avoid CORS issues
const getApiUrl = () => {
  return '/api/ai-proxy';
};

// Generate or retrieve conversation ID for maintaining history
const getConversationId = (): string => {
  if (typeof window === 'undefined') return ''; // SSR safety
  
  let conversationId = sessionStorage.getItem('claude_conversation_id');
  if (!conversationId) {
    conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('claude_conversation_id', conversationId);
  }
  return conversationId;
};

// Clear conversation history and start fresh
export const clearConversationHistory = () => {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('claude_conversation_id');
  }
};

const DEFAULT_SYSTEM_PROMPT = `You are the Starcyeed AI assistant. Do not self-identify as "Claude" or mention model/provider names unless explicitly asked. Avoid greetings like "Hi" or "I'm ...". Be concise, friendly, and helpful. Focus on answering the user's question directly, with code blocks where useful.`;

interface GenerateOptions {
  maxTokens?: number;
  temperature?: number;
  conversationId?: string; // Optional: override default conversation ID
  systemPrompt?: string; // Optional: override default system prompt
}

interface ModerationResult {
  is_safe: boolean;
  reason?: string;
}

interface SpamResult {
  is_spam: boolean;
  reason?: string;
}

interface SuggestReplyResult {
  suggestions: string[];
}

interface Message {
  username: string;
  content: string;
}

export const claudeAPI = {
  /**
   * Generate AI response with conversation history
   */
  async generate(prompt: string, options: GenerateOptions = {}) {
    try {
      // Use provided conversation ID or get default one
      const conversationId = options.conversationId || getConversationId();
      
      const response = await fetch('/api/ai-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Target-Endpoint': '/api/v1/chat'
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          message: prompt,
          conversation_history: [],
          conversation_id: conversationId, // NEW: Include conversation ID
          max_tokens: options.maxTokens || 1000,
          temperature: options.temperature || 0.7,
          system_prompt: options.systemPrompt || DEFAULT_SYSTEM_PROMPT,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI generation failed: ${response.statusText}`);
      }

      const data = await response.json();
      return { response: data.response || data.content, model: data.model, conversationId };
    } catch (error) {
      console.error('Claude API error:', error);
      throw error;
    }
  },

  /**
   * Stream AI response with real-time text updates and conversation history
   */
  async streamGenerate(
    prompt: string,
    onChunk: (text: string) => void,
    options: GenerateOptions = {}
  ): Promise<void> {
    try {
      // Use provided conversation ID or get default one
      const conversationId = options.conversationId || getConversationId();
      
      const response = await fetch('/api/ai-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: prompt,
          conversation_history: [],
          conversation_id: conversationId, // NEW: Include conversation ID
          max_tokens: options.maxTokens || 1000,
          temperature: options.temperature || 0.7,
          system_prompt: options.systemPrompt || DEFAULT_SYSTEM_PROMPT,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI streaming failed: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                onChunk(parsed.content);
              } else if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch (e) {
              // If it's not JSON, treat as raw text (backward compatibility)
              onChunk(data);
            }
          }
        }
      }
    } catch (error) {
      console.error('Claude streaming error:', error);
      throw error;
    }
  },

  /**
   * Moderate content before sending
   */
  async moderate(content: string): Promise<ModerationResult> {
    try {
      const apiUrl = getApiUrl();
      const endpoint = apiUrl.startsWith('/api') ? apiUrl : `${apiUrl}/ai/moderate`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiUrl.startsWith('/api') && { 'X-Target-Endpoint': '/ai/moderate' })
        },
        credentials: apiUrl.startsWith('/api') ? 'same-origin' : 'include',
        body: JSON.stringify({ content }),
      });

      return await response.json();
    } catch (error) {
      console.error('Moderation error:', error);
      // Fail open - allow content if moderation fails
      return { is_safe: true, reason: 'Moderation unavailable' };
    }
  },

  /**
   * Detect spam
   */
  async detectSpam(content: string): Promise<SpamResult> {
    try {
      const apiUrl = getApiUrl();
      const endpoint = apiUrl.startsWith('/api') ? apiUrl : `${apiUrl}/ai/detect-spam`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiUrl.startsWith('/api') && { 'X-Target-Endpoint': '/ai/detect-spam' })
        },
        credentials: apiUrl.startsWith('/api') ? 'same-origin' : 'include',
        body: JSON.stringify({ content }),
      });

      const data = await response.json();
      return { is_spam: data.is_spam || false, reason: data.reason };
    } catch (error) {
      console.error('Spam detection error:', error);
      return { is_spam: false };
    }
  },

  /**
   * Get smart reply suggestions based on conversation context
   */
  async suggestReply(messages: Message[]): Promise<SuggestReplyResult> {
    try {
      const apiUrl = getApiUrl();
      const endpoint = apiUrl.startsWith('/api') ? apiUrl : `${apiUrl}/ai/suggest-reply`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiUrl.startsWith('/api') && { 'X-Target-Endpoint': '/ai/suggest-reply' })
        },
        credentials: apiUrl.startsWith('/api') ? 'same-origin' : 'include',
        body: JSON.stringify({ messages }),
      });

      const data = await response.json();
      // Backend returns suggestions as array or single suggestion
      const suggestions = Array.isArray(data.suggestions) 
        ? data.suggestions 
        : data.suggested_reply 
        ? [data.suggested_reply] 
        : [];
      return { suggestions };
    } catch (error) {
      console.error('Reply suggestion error:', error);
      return { suggestions: [] };
    }
  },

  /**
   * Summarize conversation
   */
  async summarize(messages: Message[]): Promise<string | null> {
    try {
      const apiUrl = getApiUrl();
      const endpoint = apiUrl.startsWith('/api') ? apiUrl : `${apiUrl}/ai/summarize`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiUrl.startsWith('/api') && { 'X-Target-Endpoint': '/ai/summarize' })
        },
        credentials: apiUrl.startsWith('/api') ? 'same-origin' : 'include',
        body: JSON.stringify({ messages }),
      });

      const data = await response.json();
      return data.summary;
    } catch (error) {
      console.error('Summarization error:', error);
      return null;
    }
  },

  /**
   * Check if AI features are available
   */
  async checkHealth(): Promise<{ ai_enabled: boolean }> {
    try {
      const apiUrl = getApiUrl();
      const endpoint = apiUrl.startsWith('/api') ? apiUrl : `${apiUrl}/ai/health`;
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          ...(apiUrl.startsWith('/api') && { 'X-Target-Endpoint': '/ai/health' })
        },
        credentials: apiUrl.startsWith('/api') ? 'same-origin' : 'include',
      });

      const data = await response.json();
      // Backend returns { status: "healthy", claude_enabled: true }
      return { ai_enabled: data.claude_enabled || data.ai_enabled || false };
    } catch (error) {
      console.error('AI health check error:', error);
      return { ai_enabled: false };
    }
  },

  /**
   * Get current conversation ID
   */
  getConversationId,
  
  /**
   * Clear conversation history
   */
  clearHistory: clearConversationHistory,
};
