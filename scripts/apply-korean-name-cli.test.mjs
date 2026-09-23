import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

function run(args) {
  return spawnSync(process.execPath, ['scripts/apply-korean-name-evidence.mjs', ...args], { cwd: process.cwd(), encoding: 'utf8' })
}

describe('Korean-name evidence CLI contract', () => {
  it('rejects too few paths', () => {
    const result = run(['dataset.json', 'evidence.json'])
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('usage: node scripts/apply-korean-name-evidence.mjs')
  })

  it('rejects trailing positional input', () => {
    const result = run(['dataset.json', 'evidence.json', 'out.json', 'ignored'])
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('usage: node scripts/apply-korean-name-evidence.mjs')
  })

  it('rejects option-like positional input', () => {
    const result = run(['dataset.json', '--evidence', 'out.json'])
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('usage: node scripts/apply-korean-name-evidence.mjs')
  })
})
