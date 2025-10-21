const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface GenerateOptions {
  maxTokens?: number;
  temperature?: number;
}

interface ModerationResult {
  is_safe: boolean;
  reason?: string;
}

interface Message {
  username: string;
  content: string;
}

export const claudeAPI = {
  /**
   * Generate AI response
   */
  async generate(prompt: string, options: GenerateOptions = {}) {
    try {
      const response = await fetch(`${API_URL}/ai/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          prompt,
          max_tokens: options.maxTokens || 1000,
          temperature: options.temperature || 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI generation failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Claude API error:', error);
      throw error;
    }
  },

  /**
   * Moderate content before sending
   */
  async moderate(content: string): Promise<ModerationResult> {
    try {
      const response = await fetch(`${API_URL}/ai/moderate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
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
  async detectSpam(content: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/ai/detect-spam`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ content }),
      });

      const data = await response.json();
      return data.is_spam || false;
    } catch (error) {
      console.error('Spam detection error:', error);
      return false;
    }
  },

  /**
   * Get smart reply suggestion
   */
  async suggestReply(context: string, userMessage: string): Promise<string | null> {
    try {
      const response = await fetch(`${API_URL}/ai/suggest-reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          context,
          user_message: userMessage,
        }),
      });

      const data = await response.json();
      return data.suggested_reply;
    } catch (error) {
      console.error('Reply suggestion error:', error);
      return null;
    }
  },

  /**
   * Summarize conversation
   */
  async summarize(messages: Message[]): Promise<string | null> {
    try {
      const response = await fetch(`${API_URL}/ai/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
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
      const response = await fetch(`${API_URL}/ai/health`, {
        credentials: 'include',
      });

      return await response.json();
    } catch (error) {
      console.error('AI health check error:', error);
      return { ai_enabled: false };
    }
  },
};
