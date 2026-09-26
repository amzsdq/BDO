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
    const result = run(['a', 'b', 'c', 'd', 'e', 'f', 'ignored'])
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('usage: node scripts/assert-release-readiness.mjs')
  })

  it('fails closed when an option-like token is supplied', () => {
    const result = run(['a', 'b', 'c', 'd', 'e', '--mastery'])
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('usage: node scripts/assert-release-readiness.mjs')
  })

  it('accepts exactly six positional paths before evaluating evidence', () => {
    const result = run(['missing-dataset', 'missing-reconciliation', 'missing-catalog', 'missing-details', 'missing-evidence', 'missing-mastery'])
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('dataset not found: missing-dataset')
    expect(result.stderr).not.toContain('usage: node scripts/assert-release-readiness.mjs')
  })

  it('binds mastery evidence source revision to the promoted dataset snapshot', () => {
    const source = require('node:fs').readFileSync('scripts/assert-release-readiness.mjs', 'utf8')
    expect(source).toContain('evidence.sourceRevision !== dataset.metadata?.sourceRevision')
    expect(source).toContain('mastery source revision does not match dataset snapshot')
    expect(source).toContain('dataset client fingerprint is missing')
    expect(source).toContain('evidence.clientFingerprint !== dataset.metadata.clientFingerprint')
  })
})
