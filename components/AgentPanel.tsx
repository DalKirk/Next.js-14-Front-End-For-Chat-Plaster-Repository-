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
  ChevronRight,
  RotateCcw,
} from "lucide-react";

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
  id:      string;
  type:    EventType;
  text?:   string;
  tool?:   string;
  input?:  Record<string, unknown>;
  result?: Record<string, unknown>;
  error?:  string;
  cost?:   number;
  assets?: Asset[];
  total_cost?: number;
}

interface Asset {
  type: "image" | "logo" | "video" | "3d";
  url:  string;
  tool: string;
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

const EXAMPLE_PROMPTS = [
  "Create a logo for a streetwear brand called VOID, dark neon aesthetic",
  "Generate a mood board for a sci-fi film concept — deep space, abandoned station",
  "Design a YouTube thumbnail for a video about AI art with bold text",
  "Create brand assets for a luxury coffee brand called ONYX",
  "Search for trending AI art styles and create 2 images in that style",
];

// ─── Utility ──────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 10);

// ─── Sub-components ───────────────────────────────────────────────────────────

function EventRow({ event }: { event: AgentEvent }): React.ReactNode {
  const meta = event.tool ? TOOL_META[event.tool] : null;

  if (event.type === "status" || event.type === "plan") {
    return (
      <div className="flex items-center gap-2 py-1">
        <Loader2
          className="w-3 h-3 animate-spin shrink-0"
          style={{ color: "rgba(139,92,246,0.6)" }}
        />
        <span
          className="text-xs leading-relaxed"
          style={{ color: "rgba(255,255,255,0.45)" }}
        >
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
          <span
            className="ml-auto text-[10px] shrink-0"
            style={{ color: "rgba(255,255,255,0.25)" }}
          >
            {event.cost} cr
          </span>
        ) : null}
      </div>
    );
  }

  if (event.type === "tool_done") {
    const result = event.result as Record<string, unknown> | undefined;
    const urls: string[] = [];
    if (result?.urls && Array.isArray(result.urls)) urls.push(...result.urls as string[]);
    if (result?.url && typeof result.url === "string" && !urls.includes(result.url)) urls.push(result.url);

    return (
      <div className="space-y-2">
        <div
          className="flex items-center gap-2.5 py-2 px-3 rounded-lg"
          style={{ background: "rgba(52,211,153,0.04)", border: "1px solid rgba(52,211,153,0.1)" }}
        >
          <span className="text-xs shrink-0" style={{ color: "#34d399" }}>✓</span>
          <span className="shrink-0" style={{ color: meta?.color ?? "#34d399" }}>
            {meta?.icon}
          </span>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
            {meta?.label ?? event.tool} complete
          </span>
          {event.cost ? (
            <span
              className="ml-auto text-[10px] shrink-0"
              style={{ color: "rgba(52,211,153,0.5)" }}
            >
              -{event.cost} cr
            </span>
          ) : null}
        </div>

        {/* Inline image preview */}
        {urls.length > 0 ? (
          <div className={`grid gap-2 ${urls.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
            {urls.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg overflow-hidden transition-transform hover:scale-[1.02]"
                style={{ border: "1px solid rgba(139,92,246,0.15)" }}
              >
                <img
                  src={url}
                  alt={`Generated ${event.tool} ${i + 1}`}
                  className="w-full object-cover"
                  style={{ maxHeight: 200 }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </a>
            ))}
          </div>
        ) : null}

        {/* Web search results */}
        {event.tool === "web_search" && Array.isArray(result?.results) ? (
          <div className="space-y-1.5">
            {(result!.results as Array<{ title: string; url: string; snippet: string }>)
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
                  <div
                    className="text-xs font-medium mb-0.5 truncate"
                    style={{ color: "#67e8f9" }}
                  >
                    {r.title}
                  </div>
                  <div
                    className="text-[10px] leading-relaxed line-clamp-2"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    {r.snippet}
                  </div>
                </a>
              ))}
          </div>
        ) : null}
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

// ─── Main component ───────────────────────────────────────────────────────────

interface AgentPanelProps {
  isOpen:   boolean;
  onClose:  () => void;
}

export default function AgentPanel({ isOpen, onClose }: AgentPanelProps) {
  const [prompt,    setPrompt]    = useState("");
  const [events,    setEvents]    = useState<AgentEvent[]>([]);
  const [content,   setContent]   = useState("");
  const [running,   setRunning]   = useState(false);
  const [summary,   setSummary]   = useState<{ assets: Asset[]; total_cost: number } | null>(null);
  const [totalCost, setTotalCost] = useState(0);

  const feedEndRef  = useRef<HTMLDivElement>(null);
  const abortRef    = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll feed
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events, content]);

  // Focus textarea when opened
  useEffect(() => {
    if (isOpen) setTimeout(() => textareaRef.current?.focus(), 100);
  }, [isOpen]);

  const reset = useCallback(() => {
    setEvents([]);
    setContent("");
    setSummary(null);
    setTotalCost(0);
    setPrompt("");
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setRunning(false);
  }, []);

  const run = useCallback(async () => {
    if (!prompt.trim() || running) return;

    reset();
    setRunning(true);
    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/agent", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        signal:  abortRef.current.signal,
        body:    JSON.stringify({
          prompt:        prompt.trim(),
          enable_search: true,
          max_steps:     8,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Agent request failed: ${res.status}`);
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = "";
      let   fullContent = "";

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
              return;
            }

            if (data.type === "content") {
              fullContent += data.text ?? "";
              setContent(fullContent);
              continue;
            }

            if (data.type === "summary") {
              setSummary({
                assets:     (data as any).assets ?? [],
                total_cost: (data as any).total_cost ?? 0,
              });
              setTotalCost((data as any).total_cost ?? 0);
              continue;
            }

            if (data.type === "tool_done" && data.cost) {
              setTotalCost(prev => prev + (data.cost ?? 0));
            }

            // Add event to feed
            setEvents(prev => [...prev, { ...data, id: uid() }]);

          } catch {
            // skip unparseable lines
          }
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      setEvents(prev => [...prev, {
        id:    uid(),
        type:  "error",
        error: err.message ?? "Something went wrong",
      }]);
    } finally {
      setRunning(false);
    }
  }, [prompt, running, reset]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.metaKey) {
      e.preventDefault();
      run();
    }
  };

  if (!isOpen) return null;

  const hasActivity = events.length > 0 || content || summary;

  return (
    <div
      className="fixed"
      style={{ inset: 0, zIndex: 2001, width: "100vw", height: "100dvh", padding: 8, overflow: "hidden" }}
    >
      {/* Rainbow border — matches your existing ai-chat-rainbow-border */}
      <div className="ai-chat-rainbow-border" style={{ inset: 0, borderRadius: 0 }} />

      <div
        className="flex flex-col overflow-hidden relative"
        style={{
          width:             "100%",
          height:            "100%",
          borderRadius:      6,
          background:        "rgba(8,8,15,0.98)",
          backdropFilter:    "blur(20px)",
          zIndex:            1,
        }}
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
                style={{
                  background: "rgba(139,92,246,0.1)",
                  border:     "1px solid rgba(139,92,246,0.2)",
                  color:      "rgba(192,132,252,0.8)",
                }}
              >
                running
              </span>
            )}
            {totalCost > 0 && !running && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{
                  background: "rgba(52,211,153,0.06)",
                  border:     "1px solid rgba(52,211,153,0.12)",
                  color:      "rgba(52,211,153,0.7)",
                }}
              >
                {totalCost} cr used
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {hasActivity && !running && (
              <button
                onClick={reset}
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

        {/* ── Prompt input ── */}
        <div
          className="px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid rgba(139,92,246,0.06)" }}
        >
          <div
            className="flex gap-2 rounded-xl p-2 transition-all"
            style={{
              background:  "rgba(139,92,246,0.04)",
              border:      `1px solid ${running ? "rgba(139,92,246,0.25)" : "rgba(139,92,246,0.1)"}`,
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
              style={{
                background:  "transparent",
                color:       "rgba(255,255,255,0.85)",
                lineHeight:  1.6,
                paddingLeft: 4,
              }}
            />
            <button
              onClick={running ? stop : run}
              disabled={!prompt.trim() && !running}
              className="self-end px-3 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
              style={{
                background: running
                  ? "rgba(239,68,68,0.12)"
                  : "linear-gradient(135deg, rgba(124,58,237,0.8), rgba(139,92,246,0.8))",
                border: running
                  ? "1px solid rgba(239,68,68,0.2)"
                  : "1px solid rgba(139,92,246,0.3)",
                color: running ? "#f87171" : "#f0e6ff",
                boxShadow: running ? "none" : "0 0 16px rgba(139,92,246,0.2)",
              }}
            >
              {running ? "Stop" : "Create →"}
            </button>
          </div>

          {/* Example prompts — only show when idle and empty */}
          {!hasActivity && !running && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {EXAMPLE_PROMPTS.slice(0, 3).map((p, i) => (
                <button
                  key={i}
                  onClick={() => setPrompt(p)}
                  className="text-[10px] px-2.5 py-1 rounded-full transition-all hover:border-[rgba(139,92,246,0.3)] hover:text-white/60"
                  style={{
                    background: "rgba(139,92,246,0.04)",
                    border:     "1px solid rgba(139,92,246,0.1)",
                    color:      "rgba(255,255,255,0.35)",
                  }}
                >
                  {p.slice(0, 40)}…
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Activity feed ── */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-0">

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

              {/* Tool chips */}
              <div className="flex flex-wrap justify-center gap-1.5 max-w-[280px]">
                {Object.entries(TOOL_META).map(([key, meta]) => (
                  <div
                    key={key}
                    className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px]"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border:     "1px solid rgba(255,255,255,0.06)",
                      color:      meta.color,
                    }}
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

          {/* Events */}
          {events.map(event => (
            <EventRow key={event.id} event={event} />
          ))}

          {/* Streaming final answer */}
          {content && (
            <div
              className="py-3 px-3 rounded-xl text-xs leading-relaxed"
              style={{
                background: "rgba(139,92,246,0.04)",
                border:     "1px solid rgba(139,92,246,0.08)",
                color:      "rgba(255,255,255,0.75)",
                whiteSpace: "pre-wrap",
              }}
            >
              {content}
              {running && (
                <span
                  className="inline-block ml-0.5 align-middle"
                  style={{
                    width:      2,
                    height:     "1em",
                    background: "rgba(192,132,252,0.8)",
                    animation:  "blink 0.8s step-end infinite",
                    verticalAlign: "text-bottom",
                    display:    "inline-block",
                  }}
                />
              )}
            </div>
          )}

          {/* Summary */}
          {summary && summary.assets.length > 0 && (
            <div
              className="rounded-xl p-3"
              style={{ background: "rgba(52,211,153,0.04)", border: "1px solid rgba(52,211,153,0.1)" }}
            >
              <div
                className="text-[10px] mb-2 flex items-center justify-between"
                style={{ color: "rgba(52,211,153,0.7)" }}
              >
                <span>✓ {summary.assets.length} asset{summary.assets.length !== 1 ? "s" : ""} created</span>
                <span>{summary.total_cost} credits used</span>
              </div>
              <div className={`grid gap-2 ${summary.assets.length > 2 ? "grid-cols-3" : summary.assets.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                {summary.assets.map((asset, i) => (
                  asset.url ? (
                    <a
                      key={i}
                      href={asset.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg overflow-hidden transition-transform hover:scale-[1.02]"
                      style={{ border: "1px solid rgba(139,92,246,0.15)" }}
                    >
                      <img
                        src={asset.url}
                        alt={`Asset ${i + 1}`}
                        className="w-full object-cover"
                        style={{ maxHeight: 120 }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    </a>
                  ) : null
                ))}
              </div>
            </div>
          )}

          <div ref={feedEndRef} />
        </div>
      </div>
    </div>
  );
}
