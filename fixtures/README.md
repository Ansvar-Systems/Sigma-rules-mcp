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
| `result_not_empty` | Response is not null/empty | - |
| `min_results` | At least N results returned | `value` |
| `text_contains` | Response text includes ALL substrings | `values` |
| `any_result_contains` | At least one result contains at least one value | `values` |
| `fields_present` | Response JSON has these keys | `fields` |
| `handles_gracefully` | Does not throw; returns error or empty gracefully | - |

### Adding tests

Add new entries to `golden-tests.json`. Run `npm run test:contract` to verify.

Minimum: 10 tests for development, 25 for production.
