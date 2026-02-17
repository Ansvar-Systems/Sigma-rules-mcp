import { getDatabase, getDatabaseMetadata, getDatabaseStats } from '../database/db.js';
import { tacticDisplayName } from './utils.js';

interface TacticCoverageRow {
  tactic_id: string;
  rule_count: number;
  technique_count: number;
}

interface LogsourceCoverageRow {
  value: string;
  count: number;
}

interface LicenseRow {
  license: string;
  count: number;
}

export interface RuleStatistics {
  overview: ReturnType<typeof getDatabaseStats>;
  metadata: ReturnType<typeof getDatabaseMetadata>;
  tactic_coverage: Array<{
    tactic_id: string;
    tactic_name: string;
    rule_count: number;
    technique_count: number;
  }>;
  top_logsource_products: Array<{ value: string; count: number }>;
  top_logsource_services: Array<{ value: string; count: number }>;
  top_logsource_categories: Array<{ value: string; count: number }>;
  license_breakdown: Array<{ license: string; count: number }>;
}

function topLogsource(field: 'logsource_product' | 'logsource_service' | 'logsource_category') {
  const db = getDatabase();

  return db
    .prepare<LogsourceCoverageRow>(`
      SELECT ${field} AS value, COUNT(*) AS count
      FROM rules
      WHERE ${field} IS NOT NULL AND ${field} <> ''
      GROUP BY ${field}
      ORDER BY count DESC, value ASC
      LIMIT 20
    `)
    .all();
}

export function getRuleStatistics(): RuleStatistics {
  const db = getDatabase();

  const tacticCoverage = db
    .prepare<TacticCoverageRow>(`
      SELECT
        t.tactic_id,
        COUNT(DISTINCT t.rule_id) AS rule_count,
        COUNT(DISTINCT rt.technique_id) AS technique_count
      FROM rule_tactics t
      LEFT JOIN rule_techniques rt ON rt.rule_id = t.rule_id
      GROUP BY t.tactic_id
      ORDER BY rule_count DESC, t.tactic_id ASC
    `)
    .all();

  const licenses = db
    .prepare<LicenseRow>(`
      SELECT license, COUNT(*) AS count
      FROM rules
      GROUP BY license
      ORDER BY count DESC, license ASC
    `)
    .all();

  return {
    overview: getDatabaseStats(),
    metadata: getDatabaseMetadata(),
    tactic_coverage: tacticCoverage.map((row) => ({
      tactic_id: row.tactic_id,
      tactic_name: tacticDisplayName(row.tactic_id),
      rule_count: row.rule_count,
      technique_count: row.technique_count,
    })),
    top_logsource_products: topLogsource('logsource_product'),
    top_logsource_services: topLogsource('logsource_service'),
    top_logsource_categories: topLogsource('logsource_category'),
    license_breakdown: licenses.map((row) => ({ license: row.license, count: row.count })),
  };
}
