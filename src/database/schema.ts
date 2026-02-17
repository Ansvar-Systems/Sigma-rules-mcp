export const SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS rules (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT,
  description TEXT,
  author TEXT,
  level TEXT,
  date TEXT,
  modified TEXT,
  source_path TEXT NOT NULL UNIQUE,
  logsource_product TEXT COLLATE NOCASE,
  logsource_service TEXT COLLATE NOCASE,
  logsource_category TEXT COLLATE NOCASE,
  falsepositives_json TEXT NOT NULL DEFAULT '[]',
  tags_json TEXT NOT NULL DEFAULT '[]',
  license TEXT NOT NULL DEFAULT 'DRL',
  detection_yaml TEXT,
  full_yaml TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_rules_status ON rules(status);
CREATE INDEX IF NOT EXISTS idx_rules_level ON rules(level);
CREATE INDEX IF NOT EXISTS idx_rules_logsource_product ON rules(logsource_product);
CREATE INDEX IF NOT EXISTS idx_rules_logsource_service ON rules(logsource_service);
CREATE INDEX IF NOT EXISTS idx_rules_logsource_category ON rules(logsource_category);
CREATE INDEX IF NOT EXISTS idx_rules_logsource_triplet ON rules(logsource_product, logsource_service, logsource_category);

CREATE VIRTUAL TABLE IF NOT EXISTS rules_fts USING fts5(
  id UNINDEXED,
  title,
  description,
  content='rules',
  content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS rules_fts_insert AFTER INSERT ON rules BEGIN
  INSERT INTO rules_fts(rowid, id, title, description)
  VALUES (new.rowid, new.id, new.title, COALESCE(new.description, ''));
END;

CREATE TRIGGER IF NOT EXISTS rules_fts_delete AFTER DELETE ON rules BEGIN
  DELETE FROM rules_fts WHERE rowid = old.rowid;
END;

CREATE TRIGGER IF NOT EXISTS rules_fts_update AFTER UPDATE ON rules BEGIN
  DELETE FROM rules_fts WHERE rowid = old.rowid;
  INSERT INTO rules_fts(rowid, id, title, description)
  VALUES (new.rowid, new.id, new.title, COALESCE(new.description, ''));
END;

CREATE TABLE IF NOT EXISTS rule_techniques (
  rule_id TEXT NOT NULL,
  technique_id TEXT NOT NULL,
  PRIMARY KEY (rule_id, technique_id),
  FOREIGN KEY (rule_id) REFERENCES rules(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rule_techniques_technique_id ON rule_techniques(technique_id);
CREATE INDEX IF NOT EXISTS idx_rule_techniques_rule_id ON rule_techniques(rule_id);

CREATE TABLE IF NOT EXISTS rule_tactics (
  rule_id TEXT NOT NULL,
  tactic_id TEXT NOT NULL,
  PRIMARY KEY (rule_id, tactic_id),
  FOREIGN KEY (rule_id) REFERENCES rules(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rule_tactics_tactic_id ON rule_tactics(tactic_id);
CREATE INDEX IF NOT EXISTS idx_rule_tactics_rule_id ON rule_tactics(rule_id);

CREATE TABLE IF NOT EXISTS metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO metadata(key, value) VALUES ('schema_version', '1.0.0');
`;
