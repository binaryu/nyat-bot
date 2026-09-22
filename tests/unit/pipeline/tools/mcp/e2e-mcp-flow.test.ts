import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const mockEnv = vi.fn(() => ({
  MCP_ENABLED: true,
  MCP_CONFIG_PATH: './config/mcp.test.json',
  SKILLS_DIR: './data/skills',
}));

vi.mock('../../../../../src/env.js', () => ({
  env: () => mockEnv(),
}));

vi.mock('../../../../../src/tracking/interaction.js', () => ({
  getBotTracker: () => null,
}));

import { McpClientManager } from '../../../../../src/pipeline/tools/mcp/client-manager.js';
import { buildToolSet, executeValidatedToolStep } from '../../../../../src/pipeline/tools/registry.js';

describe('MCP e2e flow with real stdio server', () => {
  const serverScript = resolve('tests/unit/pipeline/tools/mcp/fixtures-stdio-server.js');
  const configPath = resolve('tests/unit/pipeline/tools/mcp/fixtures-mcp.json');

  beforeEach(() => {
    // Write out test stdio server script
    writeFileSync(
      serverScript,
      `import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const server = new Server({ name: 'math', version: '1.0.0' }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'add_numbers',
      description: 'Add two numbers together',
      inputSchema: {
        type: 'object',
        properties: {
          a: { type: 'number', description: 'First number' },
          b: { type: 'number', description: 'Second number' }
        },
        required: ['a', 'b']
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { a, b } = req.params.arguments || {};
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ sum: Number(a) + Number(b) })
      }
    ]
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
`,
    );

    // Write out test mcp.json
    writeFileSync(
      configPath,
      JSON.stringify({
        mcpServers: {
          math: {
            command: process.execPath,
            args: [serverScript],
            cwd: process.cwd(),
          },
        },
      }),
    );
  });

  afterEach(() => {
    if (existsSync(serverScript)) unlinkSync(serverScript);
    if (existsSync(configPath)) unlinkSync(configPath);
  });

  it('connects to real stdio MCP server, discovers tools, and executes successfully', async () => {
    const manager = new McpClientManager();
    await manager.connectAll(configPath);
    expect(manager.isReady()).toBe(true);

    const tools = manager.getTools();
    expect(tools['math_add_numbers']).toBeDefined();

    const mcpTool = tools['math_add_numbers']!;
    expect(mcpTool.name).toBe('math_add_numbers');
    expect(mcpTool.originalName).toBe('add_numbers');

    // Call tool directly through manager
    const directResult = await manager.callTool('math', 'add_numbers', { a: 15, b: 27 });
    expect(directResult).toEqual({ sum: 42 });

    // Call tool through AI SDK tool.execute
    const toolExecResult = await (mcpTool.tool.execute as (args: unknown) => Promise<unknown>)({
      a: 100,
      b: 25,
    });
    expect(toolExecResult).toEqual({ sum: 125 });

    await manager.closeAll();
    expect(manager.isReady()).toBe(false);
  });

  it('can be integrated via registry when connected', async () => {
    const { getMcpClientManager } = await import('../../../../../src/pipeline/tools/mcp/client-manager.js');
    const singleton = getMcpClientManager();
    await singleton.connectAll(configPath);

    const toolSet = buildToolSet(10, 20);
    expect(toolSet['math_add_numbers']).toBeDefined();

    const res = await executeValidatedToolStep('math_add_numbers', { a: 7, b: 8 }, 10, 20);
    expect(res).toEqual({ sum: 15 });

    await singleton.closeAll();
  });
});
