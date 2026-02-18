import type { VercelRequest, VercelResponse } from '@vercel/node';
import { copyFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { SERVER_VERSION } from '../src/version.js';

const SOURCE_DB = process.env.SIGMA_RULES_DB_PATH || join(process.cwd(), 'data', 'sigma_rules.db');
const TMP_DB = '/tmp/sigma_rules.db';
const MAX_AGE_DAYS = 14;
const startTime = Date.now();

function ensureDb(): boolean {
  if (!existsSync(SOURCE_DB) && !existsSync(TMP_DB)) return false;

  if (
    !existsSync(TMP_DB) ||
    (existsSync(SOURCE_DB) && statSync(SOURCE_DB).mtimeMs > statSync(TMP_DB).mtimeMs)
  ) {
    try {
      copyFileSync(SOURCE_DB, TMP_DB);
    } catch {
      return false;
    }
  }

  process.env.SIGMA_RULES_DB_PATH = TMP_DB;
  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method && req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const dbAvailable = ensureDb();

  if (!dbAvailable) {
    res.status(503).json({
      status: 'degraded',
      server: 'sigma-rules-mcp',
      version: SERVER_VERSION,
      error: 'Database not available',
    });
    return;
  }

  try {
    const { getDatabaseMetadata, getDatabaseStats } = await import('../src/database/db.js');
    const metadata = getDatabaseMetadata();
    const stats = getDatabaseStats();

    const lastIngested = metadata.build_time || '';
    const ageDays = lastIngested
      ? Math.floor((Date.now() - new Date(lastIngested).getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    const isStale = ageDays > MAX_AGE_DAYS;

    res.status(200).json({
      status: isStale ? 'stale' : 'ok',
      server: 'sigma-rules-mcp',
      version: SERVER_VERSION,
      git_sha: (metadata.source_commit || '').slice(0, 7),
      uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
      build_timestamp: metadata.build_time || null,
      data_freshness: {
        last_ingested: metadata.build_time || null,
        age_days: ageDays,
        max_age_days: MAX_AGE_DAYS,
        source_count: 1,
        record_count: stats.total_rules,
      },
      capabilities: [
        'search',
        'rule_retrieval',
        'technique_lookup',
        'logsource_lookup',
        'statistics',
        'data_provenance',
      ],
      tier: 'free',
    });
  } catch (error) {
    res.status(503).json({
      status: 'degraded',
      server: 'sigma-rules-mcp',
      version: SERVER_VERSION,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
