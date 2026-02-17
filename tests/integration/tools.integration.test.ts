import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { handleToolCall } from '../../src/tools/definitions.js';
import { closeDatabase, getDatabase } from '../../src/database/db.js';

interface ToolCallResult {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

interface SearchPayload {
  total: number;
  results: Array<{ id: string; title: string }>;
}

let sampleRuleId = '';
let sampleTechnique = '';
let sampleLogsource: { product?: string; service?: string; category?: string } = {};

function parse(result: ToolCallResult): any {
  expect(result.content.length).toBeGreaterThan(0);
  return JSON.parse(result.content[0].text);
}

describe('MCP tools integration', () => {
  beforeAll(async () => {
    const searchResult = (await handleToolCall('search_rules', {
      query: 'powershell',
      limit: 1,
    })) as ToolCallResult;

    expect(searchResult.isError).toBeFalsy();
    const searchPayload = parse(searchResult) as SearchPayload;
    expect(searchPayload.results.length).toBeGreaterThan(0);

    sampleRuleId = searchPayload.results[0].id;

    const db = getDatabase();
    const techniqueRow = db
      .prepare<{ technique_id: string }>(
        `SELECT technique_id FROM rule_techniques ORDER BY technique_id LIMIT 1`
      )
      .get();
    expect(techniqueRow).toBeTruthy();
    sampleTechnique = techniqueRow!.technique_id;

    const logsourceRow = db
      .prepare<{ product: string | null; service: string | null; category: string | null }>(
        `
          SELECT
            logsource_product AS product,
            logsource_service AS service,
            logsource_category AS category
          FROM rules
          WHERE logsource_product IS NOT NULL
          ORDER BY id
          LIMIT 1
        `
      )
      .get();

    expect(logsourceRow).toBeTruthy();
    sampleLogsource = {
      product: logsourceRow?.product ?? undefined,
      service: logsourceRow?.service ?? undefined,
      category: logsourceRow?.category ?? undefined,
    };
  });

  afterAll(() => {
    closeDatabase();
  });

  it('search_rules returns matching rules', async () => {
    const result = (await handleToolCall('search_rules', {
      query: 'powershell',
      limit: 5,
      product: 'windows',
    })) as ToolCallResult;

    expect(result.isError).toBeFalsy();
    const payload = parse(result);
    expect(payload.total).toBeGreaterThan(0);
    expect(payload.results[0]).toHaveProperty('id');
    expect(payload.results[0]).toHaveProperty('title');
    expect(payload.results[0]).toHaveProperty('snippet');
  });

  it('get_rule returns full YAML and detection YAML', async () => {
    const result = (await handleToolCall('get_rule', {
      rule_id: sampleRuleId,
    })) as ToolCallResult;

    expect(result.isError).toBeFalsy();
    const payload = parse(result);

    expect(payload.id).toBe(sampleRuleId);
    expect(typeof payload.full_yaml).toBe('string');
    expect(payload.full_yaml.length).toBeGreaterThan(50);
    expect(typeof payload.detection_yaml).toBe('string');
    expect(payload.detection_yaml.toLowerCase()).toContain('detection');
  });

  it('list_by_technique resolves rules for ATT&CK technique IDs', async () => {
    const result = (await handleToolCall('list_by_technique', {
      technique_id: sampleTechnique.toLowerCase(),
      limit: 10,
    })) as ToolCallResult;

    expect(result.isError).toBeFalsy();
    const payload = parse(result);

    expect(payload.technique_id).toBe(sampleTechnique);
    expect(payload.total).toBeGreaterThan(0);
    expect(Array.isArray(payload.results)).toBe(true);
  });

  it('list_by_logsource filters by product/service/category', async () => {
    const result = (await handleToolCall('list_by_logsource', {
      product: sampleLogsource.product,
      service: sampleLogsource.service,
      category: sampleLogsource.category,
      limit: 10,
    })) as ToolCallResult;

    expect(result.isError).toBeFalsy();
    const payload = parse(result);

    expect(payload.total).toBeGreaterThan(0);
    expect(payload.filters.product).toBe(sampleLogsource.product);
  });

  it('get_rule_statistics returns coverage metrics', async () => {
    const result = (await handleToolCall('get_rule_statistics', {})) as ToolCallResult;

    expect(result.isError).toBeFalsy();
    const payload = parse(result);

    expect(payload.overview.total_rules).toBeGreaterThanOrEqual(3000);
    expect(payload.overview.unique_techniques).toBeGreaterThan(100);
    expect(payload.tactic_coverage.length).toBeGreaterThanOrEqual(10);
  });

  it('returns errors for invalid requests', async () => {
    const missingRuleId = (await handleToolCall('get_rule', {})) as ToolCallResult;
    expect(missingRuleId.isError).toBe(true);

    const badLogsource = (await handleToolCall('list_by_logsource', {})) as ToolCallResult;
    expect(badLogsource.isError).toBe(true);

    const unknownTool = (await handleToolCall('not_a_tool', {})) as ToolCallResult;
    expect(unknownTool.isError).toBe(true);
  });
});
