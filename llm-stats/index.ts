/**
 * LLM Stats Extension - Tracks model API request counts
 * 
 * 显示效果: ↑12 ↓104 R6.9k W6 $0.001 3.4%/205k (auto) Req:1  model-name
 * Req 计数与原有统计信息显示在同一行
 */

import type { AssistantMessage } from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

interface LLMStatsData {
  requestCount: number;
  lastUpdated: number;
}

export default function (pi: ExtensionAPI) {
  let stats: LLMStatsData = { requestCount: 0, lastUpdated: Date.now() };
  let footerEnabled = true;

  // Restore state
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

    if (existingCount.size > stats.requestCount) {
      stats.requestCount = existingCount.size;
      pi.appendEntry("llm-stats", stats);
    }

    updateFooter(ctx);
  });

  // Track requests
  pi.on("message_end", async (event, ctx) => {
    if (event.message.role === "assistant") {
      const msg = event.message as AssistantMessage;
      if (msg.usage && (msg.usage.input > 0 || msg.usage.output > 0)) {
        stats.requestCount++;
        stats.lastUpdated = Date.now();
        pi.appendEntry("llm-stats", stats);
        updateFooter(ctx);
      }
    }
  });

  // Toggle command
  pi.registerCommand("llm-stats", {
    description: "Toggle LLM request count display",
    handler: async (_args, ctx) => {
      footerEnabled = !footerEnabled;
      if (footerEnabled) {
        updateFooter(ctx);
        ctx.ui.notify("LLM stats enabled", "info");
      } else {
        ctx.ui.setFooter(undefined);
        ctx.ui.notify("LLM stats disabled", "info");
      }
    },
  });

  // Show detailed stats
  pi.registerCommand("llm-stats-show", {
    description: "Show LLM request statistics",
    handler: async (_args, ctx) => {
      ctx.ui.notify(`Total requests: ${stats.requestCount}`, "info");
    },
  });

  function updateFooter(ctx: any) {
    if (!footerEnabled) return;

    ctx.ui.setFooter((tui: any, theme: any, footerData: any) => {
      const unsub = footerData.onBranchChange(() => tui.requestRender());

      return {
        dispose: unsub,
        invalidate() {},
        render(width: number): string[] {
          // Calculate stats from session
          let input = 0, output = 0, cacheRead = 0, cacheWrite = 0, cost = 0;
          let totalTokens = 0;
          
          for (const e of ctx.sessionManager.getBranch()) {
            if (e.type === "message" && (e.message as any).role === "assistant") {
              const m = e.message as AssistantMessage;
              if (m.usage) {
                input += m.usage.input || 0;
                output += m.usage.output || 0;
                cacheRead += m.usage.cacheRead || 0;
                cacheWrite += m.usage.cacheWrite || 0;
                cost += m.usage.cost?.total || 0;
                totalTokens += m.usage.totalTokens || 0;
              }
            }
          }

          const fmt = (n: number) => n < 1000 ? `${n}` : `${(n / 1000).toFixed(1)}k`;
          const fmtCost = (n: number) => n < 1 ? `$${n.toFixed(3)}` : `$${n.toFixed(2)}`;
          
          // Build left side: token stats + Req count
          const leftParts: string[] = [];
          if (input > 0) leftParts.push(theme.fg("dim", `↑${fmt(input)}`));
          if (output > 0) leftParts.push(theme.fg("dim", `↓${fmt(output)}`));
          if (cacheRead > 0) leftParts.push(theme.fg("dim", `R${fmt(cacheRead)}`));
          if (cacheWrite > 0) leftParts.push(theme.fg("dim", `W${fmt(cacheWrite)}`));
          if (cost > 0) leftParts.push(theme.fg("dim", fmtCost(cost)));
          
          // Add Req count (highlighted)
          leftParts.push(theme.fg("accent", `Req:${stats.requestCount}`));

          const left = leftParts.join(" ");

          // Right side: model + branch
          const branch = footerData.getGitBranch();
          const branchStr = branch ? ` (${branch})` : "";
          const modelId = ctx.model?.id || "no-model";
          const right = theme.fg("dim", `${modelId}${branchStr}`);

          // Padding between left and right
          const leftWidth = visibleWidth(left);
          const rightWidth = visibleWidth(right);
          const available = width - leftWidth - rightWidth - 1;
          const pad = " ".repeat(Math.max(1, available));

          return [truncateToWidth(left + pad + right, width)];
        },
      };
    });
  }
}
