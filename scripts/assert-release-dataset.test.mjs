import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import crypto from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { reconciliationDatasetFingerprint } from './reconciliation-fingerprint.mjs'

function fingerprint(value) { return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex') }
function fixture() {
  return {
    metadata: { generatedAt: '2026-09-23T00:00:00Z', supportedRegion: 'KR', sources: ['client', 'codex'], sourceRevision: 'client-sha-abc123', clientFingerprint: 'sha256:' + 'a'.repeat(64), counts: { cooking: 1, alchemy: 1 } },
    items: {
      '10': { id: 10, nameKo: '요리', weightLT: 0.1, iconPath: 'icons/10.webp', iconUrl: 'https://example.invalid/10.png' },
      '11': { id: 11, nameKo: '연금', weightLT: 0.1, iconPath: 'icons/11.webp', iconUrl: 'https://example.invalid/11.png' },
      '20': { id: 20, nameKo: '재료', weightLT: 0.2, iconPath: 'icons/20.webp', iconUrl: 'https://example.invalid/20.png' },
    },
    recipes: {
      cook: { id: 'cook', skill: 'cooking', outputItemId: 10, yield: { min: 1, max: 1 }, variants: [{ id: 'v1', inputs: [{ itemId: 20, count: 1 }] }] },
      alch: { id: 'alch', skill: 'alchemy', outputItemId: 11, yield: { min: 1, max: 1 }, variants: [{ id: 'v1', inputs: [{ itemId: 20, count: 1 }] }] },
    },
    recipesByOutput: { '10': ['cook'], '11': ['alch'] },
  }
}
function completeCatalog() {
  return {
    schemaVersion: 2,
    source: 'BDO Codex KR',
    collectedAt: '2026-09-23T00:00:00.000Z',
    complete: true,
    catalogs: [
      { skill: 'cooking', recipeCount: 1, recipeIds: [101], complete: true, endpointUsed: 'https://bdocodex.com/query.php?a=recipes&type=culinary&l=kr', endpointFinalUrl: 'https://bdocodex.com/query.php?a=recipes&type=culinary&l=kr', endpointEvidence: { recordsReported: 1 }, countMatchesExpected: null },
      { skill: 'alchemy', recipeCount: 1, recipeIds: [201], complete: true, endpointUsed: 'https://bdocodex.com/query.php?a=recipes&type=alchemy&l=kr', endpointFinalUrl: 'https://bdocodex.com/query.php?a=recipes&type=alchemy&l=kr', endpointEvidence: { recordsReported: 1 }, countMatchesExpected: null },
    ],
  }
}
function setup(catalog = completeCatalog()) {
  const dir = mkdtempSync(join(tmpdir(), 'bdo-release-gate-'))
  const datasetFile = join(dir, 'dataset.json'), reportFile = join(dir, 'report.json'), catalogFile = join(dir, 'catalog.json')
  mkdirSync(join(dir, '..', 'icons'), { recursive: true })
  for (const id of [10, 11, 20]) writeFileSync(join(dir, '..', 'icons', `${id}.webp`), 'fixture')
  const source = fixture()
  writeFileSync(datasetFile, JSON.stringify(source))
  writeFileSync(reportFile, JSON.stringify({ status: 'ZERO_UNEXPLAINED_DIFF', unresolved: [], clientRecipeGroups: 2, clientRecipes: 2, codexLivePages: 2, codexLiveRecipeIds: [101, 201], datasetFingerprint: reconciliationDatasetFingerprint(source) }))
  writeFileSync(catalogFile, JSON.stringify(catalog))
  const promoted = spawnSync(process.execPath, ['scripts/promote-release-dataset.mjs', datasetFile, reportFile, catalogFile], { cwd: process.cwd(), encoding: 'utf8' })
  expect(promoted.status).toBe(0)
  return { datasetFile, reportFile, catalogFile }
}
function gate(datasetFile, reportFile, catalogFile) { return spawnSync(process.execPath, ['scripts/assert-release-dataset.mjs', datasetFile, reportFile, catalogFile], { cwd: process.cwd(), encoding: 'utf8' }) }

describe('final release gate', () => {
  it('accepts a promoted structurally valid dataset with independently complete Codex catalogs', () => { const files = setup(); expect(gate(files.datasetFile, files.reportFile, files.catalogFile).status).toBe(0) })
  it('accepts browser-captured POST scope evidence when server totals match the full id set', () => {
    const catalog = completeCatalog()
    for (const entry of catalog.catalogs) {
      entry.endpointUsed = 'https://bdocodex.com/query.php'
      entry.endpointFinalUrl = 'https://bdocodex.com/query.php'
      entry.endpointRequest = {
        method: 'POST',
        params: { a: 'recipes', type: entry.skill === 'cooking' ? 'culinary' : 'alchemy', l: 'kr' },
      }
      entry.endpointEvidence.acquisition = 'playwright-network-capture'
    }
    const files = setup(catalog)
    expect(gate(files.datasetFile, files.reportFile, files.catalogFile).status).toBe(0)
  })
  it('accepts an unpaginated captured full-array only when browser rendering cross-checks the same complete id count', () => {
    const catalog = completeCatalog()
    for (const entry of catalog.catalogs) {
      entry.endpointUsed = `https://bdocodex.com/query.php?a=recipes&type=${entry.skill === 'cooking' ? 'culinary' : 'alchemy'}&id=1&l=kr`
      entry.endpointFinalUrl = entry.endpointUsed
      entry.endpointRequest = {
        method: 'GET',
        params: { a: 'recipes', type: entry.skill === 'cooking' ? 'culinary' : 'alchemy', id: '1', l: 'kr' },
      }
      entry.endpointEvidence = {
        recordsReported: null,
        fullArrayRows: entry.recipeCount,
        renderedRecipeIds: entry.recipeCount,
        requestPaginationParametersPresent: false,
        completenessMode: 'unpaginated-full-array+rendered-id-crosscheck',
        acquisition: 'playwright-network-capture',
      }
    }
    const files = setup(catalog)
    expect(gate(files.datasetFile, files.reportFile, files.catalogFile).status).toBe(0)
  })
  it('rejects unpaginated full-array evidence when the rendered id cross-check is incomplete', () => {
    const catalog = completeCatalog()
    const entry = catalog.catalogs[0]
    entry.endpointRequest = { method: 'GET', params: { a: 'recipes', type: 'culinary', id: '1', l: 'kr' } }
    entry.endpointEvidence = {
      recordsReported: null,
      fullArrayRows: entry.recipeCount,
      renderedRecipeIds: 0,
      requestPaginationParametersPresent: false,
      completenessMode: 'unpaginated-full-array+rendered-id-crosscheck',
      acquisition: 'playwright-network-capture',
    }
    const files = setup(catalog)
    const result = gate(files.datasetFile, files.reportFile, files.catalogFile)
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('auditable completeness evidence')
  })
  it('rejects reconciliation evidence that omitted a client recipe', () => {
    const { datasetFile, reportFile, catalogFile } = setup(); const report = JSON.parse(readFileSync(reportFile, 'utf8')); report.clientRecipes = 1; writeFileSync(reportFile, JSON.stringify(report)); const result = gate(datasetFile, reportFile, catalogFile); expect(result.status).toBe(1); expect(result.stderr).toContain('client recipe count')
  })
  it('rejects unrecorded source provenance even with a recomputed dataset fingerprint', () => {
    const { datasetFile, reportFile, catalogFile } = setup(); const dataset = JSON.parse(readFileSync(datasetFile, 'utf8')); dataset.metadata.sourceRevision = 'unrecorded'; delete dataset.metadata.fingerprint; dataset.metadata.fingerprint = fingerprint(dataset); writeFileSync(datasetFile, JSON.stringify(dataset)); const result = gate(datasetFile, reportFile, catalogFile); expect(result.status).toBe(1); expect(result.stderr).toContain('sourceRevision')
  })
  it('rejects missing client fingerprint even with a recomputed dataset fingerprint', () => {
    const { datasetFile, reportFile, catalogFile } = setup(); const dataset = JSON.parse(readFileSync(datasetFile, 'utf8')); delete dataset.metadata.clientFingerprint; delete dataset.metadata.fingerprint; dataset.metadata.fingerprint = fingerprint(dataset); writeFileSync(datasetFile, JSON.stringify(dataset)); const result = gate(datasetFile, reportFile, catalogFile); expect(result.status).toBe(1); expect(result.stderr).toContain('clientFingerprint')
  })
  it('rejects structural corruption even when fingerprint is recomputed', () => {
    const { datasetFile, reportFile, catalogFile } = setup(); const dataset = JSON.parse(readFileSync(datasetFile, 'utf8')); dataset.recipesByOutput['10'] = ['alch']; delete dataset.metadata.fingerprint; dataset.metadata.fingerprint = fingerprint(dataset); writeFileSync(datasetFile, JSON.stringify(dataset)); const result = gate(datasetFile, reportFile, catalogFile); expect(result.status).toBe(1); expect(result.stderr).toContain('structural validation failed')
  })
  it('rejects remote-only icon metadata even when a remote fallback URL exists', () => {
    const { datasetFile, reportFile, catalogFile } = setup(); const dataset = JSON.parse(readFileSync(datasetFile, 'utf8')); delete dataset.items['20'].iconPath; delete dataset.metadata.fingerprint; dataset.metadata.fingerprint = fingerprint(dataset); writeFileSync(datasetFile, JSON.stringify(dataset)); const result = gate(datasetFile, reportFile, catalogFile); expect(result.status).toBe(1); expect(result.stderr).toContain('lack canonical local icon paths')
  })
  it('rejects a canonical local icon path when the installed asset is missing', () => {
    const { datasetFile, reportFile, catalogFile } = setup(); const dataset = JSON.parse(readFileSync(datasetFile, 'utf8')); dataset.items['20'].iconPath = 'icons/999.webp'; delete dataset.metadata.fingerprint; dataset.metadata.fingerprint = fingerprint(dataset); writeFileSync(datasetFile, JSON.stringify(dataset)); const result = gate(datasetFile, reportFile, catalogFile); expect(result.status).toBe(1); expect(result.stderr).toMatch(/canonical local icon paths|canonical local icon assets are missing/)
  })
  it('rejects a non-canonical local icon path even when it resolves to an existing repository file', () => {
    const { datasetFile, reportFile, catalogFile } = setup(); const dataset = JSON.parse(readFileSync(datasetFile, 'utf8')); dataset.items['20'].iconPath = '../../package.json'; delete dataset.metadata.fingerprint; dataset.metadata.fingerprint = fingerprint(dataset); writeFileSync(datasetFile, JSON.stringify(dataset)); const result = gate(datasetFile, reportFile, catalogFile); expect(result.status).toBe(1); expect(result.stderr).toContain('lack canonical local icon paths')
  })
  it('rejects ZERO_UNEXPLAINED_DIFF evidence generated for different dataset content', () => {
    const { datasetFile, reportFile, catalogFile } = setup(); const dataset = JSON.parse(readFileSync(datasetFile, 'utf8')); dataset.items['20'].nameKo = '변경된 재료'; delete dataset.metadata.fingerprint; dataset.metadata.fingerprint = fingerprint(dataset); writeFileSync(datasetFile, JSON.stringify(dataset)); const result = gate(datasetFile, reportFile, catalogFile); expect(result.status).toBe(1); expect(result.stderr).toContain('reconciliation report belongs to different dataset content')
  })
  it('rejects an incomplete Codex catalog even when reconciliation claims zero unexplained diff', () => {
    const { datasetFile, reportFile, catalogFile } = setup(); const catalog = completeCatalog(); catalog.complete = false; catalog.catalogs[0].complete = false; writeFileSync(catalogFile, JSON.stringify(catalog)); const result = gate(datasetFile, reportFile, catalogFile); expect(result.status).toBe(1); expect(result.stderr).toContain('Codex catalog completeness is not independently proven')
  })
  it('rejects catalog evidence when collectedAt is missing or invalid', () => {
    for (const collectedAt of [undefined, '', 'not-a-date']) { const { datasetFile, reportFile, catalogFile } = setup(); const catalog = completeCatalog(); catalog.collectedAt = collectedAt; writeFileSync(catalogFile, JSON.stringify(catalog)); const result = gate(datasetFile, reportFile, catalogFile); expect(result.status).toBe(1); expect(result.stderr).toContain('collectedAt timestamp') }
  })
  it('rejects a different Codex artifact after promotion even when recipe ids and counts still match', () => {
    const { datasetFile, reportFile, catalogFile } = setup(); const catalog = completeCatalog(); catalog.discoveredEndpointCandidates = ['https://example.invalid/semantically-irrelevant']; writeFileSync(catalogFile, JSON.stringify(catalog)); const result = gate(datasetFile, reportFile, catalogFile); expect(result.status).toBe(1); expect(result.stderr).toContain('artifact does not match promoted evidence')
  })
  it('rejects catalog evidence whose endpoint scope does not match the declared skill', () => {
    const { datasetFile, reportFile, catalogFile } = setup(); const catalog = completeCatalog(); catalog.catalogs[0].endpointFinalUrl = 'https://bdocodex.com/query.php?a=recipes&type=alchemy&l=kr'; writeFileSync(catalogFile, JSON.stringify(catalog)); const result = gate(datasetFile, reportFile, catalogFile); expect(result.status).toBe(1); expect(result.stderr).toMatch(/artifact does not match promoted evidence|endpoint scope is invalid/)
  })
  it('rejects reconciliation performed against fewer Codex pages than the complete catalog', () => {
    const { datasetFile, reportFile, catalogFile } = setup(); const report = JSON.parse(readFileSync(reportFile, 'utf8')); report.codexLivePages = 1; writeFileSync(reportFile, JSON.stringify(report)); const result = gate(datasetFile, reportFile, catalogFile); expect(result.status).toBe(1); expect(result.stderr).toContain('does not match independently complete catalog count')
  })
  it('rejects a same-sized reconciliation built from different Codex recipe ids', () => {
    const { datasetFile, reportFile, catalogFile } = setup(); const report = JSON.parse(readFileSync(reportFile, 'utf8')); report.codexLiveRecipeIds = [102, 201]; writeFileSync(reportFile, JSON.stringify(report)); const result = gate(datasetFile, reportFile, catalogFile); expect(result.status).toBe(1); expect(result.stderr).toContain('recipe-id set does not match')
  })
})