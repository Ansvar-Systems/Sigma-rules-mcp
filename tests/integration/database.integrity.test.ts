import { afterAll, describe, expect, it } from 'vitest';

import { closeDatabase, getDatabase, getDatabaseMetadata, getDatabaseStats } from '../../src/database/db.js';

describe('Database integrity', () => {
  afterAll(() => {
    closeDatabase();
  });

  it('metadata and row counts are consistent', () => {
    const db = getDatabase();
    const metadata = getDatabaseMetadata();

    const ruleCountRow = db.prepare<{ c: number }>('SELECT COUNT(*) AS c FROM rules').get();
    expect(ruleCountRow).toBeTruthy();

    const metadataRuleCount = Number(metadata.ingest_rule_count);
    expect(Number.isFinite(metadataRuleCount)).toBe(true);
    expect(ruleCountRow!.c).toBe(metadataRuleCount);

    const uniqueIdCount = db
      .prepare<{ c: number }>('SELECT COUNT(DISTINCT id) AS c FROM rules')
      .get();
    expect(uniqueIdCount!.c).toBe(ruleCountRow!.c);
  });

  it('has no missing detection block and no empty licenses', () => {
    const db = getDatabase();

    const detectionMissing = db
      .prepare<{ c: number }>(
        "SELECT COUNT(*) AS c FROM rules WHERE detection_yaml IS NULL OR detection_yaml = ''"
      )
      .get();
    expect(detectionMissing!.c).toBe(0);

    const emptyLicense = db
      .prepare<{ c: number }>(
        "SELECT COUNT(*) AS c FROM rules WHERE license IS NULL OR TRIM(license) = ''"
      )
      .get();
    expect(emptyLicense!.c).toBe(0);
  });

  it('stores ATT&CK techniques in normalized format', () => {
    const db = getDatabase();
    const rows = db
      .prepare<{ technique_id: string }>('SELECT DISTINCT technique_id FROM rule_techniques')
      .all();

    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(/^T\d{4}(?:\.\d{3})?$/.test(row.technique_id)).toBe(true);
    }
  });

  it('exposes expected indexes for techniques and logsource fields', () => {
    const db = getDatabase();
    const idxRows = db
      .prepare<{ name: string }>(`
        SELECT name
        FROM sqlite_master
        WHERE type = 'index'
          AND name IN (
            'idx_rule_techniques_technique_id',
            'idx_rule_techniques_rule_id',
            'idx_rules_logsource_product',
            'idx_rules_logsource_service',
            'idx_rules_logsource_category',
            'idx_rules_logsource_triplet'
          )
        ORDER BY name
      `)
      .all();

    expect(idxRows.map((row) => row.name)).toEqual([
      'idx_rule_techniques_rule_id',
      'idx_rule_techniques_technique_id',
      'idx_rules_logsource_category',
      'idx_rules_logsource_product',
      'idx_rules_logsource_service',
      'idx_rules_logsource_triplet',
    ]);
  });

  it('database stats API returns sane values', () => {
    const stats = getDatabaseStats();

    expect(stats.total_rules).toBeGreaterThanOrEqual(3000);
    expect(stats.rules_with_techniques).toBeGreaterThan(0);
    expect(stats.unique_techniques).toBeGreaterThan(100);
    expect(stats.unique_tactics).toBeGreaterThanOrEqual(10);
    expect(stats.unique_logsource_products).toBeGreaterThan(0);
  });
});
