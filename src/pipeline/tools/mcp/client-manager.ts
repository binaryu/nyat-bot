// ────────────────────────────────────────
// MCP Client Manager — Lifecycle, Connection Pool, & Tool Discovery
// ────────────────────────────────────────

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { tool } from 'ai';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { McpServerConfig, McpConfigFile, McpToolEntry } from './types.js';
import { jsonSchemaToZodObject } from './schema-converter.js';
import { env } from '../../../env.js';
import { logger } from '../../../shared/logger.js';

export function sanitizeToolName(name: string): string {
  const sanitized = name.replace(/[^a-zA-Z0-9_-]/g, '_');
  return sanitized.slice(0, 64);
}

export function computeToolName(serverName: string, originalName: string): string {
  const cleanServer = sanitizeToolName(serverName);
  const cleanOriginal = sanitizeToolName(originalName);
  if (cleanOriginal.toLowerCase().startsWith(`${cleanServer.toLowerCase()}_`)) {
    return cleanOriginal;
  }
  return sanitizeToolName(`${cleanServer}_${cleanOriginal}`);
}

function substituteEnvVars(val: unknown): unknown {
  if (typeof val === 'string') {
    return val.replace(/\$\{([^}]+)\}|\$([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, group1, group2) => {
      const varName = (group1 || group2) as string;
      return process.env[varName] ?? '';
    });
  }
  if (Array.isArray(val)) {
    return val.map(substituteEnvVars);
  }
  if (val !== null && typeof val === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val)) {
      result[k] = substituteEnvVars(v);
    }
    return result;
  }
  return val;
}

export function formatMcpToolResult(result: unknown): unknown {
  if (!result || typeof result !== 'object') {
    return result;
  }
  const r = result as {
    isError?: boolean;
    content?: Array<{ type: string; text?: string; [key: string]: unknown }>;
  };
  if (r.isError) {
    const errorText = Array.isArray(r.content)
      ? r.content.map((c) => (c.type === 'text' && c.text ? c.text : JSON.stringify(c))).join('\n')
      : 'MCP tool execution failed with error flag';
    throw new Error(errorText);
  }

  if (!r.content || !Array.isArray(r.content) || r.content.length === 0) {
    return 'ok';
  }

  if (r.content.length === 1 && r.content[0]?.type === 'text') {
    const text = r.content[0].text ?? '';
    const trimmed = text.trim();
    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return text;
      }
    }
    return text;
  }

  const allText = r.content.every((c) => c.type === 'text');
  if (allText) {
    return r.content.map((c) => c.text ?? '').join('\n');
  }

  return r.content;
}

export class McpClientManager {
  private clients = new Map<string, Client>();
  private transports = new Map<string, Transport>();
  private tools = new Map<string, McpToolEntry>();
  private connected = false;
  private connectingPromise: Promise<void> | null = null;

  async loadConfig(configPath?: string): Promise<Record<string, McpServerConfig>> {
    const filePath = resolve(process.cwd(), configPath ?? env().MCP_CONFIG_PATH);
    if (!existsSync(filePath)) {
      logger.debug({ filePath }, 'MCP config file not found, skipping');
      return {};
    }

    try {
      const raw = await readFile(filePath, 'utf-8');
      const parsed = JSON.parse(raw) as McpConfigFile;
      const substituted = substituteEnvVars(parsed) as McpConfigFile;

      if (substituted.mcpServers && typeof substituted.mcpServers === 'object') {
        return substituted.mcpServers;
      }

      // Flat map fallback: { "server1": { "command": ... } }
      const flat: Record<string, McpServerConfig> = {};
      for (const [key, value] of Object.entries(substituted)) {
        if (value && typeof value === 'object' && ('command' in value || 'url' in value)) {
          flat[key] = value as McpServerConfig;
        }
      }
      return flat;
    } catch (err) {
      logger.error({ err, filePath }, 'Failed to parse MCP config file');
      return {};
    }
  }

  private createTransport(name: string, cfg: McpServerConfig): Transport {
    if (cfg.url) {
      const url = new URL(cfg.url);
      const isHttpType = cfg.type === 'http';
      if (isHttpType) {
        return new StreamableHTTPClientTransport(url, {
          requestInit: cfg.headers ? { headers: cfg.headers } : undefined,
        });
      }

      // Default to SSE for remote URLs
      const customFetch = cfg.headers
        ? ((url: string | URL, init: import('eventsource').EventSourceFetchInit) =>
            globalThis.fetch(url, {
              ...init,
              headers: {
                ...init.headers,
                ...cfg.headers,
              },
            }) as Promise<import('eventsource').FetchLikeResponse>)
        : undefined;

      return new SSEClientTransport(url, {
        requestInit: cfg.headers ? { headers: cfg.headers } : undefined,
        eventSourceInit: customFetch ? { fetch: customFetch } : undefined,
      });
    }

    if (cfg.command) {
      const mergedEnv: Record<string, string> = {
        ...(process.env as Record<string, string>),
        ...(cfg.env ?? {}),
      };

      return new StdioClientTransport({
        command: cfg.command,
        args: cfg.args ?? [],
        env: mergedEnv,
        cwd: cfg.cwd,
      });
    }

    throw new Error(`MCP server '${name}' config missing both 'command' and 'url'`);
  }

  async connectAll(configPath?: string): Promise<void> {
    if (!env().MCP_ENABLED) {
      return;
    }

    if (this.connectingPromise) {
      return this.connectingPromise;
    }

    this.connectingPromise = (async () => {
      const servers = await this.loadConfig(configPath);
      const serverNames = Object.keys(servers);

      if (serverNames.length === 0) {
        logger.info('No MCP servers configured to connect');
        this.connected = true;
        return;
      }

      logger.info({ serverCount: serverNames.length }, 'Connecting to MCP servers...');

      for (const [serverName, cfg] of Object.entries(servers)) {
        if (cfg.disabled) {
          logger.debug({ serverName }, 'MCP server is disabled, skipping');
          continue;
        }

        try {
          const transport = this.createTransport(serverName, cfg);
          const client = new Client(
            { name: 'nyat-bot', version: '0.5.0' },
            { capabilities: {} },
          );

          await client.connect(transport);
          this.clients.set(serverName, client);
          this.transports.set(serverName, transport);

          // List tools from this MCP server
          const listRes = await client.listTools();
          const serverTools = listRes.tools ?? [];

          for (const t of serverTools) {
            const toolName = computeToolName(serverName, t.name);
            const parameterSchema = jsonSchemaToZodObject(
              t.inputSchema as Parameters<typeof jsonSchemaToZodObject>[0],
            );

            const sdkTool = tool({
              description: t.description || `MCP tool ${t.name} from server ${serverName}`,
              parameters: parameterSchema,
              execute: async (args) => {
                return await this.callTool(serverName, t.name, args);
              },
            });

            this.tools.set(toolName, {
              name: toolName,
              serverName,
              originalName: t.name,
              description: t.description,
              parameterSchema,
              tool: sdkTool,
            });
          }

          logger.info(
            { serverName, toolCount: serverTools.length },
            'Connected to MCP server successfully',
          );
        } catch (err) {
          logger.error({ err, serverName }, 'Failed to connect to MCP server, continuing with others');
        }
      }

      this.connected = true;
      logger.info(
        { activeServers: this.clients.size, totalTools: this.tools.size },
        'MCP Client Manager initialization finished',
      );
    })();

    try {
      await this.connectingPromise;
    } finally {
      this.connectingPromise = null;
    }
  }

  async callTool(serverName: string, originalName: string, args: unknown): Promise<unknown> {
    const client = this.clients.get(serverName);
    if (!client) {
      throw new Error(`MCP server '${serverName}' is not connected or not found`);
    }

    const toolArgs =
      args && typeof args === 'object' ? (args as Record<string, unknown>) : {};

    logger.debug({ serverName, tool: originalName, args: toolArgs }, 'Calling MCP tool');
    const result = await client.callTool({
      name: originalName,
      arguments: toolArgs,
    });

    return formatMcpToolResult(result);
  }

  getTools(): Record<string, McpToolEntry> {
    const out: Record<string, McpToolEntry> = {};
    for (const [name, entry] of this.tools.entries()) {
      out[name] = entry;
    }
    return out;
  }

  isReady(): boolean {
    return this.connected;
  }

  async closeAll(): Promise<void> {
    logger.info('Closing all MCP clients and transports...');

    for (const [name, client] of this.clients.entries()) {
      try {
        await client.close();
      } catch (err) {
        logger.warn({ err, serverName: name }, 'Error closing MCP client');
      }
    }

    for (const [name, transport] of this.transports.entries()) {
      try {
        await transport.close();
      } catch (err) {
        logger.warn({ err, serverName: name }, 'Error closing MCP transport');
      }
    }

    this.clients.clear();
    this.transports.clear();
    this.tools.clear();
    this.connected = false;
    logger.info('All MCP clients and transports closed');
  }
}

let _manager: McpClientManager | undefined;

export function getMcpClientManager(): McpClientManager {
  if (!_manager) {
    _manager = new McpClientManager();
  }
  return _manager;
}

export function resetMcpClientManager(): void {
  _manager = undefined;
}
