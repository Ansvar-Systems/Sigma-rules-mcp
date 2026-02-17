import { getDatabase } from '../database/db.js';
import { RuleSummary, normalizeTechniqueId } from './utils.js';

interface RuleByTechniqueRow {
  id: string;
  title: string;
  status: string | null;
  level: string | null;
  description: string | null;
  logsource_product: string | null;
  logsource_service: string | null;
  logsource_category: string | null;
}

export interface ListByTechniqueParams {
  technique_id: string;
  limit?: number;
  offset?: number;
}

export function listByTechnique(params: ListByTechniqueParams): {
  normalized_technique_id: string;
  results: RuleSummary[];
} {
  const db = getDatabase();
  const techniqueId = normalizeTechniqueId(params.technique_id);
  const limit = Math.min(Math.max(params.limit ?? 100, 1), 1000);
  const offset = Math.max(params.offset ?? 0, 0);

  const rows = db
    .prepare<RuleByTechniqueRow>(
      `
      SELECT
        r.id,
        r.title,
        r.status,
        r.level,
        r.description,
        r.logsource_product,
        r.logsource_service,
        r.logsource_category
      FROM rule_techniques rt
      JOIN rules r ON r.id = rt.rule_id
      WHERE rt.technique_id = @technique_id
      ORDER BY r.id
      LIMIT @limit OFFSET @offset
    `
    )
    .all({ technique_id: techniqueId, limit, offset });

  return {
    normalized_technique_id: techniqueId,
    results: rows.map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      level: row.level,
      description: row.description,
      logsource: {
        product: row.logsource_product,
        service: row.logsource_service,
        category: row.logsource_category,
      },
    })),
  };
}
