import Database from '@ansvar/mcp-sqlite';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = process.env.SIGMA_RULES_DB_PATH || join(__dirname, '../../data/sigma_rules.db');

let db: InstanceType<typeof Database> | null = null;

export function getDatabase(): InstanceType<typeof Database> {
  if (!db) {
    try {
      db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
      db.pragma('cache_size = -64000');
      db.pragma('temp_store = MEMORY');
      db.pragma('journal_mode = DELETE');
    } catch (error) {
      throw new Error(
        `Database not found at ${DB_PATH}. Run "npm run build:db" to ingest Sigma rules.` +
          ` Original error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export interface DatabaseStats {
  total_rules: number;
  rules_with_techniques: number;
  unique_techniques: number;
  rules_with_tactics: number;
  unique_tactics: number;
  unique_logsource_products: number;
  unique_logsource_services: number;
  unique_logsource_categories: number;
}

export function getDatabaseStats(): DatabaseStats {
  const database = getDatabase();
  const result = database
    .prepare<DatabaseStats>(
      `
    SELECT
      (SELECT COUNT(*) FROM rules) AS total_rules,
      (SELECT COUNT(DISTINCT rule_id) FROM rule_techniques) AS rules_with_techniques,
      (SELECT COUNT(DISTINCT technique_id) FROM rule_techniques) AS unique_techniques,
      (SELECT COUNT(DISTINCT rule_id) FROM rule_tactics) AS rules_with_tactics,
      (SELECT COUNT(DISTINCT tactic_id) FROM rule_tactics) AS unique_tactics,
      (
        SELECT COUNT(DISTINCT logsource_product)
        FROM rules
        WHERE logsource_product IS NOT NULL AND logsource_product <> ''
      ) AS unique_logsource_products,
      (
        SELECT COUNT(DISTINCT logsource_service)
        FROM rules
        WHERE logsource_service IS NOT NULL AND logsource_service <> ''
      ) AS unique_logsource_services,
      (
        SELECT COUNT(DISTINCT logsource_category)
        FROM rules
        WHERE logsource_category IS NOT NULL AND logsource_category <> ''
      ) AS unique_logsource_categories
  `
    )
    .get();

  if (!result) {
    throw new Error('Failed to retrieve database statistics: no rows returned');
  }

  return result;
}

export interface DatabaseMetadata {
  schema_version: string;
  source_repository?: string;
  source_commit?: string;
  build_time?: string;
  ingest_rule_count?: string;
}

export function getDatabaseMetadata(): DatabaseMetadata {
  const database = getDatabase();
  const rows = database
    .prepare<{ key: string; value: string }>('SELECT key, value FROM metadata')
    .all();

  const metadata: Partial<DatabaseMetadata> = {};
  for (const row of rows) {
    metadata[row.key as keyof DatabaseMetadata] = row.value;
  }

  return metadata as DatabaseMetadata;
}
