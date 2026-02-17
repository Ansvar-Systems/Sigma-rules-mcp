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
