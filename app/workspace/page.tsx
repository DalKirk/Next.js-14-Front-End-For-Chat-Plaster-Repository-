'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User } from '@/lib/types';
import './workspace.css';
import { WorkspaceLeftRail } from '@/components/workspace/LeftRail';
import { WorkspaceCenterViewport } from '@/components/workspace/CenterViewport';
import { WorkspaceRightRail } from '@/components/workspace/RightRail';
import type { VoiceExposedState } from '@/components/workspace/RightRail';
import { MobileVoiceFAB } from '@/components/workspace/MobileVoiceFAB';
import { GenerationModal } from '@/components/workspace/GenerationModal';
import type { AgentActivityHandle } from '@/components/workspace/AgentActivity';

export type GenerationTool = 'video' | 'image' | 'ideogram' | '3d' | 'image-analysis' | 'transparency' | null;
export type CenterTab = 'gallery' | 'agent' | 'chat';

export interface GalleryItem {
  id: string;
  type: 'image' | 'video' | '3d';
  url: string;
  prompt: string;
  model?: string;
  style?: string;
  duration?: string;
  time?: number;
  createdAt: number;
  kept?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

interface SharedHistoryEntry {
  role: 'user' | 'assistant';
  content: string;
  source: 'chat' | 'agent';
}

const uid = () => Math.random().toString(36).slice(2, 10);

function getSystemPrompt(): string {
  const now = new Date();
  const userDate = now.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const userTime = now.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
  return (
    `You are Star, an AI assistant built into the Starcyeed platform. ` +
    `Your name is Star. You were created by Starcyeed. ` +
    `NEVER refer to yourself as Claude, never mention Anthropic, OpenAI, or any AI company or model. ` +
    `If anyone asks what AI you are or who made you, say you are Star, made by Starcyeed. ` +
    `Never correct users about your name — your name is Star, not Claude. ` +
    `Today's date is ${userDate} and the current time is ${userTime}. ` +
    `Be concise, friendly, and helpful. Respond in the same language the user writes in. ` +
    `You have memory of this conversation — use it to give contextually relevant answers.`
  );
}

export default function WorkspacePage() {
  // ─── Loading screen ───────────────────────────────────
  const [loading, setLoading] = useState(true);
  const loadingAudioRef = useRef<HTMLAudioElement | null>(null);
  const [loadProgress, setLoadProgress] = useState(0);

  useEffect(() => {
    // Pick up audio pre-started from home page click (user gesture context)
    const preAudio = (window as any).__wsLoadingAudio as HTMLAudioElement | undefined;
    if (preAudio) delete (window as any).__wsLoadingAudio;

    const audio = preAudio || new Audio('/previews/audiopapkin-mechanical-sound-design-elements-robot-ps-005-295036.mp3');
    loadingAudioRef.current = audio;

    const FALLBACK_DURATION = 5000;
    const startTime = Date.now();
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      setLoadProgress(100);
      clearInterval(progressInterval);
      clearTimeout(fallbackTimer);
      setTimeout(() => setLoading(false), 300);
    };

    audio.addEventListener('ended', finish);
    audio.addEventListener('error', finish);

    const progressInterval = setInterval(() => {
      if (!audio.paused && audio.duration) {
        setLoadProgress(Math.min((audio.currentTime / audio.duration) * 100, 100));
      } else {
        setLoadProgress(Math.min(((Date.now() - startTime) / FALLBACK_DURATION) * 100, 100));
      }
    }, 50);

    // Always set a max-duration fallback
    const fallbackTimer = setTimeout(finish, FALLBACK_DURATION);

    // If no pre-started audio, try to play (will be blocked on refresh)
    if (!preAudio || preAudio.paused) {
      audio.play().catch(() => { /* blocked — fallback timer handles it */ });
    }

    return () => {
      clearInterval(progressInterval);
      clearTimeout(fallbackTimer);
      audio.removeEventListener('ended', finish);
      audio.removeEventListener('error', finish);
      audio.pause();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── User ─────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('chat-user');
      if (raw) setCurrentUser(JSON.parse(raw));
    } catch { /* ignore */ }

    const onUserChange = () => {
      try {
        const raw = localStorage.getItem('chat-user');
        setCurrentUser(raw ? JSON.parse(raw) : null);
      } catch { /* ignore */ }
    };
    window.addEventListener('storage', onUserChange);
    return () => window.removeEventListener('storage', onUserChange);
  }, []);

  // ─── Layout state ─────────────────────────────────────
  const [activeTab, setActiveTab] = useState<CenterTab>('gallery');
  const [openTool, setOpenTool] = useState<GenerationTool>(null);

  // ─── Gallery ──────────────────────────────────────────
  const [gallery, setGallery] = useState<GalleryItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('ws-gallery');
      if (raw) setGallery(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (gallery.length > 0) {
      try {
        localStorage.setItem('ws-gallery', JSON.stringify(gallery.slice(0, 200)));
      } catch { /* quota */ }
    }
  }, [gallery]);

  const addToGallery = useCallback((item: GalleryItem) => {
    setGallery(prev => [item, ...prev]);
  }, []);

  const removeFromGallery = useCallback((id: string) => {
    setGallery(prev => prev.filter(g => g.id !== id));
  }, []);

  // ─── Shared conversation memory ──────────────────────
  const sharedHistory = useRef<SharedHistoryEntry[]>([]);

  // ─── Chat state ───────────────────────────────────────
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatStreaming, setChatStreaming] = useState(false);
  const chatAbortRef = useRef<AbortController | null>(null);

  // ─── Voice → TTS response ────────────────────────────
  const [voiceResponse, setVoiceResponse] = useState('');
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const lastVoiceContentRef = useRef('');
  const [voiceState, setVoiceState] = useState<VoiceExposedState | null>(null);

  // ─── Agent refs ───────────────────────────────────────
  const agentRef = useRef<AgentActivityHandle | null>(null);
  const [agentRunning, setAgentRunning] = useState(false);
  const [agentContent, setAgentContent] = useState('');
  const voiceTriggeredRef = useRef(false);
  const voiceErrSeq = useRef(0);
  const activeTabRef = useRef<CenterTab>(activeTab);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);
  const prevAgentRunningRef = useRef(false);

  // ─── Strip self-identification ────────────────────────
  const stripIntro = useCallback((text: string): string => {
    const lines = text.split('\n');
    let remove = 0;
    const isGreeting = (s: string) => /\b(hi|hello|hey|welcome)\b/i.test(s);
    const isSelfIntro = (s: string) => /\b(i\s*'?m|i\s*am|my\s*name\s*is)\b/i.test(s);
    const hasClaude = (s: string) => /\bclaude\b/i.test(s);
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      const s = lines[i].trim();
      if (i === 0 && isGreeting(s)) { remove++; continue; }
      if ((isSelfIntro(s) && hasClaude(s)) || hasClaude(s)) { remove++; continue; }
      break;
    }
    return remove > 0 ? lines.slice(remove).join('\n').trimStart().replace(/^\s*claude[:,]?\s*/i, '') : text;
  }, []);

  // ══════════════════════════════════════════════════════
  // CHAT — send message via /api/ai-stream
  // ══════════════════════════════════════════════════════

  const sendChat = useCallback(async (text: string) => {
    if (!text.trim() || chatStreaming) return;

    const msgId = uid();
    const asstId = uid();

    setChatMessages(prev => [
      ...prev,
      { id: msgId, role: 'user', content: text },
      { id: asstId, role: 'assistant', content: '', isStreaming: true },
    ]);
    setChatStreaming(true);
    chatAbortRef.current = new AbortController();

    const chatHistory = sharedHistory.current
      .filter(e => e.source === 'chat')
      .map(e => ({ role: e.role, content: e.content }));

    let fullContent = '';

    try {
      const res = await fetch('/api/ai-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: chatAbortRef.current.signal,
        body: JSON.stringify({
          message: text,
          conversation_history: chatHistory,
          enable_search: false,
          system_prompt: getSystemPrompt(),
        }),
      });

      if (!res.ok || !res.body) throw new Error('Stream failed');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6);
          if (raw === '[DONE]') continue;
          try {
            const parsed = JSON.parse(raw);
            if (parsed.error) {
              setChatMessages(prev => prev.map(m =>
                m.id === asstId ? { ...m, content: `⚠️ ${parsed.error}`, isStreaming: false } : m
              ));
              return;
            }
            if (parsed.content || parsed.text) {
              let chunk = parsed.content || parsed.text;
              if (!fullContent) chunk = stripIntro(chunk);
              fullContent += chunk;
              setChatMessages(prev => prev.map(m =>
                m.id === asstId ? { ...m, content: fullContent } : m
              ));
            }
          } catch { /* skip */ }
        }
      }

      sharedHistory.current = [
        ...sharedHistory.current,
        { role: 'user', content: text, source: 'chat' },
        { role: 'assistant', content: fullContent, source: 'chat' },
      ];
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setChatMessages(prev => prev.map(m =>
        m.id === asstId ? { ...m, content: `⚠️ ${err.message}`, isStreaming: false } : m
      ));
    } finally {
      setChatMessages(prev => prev.map(m =>
        m.id === asstId ? { ...m, isStreaming: false } : m
      ));
      setChatStreaming(false);
    }
  }, [chatStreaming, stripIntro]);

  const clearChat = useCallback(() => {
    setChatMessages([]);
    sharedHistory.current = sharedHistory.current.filter(e => e.source === 'agent');
  }, []);

  // ══════════════════════════════════════════════════════
  // VOICE ROUTING — smart detection (from UnifiedAIPanel)
  // ══════════════════════════════════════════════════════

  // Wrapper: only clear voiceProcessing on genuine true→false transition
  // (not on agent component mount which fires onRunningChange(false) immediately)
  const handleAgentRunningChange = useCallback((running: boolean) => {
    const wasRunning = prevAgentRunningRef.current;
    prevAgentRunningRef.current = running;
    setAgentRunning(running);
    if (wasRunning && !running) setVoiceProcessing(false);
  }, []);

  const handleVoiceSpeech = useCallback(async (text: string) => {
    setVoiceResponse('');
    setVoiceProcessing(true);

    const lower = text.toLowerCase();

    // If user is already on the agent tab, always route to agent
    // so Star has full tool awareness for questions like "what tools do you have?"
    const onAgentTab = activeTabRef.current === 'agent';

    // Auto-detect if this needs the agent (tool-capable)
    const hasAttachedImage = agentRef.current?.hasImage?.() ?? false;
    const needsAgent =
      onAgentTab ||
      hasAttachedImage ||
      /\b(generat|creat|mak|design|draw|render)\w*\s+(a\s+)?(image|picture|photo|logo|thumbnail|3d|model|video)/i.test(lower) ||
      /\b(image|logo|thumbnail|3d|video)\s+(of|for|about|with)/i.test(lower) ||
      /\b(skyreel|sky\s*reel)/i.test(lower) ||
      /\b(nasa|apod|mars rover|iss|space station|earth from space)/i.test(lower) ||
      /\b(search|look up|find|google)\b/i.test(lower) ||
      /\b(tool|capabilit|what can you|what do you|your abilit)/i.test(lower);

    if (needsAgent) {
      voiceTriggeredRef.current = true;
      setActiveTab('agent');
      // Give the agent component time to mount
      await new Promise(r => setTimeout(r, 300));
      if (agentRef.current) {
        agentRef.current.runPrompt(text);
      } else {
        // Agent didn't mount — fall back to chat
        console.warn('[voice] agentRef not available, falling back to chat');
        voiceTriggeredRef.current = false;
        try {
          setActiveTab('chat');
          await sendChat(text);
        } catch (err) {
          console.error('[voice] fallback chat error:', err);
        } finally {
          setVoiceProcessing(false);
        }
        return;
      }
      // Safety timeout: if agent never reports back, unblock after 30s
      setTimeout(() => {
        setVoiceProcessing(prev => {
          if (prev) console.warn('[voice] safety timeout: clearing stuck voiceProcessing');
          return false;
        });
      }, 30000);
    } else {
      try {
        setActiveTab('chat');
        await sendChat(text);
      } catch (err) {
        console.error('[voice] handleVoiceSpeech error:', err);
      } finally {
        setVoiceProcessing(false);
      }
    }
  }, [sendChat]);

  // ══════════════════════════════════════════════════════
  // TTS — speak responses back through voice strip
  // ══════════════════════════════════════════════════════

  // Chat response → voiceResponse
  useEffect(() => {
    if (chatStreaming) return;
    if (voiceProcessing) return;
    const lastMsg = chatMessages[chatMessages.length - 1];
    if (!lastMsg || lastMsg.role !== 'assistant') return;
    if (!lastMsg.content) return;
    if (lastMsg.content === lastVoiceContentRef.current) return;
    lastVoiceContentRef.current = lastMsg.content;
    setVoiceResponse(lastMsg.content);
  }, [chatMessages, chatStreaming, voiceProcessing]);

  // Agent response → voiceResponse (when agent finishes)
  useEffect(() => {
    if (agentRunning) return;
    if (voiceProcessing) return;

    // Voice-triggered run: always provide audio feedback
    if (voiceTriggeredRef.current) {
      voiceTriggeredRef.current = false;
      if (agentContent && agentContent !== lastVoiceContentRef.current) {
        lastVoiceContentRef.current = agentContent;
        setVoiceResponse(agentContent);
      } else {
        // Agent finished with no new content (error / empty) — speak error
        voiceErrSeq.current++;
        setVoiceResponse(
          'Sorry, I ran into an issue. Please try again.' +
          '\u200B'.repeat(voiceErrSeq.current % 10),
        );
      }
      return;
    }

    // Non-voice: existing behaviour
    if (!agentContent) return;
    if (agentContent === lastVoiceContentRef.current) return;
    lastVoiceContentRef.current = agentContent;
    setVoiceResponse(agentContent);
  }, [agentRunning, agentContent, voiceProcessing]);

  // ─── Render ───────────────────────────────────────────
  if (loading) {
    return (
      <div className="ws-loading-screen">
        <div className="ws-loading-gear">
          <svg viewBox="0 0 100 100" width="80" height="80" fill="none">
            <path
              d="M43 7 L57 7 L57 17 A24 24 0 0 1 66.5 20.8 L74 14 L86 26 L79.2 33.5 A24 24 0 0 1 83 43 L93 43 L93 57 L83 57 A24 24 0 0 1 79.2 66.5 L86 74 L74 86 L66.5 79.2 A24 24 0 0 1 57 83 L57 93 L43 93 L43 83 A24 24 0 0 1 33.5 79.2 L26 86 L14 74 L20.8 66.5 A24 24 0 0 1 17 57 L7 57 L7 43 L17 43 A24 24 0 0 1 20.8 33.5 L14 26 L26 14 L33.5 20.8 A24 24 0 0 1 43 17 Z"
              stroke="#c0c8d4"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <circle cx="50" cy="50" r="12" stroke="#c0c8d4" strokeWidth="2" />
          </svg>
        </div>
        <div className="ws-loading-bar-track">
          <div
            className="ws-loading-bar-fill"
            style={{ width: `${loadProgress}%` }}
          />
        </div>
        <p className="ws-loading-text">INITIALIZING WORKSPACE</p>
      </div>
    );
  }

  return (
    <div className="ws-shell">
      <WorkspaceLeftRail
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenTool={setOpenTool}
        currentUser={currentUser}
      />

      <WorkspaceCenterViewport
        activeTab={activeTab}
        onTabChange={setActiveTab}
        gallery={gallery}
        addToGallery={addToGallery}
        removeFromGallery={removeFromGallery}
        onOpenTool={setOpenTool}
        chatMessages={chatMessages}
        chatStreaming={chatStreaming}
        onSendChat={sendChat}
        onClearChat={clearChat}
        sharedTurnCount={Math.floor(sharedHistory.current.length / 2)}
        agentRef={agentRef}
        onAgentRunningChange={handleAgentRunningChange}
        onAgentContentChange={setAgentContent}
      />

      <WorkspaceRightRail
        currentUser={currentUser}
        onVoiceSpeech={handleVoiceSpeech}
        responseText={voiceResponse}
        isProcessing={voiceProcessing}
        onVoiceStateChange={setVoiceState}
      />

      {/* Mobile-only floating voice button (right rail hidden on ≤768px) */}
      {voiceState && (
        <MobileVoiceFAB
          voiceStatus={voiceState.voiceStatus}
          isProcessing={voiceState.isProcessing}
          isActive={voiceState.isActive}
          isMobile={voiceState.isMobile}
          activated={voiceState.activated}
          statusLabel={voiceState.statusLabel}
          statusColor={voiceState.statusColor}
          micRecording={voiceState.micRecording}
          micSpeaking={voiceState.micSpeaking}
          onMicClick={voiceState.onMicClick}
        />
      )}

      {openTool && (
        <GenerationModal
          tool={openTool}
          onClose={() => setOpenTool(null)}
          addToGallery={addToGallery}
        />
      )}
    </div>
  );
}
