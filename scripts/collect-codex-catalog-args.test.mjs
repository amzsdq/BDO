import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'

function run(args) {
  return spawnSync(process.execPath, ['scripts/collect-codex-catalog.mjs', ...args], {
    cwd: process.cwd(), encoding: 'utf8',
  })
}

describe('collect-codex-catalog CLI contract', () => {
  it('rejects unknown flags before network access', () => {
    const result = run(['--bogus', 'value'])
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('unknown argument: --bogus')
  })

  it('rejects duplicate flags before network access', () => {
    const result = run(['--out', 'a.json', '--out', 'b.json'])
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('duplicate argument: --out')
  })

  it('rejects missing values instead of consuming another option', () => {
    const result = run(['--out', '--endpoint', 'https://example.invalid/{skill}'])
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('missing value for --out')
  })

  it('rejects malformed expected-count JSON before network access', () => {
    const result = run(['--expected-counts', '{bad-json}'])
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('--expected-counts must be valid JSON')
  })
})
