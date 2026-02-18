import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as {
  version: string;
  dependencies: Record<string, string>;
};

export const SERVER_VERSION = pkg.version;
export const SERVER_NAME = 'sigma-rules-mcp';
export const MCP_SDK_VERSION =
  pkg.dependencies['@modelcontextprotocol/sdk']?.replace(/^\^/, '') ?? 'unknown';
