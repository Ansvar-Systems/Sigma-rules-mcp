import { createHash } from 'crypto';
import Database from '@ansvar/mcp-sqlite';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = join(__dirname, '..', 'data', 'sigma_rules.db');

const db = new Database(DB_PATH, { readonly: true, fileMustExist: true });

const SAMPLE_QUERIES = [
  "SELECT id, title, full_yaml FROM rules WHERE LOWER(title) LIKE '%mimikatz%' AND status = 'stable' LIMIT 1",
  "SELECT id, title, full_yaml FROM rules WHERE LOWER(title) LIKE '%cobalt strike%' AND status = 'stable' LIMIT 1",
  "SELECT id, title, full_yaml FROM rules WHERE LOWER(title) LIKE '%psexec%' AND status = 'stable' LIMIT 1",
  "SELECT id, title, full_yaml FROM rules WHERE LOWER(title) LIKE '%powershell download%' LIMIT 1",
  "SELECT id, title, full_yaml FROM rules WHERE LOWER(title) LIKE '%scheduled task%' AND status = 'stable' LIMIT 1",
  "SELECT id, title, full_yaml FROM rules WHERE LOWER(title) LIKE '%lsass%' AND status = 'stable' LIMIT 1",
  "SELECT id, title, full_yaml FROM rules WHERE LOWER(title) LIKE '%credential dump%' LIMIT 1",
  "SELECT id, title, full_yaml FROM rules WHERE LOWER(title) LIKE '%brute force%' LIMIT 1",
  "SELECT id, title, full_yaml FROM rules WHERE LOWER(title) LIKE '%rundll32%' AND status = 'stable' LIMIT 1",
  "SELECT id, title, full_yaml FROM rules WHERE LOWER(title) LIKE '%certutil%' AND status = 'stable' LIMIT 1",
];

interface RuleRow {
  id: string;
  title: string;
  full_yaml: string;
}

const hashes: Array<{ id: string; title: string; sha256: string }> = [];

for (const query of SAMPLE_QUERIES) {
  const row = db.prepare<RuleRow>(query).get();
  if (row) {
    const hash = createHash('sha256').update(row.full_yaml, 'utf-8').digest('hex');
    hashes.push({ id: row.id, title: row.title, sha256: hash });
  }
}

db.close();

const output = {
  generated_at: new Date().toISOString(),
  description: 'SHA-256 hashes of sampled Sigma rule full_yaml for drift detection',
  hashes,
};

const outPath = join(__dirname, '..', 'fixtures', 'golden-hashes.json');
writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n');
console.log(`Generated ${hashes.length} golden hashes at ${outPath}`);
