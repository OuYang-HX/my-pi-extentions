/**
 * LLM Stats Extension - Tracks model API request counts
 *
 * Display: ↑98k ↓1.9k R78k W4.3k $0.070 9.1%/205k (auto) Req:12  model-name (branch)
 *
 * Replaces the footer to add Req: count, while preserving all original stats:
 * - Token counts (↑ ↓ R W)
 * - Cost ($)
 * - Context usage (X%/contextWindow (auto))
 * - PWD + branch + session name
 */

import type { AssistantMessage } from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { theme } from "@earendil-works/pi-coding-agent";

interface LLMStatsData {
  requestCount: number;
  lastUpdated: number;
}

/** Format token counts, matching the original footer's formatTokens() */
function formatTokens(count: number): string {
  if (count < 1000) return count.toString();
  if (count < 10000) return `${(count / 1000).toFixed(1)}k`;
  if (count < 1000000) return `${Math.round(count / 1000)}k`;
  if (count < 1000000) return `${(count / 1000000).toFixed(1)}M`;
  return `${Math.round(count / 1000000)}M`;
}

/** Sanitize text for status display */
function sanitizeStatusText(text: string): string {
  return text.replace(/[\r\n\t]/g, " ").replace(/ +/g, " ").trim();
}

export default function (pi: ExtensionAPI) {
  let stats: LLMStatsData = { requestCount: 0, lastUpdated: Date.now() };
  let footerEnabled = true;

  // Restore state on session start
  pi.on("session_start", async (_event, ctx) => {
    stats = { requestCount: 0, lastUpdated: Date.now() };

    // Count existing assistant messages with usage
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

    // Use the larger count (session history vs persisted)
    if (existingCount.size > stats.requestCount) {
      stats.requestCount = existingCount.size;
      pi.appendEntry("llm-stats", stats);
    }

    updateFooter(ctx);
  });

  // Track new requests
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

    ctx.ui.setFooter((tui: any, themeFn: any, footerData: any) => {
      const unsub = footerData.onBranchChange(() => tui.requestRender());

      return {
        dispose: unsub,
        invalidate() {},
        render(width: number): string[] {
          // Calculate cumulative usage from ALL session entries (not just branch)
          // This matches the original footer's approach
          let totalInput = 0;
          let totalOutput = 0;
          let totalCacheRead = 0;
          let totalCacheWrite = 0;
          let totalCost = 0;

          for (const entry of ctx.sessionManager.getEntries()) {
            if (entry.type === "message" && entry.message.role === "assistant") {
              const m = entry.message as AssistantMessage;
              totalInput += m.usage?.input || 0;
              totalOutput += m.usage?.output || 0;
              totalCacheRead += m.usage?.cacheRead || 0;
              totalCacheWrite += m.usage?.cacheWrite || 0;
              totalCost += m.usage?.cost?.total || 0;
            }
          }

          // Get context usage
          const contextUsage = ctx.getContextUsage();
          const contextWindow = contextUsage?.contextWindow ?? ctx.model?.contextWindow ?? 0;
          const contextPercentValue = contextUsage?.percent ?? 0;
          const contextPercent =
            contextUsage?.percent !== null
              ? contextPercentValue.toFixed(1)
              : "?";

          // Build pwd line (matching original footer)
          let pwd = ctx.sessionManager.getCwd();
          const home = (process as any).env?.HOME || (process as any).env?.USERPROFILE;
          if (home && pwd.startsWith(home)) {
            pwd = `~${pwd.slice(home.length)}`;
          }

          const branch = footerData.getGitBranch();
          if (branch) {
            pwd = `${pwd} (${branch})`;
          }

          const sessionName = ctx.sessionManager.getSessionName();
          if (sessionName) {
            pwd = `${pwd} • ${sessionName}`;
          }

          // Build stats parts (matching original footer's stats line)
          const statsParts: string[] = [];

          if (totalInput) statsParts.push(`↑${formatTokens(totalInput)}`);
          if (totalOutput) statsParts.push(`↓${formatTokens(totalOutput)}`);
          if (totalCacheRead) statsParts.push(`R${formatTokens(totalCacheRead)}`);
          if (totalCacheWrite) statsParts.push(`W${formatTokens(totalCacheWrite)}`);
          if (totalCost) statsParts.push(`$${totalCost.toFixed(3)}`);

          // Context usage with color (always show, even when 0)
          let contextPercentStr: string;
          const autoIndicator = " (auto)";
          const contextPercentDisplay =
            contextPercent === "?"
              ? `?/${formatTokens(contextWindow)}${autoIndicator}`
              : `${contextPercent}%/${formatTokens(contextWindow)}${autoIndicator}`;

          if (contextPercentValue > 90) {
            contextPercentStr = themeFn.fg("error", contextPercentDisplay);
          } else if (contextPercentValue > 70) {
            contextPercentStr = themeFn.fg("warning", contextPercentDisplay);
          } else {
            contextPercentStr = contextPercentDisplay;
          }
          statsParts.push(contextPercentStr);

          // Append Req count (highlighted)
          statsParts.push(themeFn.fg("accent", `Req:${stats.requestCount}`));

          let statsLeft = statsParts.join(" ");

          // Right side: model + thinking level
          const modelName = ctx.model?.id || "no-model";
          let rightSideWithoutProvider = modelName;

          // Add thinking level if supported
          const modelAny = ctx.model as any;
          if (modelAny?.reasoning) {
            const thinkingLevel = (ctx.state as any)?.thinkingLevel || "off";
            rightSideWithoutProvider =
              thinkingLevel === "off"
                ? `${modelName} • thinking off`
                : `${modelName} • ${thinkingLevel}`;
          }

          // Add provider if multiple available
          let rightSide = rightSideWithoutProvider;
          if (footerData.getAvailableProviderCount() > 1 && ctx.model) {
            const withProvider = `(${modelAny.provider}) ${rightSideWithoutProvider}`;
            if (visibleWidth(statsLeft) + 2 + visibleWidth(withProvider) <= width) {
              rightSide = withProvider;
            }
          }

          const rightSideWidth = visibleWidth(rightSide);
          const statsLeftWidth = visibleWidth(statsLeft);

          // If statsLeft is too wide, truncate it
          if (statsLeftWidth > width) {
            statsLeft = truncateToWidth(statsLeft, width, "...");
          }

          // Build final stats line with right-side model
          let statsLine: string;
          const minPadding = 2;

          if (statsLeftWidth + minPadding + rightSideWidth <= width) {
            const padding = " ".repeat(width - statsLeftWidth - rightSideWidth);
            statsLine = statsLeft + padding + rightSide;
          } else {
            const availableForRight = width - statsLeftWidth - minPadding;
            if (availableForRight > 0) {
              const truncatedRight = truncateToWidth(rightSide, availableForRight, "");
              const truncatedRightWidth = visibleWidth(truncatedRight);
              const padding = " ".repeat(
                Math.max(0, width - statsLeftWidth - truncatedRightWidth)
              );
              statsLine = statsLeft + padding + truncatedRight;
            } else {
              statsLine = statsLeft;
            }
          }

          // Apply dim styling (split around colored context percent)
          const dimStatsLeft = themeFn.fg("dim", statsLeft);
          const remainder = statsLine.slice(statsLeft.length);
          const dimRemainder = themeFn.fg("dim", remainder);

          const pwdLine = truncateToWidth(
            themeFn.fg("dim", pwd),
            width,
            themeFn.fg("dim", "...")
          );
          const lines: string[] = [pwdLine, dimStatsLeft + dimRemainder];

          // Add extension statuses (sorted alphabetically)
          const extensionStatuses = footerData.getExtensionStatuses();
          if (extensionStatuses.size > 0) {
            const sortedStatuses = Array.from(extensionStatuses.entries())
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([, text]) => sanitizeStatusText(text));
            const statusLine = sortedStatuses.join(" ");
            lines.push(
              truncateToWidth(statusLine, width, themeFn.fg("dim", "..."))
            );
          }

          return lines;
        },
      };
    });
  }
}
