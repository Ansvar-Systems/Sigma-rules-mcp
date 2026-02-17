import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { afterAll, describe, expect, it } from 'vitest';

import { handleToolCall } from '../../src/tools/definitions.js';
import { closeDatabase } from '../../src/database/db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

const fixturesPath = join(__dirname, '../../fixtures/golden-tests.json');
const goldenTests: GoldenTest[] = JSON.parse(readFileSync(fixturesPath, 'utf-8'));

interface ToolCallResult {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

function parseResult(result: ToolCallResult) {
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
      const result = await handleToolCall(test.tool, test.args) as ToolCallResult;

      for (const assertion of test.assertions) {
        switch (assertion.type) {
          case 'result_not_empty': {
            expect(result.content).toBeDefined();
            expect(result.content.length).toBeGreaterThan(0);
            const text = result.content[0].text;
            expect(text.length).toBeGreaterThan(2);
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
            const found = assertion.values!.some((v) => text.includes(v.toLowerCase()));
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
            expect(result.content).toBeDefined();
            expect(result.content.length).toBeGreaterThan(0);
            break;
          }
        }
      }
    });
  }
});
