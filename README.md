# Sigma Rules MCP

[![CI](https://github.com/Ansvar-Systems/sigma-rules-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/Ansvar-Systems/sigma-rules-mcp/actions/workflows/ci.yml)
[![CodeQL](https://github.com/Ansvar-Systems/sigma-rules-mcp/actions/workflows/codeql.yml/badge.svg)](https://github.com/Ansvar-Systems/sigma-rules-mcp/actions/workflows/codeql.yml)
[![npm](https://img.shields.io/npm/v/@ansvar/sigma-rules-mcp)](https://www.npmjs.com/package/@ansvar/sigma-rules-mcp)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

TypeScript MCP server that ingests the full [SigmaHQ/sigma](https://github.com/SigmaHQ/sigma) rule corpus into SQLite (WASM backend) and exposes focused tooling for detection engineering workflows.

## Scope

- Source ingest: `SigmaHQ/sigma/rules/**/*.yml`
- Current corpus size: ~3000+ rules (expected around 3110 files)
- Storage: bundled SQLite DB (`data/sigma_rules.db`) for Vercel Strategy A
- Runtime SQLite engine: `node-sqlite3-wasm` via `@ansvar/mcp-sqlite`

## Data Sources

| Source | Authority | Update Frequency | License | Portal |
|--------|-----------|------------------|---------|--------|
| SigmaHQ Detection Rules | SigmaHQ Community | Weekly (automated) | [DRL](https://github.com/SigmaHQ/sigma/blob/master/LICENSE.Detection.Rules.md) | [github.com/SigmaHQ/sigma](https://github.com/SigmaHQ/sigma) |

See [`sources.yml`](sources.yml) for full metadata including coverage scope and retrieval method.

## Exposed MCP tools

- `search_rules` - full-text search across rule titles/descriptions
- `get_rule` - single rule including full YAML and raw `detection` block
- `list_by_technique` - all rules mapped to ATT&CK technique id (`Txxxx`)
- `list_by_logsource` - filter by `product` / `service` / `category`
- `get_rule_statistics` - coverage stats, including ATT&CK tactic coverage

## MCP Resources

The server exposes browsable resources for dataset exploration:

| Resource URI | Description |
|---|---|
| `sigma://logsources/products` | All distinct logsource products with rule counts |
| `sigma://logsources/services` | All distinct logsource services with rule counts |
| `sigma://logsources/categories` | All distinct logsource categories with rule counts |
| `sigma://techniques` | All ATT&CK technique IDs with rule counts |
| `sigma://tactics` | All ATT&CK tactics with display names and rule counts |
| `sigma://metadata` | Build metadata (source commit, build time, rule count) |

Agents can read these resources to discover valid filter values before querying tools.

## Extracted fields

Per Sigma rule, ingest extracts and stores:

- `id`, `title`, `status`, `description`, `author`, `level`
- `date`, `modified`
- `logsource.product`, `logsource.service`, `logsource.category`
- `falsepositives`
- `tags`
- `license` (rule-level if present, defaults to `DRL`)
- raw `detection` YAML block
- raw full YAML document

ATT&CK technique mappings are derived from tags like `attack.t1059` / `attack.t1059.001` and persisted in join table `rule_techniques(rule_id, technique_id)`.

## Quick start

```bash
npm install
git clone --depth 1 https://github.com/SigmaHQ/sigma.git /tmp/sigmahq-sigma
SIGMA_REPO_PATH=/tmp/sigmahq-sigma npm run build:db
npm run build
npm start
```

## Quality gates

This repository includes CI/CD and security hardening workflows:

- `CI` workflow: dependency install, DB artifact presence, DB size budget check, build, tests
- `Gitleaks` workflow: secret scanning on PR/push + scheduled scan
- `CodeQL` workflow: static analysis for JavaScript/TypeScript
- `Dependency Review` workflow: blocks high-severity dependency risks in pull requests
- `Release` workflow: npm publish on semver tags (`v*.*.*`) when `NPM_TOKEN` is configured

Local equivalents:

```bash
npm run ci
npm run test:coverage
```

## Vercel deploy (Strategy A)

`vercel.json` is preconfigured to:

- bundle `data/sigma_rules.db`
- bundle `node-sqlite3-wasm.wasm`
- expose `/mcp -> /api/mcp` and `/health -> /api/health`

The API function copies the bundled DB to `/tmp/sigma_rules.db` at runtime to avoid lock-dir issues with WASM SQLite.

## Local MCP configuration

Project-scoped `.mcp.json` example:

```json
{
  "mcpServers": {
    "sigma-rules": {
      "command": "node",
      "args": ["/absolute/path/to/Sigma-rules-mcp/dist/index.js"]
    }
  }
}
```

## Notes on licensing

- **Server code** (this repository): [Apache-2.0](LICENSE)
- **Sigma rule content** is generally under **Detection Rule License (DRL)**.
- Some rules carry explicit per-rule `license` metadata (for example MIT).
- This project stores the per-rule value when present, otherwise defaults to `DRL`.
