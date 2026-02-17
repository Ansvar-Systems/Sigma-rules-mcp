# Ansvar Standards Compliance — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bring the Sigma Rules MCP up to Ansvar Architecture Documentation quality standards across 5 incremental layers.

**Architecture:** Each layer builds on the previous. Foundation artifacts first, then agent UX enhancements, then testing, then CI/infrastructure, then publishing. Each task is one commit.

**Tech Stack:** TypeScript 5.9, MCP SDK ^1.25.3, WASM SQLite, Vitest, ESLint, GitHub Actions

---

## Task 1: Add CLAUDE.md

**Files:**
- Create: `CLAUDE.md`

**Step 1: Create CLAUDE.md**

```markdown
# CLAUDE.md — Sigma Rules MCP

## What this project does

TypeScript MCP server exposing the full SigmaHQ detection rule corpus (~3,100+ Sigma rules) via the Model Context Protocol. Backed by SQLite (WASM) with FTS5 full-text search.

## Architecture

- **Transport:** stdio (local) + Streamable HTTP (Vercel)
- **Database:** SQLite via `@ansvar/mcp-sqlite` (WASM, no native bindings). Opened readonly at runtime.
- **Ingest:** `scripts/build-db.ts` clones SigmaHQ/sigma, parses YAML, writes to `data/sigma_rules.db`
- **Auto-refresh:** Weekly GitHub Actions workflow re-ingests SigmaHQ and opens a PR

## Key conventions

- TypeScript strict mode (`tsconfig.json` has `strict: true`)
- WASM SQLite requires `journal_mode = DELETE` (not WAL)
- DB opened with `readonly: true` at runtime — never write to it from the server
- One file per tool in `src/tools/`
- FTS5 with fallback to LIKE matching on syntax errors
- Tool names: `snake_case`, max 64 chars

## Commands

```bash
npm run build        # tsc + chmod +x dist/index.js
npm run build:db     # Ingest SigmaHQ rules into SQLite
npm test             # vitest run (integration tests)
npm run test:contract # Contract tests from fixtures/golden-tests.json
npm run lint         # ESLint
npm run ci           # Full CI pipeline (db-size + build + test)
npm run dev          # Run via tsx (no build needed)
npm start            # Run compiled dist/index.js
```

## File structure

- `src/index.ts` — stdio server entry point
- `src/tools/definitions.ts` — tool registry, SERVER_INSTRUCTIONS, router
- `src/tools/*.ts` — one file per tool implementation
- `src/database/db.ts` — DB singleton, stats, metadata queries
- `src/database/schema.ts` — SQL DDL
- `src/resources/` — MCP resource handlers
- `api/mcp.ts` — Vercel Streamable HTTP handler
- `api/health.ts` — /health endpoint
- `api/version.ts` — /version endpoint
- `scripts/build-db.ts` — Ingest pipeline
- `data/sigma_rules.db` — Bundled DB (< 20 MB, committed to git)
- `fixtures/golden-tests.json` — Contract test definitions
- `sources.yml` — Data source metadata
```

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add CLAUDE.md project guide for AI assistants"
```

---

## Task 2: Add sources.yml

**Files:**
- Create: `sources.yml`

**Step 1: Create sources.yml**

```yaml
schema_version: "1.0"
mcp_name: "Sigma Rules MCP"
jurisdiction: "International"

sources:
  - name: "SigmaHQ Detection Rules"
    authority: "SigmaHQ Community"
    official_portal: "https://github.com/SigmaHQ/sigma"
    canonical_identifier: "N/A"
    retrieval_method: "BULK_DOWNLOAD"
    api_documentation: "N/A"
    update_frequency: "weekly"
    last_ingested: "2026-02-17"
    license_or_terms:
      type: "Detection Rule License (DRL)"
      url: "https://github.com/SigmaHQ/sigma/blob/master/LICENSE.Detection.Rules.md"
      summary: "Free for internal use and sharing; commercial products must attribute SigmaHQ"
    coverage:
      scope: "All YAML rules under SigmaHQ/sigma/rules/ — covers Windows, Linux, macOS, cloud, network, and application log sources with MITRE ATT&CK technique mappings"
      limitations: "Does not include rules from third-party Sigma rule repositories or private rule sets. Rule quality varies by contributor."
    languages:
      - "en"

data_freshness:
  automated_checks: true
  check_frequency: "weekly"
  last_verified: "2026-02-17"
```

**Step 2: Commit**

```bash
git add sources.yml
git commit -m "docs: add sources.yml data source metadata"
```

---

## Task 3: Add CHANGELOG.md

**Files:**
- Create: `CHANGELOG.md`

**Step 1: Create CHANGELOG.md**

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- CLAUDE.md project guide for AI assistants
- sources.yml data source metadata
- CHANGELOG.md (this file)
- Apache-2.0 license (replacing MIT)
- server.json MCP Registry manifest
- MCP resources for browsing logsources, techniques, tactics, and metadata
- Enhanced tool definitions with enum constraints and examples
- Expert-level SERVER_INSTRUCTIONS with Sigma primer and workflow guidance
- Contract tests (fixtures/golden-tests.json) with 12+ test cases
- /health endpoint with Ansvar-standard schema (data freshness SLO)
- /version endpoint with transport and capability metadata
- ESLint configuration
- SBOM generation in CI (CycloneDX)
- Node 18/20/22 test matrix
- .github/SECURITY-SETUP.md
- .github/ISSUE_TEMPLATE/data-error.md

### Changed
- License from MIT to Apache-2.0
- CI workflow: added concurrency control, SBOM, Semgrep, contract test job
- Release workflow: added --provenance flag, SBOM attachment
- README: added Data Sources table, security badges, resources documentation

## [0.1.0] - 2026-02-15

### Added
- Initial release with 5 MCP tools: search_rules, get_rule, list_by_technique, list_by_logsource, get_rule_statistics
- SQLite (WASM) backend with FTS5 full-text search
- SigmaHQ ingest pipeline (scripts/build-db.ts)
- Dual transport: stdio + Vercel Streamable HTTP
- CI/CD with CodeQL, Gitleaks, Dependency Review, npm audit
- Weekly auto-refresh of Sigma rules via GitHub Actions
- Bundled SQLite DB (Strategy A)

[Unreleased]: https://github.com/Ansvar-Systems/sigma-rules-mcp/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Ansvar-Systems/sigma-rules-mcp/releases/tag/v0.1.0
```

**Step 2: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: add CHANGELOG.md in Keep a Changelog format"
```

---

## Task 4: Switch license to Apache-2.0

**Files:**
- Modify: `LICENSE`
- Modify: `package.json:48` (license field)
- Modify: `manifest.json:12` (license field)

**Step 1: Replace LICENSE with Apache-2.0 text**

Download the standard Apache-2.0 text. Update `Copyright [yyyy] [name]` to `Copyright 2026 Ansvar Systems`.

**Step 2: Update package.json license field**

Change `"license": "MIT"` to `"license": "Apache-2.0"`.

**Step 3: Update manifest.json license field**

Change `"license": "MIT"` to `"license": "Apache-2.0"`.

**Step 4: Commit**

```bash
git add LICENSE package.json manifest.json
git commit -m "chore: switch license from MIT to Apache-2.0"
```

---

## Task 5: Add server.json and mcpName

**Files:**
- Create: `server.json`
- Modify: `package.json` (add mcpName field, add server.json to files array)

**Step 1: Create server.json**

```json
{
  "$schema": "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json",
  "name": "eu.ansvar/sigma-rules",
  "description": "Full SigmaHQ detection rule corpus with ATT&CK mapping, FTS search, and logsource filtering",
  "repository": {
    "url": "https://github.com/Ansvar-Systems/sigma-rules-mcp",
    "source": "github"
  },
  "homepage": "https://ansvar.eu",
  "version": "0.1.0",
  "license": "Apache-2.0",
  "packages": [
    {
      "registryType": "npm",
      "identifier": "@ansvar/sigma-rules-mcp",
      "version": "0.1.0",
      "transport": {
        "type": "stdio"
      }
    }
  ]
}
```

**Step 2: Add mcpName to package.json**

Add `"mcpName": "eu.ansvar/sigma-rules"` after the `"description"` field.

**Step 3: Add server.json to package.json files array**

Add `"server.json"` to the `"files"` array.

**Step 4: Commit**

```bash
git add server.json package.json
git commit -m "feat: add server.json MCP Registry manifest and mcpName"
```

---

## Task 6: Add .github/SECURITY-SETUP.md and issue template

**Files:**
- Create: `.github/SECURITY-SETUP.md`
- Create: `.github/ISSUE_TEMPLATE/data-error.md`

**Step 1: Create .github/SECURITY-SETUP.md**

```markdown
# Security Setup Guide

## Required GitHub Secrets

| Secret | Purpose | Rotation |
|--------|---------|----------|
| `NPM_TOKEN` | npm publish (release workflow) | Every 90 days |

## Secret Rotation Schedule

- Rotate `NPM_TOKEN` every 90 days
- Use `::add-mask::` in workflows to prevent accidental logging
- Never use personal access tokens for production

## Workflow Permissions

All workflows follow the principle of least privilege:
- `contents: read` — default for most workflows
- `security-events: write` — security scanning workflows only
- `id-token: write` — npm publish with provenance only

Never use `permissions: write-all`.
```

**Step 2: Create .github/ISSUE_TEMPLATE/data-error.md**

```markdown
---
name: Data Error Report
about: Report incorrect, missing, or stale Sigma rule data
title: "[DATA] "
labels: data-quality
assignees: ''
---

## Rule ID (if applicable)
<!-- UUID of the affected rule -->

## Expected behavior
<!-- What should the data contain? -->

## Actual behavior
<!-- What does the data actually show? -->

## SigmaHQ reference
<!-- Link to the original rule in SigmaHQ/sigma if applicable -->

## Additional context
<!-- Any other context about the data issue -->
```

**Step 3: Commit**

```bash
git add .github/SECURITY-SETUP.md .github/ISSUE_TEMPLATE/data-error.md
git commit -m "docs: add SECURITY-SETUP.md and data-error issue template"
```

---

## Task 7: Enhance tool definitions with enums and examples

**Files:**
- Modify: `src/tools/definitions.ts:24-152` (TOOLS array)

**Step 1: Update the TOOLS array**

Replace the entire `TOOLS` array with enhanced definitions. Key changes:

For `search_rules`:
- Add `enum` to `status`: `["stable", "test", "experimental", "deprecated", "unsupported"]`
- Add `enum` to `level`: `["informational", "low", "medium", "high", "critical"]`
- Enhance descriptions with examples: `"Text query for FTS5 search. Examples: 'mimikatz', 'lateral movement', 'process_creation AND windows'. Supports SQLite FTS5 syntax (AND/OR/NOT, prefix*)."`
- Add description for output shape

For `get_rule`:
- Expand description: `"Return one Sigma rule by UUID. Response includes: title, status, level, author, logsource, tags, attack_techniques, attack_tactics, detection_yaml (raw detection block), full_yaml (complete rule YAML), and metadata."`
- Add pattern hint to rule_id: `"Sigma rule UUID (e.g., '5af54681-df95-4c26-854f-2565e13cfab0')"`

For `list_by_technique`:
- Expand description to mention output fields
- Add example values in technique_id description

For `list_by_logsource`:
- Add `anyOf` or clearer constraint messaging in description: `"List Sigma rules by logsource dimensions. IMPORTANT: At least one of product, service, or category must be provided."`
- Add top examples in each param description (e.g., product: `"Logsource product. Common values: windows, linux, macos, aws, azure, gcp"`)

For `get_rule_statistics`:
- Expand description: `"Return comprehensive dataset statistics: total rule count, ATT&CK tactic coverage (rules and techniques per tactic), top 20 logsource products/services/categories, license breakdown, and build metadata (source commit, build time, rule count)."`

**Step 2: Run tests to verify nothing broke**

```bash
npm test
```
Expected: All tests pass (tool names unchanged, only descriptions/schemas enriched).

**Step 3: Commit**

```bash
git add src/tools/definitions.ts
git commit -m "feat: enhance tool definitions with enums, examples, and output descriptions"
```

---

## Task 8: Enhance SERVER_INSTRUCTIONS with expert-level content

**Files:**
- Modify: `src/tools/definitions.ts:9-22` (SERVER_INSTRUCTIONS)

**Step 1: Replace SERVER_INSTRUCTIONS**

Replace with an expert-level version that includes:

```typescript
export const SERVER_INSTRUCTIONS = `Sigma Rules MCP — Expert Detection Engineering Interface

This MCP server exposes the full SigmaHQ community detection rule corpus (~3,100+ rules) in a queryable SQLite database with full-text search.

## What are Sigma rules?
Sigma is a generic and open signature format for SIEM systems. Each rule describes a detection pattern using structured YAML:
- **logsource** defines which log data to query (product/service/category)
- **detection** defines the matching logic (field conditions, boolean operators, aggregations)
- **level** indicates severity: informational < low < medium < high < critical
- **status** indicates maturity: experimental → test → stable (deprecated/unsupported for archived rules)

## ATT&CK mapping
Rules are tagged with MITRE ATT&CK technique IDs (e.g., T1059 = Command and Scripting Interpreter, T1059.001 = PowerShell). Techniques are grouped into 14 tactics representing adversary goals:
reconnaissance → resource-development → initial-access → execution → persistence → privilege-escalation → defense-evasion → credential-access → discovery → lateral-movement → collection → command-and-control → exfiltration → impact

## Logsource hierarchy
- **product**: OS or platform (windows, linux, macos, aws, azure, gcp)
- **service**: specific log source within product (sysmon, security, powershell, cloudtrail)
- **category**: generic log type across products (process_creation, file_event, network_connection)

## Recommended workflows

**Find detections for a threat:**
1. search_rules("mimikatz") → find relevant rules by keyword
2. get_rule(id) → read full detection logic and YAML

**Map ATT&CK coverage gaps:**
1. get_rule_statistics() → see tactic/technique coverage
2. list_by_technique("T1059") → drill into specific techniques
3. get_rule(id) → examine individual detection logic

**Audit log source coverage:**
1. Browse sigma://logsources/products resource → see available products
2. list_by_logsource(product="windows") → list rules for a product
3. get_rule(id) → read detection details

**Build detection content:**
1. search_rules with filters (status="stable", level="high") → find production-ready rules
2. get_rule(id) → get complete YAML for deployment
3. Use detection_yaml field for SIEM query translation

## Available resources
Browse sigma://logsources/products, sigma://logsources/services, sigma://logsources/categories, sigma://techniques, sigma://tactics, and sigma://metadata for dataset exploration.

## Dataset notes
- Source: SigmaHQ/sigma rules/*.yml (auto-refreshed weekly)
- Detection Rule License (DRL) unless rule specifies otherwise
- ATT&CK techniques parsed from tags (attack.t1059, attack.t1059.001)
- ATT&CK tactics parsed from tags (attack.execution, attack.initial-access)`;
```

**Step 2: Run tests**

```bash
npm test
```

**Step 3: Commit**

```bash
git add src/tools/definitions.ts
git commit -m "feat: add expert-level SERVER_INSTRUCTIONS with Sigma primer and workflow guidance"
```

---

## Task 9: Add MCP resources

**Files:**
- Create: `src/resources/definitions.ts`
- Modify: `src/index.ts` (register resource handlers)
- Modify: `api/mcp.ts` (register resource handlers)

**Step 1: Create src/resources/definitions.ts**

This file exports:
- `RESOURCES` array (6 resource definitions with URIs and descriptions)
- `handleResourceRead(uri: string)` function that queries the DB based on the URI

Resource URIs:
- `sigma://logsources/products`
- `sigma://logsources/services`
- `sigma://logsources/categories`
- `sigma://techniques`
- `sigma://tactics`
- `sigma://metadata`

Each resource handler runs a simple `SELECT DISTINCT ... GROUP BY ... ORDER BY count DESC` query and returns JSON.

Implementation:

```typescript
import { Resource } from '@modelcontextprotocol/sdk/types.js';
import { getDatabase, getDatabaseMetadata, getDatabaseStats } from '../database/db.js';
import { ATTACK_TACTIC_NAMES } from '../tools/utils.js';

export const RESOURCES: Resource[] = [
  {
    uri: 'sigma://logsources/products',
    name: 'Logsource Products',
    description: 'All distinct logsource products in the Sigma rule corpus with rule counts. Use to discover valid product filter values for list_by_logsource and search_rules.',
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
    description: 'All MITRE ATT&CK technique IDs mapped in the rule corpus with rule counts. Use to discover valid technique_id values for list_by_technique.',
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

interface CountRow { value: string; count: number }
interface TechniqueRow { technique_id: string; count: number }
interface TacticRow { tactic_id: string; count: number }

function queryLogsourceField(field: 'logsource_product' | 'logsource_service' | 'logsource_category'): CountRow[] {
  const db = getDatabase();
  return db.prepare<CountRow>(`
    SELECT ${field} AS value, COUNT(*) AS count
    FROM rules
    WHERE ${field} IS NOT NULL AND ${field} <> ''
    GROUP BY ${field}
    ORDER BY count DESC, value ASC
  `).all();
}

export function handleResourceRead(uri: string): { contents: Array<{ uri: string; mimeType: string; text: string }> } {
  switch (uri) {
    case 'sigma://logsources/products':
      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(queryLogsourceField('logsource_product'), null, 2) }] };
    case 'sigma://logsources/services':
      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(queryLogsourceField('logsource_service'), null, 2) }] };
    case 'sigma://logsources/categories':
      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(queryLogsourceField('logsource_category'), null, 2) }] };
    case 'sigma://techniques': {
      const db = getDatabase();
      const rows = db.prepare<TechniqueRow>(`
        SELECT technique_id, COUNT(*) AS count
        FROM rule_techniques
        GROUP BY technique_id
        ORDER BY count DESC, technique_id ASC
      `).all();
      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(rows, null, 2) }] };
    }
    case 'sigma://tactics': {
      const db = getDatabase();
      const rows = db.prepare<TacticRow>(`
        SELECT tactic_id, COUNT(*) AS count
        FROM rule_tactics
        GROUP BY tactic_id
        ORDER BY count DESC, tactic_id ASC
      `).all();
      const result = rows.map(row => ({
        tactic_id: row.tactic_id,
        display_name: ATTACK_TACTIC_NAMES[row.tactic_id] || row.tactic_id,
        rule_count: row.count,
      }));
      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(result, null, 2) }] };
    }
    case 'sigma://metadata': {
      const metadata = getDatabaseMetadata();
      const stats = getDatabaseStats();
      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify({ ...metadata, ...stats }, null, 2) }] };
    }
    default:
      throw new Error(`Unknown resource: ${uri}`);
  }
}
```

**Step 2: Register resource handlers in src/index.ts**

Add imports for `ListResourcesRequestSchema`, `ReadResourceRequestSchema` from MCP SDK types.
Import `RESOURCES` and `handleResourceRead` from `./resources/definitions.js`.
Update server capabilities to include `resources: {}`.
Add two request handlers:

```typescript
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return { resources: RESOURCES };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  try {
    return handleResourceRead(request.params.uri);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error));
  }
});
```

**Step 3: Register resource handlers in api/mcp.ts**

Same changes as index.ts — add resource handlers to the `createServer()` function. Update capabilities to include `resources: {}`.

**Step 4: Run tests**

```bash
npm test
```

**Step 5: Commit**

```bash
git add src/resources/definitions.ts src/index.ts api/mcp.ts
git commit -m "feat: add 6 MCP resources for browsing logsources, techniques, tactics, and metadata"
```

---

## Task 10: Add contract tests

**Files:**
- Create: `fixtures/golden-tests.json`
- Create: `fixtures/README.md`
- Create: `__tests__/contract/golden.test.ts`
- Modify: `package.json` (add test:contract script)
- Modify: `vitest.config.ts` (if needed for contract test path)

**Step 1: Create fixtures/golden-tests.json**

```json
[
  {
    "name": "search_rules returns results for 'mimikatz'",
    "category": "search",
    "tool": "search_rules",
    "args": { "query": "mimikatz", "limit": 5 },
    "assertions": [
      { "type": "result_not_empty" },
      { "type": "min_results", "value": 1 },
      { "type": "any_result_contains", "values": ["mimikatz"] }
    ]
  },
  {
    "name": "search_rules returns results for 'powershell'",
    "category": "search",
    "tool": "search_rules",
    "args": { "query": "powershell", "limit": 5 },
    "assertions": [
      { "type": "result_not_empty" },
      { "type": "min_results", "value": 1 }
    ]
  },
  {
    "name": "search_rules returns results for 'lateral movement'",
    "category": "search",
    "tool": "search_rules",
    "args": { "query": "lateral movement", "limit": 5 },
    "assertions": [
      { "type": "result_not_empty" }
    ]
  },
  {
    "name": "search_rules filters by status=stable",
    "category": "search",
    "tool": "search_rules",
    "args": { "query": "windows", "status": "stable", "limit": 5 },
    "assertions": [
      { "type": "result_not_empty" }
    ]
  },
  {
    "name": "list_by_technique returns rules for T1059",
    "category": "technique_lookup",
    "tool": "list_by_technique",
    "args": { "technique_id": "T1059", "limit": 5 },
    "assertions": [
      { "type": "result_not_empty" },
      { "type": "min_results", "value": 1 },
      { "type": "fields_present", "fields": ["technique_id", "total", "results"] }
    ]
  },
  {
    "name": "list_by_technique normalizes lowercase input",
    "category": "technique_lookup",
    "tool": "list_by_technique",
    "args": { "technique_id": "attack.t1059", "limit": 5 },
    "assertions": [
      { "type": "result_not_empty" },
      { "type": "text_contains", "values": ["T1059"] }
    ]
  },
  {
    "name": "list_by_logsource returns rules for product=windows",
    "category": "logsource_lookup",
    "tool": "list_by_logsource",
    "args": { "product": "windows", "limit": 5 },
    "assertions": [
      { "type": "result_not_empty" },
      { "type": "min_results", "value": 1 }
    ]
  },
  {
    "name": "list_by_logsource returns rules for category=process_creation",
    "category": "logsource_lookup",
    "tool": "list_by_logsource",
    "args": { "category": "process_creation", "limit": 5 },
    "assertions": [
      { "type": "result_not_empty" },
      { "type": "min_results", "value": 1 }
    ]
  },
  {
    "name": "get_rule_statistics returns comprehensive stats",
    "category": "statistics",
    "tool": "get_rule_statistics",
    "args": {},
    "assertions": [
      { "type": "result_not_empty" },
      { "type": "fields_present", "fields": ["overview", "metadata", "tactic_coverage", "top_logsource_products"] }
    ]
  },
  {
    "name": "get_rule with invalid UUID handles gracefully",
    "category": "negative_test",
    "tool": "get_rule",
    "args": { "rule_id": "00000000-0000-0000-0000-000000000000" },
    "assertions": [
      { "type": "handles_gracefully" }
    ]
  },
  {
    "name": "list_by_logsource with no filters handles gracefully",
    "category": "negative_test",
    "tool": "list_by_logsource",
    "args": {},
    "assertions": [
      { "type": "handles_gracefully" }
    ]
  },
  {
    "name": "search_rules with empty query handles gracefully",
    "category": "negative_test",
    "tool": "search_rules",
    "args": { "query": "" },
    "assertions": [
      { "type": "handles_gracefully" }
    ]
  }
]
```

**Step 2: Create fixtures/README.md**

```markdown
# Contract Test Fixtures

## golden-tests.json

Contract tests that verify tool behavior against known inputs. These tests are deterministic and run without network access.

### Test format

Each test has:
- `name`: Human-readable description
- `category`: search | technique_lookup | logsource_lookup | statistics | negative_test
- `tool`: MCP tool name to call
- `args`: Arguments to pass
- `assertions`: Array of assertions to verify

### Assertion types

| Type | Description | Extra fields |
|------|-------------|--------------|
| `result_not_empty` | Response is not null/empty | — |
| `min_results` | At least N results returned | `value` |
| `text_contains` | Response text includes ALL substrings | `values` |
| `any_result_contains` | At least one result contains at least one value | `values` |
| `fields_present` | Response JSON has these keys | `fields` |
| `handles_gracefully` | Does not throw; returns error or empty gracefully | — |

### Adding tests

Add new entries to `golden-tests.json`. Run `npm run test:contract` to verify.

Minimum: 10 tests for development, 25 for production.
```

**Step 3: Create __tests__/contract/golden.test.ts**

```typescript
import { readFileSync } from 'fs';
import { join } from 'path';
import { afterAll, describe, expect, it } from 'vitest';

import { handleToolCall } from '../../src/tools/definitions.js';
import { closeDatabase } from '../../src/database/db.js';

interface Assertion {
  type: string;
  value?: number;
  values?: string[];
  fields?: string[];
}

interface GoldenTest {
  name: string;
  category: string;
  tool: string;
  args: Record<string, unknown>;
  assertions: Assertion[];
}

const fixturesPath = join(import.meta.dirname, '../../fixtures/golden-tests.json');
const goldenTests: GoldenTest[] = JSON.parse(readFileSync(fixturesPath, 'utf-8'));

function parseResult(result: { content: Array<{ type: string; text: string }>; isError?: boolean }) {
  return JSON.parse(result.content[0].text);
}

function getResultsArray(payload: Record<string, unknown>): unknown[] {
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload)) return payload;
  return [];
}

describe('Contract tests (golden-tests.json)', () => {
  afterAll(() => {
    closeDatabase();
  });

  for (const test of goldenTests) {
    it(`[${test.category}] ${test.name}`, async () => {
      const result = await handleToolCall(test.tool, test.args);

      for (const assertion of test.assertions) {
        switch (assertion.type) {
          case 'result_not_empty': {
            expect(result.content).toBeDefined();
            expect(result.content.length).toBeGreaterThan(0);
            const text = result.content[0].text;
            expect(text.length).toBeGreaterThan(2); // not just "{}" or "[]"
            break;
          }

          case 'min_results': {
            const payload = parseResult(result);
            const results = getResultsArray(payload);
            expect(results.length).toBeGreaterThanOrEqual(assertion.value!);
            break;
          }

          case 'text_contains': {
            const text = result.content[0].text;
            for (const val of assertion.values!) {
              expect(text).toContain(val);
            }
            break;
          }

          case 'any_result_contains': {
            const payload = parseResult(result);
            const results = getResultsArray(payload);
            const text = JSON.stringify(results).toLowerCase();
            const found = assertion.values!.some(v => text.includes(v.toLowerCase()));
            expect(found).toBe(true);
            break;
          }

          case 'fields_present': {
            const payload = parseResult(result);
            for (const field of assertion.fields!) {
              expect(payload).toHaveProperty(field);
            }
            break;
          }

          case 'handles_gracefully': {
            // Should NOT throw — the handler catches errors and returns isError
            expect(result.content).toBeDefined();
            expect(result.content.length).toBeGreaterThan(0);
            // It's ok to return isError: true, as long as it didn't throw
            break;
          }
        }
      }
    });
  }
});
```

**Step 4: Add test:contract script to package.json**

Add `"test:contract": "vitest run __tests__/contract/"` to scripts.

**Step 5: Run contract tests**

```bash
npm run test:contract
```
Expected: All 12 tests pass.

**Step 6: Commit**

```bash
git add fixtures/ __tests__/contract/ package.json
git commit -m "test: add 12 contract tests with golden-tests.json fixture runner"
```

---

## Task 11: Upgrade /health endpoint to standard schema

**Files:**
- Modify: `api/health.ts` (complete rewrite)

**Step 1: Rewrite api/health.ts**

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { copyFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';

const SOURCE_DB = process.env.SIGMA_RULES_DB_PATH || join(process.cwd(), 'data', 'sigma_rules.db');
const TMP_DB = '/tmp/sigma_rules.db';
const MAX_AGE_DAYS = 14;
const SERVER_VERSION = '0.2.0';
const startTime = Date.now();

function ensureDb(): boolean {
  if (!existsSync(SOURCE_DB) && !existsSync(TMP_DB)) return false;
  if (!existsSync(TMP_DB) || (existsSync(SOURCE_DB) && statSync(SOURCE_DB).mtimeMs > statSync(TMP_DB).mtimeMs)) {
    try { copyFileSync(SOURCE_DB, TMP_DB); } catch { return false; }
  }
  process.env.SIGMA_RULES_DB_PATH = TMP_DB;
  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method && req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const dbAvailable = ensureDb();

  if (!dbAvailable) {
    res.status(503).json({
      status: 'degraded',
      server: 'sigma-rules-mcp',
      version: SERVER_VERSION,
      error: 'Database not available',
    });
    return;
  }

  try {
    // Dynamic import to avoid loading DB module if not needed
    const { getDatabaseMetadata, getDatabaseStats } = await import('../src/database/db.js');
    const metadata = getDatabaseMetadata();
    const stats = getDatabaseStats();

    const lastIngested = metadata.build_time || '';
    const ageDays = lastIngested
      ? Math.floor((Date.now() - new Date(lastIngested).getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    const isStale = ageDays > MAX_AGE_DAYS;

    res.status(200).json({
      status: isStale ? 'stale' : 'ok',
      server: 'sigma-rules-mcp',
      version: SERVER_VERSION,
      git_sha: (metadata.source_commit || '').slice(0, 7),
      uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
      build_timestamp: metadata.build_time || null,
      data_freshness: {
        last_ingested: metadata.build_time || null,
        age_days: ageDays,
        max_age_days: MAX_AGE_DAYS,
        source_count: 1,
        record_count: stats.total_rules,
      },
      capabilities: ['search', 'rule_retrieval', 'technique_lookup', 'logsource_lookup', 'statistics'],
      tier: 'free',
    });
  } catch (error) {
    res.status(503).json({
      status: 'degraded',
      server: 'sigma-rules-mcp',
      version: SERVER_VERSION,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
```

**Step 2: Commit**

```bash
git add api/health.ts
git commit -m "feat: upgrade /health endpoint to Ansvar standard schema with data freshness SLO"
```

---

## Task 12: Add /version endpoint

**Files:**
- Create: `api/version.ts`
- Modify: `vercel.json` (add /version rewrite)

**Step 1: Create api/version.ts**

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';

const SERVER_VERSION = '0.2.0';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method && req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  res.status(200).json({
    name: 'sigma-rules-mcp',
    version: SERVER_VERSION,
    git_sha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'unknown',
    build_timestamp: process.env.VERCEL_GIT_COMMIT_DATE || null,
    node_version: process.version,
    transport: ['stdio', 'streamable-http'],
    mcp_sdk_version: '1.25.3',
    capabilities: ['search', 'rule_retrieval', 'technique_lookup', 'logsource_lookup', 'statistics'],
    tier: 'free',
    source_schema_version: '1.0',
    repo_url: 'https://github.com/Ansvar-Systems/sigma-rules-mcp',
    report_issue_url: 'https://github.com/Ansvar-Systems/sigma-rules-mcp/issues/new?template=data-error.md',
  });
}
```

**Step 2: Add /version rewrite to vercel.json**

Add `{ "source": "/version", "destination": "/api/version" }` to the rewrites array.

**Step 3: Commit**

```bash
git add api/version.ts vercel.json
git commit -m "feat: add /version endpoint with Ansvar standard schema"
```

---

## Task 13: Add ESLint configuration

**Files:**
- Create: `eslint.config.js`
- Modify: `package.json` (add lint script, add eslint devDependencies)

**Step 1: Install ESLint and TypeScript ESLint**

```bash
npm install --save-dev eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

**Step 2: Create eslint.config.js (flat config)**

```javascript
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  {
    files: ['src/**/*.ts', 'api/**/*.ts', 'scripts/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    ignores: ['dist/', 'coverage/', 'node_modules/', '*.mjs'],
  },
];
```

**Step 3: Add lint script to package.json**

Add `"lint": "eslint src/ api/ scripts/"` to scripts.

**Step 4: Run lint and fix any issues**

```bash
npm run lint
```

Fix any lint errors found.

**Step 5: Commit**

```bash
git add eslint.config.js package.json package-lock.json
git commit -m "chore: add ESLint with TypeScript ESLint configuration"
```

---

## Task 14: Enhance CI workflow

**Files:**
- Modify: `.github/workflows/ci.yml`

**Step 1: Rewrite ci.yml with Node matrix, SBOM, contract tests, and Semgrep**

Key changes:
- Add `schedule: cron: '0 6 * * 1'` trigger (weekly Monday)
- Add Node 18/20/22 matrix for test job
- Add `lint` step before build
- Add `contract-tests` job (depends on test)
- Add `security` job with:
  - SBOM generation via `anchore/sbom-action` (pinned to SHA)
  - `npm audit --audit-level=critical --omit=dev`
- Add `timeout-minutes: 15` to all jobs
- Ensure `concurrency` group is already present (it is)

**Step 2: Run CI locally to sanity-check**

```bash
npm run ci
```

**Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add Node matrix, SBOM, contract tests, lint, and Semgrep to CI"
```

---

## Task 15: Enhance release workflow

**Files:**
- Modify: `.github/workflows/release.yml`

**Step 1: Add --provenance to npm publish**

Change `npm publish --access public` to `npm publish --access public --provenance`.

Add `id-token: write` to permissions (required for provenance).

Add SBOM generation and upload to GitHub Release:

```yaml
- name: Generate SBOM
  uses: anchore/sbom-action@v0
  with:
    artifact-name: sbom.cdx.json
    format: cyclonedx-json

- name: Upload SBOM to Release
  uses: softprops/action-gh-release@v2
  with:
    files: sbom.cdx.json
```

**Step 2: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "ci: add provenance flag and SBOM attachment to release workflow"
```

---

## Task 16: Enhance README

**Files:**
- Modify: `README.md`

**Step 1: Add Data Sources table, badges, resource docs**

Add at the top (after title):
- Security badges (CodeQL, Gitleaks)
- npm badge

Add "Data Sources" section with table rendered from sources.yml content:

| Source | Authority | Update Frequency | License |
|--------|-----------|------------------|---------|
| SigmaHQ Detection Rules | SigmaHQ Community | Weekly | DRL |

Add "MCP Resources" section listing the 6 resources with URIs and descriptions.

Add link to `sources.yml` for full metadata.

Update "Notes on licensing" to mention Apache-2.0 for the server code.

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: enhance README with Data Sources table, badges, and MCP resources"
```

---

## Task 17: Version bump to 0.2.0

**Files:**
- Modify: `package.json:3` (version)
- Modify: `server.json` (version + packages.version)
- Modify: `manifest.json:5` (version)
- Modify: `src/index.ts:14` (SERVER_VERSION)
- Modify: `api/mcp.ts:41` (version in createServer)

**Step 1: Update all version references from 0.1.0 to 0.2.0**

Search for all `0.1.0` occurrences and update to `0.2.0`.

**Step 2: Run full CI**

```bash
npm run ci
```
Expected: All tests pass.

**Step 3: Commit**

```bash
git add package.json server.json manifest.json src/index.ts api/mcp.ts api/health.ts api/version.ts
git commit -m "chore: bump version to 0.2.0"
```

---

## Task 18: Final verification

**Step 1: Run full test suite**

```bash
npm run lint && npm run ci && npm run test:contract
```

**Step 2: Verify all required files exist**

```bash
ls -la CLAUDE.md sources.yml CHANGELOG.md LICENSE server.json
ls -la fixtures/golden-tests.json fixtures/README.md
ls -la .github/SECURITY-SETUP.md .github/ISSUE_TEMPLATE/data-error.md
ls -la api/health.ts api/version.ts
ls -la src/resources/definitions.ts
```

**Step 3: Review git log for clean commit history**

```bash
git log --oneline -20
```
