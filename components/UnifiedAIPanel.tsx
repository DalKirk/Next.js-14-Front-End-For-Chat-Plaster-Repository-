"use client";

/**
 * UnifiedAIPanel.tsx
 * Single panel combining Chat + Create (agent) + Voice tabs.
 * Shared conversation memory — context flows between tabs.
 *
 * Usage in page.tsx:
 *   import UnifiedAIPanel from "@/components/UnifiedAIPanel";
 *   const [isAIOpen, setIsAIOpen] = useState(false);
 *   <UnifiedAIPanel isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />
 *
 * Replace both the inline chat widget and the AgentPanel with this.
 */

import React, {
  useState, useRef, useEffect, useCallback, memo,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm    from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  X, Sparkles, MessageSquare, Mic,
  Image as ImageIcon, Video, Box, Search, Type,
  Loader2, RotateCcw, Send, Copy, Check,
  Download, Maximize2,
} from "lucide-react";
import VoiceTab from "@/components/VoiceTab";

// ─── Download helper (cross-origin safe) ─────────────────────────────────────
function downloadAsset(url: string) {
  fetch(url)
    .then(r => r.blob())
    .then(blob => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      const ext = url.split(".").pop()?.split("?")[0] ?? "png";
      a.download = `asset_${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    })
    .catch(() => window.open(url, "_blank"));
}

// ─── Shared types ─────────────────────────────────────────────────────────────

interface SharedHistoryEntry {
  role:    "user" | "assistant";
  content: string;
  source:  "chat" | "agent";   // which tab produced this turn
}

// ─── Chat types ───────────────────────────────────────────────────────────────

interface ChatMessage {
  id:          string;
  role:        "user" | "assistant";
  content:     string;
  isStreaming?: boolean;
}

// ─── Agent types ──────────────────────────────────────────────────────────────

type AgentEventType =
  | "status" | "plan" | "tool_start" | "tool_done"
  | "tool_error" | "content" | "summary" | "done" | "error";

interface AgentEvent {
  id:          string;
  type:        AgentEventType;
  text?:       string;
  tool?:       string;
  input?:      Record<string, unknown>;
  result?:     Record<string, unknown>;
  error?:      string;
  cost?:       number;
  assets?:     AgentAsset[];
  total_cost?: number;
}

interface AgentAsset {
  type: "image" | "logo" | "video" | "3d";
  url:  string;
  tool: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TOOL_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  generate_image:     { label: "Generating image",     icon: <ImageIcon className="w-3.5 h-3.5" />, color: "#c084fc" },
  generate_logo:      { label: "Generating logo",      icon: <Type className="w-3.5 h-3.5" />,      color: "#f472b6" },
  generate_thumbnail: { label: "Generating thumbnail", icon: <ImageIcon className="w-3.5 h-3.5" />, color: "#fb923c" },
  generate_video:     { label: "Generating video",     icon: <Video className="w-3.5 h-3.5" />,     color: "#fbbf24" },
  generate_skyreel:   { label: "SkyReels video",       icon: <Video className="w-3.5 h-3.5" />,     color: "#f43f5e" },
  generate_3d:        { label: "Generating 3D model",  icon: <Box className="w-3.5 h-3.5" />,       color: "#67e8f9" },
  web_search:         { label: "Searching the web",    icon: <Search className="w-3.5 h-3.5" />,    color: "#34d399" },
};

const AGENT_EXAMPLES = [
  "Create a logo for a streetwear brand called VOID, dark neon aesthetic",
  "Generate a mood board for a sci-fi film — deep space, abandoned station",
  "Design a YouTube thumbnail for an AI art video with bold text",
];

const AI_SYSTEM_PROMPT =
  `You are Star, the Starcyeed AI assistant. ` +
  `Do not identify as Claude. Be concise and helpful. ` +
  `For image, video, logo or creative generation requests, ` +
  `tell the user to switch to Create mode using the toggle at the top of the Voice tab.`;

const uid = () => Math.random().toString(36).slice(2, 10);

// ─── AgentEventRow ────────────────────────────────────────────────────────────

function AgentEventRow({ event }: { event: AgentEvent }) {
  const meta = event.tool ? TOOL_META[event.tool] : null;

  if (event.type === "status" || event.type === "plan") {
    return (
      <div className="flex items-center gap-2 py-1">
        <Loader2 className="w-3 h-3 animate-spin shrink-0" style={{ color: "rgba(139,92,246,0.6)" }} />
        <span className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>{event.text}</span>
      </div>
    );
  }

  if (event.type === "tool_start") {
    return (
      <div className="flex items-center gap-2.5 py-2 px-3 rounded-lg"
        style={{ background: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.1)" }}>
        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" style={{ color: meta?.color ?? "#c084fc" }} />
        <span className="shrink-0" style={{ color: meta?.color ?? "#c084fc" }}>{meta?.icon}</span>
        <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>{meta?.label ?? event.tool}</span>
        {event.cost ? <span className="ml-auto text-[10px] shrink-0" style={{ color: "rgba(255,255,255,0.25)" }}>{event.cost} cr</span> : null}
      </div>
    );
  }

  if (event.type === "tool_done") {
    const result = event.result as Record<string, unknown> | undefined;
    const urls: string[] = [];
    if (result?.urls && Array.isArray(result.urls)) urls.push(...(result.urls as string[]));
    if (result?.url && typeof result.url === "string" && !urls.includes(result.url as string))
      urls.push(result.url as string);

    const webResults = event.tool === "web_search" && result?.results && Array.isArray(result.results)
      ? (result.results as Array<{ title: string; url: string; snippet: string }>).slice(0, 3)
      : [];

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2.5 py-2 px-3 rounded-lg"
          style={{ background: "rgba(52,211,153,0.04)", border: "1px solid rgba(52,211,153,0.1)" }}>
          <span className="text-xs shrink-0" style={{ color: "#34d399" }}>✓</span>
          <span className="shrink-0" style={{ color: meta?.color ?? "#34d399" }}>{meta?.icon}</span>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>{meta?.label ?? event.tool} complete</span>
          {event.cost ? <span className="ml-auto text-[10px] shrink-0" style={{ color: "rgba(52,211,153,0.5)" }}>-{event.cost} cr</span> : null}
        </div>

        {webResults.length > 0 && (
          <div className="space-y-1.5">
            {webResults.map((r, i) => (
              <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                className="block p-2.5 rounded-lg transition-colors hover:bg-white/5"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="text-xs font-medium mb-0.5 truncate" style={{ color: "#67e8f9" }}>{r.title}</div>
                <div className="text-[10px] leading-relaxed line-clamp-2" style={{ color: "rgba(255,255,255,0.4)" }}>{r.snippet}</div>
              </a>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (event.type === "tool_error") {
    return (
      <div className="flex items-center gap-2.5 py-2 px-3 rounded-lg"
        style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.12)" }}>
        <span className="text-xs shrink-0" style={{ color: "#f87171" }}>✕</span>
        <span className="text-xs" style={{ color: "rgba(248,113,113,0.8)" }}>{event.tool} failed: {event.error}</span>
      </div>
    );
  }

  if (event.type === "error") {
    return (
      <div className="py-2 px-3 rounded-lg text-xs"
        style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.12)", color: "rgba(248,113,113,0.8)" }}>
        ⚠️ {event.error}
      </div>
    );
  }

  return null;
}

// ─── ChatMessage bubble ───────────────────────────────────────────────────────

const ChatBubble = memo(({ message, onCopy, copiedId }: {
  message:  ChatMessage;
  onCopy:   (text: string, id: string) => void;
  copiedId: string | null;
}) => (
  <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
    <div
      className={`max-w-[85%] sm:max-w-[60%] overflow-hidden ${
        message.role === "user"
          ? "rounded-xl px-3 py-2 text-sm"
          : "text-slate-100"
      }`}
      style={message.role === "user" ? { background: "rgba(6,182,212,0.18)", border: "1px solid rgba(6,182,212,0.2)", color: "rgba(255,255,255,0.9)" } : {}}
    >
      {message.role === "assistant" ? (
        <div className="prose prose-sm prose-invert max-w-none break-words text-xs leading-relaxed">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              img({ src, alt, ...props }) {
                if (!src) return null;
                return (
                  <a href={src} target="_blank" rel="noopener noreferrer">
                    <img
                      src={src}
                      alt={alt || ""}
                      loading="lazy"
                      className="rounded-lg my-2"
                      style={{ maxHeight: 320, maxWidth: "55%" }}
                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                      {...props}
                    />
                  </a>
                );
              },
              a({ children, href, ...props }) {
                return <a href={href} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline" {...props}>{children}</a>;
              },
              code({ className, children, ...props }: any) {
                const inline  = !className;
                const match   = /language-(\w+)/.exec(className || "");
                const lang    = match ? match[1] : "";
                const codeStr = String(children).replace(/\n$/, "");
                if (!inline && lang) {
                  return (
                    <div className="relative">
                      <button
                        onClick={() => onCopy(codeStr, codeStr.slice(0, 20))}
                        className="absolute top-2 right-2 p-1 rounded bg-slate-600 hover:bg-slate-500 text-white z-10"
                      >
                        {copiedId === codeStr.slice(0, 20) ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      </button>
                      <SyntaxHighlighter style={vscDarkPlus} language={lang} PreTag="div" className="text-xs rounded-md overflow-x-auto">
                        {codeStr}
                      </SyntaxHighlighter>
                    </div>
                  );
                }
                return <code className={`${className} break-all`} {...props}>{children}</code>;
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
          {message.isStreaming && (
            <span style={{ display: "inline-block", width: 2, height: "1em", background: "rgba(6,182,212,0.8)", animation: "blink 0.8s step-end infinite", verticalAlign: "text-bottom", marginLeft: 2 }} />
          )}
        </div>
      ) : (
        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
      )}
    </div>
  </div>
));
ChatBubble.displayName = "ChatBubble";

// ─── Main component ───────────────────────────────────────────────────────────

type Tab = "chat" | "create" | "voice";

interface UnifiedAIPanelProps {
  isOpen:  boolean;
  onClose: () => void;
  initialTab?: "chat" | "create" | "voice";
  voiceActivated?: boolean;
  onVoiceActivated?: () => void;
}

export default function UnifiedAIPanel({ isOpen, onClose, initialTab, voiceActivated, onVoiceActivated }: UnifiedAIPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab ?? "chat");

  // ── Shared conversation memory ─────────────────────────────────────────────
  // Both Chat and Create read from and write to this shared history.
  // Chat uses it as conversation_history for Claude.
  // Agent uses it so it knows what was discussed in chat.
  const sharedHistory = useRef<SharedHistoryEntry[]>([]);

  // Stable session IDs — both tabs isolated from each other externally
  const chatConvId  = useRef(`chat_${Date.now()}`).current;
  const agentConvId = useRef(`agent_${Date.now()}`).current;

  // ── Chat state ─────────────────────────────────────────────────────────────
  const [chatMessages,  setChatMessages]  = useState<ChatMessage[]>([]);
  const [chatInput,     setChatInput]     = useState("");
  const [chatStreaming,  setChatStreaming]  = useState(false);
  const [copiedId,      setCopiedId]      = useState<string | null>(null);

  // ── Agent state ────────────────────────────────────────────────────────────
  const [agentPrompt,  setAgentPrompt]  = useState("");
  const [agentReply,   setAgentReply]   = useState("");
  const [agentEvents,  setAgentEvents]  = useState<AgentEvent[]>([]);
  const [agentContent, setAgentContent] = useState("");
  const [agentRunning, setAgentRunning] = useState(false);
  const [agentSummary, setAgentSummary] = useState<{ assets: AgentAsset[]; total_cost: number } | null>(null);
  const [agentCost,    setAgentCost]    = useState(0);
  const [agentTurns,   setAgentTurns]   = useState<{ role: string; content: string }[]>([]);

  // ── Voice state ───────────────────────────────────────────────────────────
  const [voiceResponse,   setVoiceResponse]   = useState("");
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [voiceAgentMode,  setVoiceAgentMode]  = useState(true);
  const [starSpeaking,    setStarSpeaking]    = useState(false);

  // Which tab triggered the current agent run
  const [agentOwnerTab, setAgentOwnerTab] = useState<"create" | "voice">("create");

  // ── Refs ───────────────────────────────────────────────────────────────────
  const chatEndRef   = useRef<HTMLDivElement>(null);
  const agentEndRef  = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const agentInputRef = useRef<HTMLTextAreaElement>(null);
  const agentReplyRef = useRef<HTMLInputElement>(null);
  const chatAbortRef  = useRef<AbortController | null>(null);
  const agentAbortRef = useRef<AbortController | null>(null);

  // ── Voice initiated ref — only true when voice tab triggered the request ──────
  const voiceInitiatedRef   = useRef(false);
  const agentWasRunningRef  = useRef(false);

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);
  useEffect(() => { agentEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [agentEvents, agentContent, agentTurns]);

  // ── Focus on tab switch ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    setTimeout(() => {
      if (activeTab === "chat")   chatInputRef.current?.focus();
      if (activeTab === "create") agentInputRef.current?.focus();
    }, 80);
  }, [activeTab, isOpen]);

  useEffect(() => {
    if (!agentRunning && agentContent) setTimeout(() => agentReplyRef.current?.focus(), 80);
  }, [agentRunning, agentContent]);

  // ── Strip self-identification ──────────────────────────────────────────────
  const stripIntro = useCallback((text: string): string => {
    const lines = text.split("\n");
    let remove  = 0;
    const isGreeting  = (s: string) => /\b(hi|hello|hey|welcome)\b/i.test(s);
    const isSelfIntro = (s: string) => /\b(i\s*'?m|i\s*am|my\s*name\s*is)\b/i.test(s);
    const hasClaude   = (s: string) => /\bclaude\b/i.test(s);
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      const s = lines[i].trim();
      if (i === 0 && isGreeting(s)) { remove++; continue; }
      if ((isSelfIntro(s) && hasClaude(s)) || hasClaude(s)) { remove++; continue; }
      break;
    }
    return remove > 0 ? lines.slice(remove).join("\n").trimStart().replace(/^\s*claude[:,]?\s*/i, "") : text;
  }, []);

  // ══════════════════════════════════════════════════════════════════════════
  // CHAT
  // ══════════════════════════════════════════════════════════════════════════

  const sendChat = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || chatStreaming) return;

    const msgId    = uid();
    const asstId   = uid();
    const userMsg: ChatMessage = { id: msgId, role: "user", content: text };

    setChatMessages(prev => [...prev, userMsg, { id: asstId, role: "assistant", content: "", isStreaming: true }]);
    setChatInput("");
    setChatStreaming(true);
    chatAbortRef.current = new AbortController();

    // Build history for Claude — combine shared history (chat turns only) + current message
    const chatHistory = sharedHistory.current
      .filter(e => e.source === "chat")
      .map(e => ({ role: e.role, content: e.content }));

    let fullContent = "";

    try {
      const res = await fetch("/api/ai-stream", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        signal:  chatAbortRef.current.signal,
        body:    JSON.stringify({
          message:              text,
          conversation_history: chatHistory,
          conversation_id:      chatConvId,
          enable_search:        true,
          system_prompt:        AI_SYSTEM_PROMPT,
        }),
      });

      if (!res.ok || !res.body) throw new Error("Stream failed");

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6);
          if (raw === "[DONE]") continue;
          try {
            const parsed = JSON.parse(raw);
            if (parsed.error) {
              setChatMessages(prev => prev.map(m => m.id === asstId ? { ...m, content: `⚠️ ${parsed.error}`, isStreaming: false } : m));
              return;
            }
            if (parsed.content || parsed.text) {
              let chunk = parsed.content || parsed.text;
              if (!fullContent) chunk = stripIntro(chunk);
              fullContent += chunk;
              setChatMessages(prev => prev.map(m => m.id === asstId ? { ...m, content: fullContent } : m));
            }
          } catch { /* skip */ }
        }
      }

      // Save to shared history
      sharedHistory.current = [
        ...sharedHistory.current,
        { role: "user",      content: text,        source: "chat" },
        { role: "assistant", content: fullContent,  source: "chat" },
      ];

    } catch (err: any) {
      if (err.name === "AbortError") return;
      setChatMessages(prev => prev.map(m => m.id === asstId ? { ...m, content: `⚠️ ${err.message}`, isStreaming: false } : m));
    } finally {
      setChatMessages(prev => prev.map(m => m.id === asstId ? { ...m, isStreaming: false } : m));
      setChatStreaming(false);
    }
  }, [chatInput, chatStreaming, chatConvId, stripIntro]);

  const clearChat = useCallback(() => {
    setChatMessages([]);
    sharedHistory.current = sharedHistory.current.filter(e => e.source === "agent");
  }, []);

  // ══════════════════════════════════════════════════════════════════════════
  // AGENT
  // ══════════════════════════════════════════════════════════════════════════

  const resetAgent = useCallback(() => {
    setAgentOwnerTab("create");
    setAgentEvents([]);
    setAgentContent("");
    setAgentSummary(null);
    setAgentCost(0);
    setAgentPrompt("");
    setAgentReply("");
    setAgentTurns([]);
    sharedHistory.current = sharedHistory.current.filter(e => e.source === "chat");
  }, []);

  const runAgent = useCallback(async (promptText: string) => {
    if (!promptText.trim() || agentRunning) return;

    setAgentEvents([]);
    setAgentContent("");
    setAgentSummary(null);
    setAgentRunning(true);
    agentAbortRef.current = new AbortController();

    setAgentTurns(prev => [...prev, { role: "user", content: promptText.trim() }]);

    // Pass ALL shared history so agent knows what was discussed in chat too
    const historyForAgent = sharedHistory.current.map(e => ({
      role:    e.role,
      content: e.content,
    }));

    let fullContent = "";

    try {
      const res = await fetch("/api/agent", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        signal:  agentAbortRef.current.signal,
        body:    JSON.stringify({
          prompt:               promptText.trim(),
          conversation_history: historyForAgent,
          conversation_id:      agentConvId,
          enable_search:        true,
          max_steps:            8,
        }),
      });

      if (!res.ok || !res.body) throw new Error(`Agent failed: ${res.status}`);

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw || raw === "[DONE]") continue;

          try {
            const data: AgentEvent = JSON.parse(raw);

            if (data.type === "done") {
              setAgentRunning(false);
              // Save to shared history
              sharedHistory.current = [
                ...sharedHistory.current,
                { role: "user",      content: promptText.trim(), source: "agent" },
                { role: "assistant", content: fullContent,        source: "agent" },
              ];
              return;
            }

            if (data.type === "content") {
              fullContent += data.text ?? "";
              setAgentContent(fullContent);
              continue;
            }

            if (data.type === "summary") {
              setAgentSummary({ assets: (data as any).assets ?? [], total_cost: (data as any).total_cost ?? 0 });
              setAgentCost((data as any).total_cost ?? 0);
              continue;
            }

            // Replace tool_start with tool_done in place
            if (data.type === "tool_done") {
              if (data.cost) setAgentCost(prev => prev + (data.cost ?? 0));
              setAgentEvents(prev => {
                const idx = [...prev].reverse().findIndex(e => e.type === "tool_start" && e.tool === data.tool);
                if (idx === -1) return [...prev, { ...data, id: uid() }];
                const realIdx = prev.length - 1 - idx;
                const next    = [...prev];
                next[realIdx] = { ...data, id: prev[realIdx].id };
                return next;
              });
              continue;
            }

            setAgentEvents(prev => [...prev, { ...data, id: uid() }]);
          } catch { /* skip */ }
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      setAgentEvents(prev => [...prev, { id: uid(), type: "error", error: err.message ?? "Something went wrong" }]);
    } finally {
      setAgentRunning(false);
    }
  }, [agentRunning, agentConvId]);

  const submitAgentPrompt = useCallback(() => {
    setAgentOwnerTab("create");
    const text = agentPrompt.trim();
    setAgentPrompt("");
    runAgent(text);
  }, [agentPrompt, runAgent]);

  const submitAgentReply = useCallback(() => {
    setAgentOwnerTab("create");
    const text = agentReply.trim();
    if (!text) return;
    setAgentReply("");
    runAgent(text);
  }, [agentReply, runAgent]);

  const copyCode = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  // ── Voice speech handler — routes to chat or agent ─────────────────────────
  const handleVoiceSpeech = useCallback(async (text: string) => {
    setVoiceProcessing(true);
    voiceInitiatedRef.current = true;
    setAgentOwnerTab("voice");
    try {
      if (voiceAgentMode) {
        // Agent mode — runAgent streams content
        // voiceResponse will be set ONCE when agent finishes (see useEffect below)
        await runAgent(text);
      } else {
        // Chat mode — inline fetch
        const msgId  = uid();
        const asstId = uid();
        setChatMessages(prev => [
          ...prev,
          { id: msgId,  role: "user",      content: text },
          { id: asstId, role: "assistant",  content: "", isStreaming: true },
        ]);
        setChatStreaming(true);

        const chatHistory = sharedHistory.current
          .filter(e => e.source === "chat")
          .map(e => ({ role: e.role, content: e.content }));

        let fullContent = "";

        const res = await fetch("/api/ai-stream", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            message:              text,
            conversation_history: chatHistory,
            conversation_id:      chatConvId,
            enable_search:        false,  // faster for voice
            system_prompt:        AI_SYSTEM_PROMPT,
          }),
        });

        if (res.ok && res.body) {
          const reader  = res.body.getReader();
          const decoder = new TextDecoder();
          let   buffer  = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const raw = line.slice(6);
              if (raw === "[DONE]") continue;
              try {
                const parsed = JSON.parse(raw);
                if (parsed.content || parsed.text) {
                  fullContent += parsed.content || parsed.text;
                  setChatMessages(prev => prev.map(m =>
                    m.id === asstId ? { ...m, content: fullContent } : m
                  ));
                }
              } catch { /* skip */ }
            }
          }
        }

        setChatMessages(prev => prev.map(m =>
          m.id === asstId ? { ...m, isStreaming: false } : m
        ));
        setChatStreaming(false);
        sharedHistory.current = [
          ...sharedHistory.current,
          { role: "user",      content: text,        source: "chat" },
          { role: "assistant", content: fullContent,  source: "chat" },
        ];

        // Set voice response ONCE for chat — only if voice initiated
        if (voiceInitiatedRef.current) {
          voiceInitiatedRef.current = false;
          setVoiceResponse(fullContent);
        }
      }
    } catch (err) {
      console.error("[voice] handleVoiceSpeech error:", err);
      voiceInitiatedRef.current = false;
    } finally {
      setVoiceProcessing(false);
    }
  }, [voiceAgentMode, runAgent, chatConvId]);

  // ── Voice response from agent — fires ONCE when agent finishes ───────────────
  // Only triggers when voice tab initiated the request AND agent just finished
  useEffect(() => {
    if (!voiceInitiatedRef.current) return;
    if (agentRunning) {
      agentWasRunningRef.current = true;
      return;
    }
    // Agent just finished (was running, now stopped)
    if (agentWasRunningRef.current && agentContent) {
      agentWasRunningRef.current = false;
      voiceInitiatedRef.current  = false;
      // Only speak if still on voice tab
      if (activeTab === "voice") {
        setVoiceResponse(agentContent);
      }
    }
  }, [agentRunning, agentContent, activeTab]);

  if (!isOpen) return null;

  const agentHasActivity = agentOwnerTab === "create" && (agentEvents.length > 0 || agentContent || agentSummary || agentTurns.length > 0);
  const showReplyBar     = !agentRunning && agentContent;

  // ── Tab config ─────────────────────────────────────────────────────────────
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "chat",   label: "Chat",   icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { id: "create", label: "Create", icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: "voice",  label: "Voice",  icon: <Mic className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="fixed" style={{ inset: 0, zIndex: 2000, width: "100vw", height: "100dvh", padding: 8, overflow: "hidden" }}>
      <div className={starSpeaking ? "ai-chat-speaking-border" : "ai-chat-rainbow-border"} style={{ inset: 0, borderRadius: 0 }} />

      <div className="flex flex-col overflow-hidden relative"
        style={{ width: "100%", height: "100%", borderRadius: 6, background: "rgba(8,8,15,0.98)", backdropFilter: "blur(20px)", zIndex: 1 }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid rgba(139,92,246,0.08)" }}>

          {/* Tabs */}
          <div className="flex items-center gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
                style={{
                  background:   activeTab === tab.id ? "rgba(139,92,246,0.12)" : "transparent",
                  border:       activeTab === tab.id ? "1px solid rgba(139,92,246,0.25)" : "1px solid transparent",
                  color:        activeTab === tab.id ? "rgba(192,132,252,0.9)"  : "rgba(255,255,255,0.35)",
                  fontWeight:   activeTab === tab.id ? 600 : 400,
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}

            {/* Context indicator */}
            {sharedHistory.current.length > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full ml-1"
                style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.12)", color: "rgba(52,211,153,0.6)" }}>
                {Math.floor(sharedHistory.current.length / 2)} shared
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {activeTab === "chat" && chatMessages.length > 0 && (
              <button onClick={clearChat}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] transition-all hover:bg-white/5"
                style={{ color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <RotateCcw className="w-3 h-3" /> Clear
              </button>
            )}
            {activeTab === "create" && agentHasActivity && !agentRunning && (
              <button onClick={resetAgent}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] transition-all hover:bg-white/5"
                style={{ color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <RotateCcw className="w-3 h-3" /> New
              </button>
            )}
            {agentRunning && activeTab === "create" && (
              <span className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", color: "rgba(192,132,252,0.8)" }}>
                running
              </span>
            )}
            <button
              onClick={() => { chatAbortRef.current?.abort(); agentAbortRef.current?.abort(); onClose(); }}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:scale-110"
              style={{ background: "rgba(255,60,60,0.15)", border: "1px solid rgba(255,60,60,0.3)" }}
              aria-label="Close">
              <X className="w-5 h-5" style={{ color: "#ff4444", filter: "drop-shadow(0 0 4px rgba(255,68,68,0.5))" }} />
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            CHAT TAB
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "chat" && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 agent-scrollbar">
              {chatMessages.length === 0 && (
                <div className="text-center text-xs py-8" style={{ color: "rgba(255,255,255,0.2)" }}>
                  Ask me anything — code, research, creative writing, platform help.
                  {sharedHistory.current.length > 0 && (
                    <p className="mt-1" style={{ color: "rgba(52,211,153,0.5)" }}>
                      I remember {Math.floor(sharedHistory.current.length / 2)} turn{Math.floor(sharedHistory.current.length / 2) !== 1 ? "s" : ""} from this session.
                    </p>
                  )}
                </div>
              )}
              {chatMessages.map(msg => (
                <ChatBubble key={msg.id} message={msg} onCopy={copyCode} copiedId={copiedId} />
              ))}
              {chatStreaming && chatMessages[chatMessages.length - 1]?.role !== "assistant" && (
                <div className="flex justify-start">
                  <div className="flex space-x-1.5 px-3 py-2 rounded-xl"
                    style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.1)" }}>
                    {[0, 150, 300].map(d => (
                      <div key={d} className="w-1.5 h-1.5 rounded-full animate-bounce"
                        style={{ background: "rgba(192,132,252,0.6)", animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="px-3 py-2.5 shrink-0" style={{ borderTop: "1px solid rgba(139,92,246,0.06)" }}>
              <div className="flex gap-2 items-end rounded-xl p-2 transition-all"
                style={{ background: "rgba(139,92,246,0.04)", border: `1px solid ${chatStreaming ? "rgba(139,92,246,0.25)" : "rgba(139,92,246,0.1)"}` }}>
                <textarea
                  ref={chatInputRef}
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                  placeholder="Ask anything…"
                  disabled={chatStreaming}
                  rows={1}
                  className="flex-1 resize-none text-xs outline-none disabled:opacity-50 bg-transparent"
                  style={{ color: "rgba(255,255,255,0.85)", lineHeight: 1.6, paddingLeft: 4 }}
                />
                <button
                  onClick={sendChat}
                  disabled={!chatInput.trim() || chatStreaming}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30 shrink-0"
                  style={{ background: chatStreaming ? "rgba(139,92,246,0.1)" : "linear-gradient(135deg, rgba(6,182,212,0.7), rgba(139,92,246,0.7))", border: "1px solid rgba(139,92,246,0.2)" }}>
                  <Send className="w-3.5 h-3.5" style={{ color: "#f0e6ff" }} />
                </button>
              </div>
              <p className="text-[10px] mt-1 px-1" style={{ color: "rgba(255,255,255,0.15)" }}>
                Enter to send · Shift+Enter for new line · Context shared with Create tab
              </p>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            CREATE TAB (agent)
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "create" && (
          <>
            {/* Prompt input — only shown before first run */}
            {!agentHasActivity && (
              <div className="px-4 py-3 shrink-0" style={{ borderBottom: "1px solid rgba(139,92,246,0.06)" }}>
                <div className="flex gap-2 rounded-xl p-2 transition-all"
                  style={{ background: "rgba(139,92,246,0.04)", border: "1px solid rgba(139,92,246,0.1)" }}>
                  <textarea
                    ref={agentInputRef}
                    value={agentPrompt}
                    onChange={e => setAgentPrompt(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitAgentPrompt(); } }}
                    placeholder="Describe what you want to create…"
                    disabled={agentRunning}
                    rows={2}
                    className="flex-1 resize-none text-xs outline-none disabled:opacity-50 bg-transparent"
                    style={{ color: "rgba(255,255,255,0.85)", lineHeight: 1.6, paddingLeft: 4 }}
                  />
                  <button
                    onClick={submitAgentPrompt}
                    disabled={!agentPrompt.trim()}
                    className="self-end px-3 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-30 shrink-0"
                    style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.8), rgba(139,92,246,0.8))", border: "1px solid rgba(139,92,246,0.3)", color: "#f0e6ff", boxShadow: "0 0 16px rgba(139,92,246,0.2)" }}>
                    Create →
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {AGENT_EXAMPLES.slice(0, 3).map((p, i) => (
                    <button key={i} onClick={() => setAgentPrompt(p)}
                      className="text-[10px] px-2.5 py-1 rounded-full transition-all hover:border-[rgba(139,92,246,0.3)]"
                      style={{ background: "rgba(139,92,246,0.04)", border: "1px solid rgba(139,92,246,0.1)", color: "rgba(255,255,255,0.35)" }}>
                      {p.slice(0, 42)}…
                    </button>
                  ))}
                </div>
                {sharedHistory.current.length > 0 && (
                  <p className="text-[10px] mt-2 px-1" style={{ color: "rgba(52,211,153,0.5)" }}>
                    ✦ Agent has context from your Chat tab — {Math.floor(sharedHistory.current.length / 2)} turn{Math.floor(sharedHistory.current.length / 2) !== 1 ? "s" : ""} shared
                  </p>
                )}
              </div>
            )}

            {/* Activity feed */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-0 agent-scrollbar">

              {/* Empty state */}
              {!agentHasActivity && !agentRunning && (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-8">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.12)" }}>
                    <Sparkles className="w-6 h-6" style={{ color: "rgba(192,132,252,0.6)" }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>Your creative agent</p>
                    <p className="text-xs leading-relaxed max-w-[240px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                      Logos, images, videos, mood boards. The agent picks the right tools automatically.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-1.5 max-w-[280px]">
                    {Object.entries(TOOL_META).map(([key, meta]) => (
                      <div key={key} className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px]"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: meta.color }}>
                        {meta.icon}
                        <span style={{ color: "rgba(255,255,255,0.35)" }}>
                          {meta.label.replace("Generating ", "").replace("Searching the ", "")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Current user prompt bubble — only show if Create tab owns this run */}
              {agentOwnerTab === "create" && agentTurns.length > 0 && (
                <div className="flex justify-end mb-1">
                  <div className="max-w-[80%] px-3 py-2 rounded-xl text-xs"
                    style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.15)", color: "rgba(255,255,255,0.75)" }}>
                    {agentTurns[agentTurns.length - 1].content}
                  </div>
                </div>
              )}

              {agentOwnerTab === "create" && agentEvents.map(event => <AgentEventRow key={event.id} event={event} />)}

              {/* Streaming final answer — strip image/video markdown, show text only */}
              {agentOwnerTab === "create" && agentContent && (() => {
                const textOnly = agentContent
                  .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
                  .replace(/\[([^\]]*)\]\(https?:\/\/[^)]+\)/g, "$1")
                  .replace(/https?:\/\/\S+\.(png|jpg|jpeg|gif|webp|mp4|webm|mov|glb)(\?\S*)?\s*/gi, "")
                  .replace(/\n{3,}/g, "\n\n")
                  .trim();
                return textOnly ? (
                <div className="py-3 px-3 rounded-xl text-xs leading-relaxed prose prose-sm prose-invert max-w-none"
                  style={{ background: "transparent", color: "rgba(255,255,255,0.75)" }}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a({ children, href, ...props }) {
                        return <a href={href} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline" {...props}>{children}</a>;
                      },
                    }}
                  >
                    {textOnly}
                  </ReactMarkdown>
                  {agentRunning && (
                    <span style={{ display: "inline-block", width: 2, height: "1em", background: "rgba(192,132,252,0.8)", animation: "blink 0.8s step-end infinite", verticalAlign: "text-bottom", marginLeft: 2 }} />
                  )}
                </div>
                ) : agentRunning ? (
                  <div className="flex items-center gap-2 py-2">
                    <Loader2 className="w-3 h-3 animate-spin" style={{ color: "rgba(139,92,246,0.6)" }} />
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Generating…</span>
                  </div>
                ) : null;
              })()}

              {/* Summary asset grid — from summary event, or fallback from tool_done results */}
              {agentOwnerTab === "create" && (() => {
                let assets: { type: string; url: string; tool: string }[] = [];
                if (agentSummary && agentSummary.assets.length > 0) {
                  assets = agentSummary.assets;
                } else {
                  const seen = new Set<string>();
                  for (const ev of agentEvents) {
                    if (ev.type !== "tool_done" || !ev.result) continue;
                    const r = ev.result as Record<string, unknown>;
                    for (const key of ["urls", "url", "video_url", "output_url", "model_url"]) {
                      const val = r[key];
                      const list = Array.isArray(val) ? val : val ? [val] : [];
                      for (const u of list) {
                        if (typeof u === "string" && !seen.has(u)) {
                          seen.add(u);
                          const isVid = ev.tool === "generate_video" || ev.tool === "generate_skyreel";
                          const is3d  = ev.tool === "generate_3d";
                          assets.push({ type: isVid ? "video" : is3d ? "3d" : "image", url: u, tool: ev.tool ?? "" });
                        }
                      }
                    }
                  }
                }
                if (assets.length === 0) return null;
                return (
                  <div className="rounded-xl p-3" style={{ background: "rgba(52,211,153,0.04)", border: "1px solid rgba(52,211,153,0.1)" }}>
                    <div className="text-[10px] mb-2 flex items-center justify-between" style={{ color: "rgba(52,211,153,0.7)" }}>
                      <span>✓ {assets.length} asset{assets.length !== 1 ? "s" : ""} created</span>
                      {agentSummary ? <span>{agentSummary.total_cost} credits used</span> : null}
                    </div>
                    <div className="grid gap-3 grid-cols-2">
                      {assets.map((asset, i) => {
                        if (!asset.url) return null;
                        const isAssetVideo = asset.type === "video";
                        const isAsset3D = asset.type === "3d";
                        const toolMeta = asset.tool ? TOOL_META[asset.tool] : null;
                        return (
                          <div
                            key={i}
                            className="agent-asset-card"
                            style={{
                              padding: 1,
                              borderRadius: 8,
                              cursor: "pointer",
                              transition: "all 0.3s",
                              background: "linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))",
                            }}
                          >
                            <div style={{ borderRadius: 7, overflow: "hidden", background: "rgba(8,8,15,0.9)" }}>
                              <div
                                style={{
                                  position: "relative",
                                  aspectRatio: isAssetVideo ? "4/3" : isAsset3D ? undefined : "1/1",
                                  background: `linear-gradient(135deg,${(toolMeta?.color ?? "#c084fc")}15,${(toolMeta?.color ?? "#c084fc")}10)`,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  overflow: "hidden",
                                }}
                              >
                                {isAssetVideo ? (
                                  <video
                                    src={asset.url}
                                    controls
                                    preload="metadata"
                                    muted
                                    loop
                                    playsInline
                                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                  />
                                ) : isAsset3D ? (
                                  <div className="flex flex-col items-center gap-1 py-4">
                                    <Box className="w-6 h-6" style={{ color: "#67e8f9" }} />
                                    <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.5)" }}>3D Model</span>
                                  </div>
                                ) : (
                                  <img
                                    src={asset.url}
                                    alt={`Asset ${i + 1}`}
                                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                                  />
                                )}
                                <div
                                  className="agent-asset-overlay"
                                  onClick={e => e.stopPropagation()}
                                >
                                  <button
                                    onClick={() => downloadAsset(asset.url)}
                                    title="Download"
                                    style={{
                                      padding: 8,
                                      borderRadius: 6,
                                      background: "rgba(255,255,255,0.12)",
                                      border: "1px solid rgba(255,255,255,0.12)",
                                      color: "#fff",
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                    }}
                                  >
                                    <Download size={14} />
                                  </button>
                                  <a
                                    href={asset.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Open full size"
                                    style={{
                                      padding: 8,
                                      borderRadius: 6,
                                      background: "rgba(255,255,255,0.12)",
                                      border: "1px solid rgba(255,255,255,0.12)",
                                      color: "#fff",
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                    }}
                                  >
                                    <Maximize2 size={14} />
                                  </a>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              <div ref={agentEndRef} />
            </div>

            {/* Reply bar */}
            {agentOwnerTab === "create" && showReplyBar && (
              <div className="px-4 py-3 shrink-0" style={{ borderTop: "1px solid rgba(139,92,246,0.08)" }}>
                <div className="flex gap-2 items-center rounded-xl px-3 py-2"
                  style={{ background: "rgba(139,92,246,0.04)", border: "1px solid rgba(139,92,246,0.12)" }}>
                  <input
                    ref={agentReplyRef}
                    value={agentReply}
                    onChange={e => setAgentReply(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); submitAgentReply(); } }}
                    placeholder="Refine or continue… e.g. 'Make it more minimal'"
                    className="flex-1 text-xs outline-none bg-transparent"
                    style={{ color: "rgba(255,255,255,0.8)" }}
                  />
                  <button onClick={submitAgentReply} disabled={!agentReply.trim()}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-30 shrink-0"
                    style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.8), rgba(139,92,246,0.8))", border: "1px solid rgba(139,92,246,0.3)", color: "#f0e6ff" }}>
                    Run →
                  </button>
                </div>
                <p className="text-[10px] mt-1.5 px-1" style={{ color: "rgba(255,255,255,0.2)" }}>
                  Agent remembers this session ·{" "}
                  <button onClick={resetAgent} className="underline" style={{ color: "rgba(255,255,255,0.3)" }}>
                    Start new session
                  </button>
                </p>
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            VOICE TAB
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "voice" && (
          <VoiceTab
            onUserSpeech={handleVoiceSpeech}
            responseText={voiceResponse}
            isProcessing={voiceProcessing}
            sharedTurns={Math.floor(sharedHistory.current.length / 2)}
            useAgentMode={voiceAgentMode}
            onToggleMode={() => setVoiceAgentMode(v => !v)}
            onSpeakingChange={setStarSpeaking}
          />
        )}

      </div>
    </div>
  );
}
