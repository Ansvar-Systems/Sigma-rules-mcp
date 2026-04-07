import { Tool } from '@modelcontextprotocol/sdk/types.js';

import { buildCitation } from '../citation.js';
import { searchRules } from './search-rules.js';
import { getRule } from './get-rule.js';
import { listByTechnique } from './list-by-technique.js';
import { listByLogsource } from './list-by-logsource.js';
import { getRuleStatistics } from './get-rule-statistics.js';
import { listSources } from './list-sources.js';

export const SERVER_INSTRUCTIONS = `Sigma Rules MCP — Expert Detection Engineering Interface

This MCP server exposes the full SigmaHQ community detection rule corpus (~3,100+ rules) in a queryable SQLite database with full-text search.

## What are Sigma rules?
Sigma is a generic and open signature format for SIEM systems. Each rule describes a detection pattern using structured YAML:
- logsource: defines which log data to query (product/service/category)
- detection: defines the matching logic (field conditions, boolean operators, aggregations)
- level: indicates severity — informational < low < medium < high < critical
- status: indicates maturity — experimental → test → stable (deprecated/unsupported for archived rules)

## ATT&CK mapping
Rules are tagged with MITRE ATT&CK technique IDs (e.g., T1059 = Command and Scripting Interpreter, T1059.001 = PowerShell). Techniques are grouped into 14 tactics representing adversary goals:
reconnaissance → resource-development → initial-access → execution → persistence → privilege-escalation → defense-evasion → credential-access → discovery → lateral-movement → collection → command-and-control → exfiltration → impact

## Logsource hierarchy
- product: OS or platform (windows, linux, macos, aws, azure, gcp)
- service: specific log source within product (sysmon, security, powershell, cloudtrail)
- category: generic log type across products (process_creation, file_event, network_connection)

## Recommended workflows

Find detections for a threat:
1. search_rules("mimikatz") → find relevant rules by keyword
2. get_rule(id) → read full detection logic and YAML

Map ATT&CK coverage gaps:
1. get_rule_statistics() → see tactic/technique coverage
2. list_by_technique("T1059") → drill into specific techniques
3. get_rule(id) → examine individual detection logic

Audit log source coverage:
1. Browse sigma://logsources/products resource → see available products
2. list_by_logsource(product="windows") → list rules for a product
3. get_rule(id) → read detection details

Build detection content:
1. search_rules with filters (status="stable", level="high") → find production-ready rules
2. get_rule(id) → get complete YAML for deployment
3. Use detection_yaml field for SIEM query translation

Inspect data provenance:
1. list_sources() → see dataset source, license, last ingest timestamp, and source commit

## Available resources
Browse sigma://logsources/products, sigma://logsources/services, sigma://logsources/categories, sigma://techniques, sigma://tactics, and sigma://metadata for dataset exploration before querying.

## Dataset notes
- Source: SigmaHQ/sigma rules/*.yml (auto-refreshed weekly)
- Detection Rule License (DRL) unless rule specifies otherwise
- ATT&CK techniques parsed from tags (attack.t1059, attack.t1059.001)
- ATT&CK tactics parsed from tags (attack.execution, attack.initial-access)`;

export const TOOLS: Tool[] = [
  {
    name: 'search_rules',
    description:
      'Full-text search across Sigma rule titles and descriptions. Supports SQLite FTS5 syntax (AND, OR, NOT, prefix*). Returns matching rules with relevance-ranked snippets. Supports optional filters for status, level, and logsource dimensions.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          maxLength: 500,
          description:
            "FTS5 search query. Examples: 'mimikatz', 'lateral movement', 'powershell AND execution', 'process_creation'. Supports AND/OR/NOT operators and prefix* wildcards.",
        },
        status: {
          type: 'string',
          maxLength: 50,
          enum: ['stable', 'test', 'experimental', 'deprecated', 'unsupported'],
          description: 'Optional Sigma status filter',
        },
        level: {
          type: 'string',
          maxLength: 50,
          enum: ['informational', 'low', 'medium', 'high', 'critical'],
          description: 'Optional rule level filter',
        },
        product: {
          type: 'string',
          maxLength: 100,
          description:
            'Logsource product filter. Common values: windows, linux, macos, aws, azure, gcp, m365',
        },
        service: {
          type: 'string',
          maxLength: 100,
          description:
            'Logsource service filter. Common values: sysmon, security, powershell, cloudtrail, auditd',
        },
        category: {
          type: 'string',
          maxLength: 100,
          description:
            'Logsource category filter. Common values: process_creation, file_event, network_connection, image_load, registry_event',
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
    description:
      'Retrieve a single Sigma rule by its UUID. Returns complete rule data including: title, status, level, author, date, logsource (product/service/category), tags, attack_techniques (ATT&CK IDs), attack_tactics, detection_yaml (raw detection logic block), full_yaml (complete rule YAML), falsepositives, and metadata.',
    inputSchema: {
      type: 'object',
      properties: {
        rule_id: {
          type: 'string',
          maxLength: 200,
          description: "Sigma rule UUID (e.g., '5af54681-df95-4c26-854f-2565e13cfab0')",
        },
      },
      required: ['rule_id'],
    },
  },
  {
    name: 'list_by_technique',
    description:
      'List all Sigma rules mapped to a MITRE ATT&CK technique ID. Returns rule summaries (id, title, status, level, logsource). Accepts flexible input formats: T1059, t1059, attack.t1059, T1059.001.',
    inputSchema: {
      type: 'object',
      properties: {
        technique_id: {
          type: 'string',
          maxLength: 200,
          description:
            'MITRE ATT&CK technique ID. Formats accepted: T1059, t1059, attack.t1059, T1059.001. Browse sigma://techniques resource for all available technique IDs.',
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
      'List Sigma rules filtered by logsource product, service, and/or category. At least one filter MUST be provided. Returns rule summaries (id, title, status, level, logsource). Browse sigma://logsources/* resources for valid filter values.',
    inputSchema: {
      type: 'object',
      properties: {
        product: {
          type: 'string',
          maxLength: 100,
          description:
            'Logsource product. Common values: windows, linux, macos, aws, azure, gcp. Browse sigma://logsources/products for all values.',
        },
        service: {
          type: 'string',
          maxLength: 100,
          description:
            'Logsource service. Common values: sysmon, security, powershell, cloudtrail, auditd. Browse sigma://logsources/services for all values.',
        },
        category: {
          type: 'string',
          maxLength: 100,
          description:
            'Logsource category. Common values: process_creation, file_event, network_connection, image_load. Browse sigma://logsources/categories for all values.',
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
    description:
      'Return comprehensive dataset statistics: total rule count, rules with ATT&CK mappings, unique techniques/tactics count, ATT&CK tactic coverage table (rules and techniques per tactic), top 20 logsource products/services/categories by rule count, license distribution, and build metadata (source commit, build time, ingested rule count).',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'list_sources',
    description:
      'Return data provenance information for all datasets backing this MCP server. Shows source name, authority, URL, license, update frequency, last ingest timestamp, source commit hash, and rule count.',
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

/** Runtime length limits for string parameters that hit the database. */
const MAX_LENGTHS: Record<string, number> = {
  query: 500,
  rule_id: 200,
  technique_id: 200,
};

export async function handleToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  // Runtime length enforcement for database-bound string parameters
  for (const [param, maxLen] of Object.entries(MAX_LENGTHS)) {
    const value = args[param];
    if (typeof value === 'string' && value.length > maxLen) {
      return errorResponse(`${param} exceeds maximum length of ${maxLen} characters`);
    }
  }

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

      return jsonResponse({
        ...rule,
        _citation: buildCitation(
          rule.id,
          `Sigma: ${rule.title}`,
          'get_rule',
          { rule_id: rule.id },
        ),
      });
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

    case 'list_sources': {
      return jsonResponse(listSources());
    }

    default:
      return errorResponse(`Unknown tool: ${name}`);
  }
}
