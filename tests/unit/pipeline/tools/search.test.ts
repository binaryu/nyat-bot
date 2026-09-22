import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockEnv = vi.fn(() => ({
  MCP_ENABLED: true,
}));

vi.mock('../../../../src/env.js', () => ({
  env: () => mockEnv(),
}));

vi.mock('../../../../src/shared/logger.js', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const mockCallTool = vi.fn();
const mockGetTools = vi.fn();

vi.mock('../../../../src/pipeline/tools/mcp/index.js', () => ({
  getMcpClientManager: () => ({
    getTools: mockGetTools,
    callTool: mockCallTool,
  }),
}));

import { executeSearch } from '../../../../src/pipeline/tools/search.js';

describe('executeSearch via MCP delegation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv.mockReturnValue({ MCP_ENABLED: true });
    mockGetTools.mockReturnValue({
      tavily_search: {
        serverName: 'tavily',
        originalName: 'tavily_search',
        name: 'tavily_search',
      },
    });
  });

  it('delegates search query to MCP search tool and returns result', async () => {
    mockCallTool.mockResolvedValue('Detailed Results: Tavily Search Result for query');

    const result = await executeSearch('Node.js 22 LTS');
    expect(mockCallTool).toHaveBeenCalledWith('tavily', 'tavily_search', {
      query: 'Node.js 22 LTS',
    });
    expect(result).toBe('Detailed Results: Tavily Search Result for query');
  });

  it('injects news topic, time_range and start_date for time-sensitive queries', async () => {
    mockCallTool.mockResolvedValue('Fresh news today');

    const result = await executeSearch('今天的 AI 新闻');
    expect(mockCallTool).toHaveBeenCalledWith(
      'tavily',
      'tavily_search',
      expect.objectContaining({
        query: '今天的 AI 新闻',
        topic: 'news',
        time_range: 'day',
        start_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      }),
    );
    expect(result).toBe('Fresh news today');
  });

  it('serializes JSON object results cleanly', async () => {
    mockCallTool.mockResolvedValue({ answer: 'Clean answer', sources: ['https://example.com'] });

    const result = await executeSearch('What is AI?');
    expect(result).toContain('"answer": "Clean answer"');
    expect(result).toContain('"https://example.com"');
  });

  it('finds generic search tool when tavily_search is not present', async () => {
    mockGetTools.mockReturnValue({
      brave_web_search: {
        serverName: 'brave',
        originalName: 'web_search',
        name: 'brave_web_search',
      },
    });
    mockCallTool.mockResolvedValue('Brave search result');

    const result = await executeSearch('Brave test');
    expect(mockCallTool).toHaveBeenCalledWith('brave', 'web_search', {
      query: 'Brave test',
    });
    expect(result).toBe('Brave search result');
  });

  it('handles MCP tool error gracefully without throwing', async () => {
    mockCallTool.mockRejectedValue(new Error('Rate limit exceeded on MCP server'));

    const result = await executeSearch('error query');
    expect(result).toContain('搜索执行失败');
    expect(result).toContain('Rate limit exceeded');
  });

  it('returns informative message when MCP is disabled', async () => {
    mockEnv.mockReturnValue({ MCP_ENABLED: false });

    const result = await executeSearch('test query');
    expect(result).toContain('未配置可用的联网搜索服务');
  });

  it('returns informative message when no search tool is available in MCP', async () => {
    mockGetTools.mockReturnValue({
      math_add: {
        serverName: 'math',
        originalName: 'add',
        name: 'math_add',
      },
    });

    const result = await executeSearch('test query');
    expect(result).toContain('未配置可用的联网搜索服务');
    expect(mockCallTool).not.toHaveBeenCalled();
  });
});
