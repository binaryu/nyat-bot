import { describe, expect, it, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { tool } from 'ai';

const mockMcpTools: Record<string, import('../../../../../src/pipeline/tools/mcp/types.js').McpToolEntry> = {};

vi.mock('../../../../../src/pipeline/tools/mcp/index.js', () => ({
  getMcpClientManager: () => ({
    getTools: () => mockMcpTools,
    connectAll: vi.fn(async () => {}),
    closeAll: vi.fn(async () => {}),
  }),
}));

const envState = {
  MCP_ENABLED: true,
  MCP_CONFIG_PATH: './config/mcp.json',
  SKILLS_DIR: './data/skills',
};

vi.mock('../../../../../src/env.js', () => ({
  env: () => envState,
}));

vi.mock('../../../../../src/tracking/interaction.js', () => ({
  getBotTracker: () => null,
}));

import {
  buildToolSet,
  getToolNames,
  executeValidatedToolStep,
} from '../../../../../src/pipeline/tools/registry.js';

describe('MCP registry integration', () => {
  beforeEach(() => {
    envState.MCP_ENABLED = true;
    for (const k of Object.keys(mockMcpTools)) {
      delete mockMcpTools[k];
    }
  });

  it('includes MCP tools in buildToolSet and getToolNames when MCP_ENABLED is true', () => {
    const weatherSchema = z.object({ city: z.string() });
    const weatherExecute = vi.fn(async ({ city }: { city: string }) => ({ city, temp: 18 }));

    mockMcpTools['weather_get_current'] = {
      name: 'weather_get_current',
      serverName: 'weather',
      originalName: 'get_current',
      description: 'Get current weather',
      parameterSchema: weatherSchema,
      tool: tool({
        description: 'Get current weather',
        parameters: weatherSchema,
        execute: weatherExecute,
      }),
    };

    const tools = buildToolSet(100, 200);
    expect(tools['weather_get_current']).toBeDefined();

    const names = getToolNames(100, 200);
    expect(names).toContain('weather_get_current');
  });

  it('allows filtering MCP tools with only using either name or originalName', () => {
    const schema = z.object({ query: z.string() });
    mockMcpTools['fs_read_file'] = {
      name: 'fs_read_file',
      serverName: 'fs',
      originalName: 'read_file',
      description: 'Read file',
      parameterSchema: schema,
      tool: tool({
        description: 'Read file',
        parameters: schema,
        execute: async () => 'file content',
      }),
    };

    // Filter using originalName
    const tools1 = buildToolSet(100, 200, ['read_file']);
    expect(tools1['fs_read_file']).toBeDefined();

    // Filter using prefixed name
    const tools2 = buildToolSet(100, 200, ['fs_read_file']);
    expect(tools2['fs_read_file']).toBeDefined();

    // Excluded
    const tools3 = buildToolSet(100, 200, ['SEARCH']);
    expect(tools3['fs_read_file']).toBeUndefined();
  });

  it('executes MCP tool through executeValidatedToolStep with schema validation', async () => {
    const schema = z.object({ city: z.string(), days: z.number().default(1) });
    const mockExec = vi.fn(async ({ city, days }: { city: string; days: number }) => ({
      city,
      days,
      forecast: 'sunny',
    }));

    mockMcpTools['weather_forecast'] = {
      name: 'weather_forecast',
      serverName: 'weather',
      originalName: 'forecast',
      description: 'Forecast',
      parameterSchema: schema,
      tool: tool({
        description: 'Forecast',
        parameters: schema,
        execute: mockExec,
      }),
    };

    // Call with prefixed name
    const res1 = await executeValidatedToolStep('weather_forecast', { city: 'Tokyo' }, 100, 200);
    expect(res1).toEqual({ city: 'Tokyo', days: 1, forecast: 'sunny' });

    // Call with originalName
    const res2 = await executeValidatedToolStep('forecast', { city: 'Kyoto', days: 2 }, 100, 200);
    expect(res2).toEqual({ city: 'Kyoto', days: 2, forecast: 'sunny' });
  });

  it('omits MCP tools when MCP_ENABLED is false', () => {
    envState.MCP_ENABLED = false;

    mockMcpTools['weather_get_current'] = {
      name: 'weather_get_current',
      serverName: 'weather',
      originalName: 'get_current',
      parameterSchema: z.object({}),
      tool: tool({
        description: 'Get weather',
        parameters: z.object({}),
        execute: async () => 'ok',
      }),
    };

    const tools = buildToolSet(100, 200);
    expect(tools['weather_get_current']).toBeUndefined();
  });
});
