// ────────────────────────────────────────
// Web search tool — Direct Tavily REST API (primary, lightweight) + MCP fallback
// ────────────────────────────────────────

import { env } from '../../env.js';
import { logger } from '../../shared/logger.js';
import { getMcpClientManager } from './mcp/index.js';

export interface TavilySearchResultItem {
  title: string;
  url: string;
  content: string;
  score?: number;
  published_date?: string;
}

export interface TavilySearchResponse {
  query: string;
  answer?: string | null;
  results: TavilySearchResultItem[];
}

/**
 * 获取当前北京时间字符串 (YYYY-MM-DD)
 */
export function getTodayDateString(): string {
  const d = new Date();
  const bjTime = new Date(d.getTime() + 8 * 60 * 60 * 1000);
  return bjTime.toISOString().slice(0, 10);
}

/**
 * 直接通过原生 HTTP fetch 调用 Tavily REST API。
 * 零子进程、零额外依赖，节省 ~80MB 内存。
 */
export async function directTavilySearch(
  query: string,
  apiKey: string,
  apiUrl = 'https://api.tavily.com',
): Promise<string> {
  const isFreshDay = /今天|今日|今天的新闻|今日新闻|实时|即时|today/i.test(query);
  const isRecentNews = isFreshDay || /最新|新闻|本周|这几天|近期|news|latest/i.test(query);

  const payload: Record<string, unknown> = {
    api_key: apiKey,
    query,
    max_results: 5,
    search_depth: 'basic',
    include_answer: true,
  };

  if (isRecentNews) {
    payload['topic'] = 'news';
    payload['time_range'] = isFreshDay ? 'day' : 'week';
  }
  if (isFreshDay) {
    payload['start_date'] = getTodayDateString();
  }

  const endpoint = `${apiUrl.replace(/\/+$/, '')}/search`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(25_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Tavily API ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as TavilySearchResponse;
  if (!data.results || data.results.length === 0) {
    return `关于"${query}"没有找到相关搜索结果。`;
  }

  let out = `关于"${query}"的搜索结果：\n`;
  if (data.answer) {
    out += `\n概述：${data.answer}\n\n`;
  }
  for (const r of data.results) {
    out += `- [${r.title}](${r.url})\n  ${r.content}\n`;
  }
  return out.trim();
}

/**
 * 执行联网搜索：
 * 1. 优先使用直连 Tavily REST API（轻量高效，无需运行 MCP 独立子进程）
 * 2. 其次回退到外部 MCP 搜索服务（如配置了其他 MCP 搜索工具）
 */
export async function executeSearch(query: string): Promise<string> {
  const e = env();

  // Route 1: Direct Tavily REST (Lightweight, 0 child processes)
  if (e.TAVILY_API_KEY) {
    try {
      return await directTavilySearch(query, e.TAVILY_API_KEY, e.TAVILY_API_URL);
    } catch (err) {
      logger.warn({ err, query }, 'Direct Tavily search failed, checking fallbacks');
    }
  }

  // Route 2: MCP Search Tool fallback
  if (e.MCP_ENABLED) {
    try {
      const manager = getMcpClientManager();
      const tools = manager.getTools();
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

        const args: Record<string, unknown> = { query };
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

  return `未配置可用的联网搜索服务。请配置 TAVILY_API_KEY 或在 MCP 中配置搜索工具。`;
}
