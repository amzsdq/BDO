import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

function run(args) {
  return spawnSync(process.execPath, ['scripts/assert-release-dataset.mjs', ...args], { cwd: process.cwd(), encoding: 'utf8' })
}

describe('release dataset gate CLI contract', () => {
  it('rejects too few artifacts', () => {
    const result = run(['dataset.json'])
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('usage: node scripts/assert-release-dataset.mjs')
  })
  it('rejects trailing artifacts', () => {
    const result = run(['dataset.json', 'report.json', 'catalog.json', 'details.json', 'ignored'])
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('usage: node scripts/assert-release-dataset.mjs')
  })
  it('rejects option-like positional artifacts', () => {
    const result = run(['dataset.json', 'report.json', '--catalog', 'details.json'])
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('usage: node scripts/assert-release-dataset.mjs')
  })
})
