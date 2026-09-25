import { describe, expect, it } from 'vitest'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

function unverifiedDatasetFile() {
  const dir = mkdtempSync(join(tmpdir(), 'bdo-production-boundary-'))
  const file = join(dir, 'dataset.json')
  writeFileSync(file, JSON.stringify({
    metadata: {},
    items: {
      '10': { id: 10, nameKo: '임의 이름' },
    },
  }))
  return file
}

function run(script, args) {
  return spawnSync(process.execPath, [script, ...args], { cwd: process.cwd(), encoding: 'utf8' })
}

describe('strict production boundary CLIs', () => {
  it('final release rejects unverified Korean names before delegating to legacy gates', () => {
    const dataset = unverifiedDatasetFile()
    const result = run('scripts/assert-production-release.mjs', [dataset, 'missing-reconciliation.json', 'missing-catalog.json', 'missing-mastery-evidence.json', 'missing-mastery.json', 'missing-e2e-release-evidence.json'])
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Korean names are not verified')
  })

  it('standard promotion rejects unverified Korean names before delegating to legacy promotion', () => {
    const dataset = unverifiedDatasetFile()
    const result = run('scripts/promote-production-dataset.mjs', [dataset, 'missing-reconciliation.json', 'missing-catalog.json'])
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Korean names are not verified')
  })

  it('rejects extra release arguments instead of silently ignoring them', () => {
    const dataset = unverifiedDatasetFile()
    const result = run('scripts/assert-production-release.mjs', [dataset, 'a', 'b', 'c', 'd', 'extra'])
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('usage:')
  })

  it('rejects option-like promotion arguments instead of treating them as paths', () => {
    const dataset = unverifiedDatasetFile()
    const result = run('scripts/promote-production-dataset.mjs', [dataset, 'a', '--catalog'])
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('usage:')
  })
})
