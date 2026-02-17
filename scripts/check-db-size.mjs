import { statSync } from 'node:fs';
import { resolve } from 'node:path';

const dbPath = resolve(process.cwd(), 'data', 'sigma_rules.db');
const maxMb = Number(process.env.MAX_DB_SIZE_MB || '100');

const stats = statSync(dbPath);
const sizeMb = stats.size / (1024 * 1024);

if (sizeMb > maxMb) {
  console.error(`DB size check failed: ${sizeMb.toFixed(2)} MB exceeds ${maxMb} MB budget (${dbPath})`);
  process.exit(1);
}

console.log(`DB size check passed: ${sizeMb.toFixed(2)} MB <= ${maxMb} MB`);
