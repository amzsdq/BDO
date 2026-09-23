import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'

function run(args) {
  return spawnSync(process.execPath, ['scripts/assert-release-readiness.mjs', ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
  })
}

describe('assert-release-readiness CLI contract', () => {
  it('fails closed when an extra positional argument is supplied', () => {
    const result = run(['a', 'b', 'c', 'd', 'e', 'ignored'])
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('usage: node scripts/assert-release-readiness.mjs')
  })

  it('fails closed when an option-like token is supplied', () => {
    const result = run(['a', 'b', 'c', 'd', '--mastery'])
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('usage: node scripts/assert-release-readiness.mjs')
  })

  it('accepts exactly five positional paths before evaluating evidence', () => {
    const result = run(['missing-dataset', 'missing-reconciliation', 'missing-catalog', 'missing-evidence', 'missing-mastery'])
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('dataset not found: missing-dataset')
    expect(result.stderr).not.toContain('usage: node scripts/assert-release-readiness.mjs')
  })
})
