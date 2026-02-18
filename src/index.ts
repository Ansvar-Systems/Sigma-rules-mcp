#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { getDatabase, closeDatabase } from './database/db.js';
import { TOOLS, handleToolCall, SERVER_INSTRUCTIONS } from './tools/definitions.js';
import { RESOURCES, handleResourceRead } from './resources/definitions.js';
import { SERVER_NAME, SERVER_VERSION } from './version.js';

const server = new Server(
  {
    name: SERVER_NAME,
    version: SERVER_VERSION,
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
    instructions: SERVER_INSTRUCTIONS,
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;
    if (!args) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: 'Missing arguments' }) }],
        isError: true,
      };
    }

    return await handleToolCall(name, args as Record<string, unknown>);
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }),
        },
      ],
      isError: true,
    };
  }
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

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    closeDatabase();
    process.exit(0);
  });
}

async function main() {
  getDatabase();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Sigma Rules MCP started');
}

main().catch((error) => {
  console.error('Failed to start Sigma Rules MCP:', error);
  process.exit(1);
});
