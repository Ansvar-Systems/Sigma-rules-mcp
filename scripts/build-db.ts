import { readdir, readFile, mkdir, rm } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

import Database from '@ansvar/mcp-sqlite';
import { load } from 'js-yaml';

import { SCHEMA } from '../src/database/schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ROOT = join(__dirname, '..');
const SIGMA_REPO_PATH = process.env.SIGMA_REPO_PATH || '/tmp/sigmahq-sigma';
const RULES_DIR = join(SIGMA_REPO_PATH, 'rules');
const DB_PATH = join(PROJECT_ROOT, 'data', 'sigma_rules.db');
const DB_LOCK_PATH = `${DB_PATH}.lock`;

const ATTACK_TACTICS = new Set<string>([
  'reconnaissance',
  'resource-development',
  'initial-access',
  'execution',
  'persistence',
  'privilege-escalation',
  'defense-evasion',
  'credential-access',
  'discovery',
  'lateral-movement',
  'collection',
  'command-and-control',
  'exfiltration',
  'impact',
]);

interface ParsedRule {
  id: string;
  title: string;
  status: string | null;
  description: string | null;
  author: string | null;
  level: string | null;
  date: string | null;
  modified: string | null;
  sourcePath: string;
  product: string | null;
  service: string | null;
  category: string | null;
  falsepositives: string[];
  tags: string[];
  license: string;
  detectionYaml: string | null;
  fullYaml: string;
  metadata: Record<string, unknown>;
  techniques: string[];
  tactics: string[];
}

function toStringOrNull(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => (typeof item === 'string' ? item.trim() : String(item)))
      .filter((item) => item.length > 0);
    return parts.length ? parts.join(', ') : null;
  }

  return null;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : String(item)))
      .filter((item) => item.length > 0);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }

  return [];
}

function resolveRuleLicense(value: unknown): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => (typeof item === 'string' ? item.trim() : String(item)))
      .filter((item) => item.length > 0);
    if (parts.length) return parts.join(', ');
  }

  return 'DRL';
}

function extractDetectionBlockRaw(yamlText: string): string | null {
  const lines = yamlText.replace(/\r\n/g, '\n').split('\n');
  let start = -1;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    if (/^detection\s*:\s*$/.test(line) || /^detection\s*:\s*#.*$/.test(line)) {
      start = i;
      break;
    }

    if (/^detection\s*:\s*.+$/.test(line)) {
      return line.trimEnd();
    }
  }

  if (start === -1) {
    return null;
  }

  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) continue;
    if (line.trimStart().startsWith('#')) continue;

    if (!line.startsWith(' ') && !line.startsWith('\t')) {
      end = i;
      break;
    }
  }

  return lines.slice(start, end).join('\n').trimEnd();
}

function extractTechniques(tags: string[]): string[] {
  const techniques = new Set<string>();

  for (const tag of tags) {
    const match = /^attack\.t(\d{4})(?:\.(\d{3}))?$/i.exec(tag);
    if (!match) continue;

    const main = match[1];
    const sub = match[2];
    techniques.add(sub ? `T${main}.${sub}` : `T${main}`);
  }

  return [...techniques].sort();
}

function extractTactics(tags: string[]): string[] {
  const tactics = new Set<string>();

  for (const tag of tags) {
    const techniqueMatch = /^attack\.t\d{4}(?:\.\d{3})?$/i.test(tag);
    if (techniqueMatch) continue;

    const match = /^attack\.([a-z0-9][a-z0-9-]*)$/i.exec(tag);
    if (!match) continue;

    const tactic = match[1].toLowerCase();
    if (ATTACK_TACTICS.has(tactic)) {
      tactics.add(tactic);
    }
  }

  return [...tactics].sort();
}

async function findYamlFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findYamlFiles(fullPath)));
      continue;
    }

    if (entry.isFile() && (entry.name.endsWith('.yml') || entry.name.endsWith('.yaml'))) {
      files.push(fullPath);
    }
  }

  return files;
}

function sourceCommit(repoPath: string): string | null {
  try {
    return execSync(`git -C "${repoPath}" rev-parse HEAD`, { encoding: 'utf-8' }).trim();
  } catch {
    return null;
  }
}

function parseRule(filePath: string, yamlText: string): ParsedRule | null {
  const parsed = load(yamlText) as Record<string, unknown> | null;
  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  const id = toStringOrNull(parsed.id);
  const title = toStringOrNull(parsed.title);

  if (!id || !title) {
    return null;
  }

  const logsource =
    parsed.logsource && typeof parsed.logsource === 'object'
      ? (parsed.logsource as Record<string, unknown>)
      : {};

  const tags = toStringArray(parsed.tags);
  const techniques = extractTechniques(tags);
  const tactics = extractTactics(tags);

  const detectionYaml = extractDetectionBlockRaw(yamlText);
  const sourcePath = relative(RULES_DIR, filePath);

  return {
    id,
    title,
    status: toStringOrNull(parsed.status),
    description: toStringOrNull(parsed.description),
    author: toStringOrNull(parsed.author),
    level: toStringOrNull(parsed.level),
    date: toStringOrNull(parsed.date),
    modified: toStringOrNull(parsed.modified),
    sourcePath,
    product: toStringOrNull(logsource.product),
    service: toStringOrNull(logsource.service),
    category: toStringOrNull(logsource.category),
    falsepositives: toStringArray(parsed.falsepositives),
    tags,
    license: resolveRuleLicense(parsed.license),
    detectionYaml,
    fullYaml: yamlText,
    metadata: {
      references: toStringArray(parsed.references),
      source: toStringOrNull(parsed.source),
      related: toStringArray(parsed.related),
      filename: sourcePath,
    },
    techniques,
    tactics,
  };
}

async function buildDatabase(): Promise<void> {
  if (!existsSync(RULES_DIR)) {
    throw new Error(`Sigma rules directory not found: ${RULES_DIR}`);
  }

  await mkdir(dirname(DB_PATH), { recursive: true });
  await rm(DB_PATH, { force: true });
  await rm(DB_LOCK_PATH, { recursive: true, force: true });

  const db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = DELETE');
  db.exec(SCHEMA);

  const files = await findYamlFiles(RULES_DIR);

  const insertRule = db.prepare(`
    INSERT OR REPLACE INTO rules (
      id,
      title,
      status,
      description,
      author,
      level,
      date,
      modified,
      source_path,
      logsource_product,
      logsource_service,
      logsource_category,
      falsepositives_json,
      tags_json,
      license,
      detection_yaml,
      full_yaml,
      metadata_json
    ) VALUES (
      @id,
      @title,
      @status,
      @description,
      @author,
      @level,
      @date,
      @modified,
      @source_path,
      @logsource_product,
      @logsource_service,
      @logsource_category,
      @falsepositives_json,
      @tags_json,
      @license,
      @detection_yaml,
      @full_yaml,
      @metadata_json
    )
  `);

  const deleteTechniques = db.prepare('DELETE FROM rule_techniques WHERE rule_id = @rule_id');
  const insertTechnique = db.prepare(
    'INSERT OR IGNORE INTO rule_techniques (rule_id, technique_id) VALUES (@rule_id, @technique_id)'
  );

  const deleteTactics = db.prepare('DELETE FROM rule_tactics WHERE rule_id = @rule_id');
  const insertTactic = db.prepare(
    'INSERT OR IGNORE INTO rule_tactics (rule_id, tactic_id) VALUES (@rule_id, @tactic_id)'
  );

  const upsertMetadata = db.prepare(`
    INSERT INTO metadata (key, value)
    VALUES (@key, @value)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = CURRENT_TIMESTAMP
  `);

  const insertTx = db.transaction((rule: ParsedRule) => {
    insertRule.run({
      id: rule.id,
      title: rule.title,
      status: rule.status,
      description: rule.description,
      author: rule.author,
      level: rule.level,
      date: rule.date,
      modified: rule.modified,
      source_path: rule.sourcePath,
      logsource_product: rule.product,
      logsource_service: rule.service,
      logsource_category: rule.category,
      falsepositives_json: JSON.stringify(rule.falsepositives),
      tags_json: JSON.stringify(rule.tags),
      license: rule.license,
      detection_yaml: rule.detectionYaml,
      full_yaml: rule.fullYaml,
      metadata_json: JSON.stringify(rule.metadata),
    });

    deleteTechniques.run({ rule_id: rule.id });
    for (const technique of rule.techniques) {
      insertTechnique.run({ rule_id: rule.id, technique_id: technique });
    }

    deleteTactics.run({ rule_id: rule.id });
    for (const tactic of rule.tactics) {
      insertTactic.run({ rule_id: rule.id, tactic_id: tactic });
    }
  });

  let inserted = 0;
  let skipped = 0;
  const failures: string[] = [];

  for (const file of files) {
    try {
      const yamlText = await readFile(file, 'utf-8');
      const rule = parseRule(file, yamlText);
      if (!rule) {
        skipped += 1;
        continue;
      }

      insertTx(rule);
      inserted += 1;
    } catch (error) {
      failures.push(
        `${relative(SIGMA_REPO_PATH, file)}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  upsertMetadata.run({ key: 'source_repository', value: 'https://github.com/SigmaHQ/sigma' });
  upsertMetadata.run({ key: 'build_time', value: new Date().toISOString() });
  upsertMetadata.run({ key: 'ingest_file_count', value: String(files.length) });
  upsertMetadata.run({ key: 'ingest_rule_count', value: String(inserted) });
  upsertMetadata.run({ key: 'skipped_file_count', value: String(skipped) });

  const commit = sourceCommit(SIGMA_REPO_PATH);
  if (commit) {
    upsertMetadata.run({ key: 'source_commit', value: commit });
  }

  db.close();

  console.log(`Built Sigma database at ${DB_PATH}`);
  console.log(`Processed files: ${files.length}`);
  console.log(`Inserted rules: ${inserted}`);
  console.log(`Skipped files: ${skipped}`);

  if (failures.length) {
    console.log(`Failures: ${failures.length}`);
    for (const failure of failures.slice(0, 25)) {
      console.log(`- ${failure}`);
    }
    if (failures.length > 25) {
      console.log(`... and ${failures.length - 25} more`);
    }
  }
}

buildDatabase().catch((error) => {
  console.error('Failed to build Sigma rules database:', error);
  process.exit(1);
});
