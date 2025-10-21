# 🤖 AI-Powered Chat Integration Guide

Complete guide to integrate Claude AI features into your CHATTER BOX chat application.

---

## ✨ Features Included

1. **✅ Smart Reply Suggestions** - AI-generated contextual reply options
2. **🛡️ Content Moderation** - Automatic harmful content detection
3. **🚫 Spam Detection** - Real-time spam filtering
4. **✨ Message Enhancement** - AI-powered message improvement
5. **📝 Conversation Summarization** - Auto-generated chat summaries
6. **⚡ Real-time Safety Checks** - Pre-send content validation

---

## 🚀 Quick Integration

### Option A: Use the AI-Powered Chat Input Component

The easiest way to add AI features is to use the pre-built `AIChatInput` component:

```typescript
import { AIChatInput } from '@/components/chat/ai-chat-input';
import { Message } from '@/lib/types';

function ChatRoom() {
  const [messages, setMessages] = useState<Message[]>([]);
  
  const handleSendMessage = (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      room_id: roomId,
      user_id: user.id,
      username: user.username,
      content: content,
      timestamp: new Date().toISOString(),
      type: 'message'
    };
    
    setMessages([...messages, newMessage]);
    
    // Send to backend/WebSocket
    socket.emit('message', newMessage);
  };

  return (
    <div className="chat-room">
      <MessageList messages={messages} />
      
      {/* AI-Powered Chat Input */}
      <AIChatInput
        onSendMessage={handleSendMessage}
        conversationHistory={messages.slice(-20)} // Last 20 messages
        roomName="General Chat"
        disabled={!connected}
        onTyping={(isTyping) => socket.emit('typing', isTyping)}
      />
    </div>
  );
}
```

### Option B: Manual Integration with Claude API

For custom implementations, use the Claude API directly:

```typescript
import { claudeAPI } from '@/lib/api/claude';

// 1. Check AI Health
const health = await claudeAPI.checkHealth();
console.log('AI enabled:', health.ai_enabled);

// 2. Moderate Content Before Sending
const moderation = await claudeAPI.moderate(messageContent);
if (!moderation.is_safe) {
  toast.error(`Message blocked: ${moderation.reason}`);
  return;
}

// 3. Detect Spam
const spamCheck = await claudeAPI.detectSpam(messageContent);
if (spamCheck.is_spam) {
  toast.error(`Spam detected: ${spamCheck.reason}`);
  return;
}

// 4. Get Smart Reply Suggestions
const recentMessages = messages.slice(-5).map(m => ({
  username: m.username,
  content: m.content
}));
const suggestions = await claudeAPI.suggestReply(recentMessages);
console.log('Suggestions:', suggestions.suggestions);

// 5. Generate AI Response
const response = await claudeAPI.generate(
  'Say hello in a friendly way',
  { maxTokens: 50, temperature: 0.7 }
);
console.log('AI says:', response.response);

// 6. Summarize Conversation
const summary = await claudeAPI.summarize(messages.map(m => ({
  username: m.username,
  content: m.content
})));
console.log('Summary:', summary);
```

---

## 🔧 Integration into Existing Chat Page

### Step 1: Update Room Page

Replace the existing message input in `app/room/[id]/page.tsx`:

```typescript
// Find this section (around line 600):
<div className="border-t border-white/10 p-4 bg-black/20 backdrop-blur-sm sticky bottom-0">
  {/* OLD INPUT */}
  <Textarea ... />
</div>

// Replace with:
import { AIChatInput } from '@/components/chat/ai-chat-input';

<div className="border-t border-white/10 p-4 bg-black/20 backdrop-blur-sm sticky bottom-0">
  <AIChatInput
    onSendMessage={(content) => {
      sendMessage(content);
      setMessage('');
    }}
    conversationHistory={messages.slice(-20)}
    roomName={roomName}
    disabled={!wsConnected}
    onTyping={(isTyping) => {
      socketManager.sendTypingIndicator(isTyping);
    }}
  />
</div>
```

### Step 2: Add Conversation Summarization Button

Add a button to summarize the chat:

```typescript
import { SparklesIcon } from '@heroicons/react/24/outline';

const summarizeConversation = async () => {
  if (messages.length === 0) {
    toast.error('No messages to summarize');
    return;
  }

  const loadingToast = toast.loading('📝 Generating summary...');
  try {
    const recentMessages = messages.slice(-50).map(m => ({
      username: m.username,
      content: m.content
    }));
    
    const summary = await claudeAPI.summarize(recentMessages);
    
    if (summary) {
      // Add summary as system message
      const summaryMessage: Message = {
        id: `summary-${Date.now()}`,
        room_id: roomId,
        user_id: 'system',
        username: 'AI Assistant',
        content: `📝 **Conversation Summary:**\n\n${summary}`,
        timestamp: new Date().toISOString(),
        type: 'system'
      };
      
      setMessages(prev => [...prev, summaryMessage]);
      toast.success('Summary generated!', { id: loadingToast });
    }
  } catch (error) {
    toast.error('Failed to generate summary', { id: loadingToast });
  }
};

// Add button to header
<Button
  onClick={summarizeConversation}
  variant="secondary"
  size="sm"
>
  <SparklesIcon className="w-4 h-4 mr-2" />
  Summarize Chat
</Button>
```

---

## 🎨 Component Props Reference

### AIChatInput Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `onSendMessage` | `(content: string, sender?: string) => void` | ✅ | Callback when message is sent |
| `conversationHistory` | `Message[]` | ❌ | Recent messages for context (default: []) |
| `roomName` | `string` | ❌ | Name of chat room (default: 'Chat Room') |
| `disabled` | `boolean` | ❌ | Disable input (default: false) |
| `onTyping` | `(isTyping: boolean) => void` | ❌ | Typing indicator callback |
| `className` | `string` | ❌ | Additional CSS classes |

---

## 🔌 Claude API Methods

### `checkHealth()`
Check if AI features are available.

**Returns:** `Promise<{ ai_enabled: boolean }>`

```typescript
const health = await claudeAPI.checkHealth();
if (health.ai_enabled) {
  console.log('AI features active!');
}
```

### `generate(prompt, options)`
Generate AI text response.

**Parameters:**
- `prompt: string` - The prompt/question
- `options?: { maxTokens?: number, temperature?: number }`

**Returns:** `Promise<{ response: string, model: string }>`

```typescript
const result = await claudeAPI.generate(
  'Explain quantum computing in simple terms',
  { maxTokens: 100, temperature: 0.7 }
);
console.log(result.response);
```

### `moderate(content)`
Check if content violates policies.

**Returns:** `Promise<{ is_safe: boolean, reason?: string }>`

```typescript
const result = await claudeAPI.moderate('User message here');
if (!result.is_safe) {
  console.log('Blocked:', result.reason);
}
```

### `detectSpam(content)`
Detect if content is spam.

**Returns:** `Promise<{ is_spam: boolean, reason?: string }>`

```typescript
const result = await claudeAPI.detectSpam('Buy now!!!');
if (result.is_spam) {
  console.log('Spam detected:', result.reason);
}
```

### `suggestReply(messages)`
Generate smart reply suggestions.

**Parameters:**
- `messages: Array<{ username: string, content: string }>`

**Returns:** `Promise<{ suggestions: string[] }>`

```typescript
const result = await claudeAPI.suggestReply([
  { username: 'Alice', content: 'Hey everyone!' },
  { username: 'Bob', content: 'How are you?' }
]);
console.log('Suggestions:', result.suggestions);
```

### `summarize(messages)`
Summarize conversation history.

**Parameters:**
- `messages: Array<{ username: string, content: string }>`

**Returns:** `Promise<string | null>`

```typescript
const summary = await claudeAPI.summarize(messages);
console.log('Summary:', summary);
```

---

## 🎯 Features Demo

### 1. Smart Reply Suggestions
- Automatically generated when chat has context
- Shows 1-3 relevant reply options
- Click to use suggestion
- Updates after each message

### 2. Content Moderation
- Runs before sending message
- Blocks harmful, offensive, or inappropriate content
- Shows reason for blocking
- Fail-open design (allows if AI unavailable)

### 3. Spam Detection
- Detects repetitive content
- Identifies promotional messages
- Blocks excessive links
- Catches common spam patterns

### 4. Message Enhancement
- Click "Enhance" button
- AI improves clarity and tone
- Keeps original meaning
- Suggests better wording

### 5. Conversation Summary
- Generates concise overview
- Highlights key points
- Shows main topics discussed
- Useful for long conversations

---

## 🔒 Safety Features

### Fail-Open Design
All AI checks are designed to **fail open** - if the AI service is unavailable, messages are still allowed through. This ensures chat functionality is never blocked by AI issues.

```typescript
// Example: Moderation fails gracefully
try {
  const result = await claudeAPI.moderate(content);
  return result.is_safe;
} catch (error) {
  // AI unavailable - allow message
  return true;
}
```

### Privacy
- Messages are sent to backend for AI processing
- No messages stored by AI provider
- Moderation happens before sending to other users
- Optional feature - can be disabled

---

## 🎨 Customization

### Custom Styling

```typescript
<AIChatInput
  className="bg-purple-900/20 rounded-xl p-6"
  // ... other props
/>
```

### Disable Specific Features

Create a custom wrapper:

```typescript
function SimpleAIChatInput(props) {
  return (
    <AIChatInput
      {...props}
      // Disable suggestions by not showing them
      conversationHistory={[]}
    />
  );
}
```

### Custom AI Prompts

Modify `lib/api/claude.ts` to customize AI behavior:

```typescript
async generate(prompt: string, options: GenerateOptions = {}) {
  // Add custom system prompt
  const enhancedPrompt = `You are a friendly chat assistant. ${prompt}`;
  // ... rest of code
}
```

---

## 🐛 Troubleshooting

### AI Features Not Working

1. **Check Health Endpoint:**
   ```bash
   curl https://web-production-3ba7e.up.railway.app/ai/health
   ```
   Should return: `{"ai_enabled": true, ...}`

2. **Verify API Key:**
   - Railway dashboard → Variables
   - `ANTHROPIC_API_KEY` should start with `sk-ant-`

3. **Check Browser Console:**
   - Open DevTools → Console
   - Look for AI-related errors
   - Check Network tab for failed requests

### Suggestions Not Appearing

- Need at least 1 message in conversation history
- Click "Get Suggestions" button
- Wait 2-3 seconds for AI response
- Check if AI health is enabled

### Messages Getting Blocked

- Review moderation reason in error toast
- Adjust content to be appropriate
- Check backend logs for moderation details
- Moderation is intentionally strict for safety

---

## 📊 Performance

### API Response Times
- **Health Check:** ~100ms
- **Moderation:** ~500ms
- **Spam Detection:** ~400ms
- **Suggestions:** ~1-2 seconds
- **Generation:** ~1-3 seconds
- **Summarization:** ~2-5 seconds

### Optimization Tips
1. Cache health check results (5 minutes)
2. Debounce suggestion requests
3. Run moderation + spam check in parallel
4. Limit conversation history to last 20 messages
5. Show loading states for better UX

---

## 🚀 Next Steps

1. ✅ Test AI features at `/ai-test`
2. ✅ Integrate `AIChatInput` into chat room
3. ✅ Add conversation summarization button
4. ✅ Test moderation with various content
5. ✅ Customize AI prompts for your use case
6. ✅ Monitor AI usage and costs
7. ✅ Deploy to production

---

## 📝 Example: Complete Integration

Here's a complete example of a chat room with all AI features:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { AIChatInput } from '@/components/chat/ai-chat-input';
import { MessageBubble } from '@/components/chat/message-bubble';
import { Button } from '@/components/ui/button';
import { claudeAPI } from '@/lib/api/claude';
import { Message, User } from '@/lib/types';
import toast from 'react-hot-toast';
import { SparklesIcon } from '@heroicons/react/24/outline';

export default function AIEnabledChatRoom() {
  const [user] = useState<User>({ id: '1', username: 'User' });
  const [messages, setMessages] = useState<Message[]>([]);
  const [connected, setConnected] = useState(true);

  const handleSendMessage = (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      room_id: 'room-1',
      user_id: user.id,
      username: user.username,
      content: content,
      timestamp: new Date().toISOString(),
      type: 'message'
    };
    
    setMessages(prev => [...prev, newMessage]);
    // Send to backend here
  };

  const summarizeChat = async () => {
    const loadingToast = toast.loading('Generating summary...');
    try {
      const summary = await claudeAPI.summarize(
        messages.map(m => ({ username: m.username, content: m.content }))
      );
      
      if (summary) {
        const summaryMsg: Message = {
          id: `summary-${Date.now()}`,
          room_id: 'room-1',
          user_id: 'ai',
          username: 'AI Assistant',
          content: `📝 **Summary:**\n\n${summary}`,
          timestamp: new Date().toISOString(),
          type: 'system'
        };
        setMessages(prev => [...prev, summaryMsg]);
        toast.success('Summary generated!', { id: loadingToast });
      }
    } catch (error) {
      toast.error('Failed to generate summary', { id: loadingToast });
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b flex justify-between items-center">
        <h1>AI-Powered Chat</h1>
        <Button onClick={summarizeChat} disabled={messages.length === 0}>
          <SparklesIcon className="w-4 h-4 mr-2" />
          Summarize
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isOwn={msg.user_id === user.id}
          />
        ))}
      </div>

      {/* AI-Powered Input */}
      <div className="p-4 border-t">
        <AIChatInput
          onSendMessage={handleSendMessage}
          conversationHistory={messages.slice(-20)}
          roomName="AI Chat Room"
          disabled={!connected}
        />
      </div>
    </div>
  );
}
```

---

## 🎉 You're All Set!

Your chat application now has enterprise-grade AI features powered by Claude! 🚀

**Key Benefits:**
- ✅ Safer community with automatic moderation
- ✅ Better UX with smart suggestions
- ✅ Reduced spam and abuse
- ✅ Enhanced message quality
- ✅ Conversation insights with summaries

**Questions?** Check the [AI_INTEGRATION_TEST_RESULTS.md](./AI_INTEGRATION_TEST_RESULTS.md) for testing details.
