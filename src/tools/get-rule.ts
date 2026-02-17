import { getDatabase } from '../database/db.js';
import { safeJsonParse } from './utils.js';

interface RuleRow {
  id: string;
  title: string;
  status: string | null;
  description: string | null;
  author: string | null;
  level: string | null;
  date: string | null;
  modified: string | null;
  source_path: string;
  logsource_product: string | null;
  logsource_service: string | null;
  logsource_category: string | null;
  falsepositives_json: string;
  tags_json: string;
  license: string;
  detection_yaml: string | null;
  full_yaml: string;
  metadata_json: string;
}

export interface SigmaRule {
  id: string;
  title: string;
  status: string | null;
  description: string | null;
  author: string | null;
  level: string | null;
  date: string | null;
  modified: string | null;
  source_path: string;
  license: string;
  logsource: {
    product: string | null;
    service: string | null;
    category: string | null;
  };
  tags: string[];
  falsepositives: string[];
  attack_techniques: string[];
  attack_tactics: string[];
  detection_yaml: string | null;
  full_yaml: string;
  metadata: Record<string, unknown>;
}

export function getRule(ruleId: string): SigmaRule | null {
  const db = getDatabase();
  const rule = db
    .prepare<RuleRow>(`SELECT * FROM rules WHERE id = @rule_id LIMIT 1`)
    .get({ rule_id: ruleId.trim() });

  if (!rule) {
    return null;
  }

  const attackTechniques = db
    .prepare<{ technique_id: string }>(
      `SELECT technique_id FROM rule_techniques WHERE rule_id = @rule_id ORDER BY technique_id`
    )
    .all({ rule_id: rule.id })
    .map((row) => row.technique_id);

  const attackTactics = db
    .prepare<{ tactic_id: string }>(
      `SELECT tactic_id FROM rule_tactics WHERE rule_id = @rule_id ORDER BY tactic_id`
    )
    .all({ rule_id: rule.id })
    .map((row) => row.tactic_id);

  return {
    id: rule.id,
    title: rule.title,
    status: rule.status,
    description: rule.description,
    author: rule.author,
    level: rule.level,
    date: rule.date,
    modified: rule.modified,
    source_path: rule.source_path,
    license: rule.license,
    logsource: {
      product: rule.logsource_product,
      service: rule.logsource_service,
      category: rule.logsource_category,
    },
    tags: safeJsonParse<string[]>(rule.tags_json, []),
    falsepositives: safeJsonParse<string[]>(rule.falsepositives_json, []),
    attack_techniques: attackTechniques,
    attack_tactics: attackTactics,
    detection_yaml: rule.detection_yaml,
    full_yaml: rule.full_yaml,
    metadata: safeJsonParse<Record<string, unknown>>(rule.metadata_json, {}),
  };
}
