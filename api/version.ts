import type { VercelRequest, VercelResponse } from '@vercel/node';
import { SERVER_VERSION, MCP_SDK_VERSION } from '../src/version.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method && req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  res.status(200).json({
    name: 'sigma-rules-mcp',
    version: SERVER_VERSION,
    git_sha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'unknown',
    build_timestamp: process.env.VERCEL_GIT_COMMIT_DATE || null,
    node_version: process.version,
    transport: ['stdio', 'streamable-http'],
    mcp_sdk_version: MCP_SDK_VERSION,
    capabilities: [
      'search',
      'rule_retrieval',
      'technique_lookup',
      'logsource_lookup',
      'statistics',
      'data_provenance',
    ],
    tier: 'free',
    source_schema_version: '1.0',
    repo_url: 'https://github.com/Ansvar-Systems/sigma-rules-mcp',
    report_issue_url:
      'https://github.com/Ansvar-Systems/sigma-rules-mcp/issues/new?template=data-error.md',
  });
}
