import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { reconciliationDatasetFingerprint } from './reconciliation-fingerprint.mjs'

function fixture() {
  return {
    metadata: { generatedAt: '2026-09-23T00:00:00Z', supportedRegion: 'KR', sources: ['client', 'codex'], counts: { cooking: 1, alchemy: 1 } },
    items: { '10': { id: 10, nameKo: '요리', iconUrl: 'https://example.invalid/10.png' }, '11': { id: 11, nameKo: '연금', iconUrl: 'https://example.invalid/11.png' }, '20': { id: 20, nameKo: '재료', iconUrl: 'https://example.invalid/20.png' } },
    recipes: {
      cook: { id: 'cook', skill: 'cooking', outputItemId: 10, yield: { min: 1, max: 1 }, variants: [{ id: 'v1', inputs: [{ itemId: 20, count: 1 }] }] },
      alch: { id: 'alch', skill: 'alchemy', outputItemId: 11, yield: { min: 1, max: 1 }, variants: [{ id: 'v1', inputs: [{ itemId: 20, count: 1 }] }] },
    },
    recipesByOutput: { '10': ['cook'], '11': ['alch'] },
  }
}
function reportFor(dataset, overrides = {}) { return { status: 'ZERO_UNEXPLAINED_DIFF', unresolved: [], clientRecipeGroups: 2, datasetFingerprint: reconciliationDatasetFingerprint(dataset), ...overrides } }
function run(dataset, reconciliation) {
  const dir = mkdtempSync(join(tmpdir(), 'bdo-promote-')); const datasetFile = join(dir, 'dataset.json'), reportFile = join(dir, 'report.json'), outFile = join(dir, 'promoted.json')
  writeFileSync(datasetFile, JSON.stringify(dataset)); writeFileSync(reportFile, JSON.stringify(reconciliation)); const result = spawnSync(process.execPath, ['scripts/promote-release-dataset.mjs', datasetFile, reportFile, outFile], { cwd: process.cwd(), encoding: 'utf8' }); return { result, promoted: result.status === 0 ? JSON.parse(readFileSync(outFile, 'utf8')) : null }
}

describe('release dataset promotion', () => {
  it('promotes only reconciled, resolved Cooking+Alchemy data and writes a fresh fingerprint', () => {
    const dataset = fixture(); const { result, promoted } = run(dataset, reportFor(dataset)); expect(result.status).toBe(0); expect(promoted.metadata.status).toBe('COMPLETE_VERIFIED'); expect(promoted.metadata.reconciliationStatus).toBe('ZERO_UNEXPLAINED_DIFF'); expect(promoted.metadata.fingerprint).toMatch(/^[0-9a-f]{64}$/)
  })
  it('blocks promotion when reconciliation or release assets are unresolved', () => {
    const dataset = fixture(); delete dataset.items['20'].iconUrl; const unresolved = run(dataset, reportFor(dataset)); expect(unresolved.result.status).toBe(1); expect(unresolved.result.stderr).toContain('no icon resolution result')
    const clean = fixture(); const diff = run(clean, reportFor(clean, { status: 'INCOMPLETE_REVIEW', unresolved: [{ kind: 'MISSING' }] })); expect(diff.result.status).toBe(1); expect(diff.result.stderr).toContain('not ZERO_UNEXPLAINED_DIFF')
  })
  it('blocks a stale ZERO_UNEXPLAINED_DIFF report even when recipe count is unchanged', () => {
    const dataset = fixture(); const stale = reportFor(dataset); dataset.items['20'].nameKo = '변경된 재료'; const result = run(dataset, stale); expect(result.result.status).toBe(1); expect(result.result.stderr).toContain('different dataset content')
  })
})
