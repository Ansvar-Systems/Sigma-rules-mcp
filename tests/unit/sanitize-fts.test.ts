import { describe, expect, it } from 'vitest';
import { sanitizeFtsQuery } from '../../src/tools/utils.js';

describe('sanitizeFtsQuery', () => {
  it('passes through simple terms', () => {
    expect(sanitizeFtsQuery('mimikatz')).toBe('mimikatz');
  });

  it('preserves AND/OR/NOT operators', () => {
    expect(sanitizeFtsQuery('powershell AND execution')).toBe('powershell AND execution');
  });

  it('preserves prefix wildcards', () => {
    expect(sanitizeFtsQuery('mimi*')).toBe('mimi*');
  });

  it('strips unbalanced double quotes', () => {
    expect(sanitizeFtsQuery('"unbalanced')).toBe('unbalanced');
  });

  it('preserves balanced phrase queries', () => {
    expect(sanitizeFtsQuery('"lateral movement"')).toBe('"lateral movement"');
  });

  it('strips unbalanced parentheses', () => {
    expect(sanitizeFtsQuery('(mimikatz')).toBe('mimikatz');
    expect(sanitizeFtsQuery('mimikatz)')).toBe('mimikatz');
  });

  it('strips NEAR operator (not user-facing)', () => {
    expect(sanitizeFtsQuery('NEAR(a b)')).toBe('a b');
  });

  it('handles empty and whitespace-only input', () => {
    expect(sanitizeFtsQuery('')).toBe('');
    expect(sanitizeFtsQuery('   ')).toBe('');
  });

  it('strips column filter syntax (colon prefix)', () => {
    expect(sanitizeFtsQuery('title:mimikatz')).toBe('mimikatz');
  });

  it('strips spaced column filter syntax', () => {
    expect(sanitizeFtsQuery('title : mimikatz')).toBe('mimikatz');
  });
});
