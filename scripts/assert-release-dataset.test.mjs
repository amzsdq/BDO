import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import crypto from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { reconciliationDatasetFingerprint } from './reconciliation-fingerprint.mjs'

function fingerprint(value) { return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex') }
function fixture() {
  return {
    metadata: { generatedAt: '2026-09-23T00:00:00Z', supportedRegion: 'KR', sources: ['client', 'codex'], sourceRevision: 'client-sha-abc123', counts: { cooking: 1, alchemy: 1 } },
    items: {
      '10': { id: 10, nameKo: '요리', iconUrl: 'https://example.invalid/10.png' },
      '11': { id: 11, nameKo: '연금', iconUrl: 'https://example.invalid/11.png' },
      '20': { id: 20, nameKo: '재료', iconUrl: 'https://example.invalid/20.png' },
    },
    recipes: {
      cook: { id: 'cook', skill: 'cooking', outputItemId: 10, yield: { min: 1, max: 1 }, variants: [{ id: 'v1', inputs: [{ itemId: 20, count: 1 }] }] },
      alch: { id: 'alch', skill: 'alchemy', outputItemId: 11, yield: { min: 1, max: 1 }, variants: [{ id: 'v1', inputs: [{ itemId: 20, count: 1 }] }] },
    },
    recipesByOutput: { '10': ['cook'], '11': ['alch'] },
  }
}
function setup() {
  const dir = mkdtempSync(join(tmpdir(), 'bdo-release-gate-'))
  const datasetFile = join(dir, 'dataset.json'), reportFile = join(dir, 'report.json')
  const source = fixture()
  writeFileSync(datasetFile, JSON.stringify(source))
  writeFileSync(reportFile, JSON.stringify({ status: 'ZERO_UNEXPLAINED_DIFF', unresolved: [], clientRecipeGroups: 2, datasetFingerprint: reconciliationDatasetFingerprint(source) }))
  const promoted = spawnSync(process.execPath, ['scripts/promote-release-dataset.mjs', datasetFile, reportFile], { cwd: process.cwd(), encoding: 'utf8' })
  expect(promoted.status).toBe(0)
  return { datasetFile, reportFile }
}
function gate(datasetFile, reportFile) { return spawnSync(process.execPath, ['scripts/assert-release-dataset.mjs', datasetFile, reportFile], { cwd: process.cwd(), encoding: 'utf8' }) }

describe('final release gate', () => {
  it('accepts a promoted structurally valid dataset', () => { const { datasetFile, reportFile } = setup(); expect(gate(datasetFile, reportFile).status).toBe(0) })
  it('rejects unrecorded source provenance even with a recomputed dataset fingerprint', () => {
    const { datasetFile, reportFile } = setup(); const dataset = JSON.parse(readFileSync(datasetFile, 'utf8')); dataset.metadata.sourceRevision = 'unrecorded'; delete dataset.metadata.fingerprint; dataset.metadata.fingerprint = fingerprint(dataset); writeFileSync(datasetFile, JSON.stringify(dataset)); const result = gate(datasetFile, reportFile); expect(result.status).toBe(1); expect(result.stderr).toContain('sourceRevision')
  })
  it('rejects structural corruption even when fingerprint is recomputed', () => {
    const { datasetFile, reportFile } = setup(); const dataset = JSON.parse(readFileSync(datasetFile, 'utf8')); dataset.recipesByOutput['10'] = ['alch']; delete dataset.metadata.fingerprint; dataset.metadata.fingerprint = fingerprint(dataset); writeFileSync(datasetFile, JSON.stringify(dataset)); const result = gate(datasetFile, reportFile); expect(result.status).toBe(1); expect(result.stderr).toContain('structural validation failed')
  })
  it('rejects a canonical local icon path when the installed asset is missing', () => {
    const { datasetFile, reportFile } = setup(); const dataset = JSON.parse(readFileSync(datasetFile, 'utf8')); dataset.items['20'].iconPath = 'icons/20.webp'; delete dataset.items['20'].iconUrl; delete dataset.metadata.fingerprint; dataset.metadata.fingerprint = fingerprint(dataset); writeFileSync(datasetFile, JSON.stringify(dataset)); const result = gate(datasetFile, reportFile); expect(result.status).toBe(1); expect(result.stderr).toContain('canonical local icon assets are missing')
  })
  it('rejects a non-canonical local icon path even when it resolves to an existing repository file', () => {
    const { datasetFile, reportFile } = setup(); const dataset = JSON.parse(readFileSync(datasetFile, 'utf8')); dataset.items['20'].iconPath = '../../package.json'; delete dataset.items['20'].iconUrl; delete dataset.metadata.fingerprint; dataset.metadata.fingerprint = fingerprint(dataset); writeFileSync(datasetFile, JSON.stringify(dataset)); const result = gate(datasetFile, reportFile); expect(result.status).toBe(1); expect(result.stderr).toContain('non-canonical local icon paths')
  })
  it('rejects ZERO_UNEXPLAINED_DIFF evidence generated for different dataset content', () => {
    const { datasetFile, reportFile } = setup(); const dataset = JSON.parse(readFileSync(datasetFile, 'utf8')); dataset.items['20'].nameKo = '변경된 재료'; delete dataset.metadata.fingerprint; dataset.metadata.fingerprint = fingerprint(dataset); writeFileSync(datasetFile, JSON.stringify(dataset)); const result = gate(datasetFile, reportFile); expect(result.status).toBe(1); expect(result.stderr).toContain('reconciliation report belongs to different dataset content')
  })
})
