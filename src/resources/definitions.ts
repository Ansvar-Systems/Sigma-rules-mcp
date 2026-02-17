import { Resource } from '@modelcontextprotocol/sdk/types.js';
import { getDatabase, getDatabaseMetadata, getDatabaseStats } from '../database/db.js';
import { ATTACK_TACTIC_NAMES } from '../tools/utils.js';

export const RESOURCES: Resource[] = [
  {
    uri: 'sigma://logsources/products',
    name: 'Logsource Products',
    description:
      'All distinct logsource products in the Sigma rule corpus with rule counts. Use to discover valid product filter values for list_by_logsource and search_rules.',
    mimeType: 'application/json',
  },
  {
    uri: 'sigma://logsources/services',
    name: 'Logsource Services',
    description: 'All distinct logsource services with rule counts.',
    mimeType: 'application/json',
  },
  {
    uri: 'sigma://logsources/categories',
    name: 'Logsource Categories',
    description: 'All distinct logsource categories with rule counts.',
    mimeType: 'application/json',
  },
  {
    uri: 'sigma://techniques',
    name: 'ATT&CK Techniques',
    description:
      'All MITRE ATT&CK technique IDs mapped in the rule corpus with rule counts. Use to discover valid technique_id values for list_by_technique.',
    mimeType: 'application/json',
  },
  {
    uri: 'sigma://tactics',
    name: 'ATT&CK Tactics',
    description: 'All 14 MITRE ATT&CK tactics with display names and rule counts.',
    mimeType: 'application/json',
  },
  {
    uri: 'sigma://metadata',
    name: 'Dataset Metadata',
    description: 'Build metadata: source commit, build time, rule count, schema version.',
    mimeType: 'application/json',
  },
];

interface CountRow {
  value: string;
  count: number;
}

interface TechniqueRow {
  technique_id: string;
  count: number;
}

interface TacticRow {
  tactic_id: string;
  count: number;
}

function queryLogsourceField(
  field: 'logsource_product' | 'logsource_service' | 'logsource_category'
): CountRow[] {
  const db = getDatabase();
  return db
    .prepare<CountRow>(
      `
    SELECT ${field} AS value, COUNT(*) AS count
    FROM rules
    WHERE ${field} IS NOT NULL AND ${field} <> ''
    GROUP BY ${field}
    ORDER BY count DESC, value ASC
  `
    )
    .all();
}

export function handleResourceRead(uri: string): {
  contents: Array<{ uri: string; mimeType: string; text: string }>;
} {
  switch (uri) {
    case 'sigma://logsources/products':
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(queryLogsourceField('logsource_product'), null, 2),
          },
        ],
      };
    case 'sigma://logsources/services':
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(queryLogsourceField('logsource_service'), null, 2),
          },
        ],
      };
    case 'sigma://logsources/categories':
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(queryLogsourceField('logsource_category'), null, 2),
          },
        ],
      };
    case 'sigma://techniques': {
      const db = getDatabase();
      const rows = db
        .prepare<TechniqueRow>(
          `
        SELECT technique_id, COUNT(*) AS count
        FROM rule_techniques
        GROUP BY technique_id
        ORDER BY count DESC, technique_id ASC
      `
        )
        .all();
      return {
        contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(rows, null, 2) }],
      };
    }
    case 'sigma://tactics': {
      const db = getDatabase();
      const rows = db
        .prepare<TacticRow>(
          `
        SELECT tactic_id, COUNT(*) AS count
        FROM rule_tactics
        GROUP BY tactic_id
        ORDER BY count DESC, tactic_id ASC
      `
        )
        .all();
      const result = rows.map((row) => ({
        tactic_id: row.tactic_id,
        display_name: ATTACK_TACTIC_NAMES[row.tactic_id] || row.tactic_id,
        rule_count: row.count,
      }));
      return {
        contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(result, null, 2) }],
      };
    }
    case 'sigma://metadata': {
      const metadata = getDatabaseMetadata();
      const stats = getDatabaseStats();
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({ ...metadata, ...stats }, null, 2),
          },
        ],
      };
    }
    default:
      throw new Error(`Unknown resource: ${uri}`);
  }
}
