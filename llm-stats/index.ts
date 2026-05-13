/**
 * LLM Stats Extension - Tracks model API request counts
 * 
 * Features:
 * - Tracks total LLM API request count across all sessions
 * - Shows request count in status bar (不覆盖原有内容)
 * - Persists stats across sessions
 * - Toggle display with /llm-stats command
 * - View detailed stats with /llm-stats-show command
 * 
 * Installation: Copy the llm-stats folder to ~/.pi/agent/extensions/
 */

import type { AssistantMessage } from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

interface LLMStatsData {
  requestCount: number;
  lastUpdated: number;
}

export default function (pi: ExtensionAPI) {
  // State
  let stats: LLMStatsData = { requestCount: 0, lastUpdated: Date.now() };
  let statusEnabled = true;

  // Restore state from previous session entries
  pi.on("session_start", async (_event, ctx) => {
    stats = { requestCount: 0, lastUpdated: Date.now() };

    // Count existing assistant messages
    const existingCount = new Set<string>();
    for (const entry of ctx.sessionManager.getBranch()) {
      if (entry.type === "message" && (entry.message as any).role === "assistant") {
        const msg = entry.message as AssistantMessage;
        if (msg.usage && (msg.usage.input > 0 || msg.usage.output > 0)) {
          existingCount.add(`${msg.timestamp}-${msg.usage.input}-${msg.usage.output}`);
        }
      }
    }

    // Load persisted stats
    for (const entry of ctx.sessionManager.getEntries()) {
      if (entry.type === "custom" && entry.customType === "llm-stats") {
        const data = entry.data as LLMStatsData;
        if (data) {
          stats.requestCount = data.requestCount || 0;
          stats.lastUpdated = data.lastUpdated || Date.now();
        }
      }
    }

    // Use the higher count
    if (existingCount.size > stats.requestCount) {
      stats.requestCount = existingCount.size;
      pi.appendEntry("llm-stats", stats);
    }

    updateStatus(ctx);
  });

  // Track requests
  pi.on("message_end", async (event, ctx) => {
    if (event.message.role === "assistant") {
      const msg = event.message as AssistantMessage;
      if (msg.usage && (msg.usage.input > 0 || msg.usage.output > 0)) {
        stats.requestCount++;
        stats.lastUpdated = Date.now();
        pi.appendEntry("llm-stats", stats);
        updateStatus(ctx);
      }
    }
  });

  // Command to toggle status display
  pi.registerCommand("llm-stats", {
    description: "Toggle LLM request count display",
    handler: async (_args, ctx) => {
      statusEnabled = !statusEnabled;
      if (statusEnabled) {
        updateStatus(ctx);
        ctx.ui.notify("LLM stats enabled", "info");
      } else {
        ctx.ui.setStatus("llm-stats", undefined);
        ctx.ui.notify("LLM stats disabled", "info");
      }
    },
  });

  // Command to show detailed stats
  pi.registerCommand("llm-stats-show", {
    description: "Show LLM request statistics",
    handler: async (_args, ctx) => {
      const sessionMsgCount = ctx.sessionManager.getBranch().filter(
        e => e.type === "message" && (e.message as any).role === "assistant"
      ).length;
      ctx.ui.notify(
        `LLM Requests: ${stats.requestCount} total | ${sessionMsgCount} in this session`,
        "info"
      );
    },
  });

  // Command to reset session count
  pi.registerCommand("llm-stats-reset", {
    description: "Reset session request counter (keeps total)",
    handler: async (_args, ctx) => {
      ctx.ui.notify("Use /llm-stats to toggle display", "info");
    },
  });

  function updateStatus(ctx: any) {
    if (!statusEnabled) return;
    
    // 使用 accent 颜色显示请求计数
    const statusText = `Req: ${stats.requestCount}`;
    ctx.ui.setStatus("llm-stats", statusText);
  }
}
