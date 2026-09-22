// ────────────────────────────────────────
// MCP Client Types
// ────────────────────────────────────────

import type { ZodTypeAny } from 'zod';
import type { Tool } from 'ai';

export interface McpServerConfig {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  url?: string;
  headers?: Record<string, string>;
  type?: 'stdio' | 'sse' | 'http';
  disabled?: boolean;
}

export interface McpConfigFile {
  mcpServers?: Record<string, McpServerConfig>;
  [key: string]: unknown;
}

export interface McpToolEntry {
  name: string;
  serverName: string;
  originalName: string;
  description?: string;
  parameterSchema: ZodTypeAny;
  tool: Tool;
}
