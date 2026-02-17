import { getDatabase } from '../database/db.js';
import { RuleSummary } from './utils.js';

interface RuleByLogsourceRow {
  id: string;
  title: string;
  status: string | null;
  level: string | null;
  description: string | null;
  logsource_product: string | null;
  logsource_service: string | null;
  logsource_category: string | null;
}

export interface ListByLogsourceParams {
  product?: string;
  service?: string;
  category?: string;
  limit?: number;
  offset?: number;
}

export function listByLogsource(params: ListByLogsourceParams): RuleSummary[] {
  const db = getDatabase();
  const limit = Math.min(Math.max(params.limit ?? 100, 1), 1000);
  const offset = Math.max(params.offset ?? 0, 0);

  const clauses: string[] = [];
  const values: Record<string, unknown> = { limit, offset };

  if (params.product) {
    clauses.push('r.logsource_product = @product');
    values.product = params.product;
  }

  if (params.service) {
    clauses.push('r.logsource_service = @service');
    values.service = params.service;
  }

  if (params.category) {
    clauses.push('r.logsource_category = @category');
    values.category = params.category;
  }

  if (!clauses.length) {
    throw new Error('At least one of product, service, or category is required');
  }

  const rows = db
    .prepare<RuleByLogsourceRow>(`
      SELECT
        r.id,
        r.title,
        r.status,
        r.level,
        r.description,
        r.logsource_product,
        r.logsource_service,
        r.logsource_category
      FROM rules r
      WHERE ${clauses.join(' AND ')}
      ORDER BY r.id
      LIMIT @limit OFFSET @offset
    `)
    .all(values);

  return rows.map((row) => ({
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
  }));
}
