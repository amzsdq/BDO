import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { reconciliationDatasetFingerprint } from './reconciliation-fingerprint.mjs'

function fixture() {
  return {
    metadata: { generatedAt: '2026-09-23T00:00:00Z', supportedRegion: 'KR', sources: ['client', 'codex'], sourceRevision: 'client-sha-abc123', clientFingerprint: 'sha256:' + 'a'.repeat(64), counts: { cooking: 1, alchemy: 1 } },
    items: { '10': { id: 10, nameKo: '요리', iconPath: 'icons/10.webp', iconUrl: 'https://example.invalid/10.png' }, '11': { id: 11, nameKo: '연금', iconPath: 'icons/11.webp', iconUrl: 'https://example.invalid/11.png' }, '20': { id: 20, nameKo: '재료', weightLT: 0.2, iconPath: 'icons/20.webp', iconUrl: 'https://example.invalid/20.png' } },
    recipes: {
      cook: { id: 'cook', skill: 'cooking', outputItemId: 10, yield: { min: 1, max: 1 }, variants: [{ id: 'v1', inputs: [{ itemId: 20, count: 1 }] }] },
      alch: { id: 'alch', skill: 'alchemy', outputItemId: 11, yield: { min: 1, max: 1 }, variants: [{ id: 'v1', inputs: [{ itemId: 20, count: 1 }] }] },
    },
    recipesByOutput: { '10': ['cook'], '11': ['alch'] },
  }
}
function reportFor(dataset, overrides = {}) { return { status: 'ZERO_UNEXPLAINED_DIFF', unresolved: [], clientRecipeGroups: 2, clientRecipes: Object.keys(dataset.recipes || {}).length, codexLivePages: 2, codexLiveRecipeIds: [101, 201], datasetFingerprint: reconciliationDatasetFingerprint(dataset), ...overrides } }
function catalog(overrides = {}) { return { source: 'BDO Codex KR', collectedAt: '2026-09-23T00:00:00.000Z', complete: true, catalogs: [{ skill: 'cooking', complete: true, recipeCount: 1, recipeIds: [101], endpointUsed: 'https://bdocodex.com/query.php?a=recipes&type=culinary&l=kr', endpointFinalUrl: 'https://bdocodex.com/query.php?a=recipes&type=culinary&l=kr', endpointEvidence: { recordsReported: 1 }, countMatchesExpected: null }, { skill: 'alchemy', complete: true, recipeCount: 1, recipeIds: [201], endpointUsed: 'https://bdocodex.com/query.php?a=recipes&type=alchemy&l=kr', endpointFinalUrl: 'https://bdocodex.com/query.php?a=recipes&type=alchemy&l=kr', endpointEvidence: { recordsReported: 1 }, countMatchesExpected: null }], ...overrides } }
function run(dataset, reconciliation, catalogEvidence = catalog(), missingIconId = null) {
  const root = mkdtempSync(join(tmpdir(), 'bdo-promote-')), dir = join(root, 'data'), iconDir = join(root, 'icons'); mkdirSync(dir); mkdirSync(iconDir)
  const datasetFile = join(dir, 'dataset.json'), reportFile = join(dir, 'report.json'), catalogFile = join(dir, 'catalog.json'), outFile = join(dir, 'promoted.json')
  for (const id of [10, 11, 20]) writeFileSync(join(iconDir, `${id}.webp`), 'fixture'); if (missingIconId != null) rmSync(join(iconDir, `${missingIconId}.webp`), { force: true })
  writeFileSync(datasetFile, JSON.stringify(dataset)); writeFileSync(reportFile, JSON.stringify(reconciliation)); writeFileSync(catalogFile, JSON.stringify(catalogEvidence)); const result = spawnSync(process.execPath, ['scripts/promote-release-dataset.mjs', datasetFile, reportFile, catalogFile, outFile], { cwd: process.cwd(), encoding: 'utf8' }); return { result, promoted: result.status === 0 ? JSON.parse(readFileSync(outFile, 'utf8')) : null }
}

describe('release dataset promotion', () => {
  it('promotes only reconciled, resolved Cooking+Alchemy data with complete catalog evidence', () => {
    const dataset = fixture(); const { result, promoted } = run(dataset, reportFor(dataset)); expect(result.status).toBe(0); expect(promoted.metadata.status).toBe('COMPLETE_VERIFIED'); expect(promoted.metadata.reconciliationStatus).toBe('ZERO_UNEXPLAINED_DIFF'); expect(promoted.metadata.codexCatalogPages).toBe(2); expect(promoted.metadata.fingerprint).toMatch(/^[0-9a-f]{64}$/)
  })
  it('blocks promotion when reconciliation omits a client recipe even if output-group count looks plausible', () => {
    const dataset = fixture(); const result = run(dataset, reportFor(dataset, { clientRecipeGroups: 2, clientRecipes: 1 })); expect(result.result.status).toBe(1); expect(result.result.stderr).toContain('client recipe count does not match dataset')
  })
  it('blocks promotion when canonical client source revision is missing or unrecorded', () => {
    for (const sourceRevision of [undefined, '', '  ', 'unrecorded', 'UNRECORDED']) { const dataset = fixture(); dataset.metadata.sourceRevision = sourceRevision; const attempt = run(dataset, reportFor(dataset)); expect(attempt.result.status).toBe(1); expect(attempt.result.stderr).toContain('sourceRevision') }
  })
  it('blocks promotion when client fingerprint is missing', () => {
    const dataset = fixture(); delete dataset.metadata.clientFingerprint; const attempt = run(dataset, reportFor(dataset)); expect(attempt.result.status).toBe(1); expect(attempt.result.stderr).toContain('clientFingerprint')
  })
  it('blocks promotion when a local icon path is not canonical for its item id', () => {
    const dataset = fixture(); dataset.items['20'].iconPath = '../../package.json'; const attempt = run(dataset, reportFor(dataset)); expect(attempt.result.status).toBe(1); expect(attempt.result.stderr).toContain('lack canonical local icon paths')
  })
  it('blocks promotion when an item has only remote icon fallback metadata', () => {
    const dataset = fixture(); delete dataset.items['20'].iconPath; const unresolved = run(dataset, reportFor(dataset)); expect(unresolved.result.status).toBe(1); expect(unresolved.result.stderr).toContain('lack canonical local icon paths')
  })
  it('blocks promotion when canonical icon metadata exists but the installed asset is missing', () => {
    const dataset = fixture(); const attempt = run(dataset, reportFor(dataset), catalog(), 20); expect(attempt.result.status).toBe(1); expect(attempt.result.stderr).toContain('canonical local icon assets are missing')
  })
  it('blocks promotion when reconciliation is unresolved', () => {
    const clean = fixture(); const diff = run(clean, reportFor(clean, { status: 'INCOMPLETE_REVIEW', unresolved: [{ kind: 'MISSING' }] })); expect(diff.result.status).toBe(1); expect(diff.result.stderr).toContain('not ZERO_UNEXPLAINED_DIFF')
  })
  it('blocks a stale ZERO_UNEXPLAINED_DIFF report even when recipe count is unchanged', () => {
    const dataset = fixture(); const stale = reportFor(dataset); dataset.items['20'].nameKo = '변경된 재료'; const result = run(dataset, stale); expect(result.result.status).toBe(1); expect(result.result.stderr).toContain('different dataset content')
  })
  it('blocks COMPLETE_VERIFIED promotion when catalog completeness is unproven', () => {
    const dataset = fixture(); const result = run(dataset, reportFor(dataset), catalog({ complete: false })); expect(result.result.status).toBe(1); expect(result.result.stderr).toContain('catalog completeness is not independently proven')
  })
  it('blocks promotion when Codex catalog collection time is missing or invalid', () => {
    const dataset = fixture(); for (const collectedAt of [undefined, '', 'not-a-date']) { const evidence = catalog({ collectedAt }); const result = run(dataset, reportFor(dataset), evidence); expect(result.result.status).toBe(1); expect(result.result.stderr).toContain('collectedAt timestamp') }
  })
  it('blocks promotion when catalog endpoint scope does not match its declared skill', () => {
    const dataset = fixture(); const evidence = catalog(); evidence.catalogs[0].endpointUsed = 'https://bdocodex.com/query.php?a=recipes&type=alchemy&l=kr'; const result = run(dataset, reportFor(dataset), evidence); expect(result.result.status).toBe(1); expect(result.result.stderr).toContain('endpoint scope is invalid')
  })
  it('blocks promotion when reconciliation covers fewer pages than the complete catalog', () => {
    const dataset = fixture(); const result = run(dataset, reportFor(dataset, { codexLivePages: 1 })); expect(result.result.status).toBe(1); expect(result.result.stderr).toContain('does not match independently complete catalog count')
  })
  it('blocks a same-sized reconciliation built from different Codex recipe ids', () => {
    const dataset = fixture(); const result = run(dataset, reportFor(dataset, { codexLiveRecipeIds: [102, 201] })); expect(result.result.status).toBe(1); expect(result.result.stderr).toContain('recipe-id set does not match')
  })
})
