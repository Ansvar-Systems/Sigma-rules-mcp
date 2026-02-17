import type { VercelRequest, VercelResponse } from '@vercel/node';
import { existsSync } from 'fs';
import { join } from 'path';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method && req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  const dbPath = process.env.SIGMA_RULES_DB_PATH || join(process.cwd(), 'data', 'sigma_rules.db');
  const ok = existsSync(dbPath) || existsSync('/tmp/sigma_rules.db');

  res.status(ok ? 200 : 500).json({
    ok,
    name: 'sigma-rules-mcp',
    version: '0.1.0',
    db_present: ok,
  });
}
