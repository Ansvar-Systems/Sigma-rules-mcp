# Ansvar Standards Compliance — Design Document

**Date:** 2026-02-17
**Status:** Approved
**Approach:** Incremental compliance (5 layers)
**Scope:** Spirit-of-the-standard compliance with Ansvar Architecture Documentation

## Context

The Sigma Rules MCP server exposes the full SigmaHQ detection rule corpus (~3,100+ rules) via the Model Context Protocol. It was built before the Ansvar quality standards were codified. This design brings it into compliance.

### What we're NOT doing (law-specific items skipped)

- `eu_cross_reference` contract tests
- `legal_documents` / `legal_provisions` schema
- Tiered capabilities (free/professional)
- Seed-based reproducibility (Sigma rules come from SigmaHQ git clone, not seeds)
- Drift detection with golden hashes (SigmaHQ rules change frequently by design)
- 2 reviewer branch protection (single-maintainer project)

## Layer 1: Foundation

### 1.1 CLAUDE.md
Project coding standards for AI assistants: architecture, commands, conventions.

### 1.2 sources.yml
Data source metadata at repo root documenting SigmaHQ as the sole source.

### 1.3 CHANGELOG.md
Keep a Changelog format starting with [0.1.0].

### 1.4 License: MIT → Apache-2.0
Replace LICENSE file, update package.json.

### 1.5 server.json + mcpName
MCP Registry manifest with `eu.ansvar/sigma-rules` namespace. Add `mcpName` to package.json.

### 1.6 .github/SECURITY-SETUP.md + Issue Template
Internal secrets guide and data-error issue template.

## Layer 2: Agent UX

### 2.1 Enhanced Tool Definitions
- Add enum constraints for `status` and `level` parameters
- Add example values in descriptions
- Describe expected output shapes
- Clarify "at least one required" constraint on `list_by_logsource`

### 2.2 Enhanced SERVER_INSTRUCTIONS
- Sigma rules primer (what they are, detection logic)
- ATT&CK mapping structure (techniques vs tactics, subtechniques)
- Multi-tool workflow guidance
- Logsource hierarchy explanation

### 2.3 MCP Resources (6 resources)
| Resource URI | Description |
|---|---|
| `sigma://logsources/products` | Distinct products with rule counts |
| `sigma://logsources/services` | Distinct services with rule counts |
| `sigma://logsources/categories` | Distinct categories with rule counts |
| `sigma://techniques` | ATT&CK technique IDs with rule counts |
| `sigma://tactics` | ATT&CK tactics with display names and counts |
| `sigma://metadata` | Build metadata |

## Layer 3: Testing

### 3.1 Contract Tests
`fixtures/golden-tests.json` with 12+ tests:
- 3 rule_retrieval (fetch known rules by UUID)
- 3 search (FTS for "mimikatz", "powershell", "lateral movement")
- 2 technique_lookup (T1059, verify min results)
- 2 logsource_lookup (product=windows, verify min results)
- 2 negative_test (invalid UUID, missing logsource params)

### 3.2 Contract Test Runner
`__tests__/contract/golden.test.ts` — reads golden-tests.json, invokes handleToolCall, runs assertions.

### 3.3 Scripts
Add `test:contract` to package.json.

## Layer 4: Infrastructure

### 4.1 /health Endpoint (standard schema)
Returns status (ok/stale/degraded), data_freshness with 14-day SLO, capabilities list.

### 4.2 /version Endpoint (new)
Standard schema with repo_url, report_issue_url, transport, SDK version.

### 4.3 CI Enhancements
- Node 18/20/22 matrix
- Concurrency control (cancel stale runs)
- Job timeouts (15 min)
- SBOM generation (CycloneDX via anchore/sbom-action)
- Semgrep workflow
- SHA-pin third-party actions
- Contract tests as separate CI job

### 4.4 ESLint
Add eslint + @typescript-eslint, `lint` script.

### 4.5 Publish Enhancement
`--provenance --access public`, SBOM attached to releases.

## Layer 5: Publishing

### 5.1 README Enhancement
Data Sources table, security badges, resources docs, sources.yml link.

### 5.2 Version Bump
0.1.0 → 0.2.0 (minor: new capabilities added).

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| License | Apache-2.0 | Align with Ansvar ecosystem |
| Registry namespace | eu.ansvar/sigma-rules | DNS-authenticated, consistent |
| Staleness SLO | 14 days | Weekly refresh keeps us fresh |
| MCP prompts | Deferred | Tools + Resources sufficient for now |
| Drift detection | Skipped | SigmaHQ rules change by design |
| DB in git | Keep (14 MB < 20 MB) | Compliant with standards |
