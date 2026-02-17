import { getDatabase } from '../database/db.js';
import { RuleSummary } from './utils.js';

export interface SearchRulesParams {
  query: string;
  limit?: number;
  offset?: number;
  status?: string;
  level?: string;
  product?: string;
  service?: string;
  category?: string;
}

export interface SearchRuleResult extends RuleSummary {
  rank: number;
  snippet: string;
}

interface SearchRow {
  id: string;
  title: string;
  status: string | null;
  level: string | null;
  description: string | null;
  logsource_product: string | null;
  logsource_service: string | null;
  logsource_category: string | null;
  snippet: string | null;
  rank: number;
}

function baseFilters(params: SearchRulesParams): { clauses: string[]; values: Record<string, unknown> } {
  const clauses: string[] = [];
  const values: Record<string, unknown> = {};

  if (params.status) {
    clauses.push('r.status = @status');
    values.status = params.status;
  }

  if (params.level) {
    clauses.push('r.level = @level');
    values.level = params.level;
  }

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

  return { clauses, values };
}

export function searchRules(params: SearchRulesParams): SearchRuleResult[] {
  const db = getDatabase();
  const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
  const offset = Math.max(params.offset ?? 0, 0);

  const { clauses, values } = baseFilters(params);
  const where = clauses.length ? `AND ${clauses.join(' AND ')}` : '';

  try {
    const rows = db
      .prepare<SearchRow>(`
        SELECT
          r.id,
          r.title,
          r.status,
          r.level,
          r.description,
          r.logsource_product,
          r.logsource_service,
          r.logsource_category,
          snippet(rules_fts, 2, '[', ']', '...', 16) AS snippet,
          bm25(rules_fts) AS rank
        FROM rules_fts
        JOIN rules r ON r.rowid = rules_fts.rowid
        WHERE rules_fts MATCH @query
        ${where}
        ORDER BY rank, r.id
        LIMIT @limit OFFSET @offset
      `)
      .all({
        query: params.query.trim(),
        limit,
        offset,
        ...values,
      });

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
      snippet: row.snippet ?? '',
      rank: row.rank,
    }));
  } catch {
    const rows = db
      .prepare<SearchRow>(`
        SELECT
          r.id,
          r.title,
          r.status,
          r.level,
          r.description,
          r.logsource_product,
          r.logsource_service,
          r.logsource_category,
          r.description AS snippet,
          0.0 AS rank
        FROM rules r
        WHERE (LOWER(r.title) LIKE @pattern OR LOWER(COALESCE(r.description, '')) LIKE @pattern)
        ${where ? `AND ${clauses.join(' AND ')}` : ''}
        ORDER BY r.id
        LIMIT @limit OFFSET @offset
      `)
      .all({
        pattern: `%${params.query.trim().toLowerCase()}%`,
        limit,
        offset,
        ...values,
      });

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
      snippet: row.snippet ?? '',
      rank: row.rank,
    }));
  }
}
