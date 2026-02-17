import { Tool } from '@modelcontextprotocol/sdk/types.js';

import { searchRules } from './search-rules.js';
import { getRule } from './get-rule.js';
import { listByTechnique } from './list-by-technique.js';
import { listByLogsource } from './list-by-logsource.js';
import { getRuleStatistics } from './get-rule-statistics.js';

export const SERVER_INSTRUCTIONS = `Sigma Rules MCP exposes the full SigmaHQ rule corpus in SQLite for fast retrieval.

Recommended workflow:
1. search_rules: find relevant detections by title/description keywords.
2. get_rule: fetch full YAML and raw detection logic for one rule.
3. list_by_technique: pivot from ATT&CK technique IDs (Txxxx) into mapped Sigma rules.
4. list_by_logsource: filter by product/service/category logsource dimensions.
5. get_rule_statistics: inspect ATT&CK tactic coverage and dataset-level stats.

Dataset notes:
- Source: SigmaHQ/sigma rules/*.yml
- ATT&CK techniques parsed from tags like attack.t1059 or attack.t1059.001
- ATT&CK tactics parsed from tags like attack.execution, attack.initial-access
- Rule-level license keeps explicit rule metadata; defaults to DRL when unspecified`;

export const TOOLS: Tool[] = [
  {
    name: 'search_rules',
    description:
      'Full-text search across Sigma rule titles and descriptions. Supports optional filters for logsource and rule metadata.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Text query for title/description search',
        },
        status: {
          type: 'string',
          description: 'Optional Sigma status filter (e.g., stable, test, experimental)',
        },
        level: {
          type: 'string',
          description: 'Optional rule level filter (e.g., low, medium, high, critical)',
        },
        product: {
          type: 'string',
          description: 'Optional logsource product filter (e.g., windows, linux)',
        },
        service: {
          type: 'string',
          description: 'Optional logsource service filter (e.g., sysmon, security)',
        },
        category: {
          type: 'string',
          description: 'Optional logsource category filter (e.g., process_creation)',
        },
        limit: {
          type: 'number',
          minimum: 1,
          maximum: 100,
          description: 'Maximum results (default: 20)',
        },
        offset: {
          type: 'number',
          minimum: 0,
          description: 'Pagination offset (default: 0)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_rule',
    description: 'Return one Sigma rule by ID, including full YAML and raw detection block.',
    inputSchema: {
      type: 'object',
      properties: {
        rule_id: {
          type: 'string',
          description: 'Sigma rule UUID id field',
        },
      },
      required: ['rule_id'],
    },
  },
  {
    name: 'list_by_technique',
    description:
      'List all Sigma rules mapped to an ATT&CK technique. Accepts values like T1059, t1059, attack.t1059, T1059.001.',
    inputSchema: {
      type: 'object',
      properties: {
        technique_id: {
          type: 'string',
          description: 'ATT&CK technique id (e.g., T1059 or T1059.001)',
        },
        limit: {
          type: 'number',
          minimum: 1,
          maximum: 1000,
          description: 'Maximum results (default: 100)',
        },
        offset: {
          type: 'number',
          minimum: 0,
          description: 'Pagination offset (default: 0)',
        },
      },
      required: ['technique_id'],
    },
  },
  {
    name: 'list_by_logsource',
    description:
      'List Sigma rules by logsource product/service/category. At least one filter is required.',
    inputSchema: {
      type: 'object',
      properties: {
        product: {
          type: 'string',
          description: 'Logsource product (e.g., windows, linux)',
        },
        service: {
          type: 'string',
          description: 'Logsource service (e.g., sysmon)',
        },
        category: {
          type: 'string',
          description: 'Logsource category (e.g., process_creation)',
        },
        limit: {
          type: 'number',
          minimum: 1,
          maximum: 1000,
          description: 'Maximum results (default: 100)',
        },
        offset: {
          type: 'number',
          minimum: 0,
          description: 'Pagination offset (default: 0)',
        },
      },
    },
  },
  {
    name: 'get_rule_statistics',
    description: 'Return dataset statistics, including ATT&CK tactic coverage across Sigma rules.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

interface ToolResult {
  [key: string]: unknown;
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

function jsonResponse(payload: unknown): ToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
  };
}

function errorResponse(message: string): ToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify({ error: message }) }],
    isError: true,
  };
}

export async function handleToolCall(name: string, args: Record<string, unknown>): Promise<ToolResult> {
  switch (name) {
    case 'search_rules': {
      const query = args.query;
      if (typeof query !== 'string' || !query.trim()) {
        return errorResponse('query is required and must be a non-empty string');
      }

      const results = searchRules({
        query,
        status: typeof args.status === 'string' ? args.status : undefined,
        level: typeof args.level === 'string' ? args.level : undefined,
        product: typeof args.product === 'string' ? args.product : undefined,
        service: typeof args.service === 'string' ? args.service : undefined,
        category: typeof args.category === 'string' ? args.category : undefined,
        limit: typeof args.limit === 'number' ? args.limit : undefined,
        offset: typeof args.offset === 'number' ? args.offset : undefined,
      });

      return jsonResponse({ query, total: results.length, results });
    }

    case 'get_rule': {
      const ruleId = args.rule_id;
      if (typeof ruleId !== 'string' || !ruleId.trim()) {
        return errorResponse('rule_id is required and must be a non-empty string');
      }

      const rule = getRule(ruleId);
      if (!rule) {
        return errorResponse(`Rule not found: ${ruleId}`);
      }

      return jsonResponse(rule);
    }

    case 'list_by_technique': {
      const techniqueId = args.technique_id;
      if (typeof techniqueId !== 'string' || !techniqueId.trim()) {
        return errorResponse('technique_id is required and must be a non-empty string');
      }

      const result = listByTechnique({
        technique_id: techniqueId,
        limit: typeof args.limit === 'number' ? args.limit : undefined,
        offset: typeof args.offset === 'number' ? args.offset : undefined,
      });

      return jsonResponse({
        technique_id: result.normalized_technique_id,
        total: result.results.length,
        results: result.results,
      });
    }

    case 'list_by_logsource': {
      const product = typeof args.product === 'string' ? args.product : undefined;
      const service = typeof args.service === 'string' ? args.service : undefined;
      const category = typeof args.category === 'string' ? args.category : undefined;

      if (!product && !service && !category) {
        return errorResponse('At least one of product, service, or category is required');
      }

      const results = listByLogsource({
        product,
        service,
        category,
        limit: typeof args.limit === 'number' ? args.limit : undefined,
        offset: typeof args.offset === 'number' ? args.offset : undefined,
      });

      return jsonResponse({
        filters: { product, service, category },
        total: results.length,
        results,
      });
    }

    case 'get_rule_statistics': {
      return jsonResponse(getRuleStatistics());
    }

    default:
      return errorResponse(`Unknown tool: ${name}`);
  }
}
