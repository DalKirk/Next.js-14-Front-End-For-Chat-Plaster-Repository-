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
} from "lucide-react";
import VoiceTab from "@/components/VoiceTab";

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
  get_location:       { label: "Getting location",     icon: <Search className="w-3.5 h-3.5" />,    color: "#38bdf8" },
  get_nasa_apod:      { label: "NASA Picture of Day",  icon: <Sparkles className="w-3.5 h-3.5" />,  color: "#818cf8" },
  get_nasa_mars:      { label: "Mars rover photos",    icon: <Sparkles className="w-3.5 h-3.5" />,  color: "#f97316" },
  get_nasa_epic:      { label: "Earth from space",     icon: <Sparkles className="w-3.5 h-3.5" />,  color: "#34d399" },
  get_iss_location:   { label: "ISS location",         icon: <Sparkles className="w-3.5 h-3.5" />,  color: "#a78bfa" },
  get_iss_live:       { label: "ISS live stream",      icon: <Video className="w-3.5 h-3.5" />,     color: "#f43f5e" },
  get_nasa_live:      { label: "NASA TV live",         icon: <Video className="w-3.5 h-3.5" />,     color: "#ef4444" },
};

const AGENT_EXAMPLES = [
  "Create a logo for a streetwear brand called VOID, dark neon aesthetic",
  "Show me today's NASA space image and create artwork inspired by it",
  "Show me the ISS live stream",
];

const AI_SYSTEM_PROMPT =
  `You are Star, an AI assistant built into the Starcyeed platform. ` +
  `Your name is Star. You were created by Starcyeed. ` +
  `NEVER refer to yourself as Claude, never mention Anthropic, OpenAI, or any AI company or model. ` +
  `If anyone asks what AI you are or who made you, say you are Star, made by Starcyeed. ` +
  `Never correct users about your name — your name is Star, not Claude. ` +
  `Today's date is ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}. ` +
  `Be concise, friendly, and helpful. Respond in the same language the user writes in. ` +
  `You have memory of this conversation — use it to give contextually relevant answers.`;

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
    console.log("[AgentEventRow] result:", JSON.stringify(result))
    const urls: string[] = [];
    if (result?.urls && Array.isArray(result.urls)) urls.push(...(result.urls as string[]));
    if (result?.url && typeof result.url === "string" && !urls.includes(result.url as string))
      urls.push(result.url as string);

    // ── YouTube embed (ISS live / NASA TV) ──────────────────────────────────────
    const embedUrl = result?.embed_url as string | undefined;
    const embedType = result?.embed_type as string | undefined;
    console.log("[AgentEventRow] embedType:", embedType, "embedUrl:", embedUrl)

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2.5 py-2 px-3 rounded-lg"
          style={{ background: "rgba(52,211,153,0.04)", border: "1px solid rgba(52,211,153,0.1)" }}>
          <span className="text-xs shrink-0" style={{ color: "#34d399" }}>✓</span>
          <span className="shrink-0" style={{ color: meta?.color ?? "#34d399" }}>{meta?.icon}</span>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>{meta?.label ?? event.tool} complete</span>
          {event.cost ? <span className="ml-auto text-[10px] shrink-0" style={{ color: "rgba(52,211,153,0.5)" }}>-{event.cost} cr</span> : null}
        </div>

        {/* YouTube live embed */}
        {embedType === "youtube" && !!embedUrl && (
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(139,92,246,0.2)" }}>
            <div className="px-3 py-2 flex items-center justify-between"
              style={{ background: "rgba(139,92,246,0.08)", borderBottom: "1px solid rgba(139,92,246,0.1)" }}>
              <span className="text-xs font-medium" style={{ color: "rgba(192,132,252,0.9)" }}>
                {String(result?.title ?? "Live Stream")}
              </span>
              <a href={String(result?.watch_url ?? "#")} target="_blank" rel="noopener noreferrer"
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: "rgba(255,0,0,0.15)", border: "1px solid rgba(255,0,0,0.25)", color: "rgba(255,100,100,0.9)" }}>
                ● LIVE
              </a>
            </div>
            <div style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
              <iframe
                src={embedUrl}
                title={String(result?.title ?? "Live Stream")}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
              />
            </div>
            {!!result?.iss_location && (
              <div className="px-3 py-2 text-[10px]" style={{ color: "rgba(255,255,255,0.4)", background: "rgba(0,0,0,0.3)" }}>
                ISS currently {String(result.iss_location)} · {408}km altitude · 27,600 km/h
              </div>
            )}
          </div>
        )}

        {/* Regular image grid */}
        {urls.length > 0 && !embedType && (
          <div className={`grid gap-2 ${urls.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
            {urls.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                className="block rounded-lg overflow-hidden transition-transform hover:scale-[1.02]"
                style={{ border: "1px solid rgba(139,92,246,0.15)" }}>
                <img src={url} alt={`Generated ${event.tool} ${i + 1}`}
                  className="w-full object-cover" style={{ maxHeight: 200 }}
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
              </a>
            ))}
          </div>
        )}

        {/* NASA APOD — show image + explanation */}
        {(event.tool === "get_nasa_apod" && result && typeof result.url === "string") ? (
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(139,92,246,0.15)" }}>
            <img src={result.url} alt={String(result.title ?? "NASA APOD")}
              className="w-full object-cover" style={{ maxHeight: 220 }}
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
            {typeof result.title === "string" && (
              <div className="px-3 py-2" style={{ background: "rgba(0,0,0,0.4)" }}>
                <p className="text-xs font-medium mb-1" style={{ color: "rgba(192,132,252,0.9)" }}>{result.title}</p>
                {typeof result.date === "string" && <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>{result.date} · {String(result.copyright ?? "NASA")}</p>}
              </div>
            )}
          </div>
        ) : null}

        {/* ISS location info */}
        {event.tool === "get_iss_location" && result?.latitude !== undefined && (
          <div className="px-3 py-2.5 rounded-xl text-xs space-y-1"
            style={{ background: "rgba(52,211,153,0.04)", border: "1px solid rgba(52,211,153,0.1)" }}>
            <p style={{ color: "rgba(52,211,153,0.9)" }}>🛰 ISS is currently {String(result.location)}</p>
            <p style={{ color: "rgba(255,255,255,0.4)" }}>
              {(result.latitude as number).toFixed(2)}°, {(result.longitude as number).toFixed(2)}° · {408}km altitude
            </p>
          </div>
        )}

        {/* Location info */}
        {event.tool === "get_location" && !!result?.city && (
          <div className="px-3 py-2.5 rounded-xl text-xs space-y-1"
            style={{ background: "rgba(6,182,212,0.04)", border: "1px solid rgba(6,182,212,0.1)" }}>
            <p style={{ color: "rgba(6,182,212,0.9)" }}>📍 {String(result.city)}, {String(result.country)}</p>
            <p style={{ color: "rgba(255,255,255,0.4)" }}>{String(result.timezone)}</p>
          </div>
        )}

        {/* Web search results */}
        {event.tool === "web_search" && !!result?.results && Array.isArray(result.results) && (
          <div className="space-y-1.5">
            {(result.results as Array<{ title: string; url: string; snippet: string }>).slice(0, 3).map((r, i) => (
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
      className={`max-w-[85%] overflow-hidden ${
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
}

export default function UnifiedAIPanel({ isOpen, onClose }: UnifiedAIPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("chat");

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
  const [voiceAgentMode,  setVoiceAgentMode]  = useState(false);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const chatEndRef   = useRef<HTMLDivElement>(null);
  const agentEndRef  = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const agentInputRef = useRef<HTMLTextAreaElement>(null);
  const agentReplyRef = useRef<HTMLInputElement>(null);
  const chatAbortRef  = useRef<AbortController | null>(null);
  const agentAbortRef = useRef<AbortController | null>(null);

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
              console.log("[runAgent] tool_done result:", JSON.stringify(data.result))
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
    const text = agentPrompt.trim();
    setAgentPrompt("");
    runAgent(text);
  }, [agentPrompt, runAgent]);

  const submitAgentReply = useCallback(() => {
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
    try {
      if (voiceAgentMode) {
        await runAgent(text);
      } else {
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
            enable_search:        false,
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
      }
    } catch (err) {
      console.error("[voice] handleVoiceSpeech error:", err);
    } finally {
      setVoiceProcessing(false);
    }
  }, [voiceAgentMode, runAgent, chatConvId]);

  // ── Voice response — speaks whenever Voice tab is open ───────────────────────
  // Fires for ANY response (typed or spoken) as long as Voice tab is active.

  // Track last spoken content to avoid double-speak
  const lastVoiceContentRef = useRef("")

  // Chat response → speak if on Voice tab
  useEffect(() => {
    if (activeTab !== "voice") return
    if (chatStreaming) return
    const lastMsg = chatMessages[chatMessages.length - 1]
    if (!lastMsg || lastMsg.role !== "assistant") return
    if (!lastMsg.content) return
    if (lastMsg.content === lastVoiceContentRef.current) return
    lastVoiceContentRef.current = lastMsg.content
    setVoiceResponse(lastMsg.content)
  }, [chatMessages, chatStreaming, activeTab])

  // Agent response → speak if on Voice tab, fires once when agent finishes
  useEffect(() => {
    if (activeTab !== "voice") return
    if (agentRunning) return
    if (!agentContent) return
    if (agentContent === lastVoiceContentRef.current) return
    // Only speak agent content if voice initiated OR user is on voice tab
    lastVoiceContentRef.current = agentContent
    setVoiceResponse(agentContent)
  }, [agentRunning, agentContent, activeTab])

  if (!isOpen) return null;

  const agentHasActivity = agentEvents.length > 0 || agentContent || agentSummary || agentTurns.length > 0;
  const showReplyBar     = !agentRunning && agentContent;

  // ── Tab config ─────────────────────────────────────────────────────────────
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "chat",   label: "Chat",   icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { id: "create", label: "Create", icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: "voice",  label: "Voice",  icon: <Mic className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="fixed" style={{ inset: 0, zIndex: 2000, width: "100vw", height: "100dvh", padding: 8, overflow: "hidden" }}>
      <div className="ai-chat-rainbow-border" style={{ inset: 0, borderRadius: 0 }} />

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
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
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
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-0">

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

              {/* Current user prompt bubble */}
              {agentTurns.length > 0 && (
                <div className="flex justify-end mb-1">
                  <div className="max-w-[80%] px-3 py-2 rounded-xl text-xs"
                    style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.15)", color: "rgba(255,255,255,0.75)" }}>
                    {agentTurns[agentTurns.length - 1].content}
                  </div>
                </div>
              )}

              {agentEvents.map(event => <AgentEventRow key={event.id} event={event} />)}

              {/* Streaming answer */}
              {agentContent && (
                <div className="py-3 px-3 rounded-xl text-xs leading-relaxed"
                  style={{ background: "rgba(139,92,246,0.04)", border: "1px solid rgba(139,92,246,0.08)", color: "rgba(255,255,255,0.75)", whiteSpace: "pre-wrap" }}>
                  {agentContent}
                  {agentRunning && (
                    <span style={{ display: "inline-block", width: 2, height: "1em", background: "rgba(192,132,252,0.8)", animation: "blink 0.8s step-end infinite", verticalAlign: "text-bottom", marginLeft: 2 }} />
                  )}
                </div>
              )}

              {/* Summary grid */}
              {agentSummary && agentSummary.assets.length > 0 && (
                <div className="rounded-xl p-3" style={{ background: "rgba(52,211,153,0.04)", border: "1px solid rgba(52,211,153,0.1)" }}>
                  <div className="text-[10px] mb-2 flex items-center justify-between" style={{ color: "rgba(52,211,153,0.7)" }}>
                    <span>✓ {agentSummary.assets.length} asset{agentSummary.assets.length !== 1 ? "s" : ""} created</span>
                    <span>{agentSummary.total_cost} credits used</span>
                  </div>
                  <div className={`grid gap-2 ${agentSummary.assets.length > 2 ? "grid-cols-3" : agentSummary.assets.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                    {agentSummary.assets.map((asset, i) => asset.url ? (
                      <a key={i} href={asset.url} target="_blank" rel="noopener noreferrer"
                        className="block rounded-lg overflow-hidden transition-transform hover:scale-[1.02]"
                        style={{ border: "1px solid rgba(139,92,246,0.15)" }}>
                        <img src={asset.url} alt={`Asset ${i + 1}`} className="w-full object-cover"
                          style={{ maxHeight: 120 }}
                          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      </a>
                    ) : null)}
                  </div>
                </div>
              )}

              <div ref={agentEndRef} />
            </div>

            {/* Reply bar */}
            {showReplyBar && (
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
            onSwitchTab={(tab: "chat" | "create") => setActiveTab(tab)}
          />
        )}

      </div>
    </div>
  );
}
