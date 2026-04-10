"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  Sparkles,
  Image as ImageIcon,
  Video,
  Box,
  Search,
  Type,
  Loader2,
  RotateCcw,
  Download,
  Maximize2,
} from "lucide-react";
import MarkdownRenderer from "./MarkdownRenderer";

// ─── Types ────────────────────────────────────────────────────────────────────

type EventType =
  | "status"
  | "plan"
  | "tool_start"
  | "tool_done"
  | "tool_error"
  | "content"
  | "summary"
  | "done"
  | "error";

interface AgentEvent {
  id:         string;
  type:       EventType;
  text?:      string;
  tool?:      string;
  input?:     Record<string, unknown>;
  result?:    Record<string, unknown>;
  error?:     string;
  cost?:      number;
  assets?:    Asset[];
  total_cost?: number;
}

interface Asset {
  type: "image" | "logo" | "video" | "3d";
  url:  string;
  tool: string;
}

interface HistoryEntry {
  role:    "user" | "assistant";
  content: string;
}

// ─── Tool metadata ────────────────────────────────────────────────────────────

const TOOL_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  generate_image:     { label: "Generating image",     icon: <ImageIcon className="w-3.5 h-3.5" />, color: "#c084fc" },
  generate_logo:      { label: "Generating logo",      icon: <Type className="w-3.5 h-3.5" />,      color: "#f472b6" },
  generate_thumbnail: { label: "Generating thumbnail", icon: <ImageIcon className="w-3.5 h-3.5" />, color: "#fb923c" },
  generate_video:     { label: "Generating video",     icon: <Video className="w-3.5 h-3.5" />,     color: "#fbbf24" },
  generate_skyreel:   { label: "SkyReels video",       icon: <Video className="w-3.5 h-3.5" />,     color: "#f43f5e" },
  generate_3d:        { label: "Generating 3D model",  icon: <Box className="w-3.5 h-3.5" />,       color: "#67e8f9" },
  web_search:         { label: "Searching the web",    icon: <Search className="w-3.5 h-3.5" />,    color: "#34d399" },
};

// ─── Download helper (cross-origin safe) ──────────────────────────────────────
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

const EXAMPLE_PROMPTS = [
  "Create a logo for a streetwear brand called VOID, dark neon aesthetic",
  "Generate a mood board for a sci-fi film — deep space, abandoned station",
  "Design a YouTube thumbnail for an AI art video with bold text",
  "Create brand assets for a luxury coffee brand called ONYX",
];

const uid = () => Math.random().toString(36).slice(2, 10);

// ─── EventRow ─────────────────────────────────────────────────────────────────

function EventRow({ event }: { event: AgentEvent }) {
  const meta = event.tool ? TOOL_META[event.tool] : null;

  if (event.type === "status" || event.type === "plan") {
    return (
      <div className="flex items-center gap-2 py-1">
        <Loader2
          className="w-3 h-3 animate-spin shrink-0"
          style={{ color: "rgba(139,92,246,0.6)" }}
        />
        <span className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
          {event.text}
        </span>
      </div>
    );
  }

  if (event.type === "tool_start") {
    return (
      <div
        className="flex items-center gap-2.5 py-2 px-3 rounded-lg"
        style={{ background: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.1)" }}
      >
        <Loader2
          className="w-3.5 h-3.5 animate-spin shrink-0"
          style={{ color: meta?.color ?? "#c084fc" }}
        />
        <span className="shrink-0" style={{ color: meta?.color ?? "#c084fc" }}>
          {meta?.icon}
        </span>
        <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>
          {meta?.label ?? event.tool}
        </span>
        {event.cost ? (
          <span className="ml-auto text-[10px] shrink-0" style={{ color: "rgba(255,255,255,0.25)" }}>
            {event.cost} cr
          </span>
        ) : null}
      </div>
    );
  }

  if (event.type === "tool_done") {
    const result  = event.result as Record<string, unknown> | undefined;
    const urls: string[] = [];
    // Collect URLs from all common result fields
    for (const key of ["urls", "url", "video_url", "output_url", "model_url"]) {
      const val = result?.[key];
      if (Array.isArray(val)) {
        for (const v of val) if (typeof v === "string" && !urls.includes(v)) urls.push(v);
      } else if (typeof val === "string" && !urls.includes(val)) {
        urls.push(val);
      }
    }

    const isVideo = event.tool === "generate_video" || event.tool === "generate_skyreel";
    const is3D    = event.tool === "generate_3d";

    return (
      <div className="space-y-2">
        <div
          className="flex items-center gap-2.5 py-2 px-3 rounded-lg"
          style={{ background: "rgba(52,211,153,0.04)", border: "1px solid rgba(52,211,153,0.1)" }}
        >
          <span className="text-xs shrink-0" style={{ color: "#34d399" }}>✓</span>
          <span className="shrink-0" style={{ color: meta?.color ?? "#34d399" }}>{meta?.icon}</span>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
            {meta?.label ?? event.tool} complete
          </span>
          {event.cost ? (
            <span className="ml-auto text-[10px] shrink-0" style={{ color: "rgba(52,211,153,0.5)" }}>
              -{event.cost} cr
            </span>
          ) : null}
        </div>

        {event.tool === "web_search" && Array.isArray((result as any)?.results) && (
          <div className="space-y-1.5">
            {((result as any).results as Array<{ title: string; url: string; snippet: string }>)
              .slice(0, 3)
              .map((r, i) => (
                <a
                  key={i}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-2.5 rounded-lg transition-colors hover:bg-white/5"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <div className="text-xs font-medium mb-0.5 truncate" style={{ color: "#67e8f9" }}>
                    {r.title}
                  </div>
                  <div className="text-[10px] leading-relaxed line-clamp-2" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {r.snippet}
                  </div>
                </a>
              ))}
          </div>
        )}
      </div>
    );
  }

  if (event.type === "tool_error") {
    return (
      <div
        className="flex items-center gap-2.5 py-2 px-3 rounded-lg"
        style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.12)" }}
      >
        <span className="text-xs shrink-0" style={{ color: "#f87171" }}>✕</span>
        <span className="text-xs" style={{ color: "rgba(248,113,113,0.8)" }}>
          {event.tool} failed: {event.error}
        </span>
      </div>
    );
  }

  if (event.type === "error") {
    return (
      <div
        className="py-2 px-3 rounded-lg text-xs"
        style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.12)", color: "rgba(248,113,113,0.8)" }}
      >
        ⚠️ {event.error}
      </div>
    );
  }

  return null;
}

// ─── History turn — shows a past exchange in the feed ─────────────────────────

function HistoryTurn({ entry, index }: { entry: HistoryEntry; index: number }) {
  if (entry.role === "user") {
    return (
      <div
        className="flex justify-end"
        style={{ borderTop: index > 0 ? "1px solid rgba(255,255,255,0.04)" : "none", paddingTop: index > 0 ? 12 : 0 }}
      >
        <div
          className="max-w-[80%] px-3 py-2 rounded-xl text-xs"
          style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.15)", color: "rgba(255,255,255,0.75)" }}
        >
          {entry.content}
        </div>
      </div>
    );
  }
  return null; // assistant summaries show as content blocks inline
}

// ─── Main component ───────────────────────────────────────────────────────────

interface AgentPanelProps {
  isOpen:  boolean;
  onClose: () => void;
}

export default function AgentPanel({ isOpen, onClose }: AgentPanelProps) {
  const [prompt,    setPrompt]    = useState("");
  const [replyText, setReplyText] = useState("");
  const [events,    setEvents]    = useState<AgentEvent[]>([]);
  const [content,   setContent]   = useState("");
  const [running,   setRunning]   = useState(false);
  const [summary,   setSummary]   = useState<{ assets: Asset[]; total_cost: number } | null>(null);
  const [totalCost, setTotalCost] = useState(0);

  // Conversation history — persists across multiple runs in this session
  const historyRef      = useRef<HistoryEntry[]>([]);
  const historyDisplay  = useRef<HistoryEntry[]>([]);
  const [turns, setTurns] = useState<HistoryEntry[]>([]);

  // Stable agent conversation ID — isolated from the chat widget
  const agentConvId = useRef(`agent_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`).current;

  const feedEndRef  = useRef<HTMLDivElement>(null);
  const feedRef     = useRef<HTMLDivElement>(null);
  const abortRef    = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const replyRef    = useRef<HTMLInputElement>(null);

  // Auto-scroll
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events, content, turns]);

  // Lock body scroll while panel is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [isOpen]);

  // Focus on open
  useEffect(() => {
    if (isOpen) setTimeout(() => textareaRef.current?.focus(), 100);
  }, [isOpen]);

  // Focus reply input after run completes
  useEffect(() => {
    if (!running && content) {
      setTimeout(() => replyRef.current?.focus(), 100);
    }
  }, [running, content]);

  const resetAll = useCallback(() => {
    setEvents([]);
    setContent("");
    setSummary(null);
    setTotalCost(0);
    setPrompt("");
    setReplyText("");
    setTurns([]);
    historyRef.current     = [];
    historyDisplay.current = [];
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setRunning(false);
  }, []);

  // Core run — accepts the prompt text directly so reply bar can call it too
  const runWithPrompt = useCallback(async (promptText: string) => {
    if (!promptText.trim() || running) return;

    // Clear current run events but keep history display
    setEvents([]);
    setContent("");
    setSummary(null);
    setRunning(true);
    abortRef.current = new AbortController();

    // Add user message to display turns immediately
    const userTurn: HistoryEntry = { role: "user", content: promptText.trim() };
    setTurns(prev => [...prev, userTurn]);

    let fullContent = "";

    try {
      const res = await fetch("/api/agent", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        signal:  abortRef.current.signal,
        body:    JSON.stringify({
          prompt:               promptText.trim(),
          conversation_history: historyRef.current.slice(-20),  // ← cap at last 10 exchanges
          conversation_id:      agentConvId,          // ← isolated from chat
          enable_search:        true,
          max_steps:            8,
        }),
      });

      if (!res.ok || !res.body) {
        const errBody = await res.text().catch(() => "");
        throw new Error(`Agent request failed (${res.status}): ${errBody.slice(0, 200)}`);
      }

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
              setRunning(false);

              // Save this exchange to history for next run
              historyRef.current = [
                ...historyRef.current,
                { role: "user",      content: promptText.trim() },
                { role: "assistant", content: fullContent },
              ];

              return;
            }

            if (data.type === "content") {
              fullContent += data.text ?? "";
              setContent(fullContent);
              continue;
            }

            if (data.type === "summary") {
              setSummary({
                assets:     (data as any).assets     ?? [],
                total_cost: (data as any).total_cost ?? 0,
              });
              setTotalCost((data as any).total_cost ?? 0);
              continue;
            }

            // ── tool_done: replace matching tool_start in place ──────────────
            if (data.type === "tool_done") {
              if (data.cost) setTotalCost(prev => prev + (data.cost ?? 0));
              setEvents(prev => {
                const idx = [...prev].reverse().findIndex(
                  e => e.type === "tool_start" && e.tool === data.tool
                );
                if (idx === -1) return [...prev, { ...data, id: uid() }];
                const realIdx = prev.length - 1 - idx;
                const next    = [...prev];
                next[realIdx] = { ...data, id: prev[realIdx].id };
                return next;
              });
              continue;
            }

            // All other events appended normally
            setEvents(prev => [...prev, { ...data, id: uid() }]);

          } catch {
            // skip unparseable lines
          }
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      setEvents(prev => [...prev, { id: uid(), type: "error", error: err.message ?? "Something went wrong" }]);
    } finally {
      setRunning(false);
    }
  }, [running, agentConvId]);

  // Initial prompt submit
  const run = useCallback(() => {
    runWithPrompt(prompt);
    setPrompt("");
  }, [prompt, runWithPrompt]);

  // Reply bar submit
  const submitReply = useCallback(() => {
    if (!replyText.trim()) return;
    const text = replyText.trim();
    setReplyText("");
    runWithPrompt(text);
  }, [replyText, runWithPrompt]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); run(); }
  };

  const handleReplyKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); submitReply(); }
  };

  if (!isOpen) return null;

  const hasActivity = events.length > 0 || content || summary || turns.length > 0;
  const showReplyBar = !running && content; // show reply bar after agent finishes

  return (
    <div
      className="fixed"
      style={{ inset: 0, zIndex: 2001, width: "100vw", height: "100dvh", padding: 8, overflow: "hidden" }}
    >
      <div className="ai-chat-rainbow-border" style={{ inset: 0, borderRadius: 0 }} />

      <div
        className="flex flex-col overflow-hidden relative"
        style={{ width: "100%", height: "100%", borderRadius: 6, background: "rgba(8,8,15,0.98)", backdropFilter: "blur(20px)", zIndex: 1 }}
      >

        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid rgba(139,92,246,0.08)" }}
        >
          <div className="flex items-center gap-2">
            <Sparkles
              className="w-4 h-4"
              style={{ color: "#c084fc", filter: "drop-shadow(0 0 4px rgba(192,132,252,0.6))" }}
            />
            <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.85)" }}>
              Creative Agent
            </span>
            {running && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", color: "rgba(192,132,252,0.8)" }}
              >
                running
              </span>
            )}
            {totalCost > 0 && !running && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.12)", color: "rgba(52,211,153,0.7)" }}
              >
                {totalCost} cr used
              </span>
            )}
            {historyRef.current.length > 0 && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.3)" }}
              >
                {historyRef.current.length / 2} turn{historyRef.current.length / 2 !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {hasActivity && !running && (
              <button
                onClick={resetAll}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] transition-all hover:bg-white/5"
                style={{ color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <RotateCcw className="w-3 h-3" /> New
              </button>
            )}
            <button
              onClick={running ? stop : onClose}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:scale-110"
              style={{ background: "rgba(255,60,60,0.15)", border: "1px solid rgba(255,60,60,0.3)" }}
              aria-label="Close"
            >
              <X className="w-5 h-5" style={{ color: "#ff4444", filter: "drop-shadow(0 0 4px rgba(255,68,68,0.5))" }} />
            </button>
          </div>
        </div>

        {/* ── Initial prompt input — only show when no activity yet ── */}
        {!hasActivity && (
          <div
            className="px-4 py-3 shrink-0"
            style={{ borderBottom: "1px solid rgba(139,92,246,0.06)" }}
          >
            <div
              className="flex gap-2 rounded-xl p-2 transition-all"
              style={{
                background: "rgba(139,92,246,0.04)",
                border:     `1px solid ${running ? "rgba(139,92,246,0.25)" : "rgba(139,92,246,0.1)"}`,
              }}
            >
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Describe what you want to create…"
                disabled={running}
                rows={2}
                className="flex-1 resize-none text-xs outline-none disabled:opacity-50"
                style={{ background: "transparent", color: "rgba(255,255,255,0.85)", lineHeight: 1.6, paddingLeft: 4 }}
              />
              <button
                onClick={running ? stop : run}
                disabled={!prompt.trim() && !running}
                className="self-end px-3 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                style={{
                  background: running ? "rgba(239,68,68,0.12)" : "linear-gradient(135deg, rgba(124,58,237,0.8), rgba(139,92,246,0.8))",
                  border:     running ? "1px solid rgba(239,68,68,0.2)" : "1px solid rgba(139,92,246,0.3)",
                  color:      running ? "#f87171" : "#f0e6ff",
                  boxShadow:  running ? "none" : "0 0 16px rgba(139,92,246,0.2)",
                }}
              >
                {running ? "Stop" : "Create →"}
              </button>
            </div>

            {/* Example prompts */}
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {EXAMPLE_PROMPTS.slice(0, 3).map((p, i) => (
                <button
                  key={i}
                  onClick={() => setPrompt(p)}
                  className="text-[10px] px-2.5 py-1 rounded-full transition-all hover:border-[rgba(139,92,246,0.3)] hover:text-white/60"
                  style={{ background: "rgba(139,92,246,0.04)", border: "1px solid rgba(139,92,246,0.1)", color: "rgba(255,255,255,0.35)" }}
                >
                  {p.slice(0, 42)}…
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Activity feed ── */}
        <div className="flex-1 min-h-0">
          <div ref={feedRef} className="h-full overflow-y-auto agent-scrollbar px-4 py-3 space-y-2">

          {/* Empty state */}
          {!hasActivity && !running && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-8">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.12)" }}
              >
                <Sparkles className="w-6 h-6" style={{ color: "rgba(192,132,252,0.6)" }} />
              </div>
              <div>
                <p className="text-sm font-medium mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Your creative agent
                </p>
                <p className="text-xs leading-relaxed max-w-[240px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                  Describe what you want — logos, images, videos, mood boards. The agent picks the right tools automatically.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-1.5 max-w-[280px]">
                {Object.entries(TOOL_META).map(([key, meta]) => (
                  <div
                    key={key}
                    className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px]"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: meta.color }}
                  >
                    {meta.icon}
                    <span style={{ color: "rgba(255,255,255,0.35)" }}>
                      {meta.label.replace("Generating ", "").replace("Searching the ", "")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Past conversation turns — user messages above current events */}
          {turns.map((turn, i) => (
            i < turns.length - 1 ? (
              <HistoryTurn key={i} entry={turn} index={i} />
            ) : null
          ))}

          {/* Current user prompt shown as a bubble */}
          {turns.length > 0 && (
            <div className="flex justify-end mb-1">
              <div
                className="max-w-[80%] px-3 py-2 rounded-xl text-xs"
                style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.15)", color: "rgba(255,255,255,0.75)" }}
              >
                {turns[turns.length - 1].content}
              </div>
            </div>
          )}

          {/* Current run events */}
          {events.map(event => (
            <EventRow key={event.id} event={event} />
          ))}

          {/* Streaming final answer — strip image/video markdown, show text only */}
          {content && (() => {
            const textOnly = content
              .replace(/!\[[^\]]*\]\([^)]+\)/g, "")          // ![alt](url)
              .replace(/\[([^\]]*)\]\(https?:\/\/[^)]+\)/g, "$1") // keep link text, drop URL if image-like
              .replace(/https?:\/\/\S+\.(png|jpg|jpeg|gif|webp|mp4|webm|mov|glb)(\?\S*)?\s*/gi, "") // bare media URLs
              .replace(/\n{3,}/g, "\n\n")                     // collapse blank lines
              .trim();
            return textOnly ? (
              <div
                className="py-3 px-3 rounded-xl text-xs leading-relaxed"
                style={{
                  background: "rgba(139,92,246,0.04)",
                  border:     "1px solid rgba(139,92,246,0.08)",
                  color:      "rgba(255,255,255,0.75)",
                }}
              >
                <MarkdownRenderer content={textOnly} />
                {running && (
                  <span
                    style={{
                      display:       "inline-block",
                      width:         2,
                      height:        "1em",
                      background:    "rgba(192,132,252,0.8)",
                      animation:     "blink 0.8s step-end infinite",
                      verticalAlign: "text-bottom",
                      marginLeft:    2,
                    }}
                  />
                )}
              </div>
            ) : running ? (
              <div className="flex items-center gap-2 py-2">
                <Loader2 className="w-3 h-3 animate-spin" style={{ color: "rgba(139,92,246,0.6)" }} />
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Generating…</span>
              </div>
            ) : null;
          })()}

          {/* Summary asset grid — from summary event, or fallback from tool_done results */}
          {(() => {
            // Use summary assets if available, otherwise extract from tool_done events
            let assets: Asset[] = [];
            if (summary && summary.assets.length > 0) {
              assets = summary.assets;
            } else if (!running) {
              const seen = new Set<string>();
              for (const ev of events) {
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
            <div
              className="rounded-xl p-3"
              style={{ background: "rgba(52,211,153,0.04)", border: "1px solid rgba(52,211,153,0.1)" }}
            >
              <div
                className="text-[10px] mb-2 flex items-center justify-between"
                style={{ color: "rgba(52,211,153,0.7)" }}
              >
                <span>✓ {assets.length} asset{assets.length !== 1 ? "s" : ""} created</span>
                {summary ? <span>{summary.total_cost} credits used</span> : null}
              </div>
              <div className={`grid gap-3 ${assets.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
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
                        <div style={{ padding: "6px 8px" }}>
                          <p style={{
                            fontSize: 9,
                            color: "rgba(255,255,255,0.7)",
                            margin: 0,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}>
                            {toolMeta?.label?.replace("Generating ", "") ?? asset.type}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
          })()}

          <div ref={feedEndRef} />
          </div>
        </div>

        {/* ── Reply bar — appears after agent finishes, stays until new session ── */}
        {showReplyBar && (
          <div
            className="px-4 py-3 shrink-0"
            style={{ borderTop: "1px solid rgba(139,92,246,0.08)" }}
          >
            <div
              className="flex gap-2 items-center rounded-xl px-3 py-2"
              style={{ background: "rgba(139,92,246,0.04)", border: "1px solid rgba(139,92,246,0.12)" }}
            >
              <input
                ref={replyRef}
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={handleReplyKey}
                placeholder="Refine or continue… e.g. 'Make it more minimal' or 'Add a tagline'"
                className="flex-1 text-xs outline-none bg-transparent"
                style={{ color: "rgba(255,255,255,0.8)" }}
              />
              <button
                onClick={submitReply}
                disabled={!replyText.trim()}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                style={{
                  background: "linear-gradient(135deg, rgba(124,58,237,0.8), rgba(139,92,246,0.8))",
                  border:     "1px solid rgba(139,92,246,0.3)",
                  color:      "#f0e6ff",
                  boxShadow:  "0 0 12px rgba(139,92,246,0.2)",
                }}
              >
                Run →
              </button>
            </div>
            <p
              className="text-[10px] mt-1.5 px-1"
              style={{ color: "rgba(255,255,255,0.2)" }}
            >
              Agent remembers this session · {historyRef.current.length / 2 + 1} turn{historyRef.current.length / 2 + 1 !== 1 ? "s" : ""} · <button onClick={resetAll} className="underline" style={{ color: "rgba(255,255,255,0.3)" }}>Start new session</button>
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
