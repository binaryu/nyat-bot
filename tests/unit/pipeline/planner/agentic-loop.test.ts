import { beforeEach, describe, expect, it, vi } from 'vitest';

const { generateTextMock, buildToolSetMock, createOpenAIMock, createAnthropicMock, getLabelMock } = vi.hoisted(() => ({
  generateTextMock: vi.fn(),
  buildToolSetMock: vi.fn(() => ({ SEARCH: { description: 's' } })),
  createOpenAIMock: vi.fn(() => vi.fn((m: string) => ({ modelId: m, provider: 'openai' }))),
  createAnthropicMock: vi.fn(() => vi.fn((m: string) => ({ modelId: m, provider: 'anthropic' }))),
  getLabelMock: vi.fn(() => ({ name: 'l1', endpoint: 'http://x', apiKeys: ['k'], model: 'm1', apiFormat: undefined })),
}));

vi.mock('ai', () => ({ generateText: generateTextMock }));
vi.mock('@ai-sdk/openai', () => ({ createOpenAI: createOpenAIMock }));
vi.mock('@ai-sdk/anthropic', () => ({ createAnthropic: createAnthropicMock }));
vi.mock('../../../../src/pipeline/tools/registry.js', () => ({ buildToolSet: buildToolSetMock }));
vi.mock('../../../../src/shared/config.js', () => ({
  getConfig: vi.fn(() => ({ promptsDir: '/mock/prompts' })),
  loadPrompt: vi.fn(() => 'mock-system-prompt'),
}));
vi.mock('../../../../src/ai/labels.js', () => ({
  getUsage: vi.fn(() => ({ label: 'l1', backups: [], timeout: 30000 })),
  getLabel: getLabelMock,
}));
vi.mock('../../../../src/ai/cooldown.js', () => ({
  CooldownTracker: class { isCoolingDown = async () => false; setCooldown = async () => {}; },
}));
vi.mock('../../../../src/db/redis.js', () => ({ getRedis: vi.fn(() => ({})) }));
vi.mock('../../../../src/env.js', () => ({ env: () => ({ PLANNER_MAX_STEPS: 4 }) }));
vi.mock('../../../../src/shared/abort.js', () => ({
  mergeAbortSignals: vi.fn(() => undefined),
  isCallerAbort: vi.fn(() => false),
}));
vi.mock('../../../../src/shared/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

import { runAgenticPlanner } from '../../../../src/pipeline/planner/agentic-loop.js';

describe('runAgenticPlanner with Claude and OpenAI providers', () => {
  beforeEach(() => {
    generateTextMock.mockReset();
    createOpenAIMock.mockClear();
    createAnthropicMock.mockClear();
    getLabelMock.mockReset();
    generateTextMock.mockResolvedValue({
      steps: [
        {
          toolCalls: [{ toolName: 'SEARCH', args: { q: 'nyat' } }],
          toolResults: [{ toolName: 'SEARCH', result: 'found 1 result' }],
        },
      ],
    });
  });

  it('uses createAnthropic when apiFormat is claude', async () => {
    getLabelMock.mockReturnValue({
      name: 'claude-planner',
      endpoint: 'https://api.anthropic.com/v1',
      apiKeys: ['sk-ant-key'],
      model: 'claude-3-5-haiku-20241022',
      apiFormat: 'claude',
    });

    const res = await runAgenticPlanner({
      chatId: -1001,
      userId: 42,
      messageText: 'search for nyat',
      context: 'chat history',
    });

    expect(res.failed).toBe(false);
    expect(res.toolsUsed).toEqual(['SEARCH']);
    expect(createAnthropicMock).toHaveBeenCalledWith({
      baseURL: 'https://api.anthropic.com/v1',
      apiKey: 'sk-ant-key',
    });
  });

  it('uses createOpenAI when apiFormat is openai or undefined', async () => {
    getLabelMock.mockReturnValue({
      name: 'openai-planner',
      endpoint: 'https://api.openai.com/v1',
      apiKeys: ['sk-openai-key'],
      model: 'gpt-4o-mini',
      apiFormat: 'openai',
    });

    const res = await runAgenticPlanner({
      chatId: -1001,
      userId: 42,
      messageText: 'search for nyat',
      context: 'chat history',
    });

    expect(res.failed).toBe(false);
    expect(res.toolsUsed).toEqual(['SEARCH']);
    expect(createOpenAIMock).toHaveBeenCalledWith({
      baseURL: 'https://api.openai.com/v1',
      apiKey: 'sk-openai-key',
      compatibility: 'compatible',
    });
  });
});
