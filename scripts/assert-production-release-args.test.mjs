import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const run = (args) => spawnSync(process.execPath, ['scripts/assert-production-release.mjs', ...args], { cwd: process.cwd(), encoding: 'utf8' });

describe('production release gate CLI contract', () => {
  it('rejects the legacy five-artifact invocation without E2E evidence', () => {
    const result = run(['dataset.json', 'report.json', 'catalog.json', 'mastery-evidence.json', 'mastery.json']);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('<e2e-release-evidence.json>');
  });

  it('rejects option-like positional artifacts', () => {
    const result = run(['dataset.json', 'report.json', 'catalog.json', 'mastery-evidence.json', 'mastery.json', '--e2e']);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('usage: node scripts/assert-production-release.mjs');
  });
});
