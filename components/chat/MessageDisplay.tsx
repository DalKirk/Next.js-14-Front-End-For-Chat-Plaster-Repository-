"use client";

import React, { useState } from "react";
import {
  Image as ImageIcon,
  Video,
  Box,
  Search,
  Type,
  ChevronDown,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Download,
  ExternalLink,
} from "lucide-react";
import type { AgentAsset, ToolStartPayload, ToolDonePayload } from "@/services/agent-api";

// ── Tool metadata ─────────────────────────────────────────────────────────────

const TOOL_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  generate_image:     { label: "Image",     icon: <ImageIcon className="w-3.5 h-3.5" />, color: "#c084fc" },
  generate_logo:      { label: "Logo",      icon: <Type className="w-3.5 h-3.5" />,      color: "#f472b6" },
  generate_thumbnail: { label: "Thumbnail", icon: <ImageIcon className="w-3.5 h-3.5" />, color: "#fb923c" },
  generate_video:     { label: "Video",     icon: <Video className="w-3.5 h-3.5" />,     color: "#fbbf24" },
  generate_skyreel:   { label: "SkyReels",  icon: <Video className="w-3.5 h-3.5" />,     color: "#f43f5e" },
  generate_3d:        { label: "3D Model",  icon: <Box className="w-3.5 h-3.5" />,       color: "#67e8f9" },
  web_search:         { label: "Web Search",icon: <Search className="w-3.5 h-3.5" />,    color: "#34d399" },
};

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ToolStep {
  id: string;
  tool: string;
  state: "running" | "done" | "error";
  cost?: number;
  result?: Record<string, unknown>;
  error?: string;
}

// ── AssetCard ─────────────────────────────────────────────────────────────────

function AssetCard({ asset }: { asset: AgentAsset }) {
  const isVideo = asset.type === "video" || asset.tool === "generate_video" || asset.tool === "generate_skyreel";
  const is3D = asset.type === "3d" || asset.tool === "generate_3d";

  if (isVideo) {
    return (
      <div className="asset-card asset-video">
        <video
          src={asset.url}
          controls
          preload="metadata"
          className="w-full rounded-lg"
          style={{ maxHeight: 240 }}
        />
        <div className="flex items-center gap-2 mt-1.5">
          <a
            href={asset.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] flex items-center gap-1 hover:underline"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            <Download className="w-3 h-3" /> Download
          </a>
        </div>
      </div>
    );
  }

  if (is3D) {
    return (
      <div
        className="asset-card asset-3d rounded-lg p-4 flex flex-col items-center justify-center gap-2"
        style={{ background: "rgba(103,232,249,0.06)", border: "1px solid rgba(103,232,249,0.15)" }}
      >
        <Box className="w-8 h-8" style={{ color: "#67e8f9" }} />
        <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.5)" }}>3D Model</span>
        <a
          href={asset.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1 hover:bg-white/5"
          style={{ border: "1px solid rgba(103,232,249,0.2)", color: "#67e8f9" }}
        >
          <Download className="w-3 h-3" /> Download GLB
        </a>
      </div>
    );
  }

  // Default: image / logo / thumbnail
  return (
    <div className="asset-card asset-image">
      <a href={asset.url} target="_blank" rel="noopener noreferrer" className="block">
        <img
          src={asset.url}
          alt={`Generated ${asset.tool}`}
          className="w-full rounded-lg object-cover transition-transform hover:scale-[1.02]"
          style={{ maxHeight: 240, border: "1px solid rgba(139,92,246,0.12)" }}
          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      </a>
      <a
        href={asset.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[10px] mt-1.5 flex items-center gap-1 hover:underline"
        style={{ color: "rgba(255,255,255,0.4)" }}
      >
        <ExternalLink className="w-3 h-3" /> Open full size
      </a>
    </div>
  );
}

// ── ToolActivity ──────────────────────────────────────────────────────────────

export function ToolActivity({ steps }: { steps: ToolStep[] }) {
  const [expanded, setExpanded] = useState(false);
  if (steps.length === 0) return null;

  const doneCount = steps.filter(s => s.state === "done").length;
  const errCount = steps.filter(s => s.state === "error").length;
  const runCount = steps.filter(s => s.state === "running").length;

  return (
    <div className="tool-activity rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-2 px-3 py-2 text-[11px] hover:bg-white/[0.02] transition-colors"
        style={{ color: "rgba(255,255,255,0.5)" }}
      >
        {runCount > 0 && <Loader2 className="w-3 h-3 animate-spin" style={{ color: "#c084fc" }} />}
        <span>
          {doneCount}/{steps.length} tool{steps.length !== 1 ? "s" : ""} completed
          {errCount > 0 && ` · ${errCount} failed`}
        </span>
        <ChevronDown
          className={`w-3 h-3 ml-auto transition-transform ${expanded ? "rotate-180" : ""}`}
          style={{ color: "rgba(255,255,255,0.25)" }}
        />
      </button>

      {expanded && (
        <div className="px-3 pb-2 space-y-1">
          {steps.map(step => {
            const meta = TOOL_META[step.tool];
            return (
              <div key={step.id} className="flex items-center gap-2 py-1 text-[10px]">
                {step.state === "running" && <Loader2 className="w-3 h-3 animate-spin" style={{ color: meta?.color ?? "#c084fc" }} />}
                {step.state === "done" && <CheckCircle2 className="w-3 h-3" style={{ color: "#34d399" }} />}
                {step.state === "error" && <AlertCircle className="w-3 h-3" style={{ color: "#f87171" }} />}
                <span style={{ color: meta?.color ?? "#c084fc" }}>{meta?.icon}</span>
                <span style={{ color: "rgba(255,255,255,0.55)" }}>{meta?.label ?? step.tool}</span>
                {step.cost != null && (
                  <span className="ml-auto" style={{ color: "rgba(255,255,255,0.2)" }}>{step.cost} cr</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── AssetsGrid ────────────────────────────────────────────────────────────────

export function AssetsGrid({ assets }: { assets: AgentAsset[] }) {
  if (assets.length === 0) return null;

  const cols =
    assets.length >= 3 ? "grid-cols-3" :
    assets.length === 2 ? "grid-cols-2" :
    "grid-cols-1";

  return (
    <div className={`assets-grid grid gap-2 ${cols}`}>
      {assets.map((asset, i) => (
        <AssetCard key={i} asset={asset} />
      ))}
    </div>
  );
}

// ── Inline URL extractor (pulls media URLs from tool_done results) ───────────

export function extractAssetsFromResult(tool: string, result?: Record<string, unknown>): AgentAsset[] {
  if (!result) return [];
  const assets: AgentAsset[] = [];
  const urls: string[] = [];

  // Check all common result fields for URLs
  for (const key of ["urls", "url", "video_url", "output_url", "model_url"]) {
    const val = result[key];
    if (Array.isArray(val)) {
      for (const v of val) if (typeof v === "string" && !urls.includes(v)) urls.push(v);
    } else if (typeof val === "string" && !urls.includes(val)) {
      urls.push(val);
    }
  }

  const typeMap: Record<string, AgentAsset["type"]> = {
    generate_image: "image",
    generate_logo: "logo",
    generate_thumbnail: "image",
    generate_video: "video",
    generate_skyreel: "video",
    generate_3d: "3d",
  };

  for (const url of urls) {
    assets.push({ type: typeMap[tool] ?? "image", url, tool });
  }

  return assets;
}
