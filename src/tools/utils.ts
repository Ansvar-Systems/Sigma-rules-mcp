export interface RuleSummary {
  id: string;
  title: string;
  status: string | null;
  level: string | null;
  description: string | null;
  logsource: {
    product: string | null;
    service: string | null;
    category: string | null;
  };
}

export const ATTACK_TACTIC_NAMES: Record<string, string> = {
  reconnaissance: 'Reconnaissance',
  'resource-development': 'Resource Development',
  'initial-access': 'Initial Access',
  execution: 'Execution',
  persistence: 'Persistence',
  'privilege-escalation': 'Privilege Escalation',
  'defense-evasion': 'Defense Evasion',
  'credential-access': 'Credential Access',
  discovery: 'Discovery',
  'lateral-movement': 'Lateral Movement',
  collection: 'Collection',
  'command-and-control': 'Command and Control',
  exfiltration: 'Exfiltration',
  impact: 'Impact',
};

export function tacticDisplayName(tacticId: string): string {
  return ATTACK_TACTIC_NAMES[tacticId] || tacticId;
}

export function normalizeTechniqueId(input: string): string {
  const trimmed = input.trim();
  const fromTag = trimmed.replace(/^attack\./i, '');
  const upper = fromTag.toUpperCase();
  const match = upper.match(/T\d{4}(?:\.\d{3})?/);
  return match ? match[0] : upper;
}

export function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/**
 * Sanitize user input for FTS5 MATCH queries.
 * Strips dangerous syntax while preserving AND/OR/NOT, prefix*, and "phrases".
 */
export function sanitizeFtsQuery(input: string): string {
  let q = input.trim();
  if (!q) return '';

  // Strip NEAR(...) operator — not user-facing
  q = q.replace(/NEAR\s*\(/gi, '').replace(/,\s*\d+\s*\)/g, ')');

  // Strip column filter syntax (word: or word :)
  q = q.replace(/\b\w+\s*:/g, '');

  // Balance double quotes — strip all if unbalanced
  const quoteCount = (q.match(/"/g) || []).length;
  if (quoteCount % 2 !== 0) {
    q = q.replace(/"/g, '');
  }

  // Strip parentheses if unbalanced
  const openParens = (q.match(/\(/g) || []).length;
  const closeParens = (q.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    q = q.replace(/[()]/g, '');
  }

  return q.trim();
}
