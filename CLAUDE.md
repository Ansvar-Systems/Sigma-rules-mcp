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

## Git Workflow

- **Never commit directly to `main`.** Always create a feature branch and open a Pull Request.
- Branch protection requires: verified signatures, PR review, and status checks to pass.
- Use conventional commit prefixes: `feat:`, `fix:`, `chore:`, `docs:`, etc.
