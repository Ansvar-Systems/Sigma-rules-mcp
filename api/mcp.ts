import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { copyFileSync, existsSync, rmSync, statSync } from 'fs';
import { join } from 'path';

import { TOOLS, handleToolCall, SERVER_INSTRUCTIONS } from '../src/tools/definitions.js';
import { RESOURCES, handleResourceRead } from '../src/resources/definitions.js';
import { closeDatabase } from '../src/database/db.js';

const SOURCE_DB = process.env.SIGMA_RULES_DB_PATH || join(process.cwd(), 'data', 'sigma_rules.db');
const TMP_DB = '/tmp/sigma_rules.db';
const TMP_DB_LOCK = '/tmp/sigma_rules.db.lock';

function ensureDatabaseInTmp(): void {
  if (!existsSync(SOURCE_DB)) {
    throw new Error(`Database not found at ${SOURCE_DB}`);
  }

  if (existsSync(TMP_DB_LOCK)) {
    rmSync(TMP_DB_LOCK, { recursive: true, force: true });
  }

  const shouldCopy =
    !existsSync(TMP_DB) || statSync(SOURCE_DB).mtimeMs > statSync(TMP_DB).mtimeMs;

  if (shouldCopy) {
    copyFileSync(SOURCE_DB, TMP_DB);
    closeDatabase();
  }

  process.env.SIGMA_RULES_DB_PATH = TMP_DB;
}

function createServer(): Server {
  const server = new Server(
    {
      name: 'sigma-rules-mcp',
      version: '0.2.0',
    },
    {
      capabilities: { tools: {}, resources: {} },
      instructions: SERVER_INSTRUCTIONS,
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    if (!args) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: 'Missing arguments' }) }],
        isError: true,
      };
    }

    return handleToolCall(name, args as Record<string, unknown>);
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return { resources: RESOURCES };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    try {
      return handleResourceRead(request.params.uri);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : String(error));
    }
  });

  return server;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id');
  res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method === 'GET') {
    res.status(200).json({
      name: 'sigma-rules-mcp',
      version: '0.2.0',
      protocol: 'mcp-streamable-http',
    });
    return;
  }

  try {
    ensureDatabaseInTmp();

    const server = createServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('MCP API handler error:', message);

    if (!res.headersSent) {
      res.status(500).json({ error: message });
    }
  }
}
