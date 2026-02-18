import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { load } from 'js-yaml';
import { execFileSync } from 'child_process';

import Database from '@ansvar/mcp-sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, '..', 'data', 'sigma_rules.db');
const SIGMA_REPO = process.env.SIGMA_REPO_PATH || '/tmp/sigmahq-sigma';

// Clone or update SigmaHQ using execFileSync (no shell injection risk)
if (!existsSync(join(SIGMA_REPO, 'rules'))) {
  console.log('Cloning SigmaHQ/sigma...');
  execFileSync('git', ['clone', '--depth', '1', 'https://github.com/SigmaHQ/sigma.git', SIGMA_REPO], {
    stdio: 'inherit',
  });
} else {
  console.log('Updating SigmaHQ/sigma...');
  execFileSync('git', ['-C', SIGMA_REPO, 'pull', '--ff-only'], { stdio: 'inherit' });
}

const db = new Database(DB_PATH, { readonly: true, fileMustExist: true });

interface RuleRow {
  id: string;
  title: string;
  status: string | null;
  level: string | null;
  description: string | null;
  source_path: string;
  logsource_product: string | null;
  logsource_service: string | null;
  logsource_category: string | null;
  tags_json: string;
  detection_yaml: string | null;
  full_yaml: string;
}

// Sample 5 rules from different logsource products
const sampleRules = db
  .prepare<RuleRow>(
    `SELECT id, title, status, level, description, source_path,
            logsource_product, logsource_service, logsource_category,
            tags_json, detection_yaml, full_yaml
     FROM rules
     WHERE status = 'stable'
     ORDER BY RANDOM()
     LIMIT 5`
  )
  .all();

let passed = 0;
let failed = 0;
const failures: string[] = [];

for (const rule of sampleRules) {
  const sourcePath = join(SIGMA_REPO, 'rules', rule.source_path);

  if (!existsSync(sourcePath)) {
    failures.push(`${rule.id}: source file missing at ${sourcePath}`);
    failed++;
    continue;
  }

  const sourceYaml = readFileSync(sourcePath, 'utf-8');
  const parsed = load(sourceYaml) as Record<string, unknown>;

  const checks: Array<{ field: string; db: unknown; source: unknown }> = [
    { field: 'title', db: rule.title, source: parsed.title },
    { field: 'status', db: rule.status, source: parsed.status ?? null },
    { field: 'level', db: rule.level, source: parsed.level ?? null },
  ];

  let rulePassed = true;
  for (const check of checks) {
    const dbVal = typeof check.db === 'string' ? check.db.trim() : check.db;
    const srcVal = typeof check.source === 'string' ? (check.source as string).trim() : check.source;
    if (dbVal !== srcVal) {
      failures.push(
        `${rule.id} (${rule.title}): ${check.field} mismatch — DB="${dbVal}" vs source="${srcVal}"`
      );
      rulePassed = false;
    }
  }

  // Verify full_yaml matches source file byte-for-byte
  if (rule.full_yaml.trim() !== sourceYaml.trim()) {
    failures.push(`${rule.id} (${rule.title}): full_yaml content differs from source file`);
    rulePassed = false;
  }

  if (rulePassed) {
    console.log(`PASS ${rule.id} — ${rule.title}`);
    passed++;
  } else {
    console.log(`FAIL ${rule.id} — ${rule.title}`);
    failed++;
  }
}

db.close();

console.log(`\nData verification complete: ${passed} passed, ${failed} failed`);
if (failures.length) {
  console.log('\nFailures:');
  for (const f of failures) {
    console.log(`  - ${f}`);
  }
  process.exit(1);
}
