// services/agent-api.ts
// Structured SSE client for POST /api/agent (→ backend /ai/agent/run).
// Parses typed events: content, plan, tool_start, tool_done, tool_error,
// status, summary, done, error.

export interface AgentAsset {
  type: "image" | "logo" | "video" | "3d";
  url: string;
  tool: string;
}

export interface ToolStartPayload {
  tool: string;
  input?: Record<string, unknown>;
  cost?: number;
}

export interface ToolDonePayload {
  tool: string;
  result?: Record<string, unknown>;
  cost?: number;
}

export interface SummaryPayload {
  assets: AgentAsset[];
  totalCost: number;
}

export interface AgentCallbacks {
  onContent?: (text: string) => void;
  onPlan?: (text: string) => void;
  onToolStart?: (payload: ToolStartPayload) => void;
  onToolDone?: (payload: ToolDonePayload) => void;
  onToolError?: (err: string) => void;
  onStatus?: (text: string) => void;
  onSummary?: (payload: SummaryPayload) => void;
  onDone?: () => void;
  onError?: (err: string) => void;
}

export interface AgentOptions {
  enableSearch?: boolean;
  maxSteps?: number;
}

/**
 * Send a prompt to the agent SSE endpoint and dispatch typed callbacks.
 * Returns an AbortController so the caller can cancel the stream.
 */
export function sendAgentMessage(
  prompt: string,
  conversationHistory: Array<{ role: string; content: string }>,
  callbacks: AgentCallbacks,
  options: AgentOptions = {},
): AbortController {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          prompt,
          conversation_history: conversationHistory,
          enable_search: options.enableSearch ?? true,
          max_steps: options.maxSteps ?? 8,
        }),
      });

      if (!res.ok || !res.body) {
        callbacks.onError?.(`Server error ${res.status}`);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

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

          let evt: Record<string, unknown>;
          try {
            evt = JSON.parse(raw);
          } catch {
            continue;
          }

          const type = evt.type as string;

          switch (type) {
            case "content":
              callbacks.onContent?.(evt.text as string);
              break;
            case "plan":
              callbacks.onPlan?.(evt.text as string);
              break;
            case "tool_start":
              callbacks.onToolStart?.({
                tool: evt.tool as string,
                input: evt.input as Record<string, unknown> | undefined,
                cost: evt.cost as number | undefined,
              });
              break;
            case "tool_done":
              callbacks.onToolDone?.({
                tool: evt.tool as string,
                result: evt.result as Record<string, unknown> | undefined,
                cost: evt.cost as number | undefined,
              });
              break;
            case "tool_error":
              callbacks.onToolError?.(evt.error as string);
              break;
            case "status":
              callbacks.onStatus?.(evt.text as string);
              break;
            case "summary":
              callbacks.onSummary?.({
                assets: (evt.assets as AgentAsset[]) ?? [],
                totalCost: (evt.total_cost as number) ?? 0,
              });
              break;
            case "done":
              callbacks.onDone?.();
              break;
            case "error":
              callbacks.onError?.(evt.error as string ?? "Unknown error");
              break;
          }
        }
      }

      // If stream ended without explicit done/error
      callbacks.onDone?.();
    } catch (err: unknown) {
      if ((err as Error).name === "AbortError") return;
      callbacks.onError?.((err as Error).message ?? "Network error");
    }
  })();

  return controller;
}
