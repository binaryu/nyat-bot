import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const { clientInstances } = vi.hoisted(() => ({
  clientInstances: [] as Array<{
    connect: ReturnType<typeof vi.fn>;
    listTools: ReturnType<typeof vi.fn>;
    callTool: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
  }>,
}));

vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: class {
    connect = vi.fn(async () => {});
    listTools = vi.fn(async () => ({
      tools: [
        {
          name: 'get_current_weather',
          description: 'Get weather for city',
          inputSchema: {
            type: 'object',
            properties: {
              city: { type: 'string' },
            },
            required: ['city'],
          },
        },
      ],
    }));
    callTool = vi.fn(async ({ name, arguments: args }: { name: string; arguments?: Record<string, unknown> }) => {
      if (name === 'get_current_weather') {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ city: args?.city, temperature: 22 }),
            },
          ],
        };
      }
      if (name === 'failing_tool') {
        return {
          isError: true,
          content: [{ type: 'text', text: 'Server error occurred' }],
        };
      }
      return { content: [] };
    });
    close = vi.fn(async () => {});

    constructor() {
      clientInstances.push(this);
    }
  },
}));

vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: class {
    close = vi.fn(async () => {});
  },
}));

vi.mock('@modelcontextprotocol/sdk/client/sse.js', () => ({
  SSEClientTransport: class {
    close = vi.fn(async () => {});
  },
}));

vi.mock('@modelcontextprotocol/sdk/client/streamableHttp.js', () => ({
  StreamableHTTPClientTransport: class {
    close = vi.fn(async () => {});
  },
}));

const mockEnv = vi.fn(() => ({
  MCP_ENABLED: true,
  MCP_CONFIG_PATH: './config/mcp.json',
}));
vi.mock('../../../../../src/env.js', () => ({
  env: () => mockEnv(),
}));

import {
  McpClientManager,
  sanitizeToolName,
  computeToolName,
  formatMcpToolResult,
} from '../../../../../src/pipeline/tools/mcp/client-manager.js';

describe('MCP client-manager', () => {
  let tempDir: string;

  beforeEach(() => {
    clientInstances.length = 0;
    tempDir = mkdtempSync(join(tmpdir(), 'mcp-test-'));
  });

  afterEach(() => {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('sanitizes tool names and computes prefixed names', () => {
    expect(sanitizeToolName('valid_name-123')).toBe('valid_name-123');
    expect(sanitizeToolName('invalid.name@foo')).toBe('invalid_name_foo');
    expect(computeToolName('weather', 'get_current')).toBe('weather_get_current');
    expect(computeToolName('weather', 'weather_forecast')).toBe('weather_forecast');
  });

  it('formats tool results properly for text, json, and errors', () => {
    expect(formatMcpToolResult(null)).toBeNull();
    expect(formatMcpToolResult({ content: [] })).toBe('ok');
    expect(
      formatMcpToolResult({
        content: [{ type: 'text', text: '{"temp":25}' }],
      }),
    ).toEqual({ temp: 25 });
    expect(
      formatMcpToolResult({
        content: [{ type: 'text', text: 'raw plain text' }],
      }),
    ).toBe('raw plain text');
    expect(() =>
      formatMcpToolResult({
        isError: true,
        content: [{ type: 'text', text: 'Execution failed' }],
      }),
    ).toThrow(/Execution failed/);
  });

  it('loads config with env variable substitution', async () => {
    process.env['TEST_MCP_KEY'] = 'secret-123';
    const configPath = join(tempDir, 'mcp.json');
    writeFileSync(
      configPath,
      JSON.stringify({
        mcpServers: {
          testServer: {
            command: 'node',
            args: ['server.js'],
            env: {
              API_KEY: '${TEST_MCP_KEY}',
            },
          },
        },
      }),
    );

    const manager = new McpClientManager();
    const loaded = await manager.loadConfig(configPath);
    expect(loaded['testServer']).toBeDefined();
    expect(loaded['testServer']?.env?.['API_KEY']).toBe('secret-123');
  });

  it('connects to servers, discovers tools, calls tool, and closes gracefully', async () => {
    const configPath = join(tempDir, 'mcp.json');
    writeFileSync(
      configPath,
      JSON.stringify({
        mcpServers: {
          weather: {
            command: 'node',
            args: ['weather-server.js'],
          },
        },
      }),
    );

    const manager = new McpClientManager();
    await manager.connectAll(configPath);
    expect(manager.isReady()).toBe(true);

    const tools = manager.getTools();
    expect(tools['weather_get_current_weather']).toBeDefined();
    expect(tools['weather_get_current_weather']?.originalName).toBe('get_current_weather');

    const result = await manager.callTool('weather', 'get_current_weather', { city: 'Paris' });
    expect(result).toEqual({ city: 'Paris', temperature: 22 });

    await manager.closeAll();
    expect(manager.isReady()).toBe(false);
    expect(Object.keys(manager.getTools())).toHaveLength(0);
  });

  it('does nothing when MCP_ENABLED is false', async () => {
    mockEnv.mockReturnValueOnce({
      MCP_ENABLED: false,
      MCP_CONFIG_PATH: './config/mcp.json',
    });

    const manager = new McpClientManager();
    await manager.connectAll();
    expect(manager.isReady()).toBe(false);
    expect(Object.keys(manager.getTools())).toHaveLength(0);
  });
});
