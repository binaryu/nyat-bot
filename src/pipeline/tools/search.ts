// ────────────────────────────────────────
// Web search tool — Delegated to external MCP search tools
// ────────────────────────────────────────

import { env } from '../../env.js';
import { logger } from '../../shared/logger.js';
import { getMcpClientManager } from './mcp/index.js';

/**
 * 获取当前北京时间字符串 (YYYY-MM-DD)
 */
export function getTodayDateString(): string {
  const d = new Date();
  const bjTime = new Date(d.getTime() + 8 * 60 * 60 * 1000);
  return bjTime.toISOString().slice(0, 10);
}

/**
 * 执行联网搜索：委托给外部 MCP 搜索服务（如 Tavily、Brave 等）。
 * 搜索能力完全外部化，通过 MCP 协议解耦。
 * 针对时效性词汇（今天/今日/最新/新闻）自动配置时间范围与日期上下文。
 */
export async function executeSearch(query: string): Promise<string> {
  if (env().MCP_ENABLED) {
    try {
      const manager = getMcpClientManager();
      const tools = manager.getTools();
      // 优先寻找名为 tavily_search 或任意以 _search 结尾 / 包含 search 的 MCP 工具
      const searchTool =
        tools['tavily_search'] ??
        Object.values(tools).find(
          (t) =>
            t.originalName.toLowerCase() === 'search' ||
            t.originalName.toLowerCase().includes('search') ||
            t.name.toLowerCase().endsWith('_search'),
        );

      if (searchTool) {
        const isFreshDay = /今天|今日|今天的新闻|今日新闻|实时|即时|today/i.test(query);
        const isRecentNews = isFreshDay || /最新|新闻|本周|这几天|近期|news|latest/i.test(query);

        const args: Record<string, unknown> = {
          query,
        };

        // 如果是 Tavily MCP，支持针对时效性做针对性优化
        if (searchTool.serverName === 'tavily' || searchTool.originalName.includes('tavily')) {
          if (isRecentNews) {
            args['topic'] = 'news';
            args['time_range'] = isFreshDay ? 'day' : 'week';
          }
          if (isFreshDay) {
            args['start_date'] = getTodayDateString();
          }
        }

        const result = await manager.callTool(searchTool.serverName, searchTool.originalName, args);
        if (typeof result === 'string') return result;
        if (result && typeof result === 'object') {
          return JSON.stringify(result, null, 2);
        }
        return String(result);
      }
    } catch (err) {
      logger.warn({ err, query }, 'MCP search delegation failed');
      return `搜索执行失败: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  return `未配置可用的联网搜索服务。请在 MCP 配置 (config/mcp.json) 中启用搜索工具。`;
}
