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
- CI workflow: added concurrency control, SBOM, contract tests job, lint
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
