import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

function run(dataset, manifest, review) {
  const dir = mkdtempSync(join(tmpdir(), 'bdo-reconcile-'))
  const datasetPath = join(dir, 'dataset.json'), codexPath = join(dir, 'codex.json'), reviewPath = join(dir, 'review.json'), reportPath = join(dir, 'report.json')
  writeFileSync(datasetPath, JSON.stringify(dataset)); writeFileSync(codexPath, JSON.stringify(manifest))
  const argv = ['scripts/reconcile-codex.mjs', '--dataset', datasetPath, '--codex', codexPath]
  if (review) { writeFileSync(reviewPath, JSON.stringify(review)); argv.push('--review', reviewPath) }
  argv.push('--out', reportPath)
  const result = spawnSync(process.execPath, argv, { cwd: process.cwd(), encoding: 'utf8' })
  return { exitCode: result.status, report: JSON.parse(readFileSync(reportPath, 'utf8')) }
}

const dataset = { items: { '10': { id: 10, nameKo: '결과' }, '20': { id: 20, nameKo: '재료' } }, recipes: { r: { id: 'r', skill: 'cooking', outputItemId: 10, variants: [{ id: 'v1', inputs: [{ itemId: 20, count: 2 }] }] } } }
const matchingManifest = { recipes: [{ recipeId: 999, skill: 'cooking', outputItemId: 10, titleKo: '결과', ingredients: [{ itemId: 20, name: '다른 표기여도 ID가 우선', count: 2 }] }] }
const mismatchManifest = { recipes: [{ recipeId: 999, skill: 'cooking', outputItemId: 10, titleKo: '결과', ingredients: [{ itemId: 20, name: '재료', count: 3 }] }] }

describe('Codex reconciliation', () => {
  it('earns ZERO_UNEXPLAINED_DIFF when canonical item ids and counts agree', () => {
    const { exitCode, report } = run(dataset, matchingManifest)
    expect(exitCode).toBe(0); expect(report.status).toBe('ZERO_UNEXPLAINED_DIFF'); expect(report.unresolved).toEqual([]); expect(report.codexLiveRecipeIds).toEqual([999]); expect(report.codexAccountedRecipeIds).toEqual([999])
    expect(report.clientRecipes).toBe(1)
  })
  it('reports a deterministic signature mismatch when canonical ingredient counts differ', () => {
    const { exitCode, report } = run(dataset, mismatchManifest)
    expect(exitCode).toBe(2); expect(report.status).toBe('INCOMPLETE_REVIEW'); expect(report.unresolved.some((entry) => entry.kind === 'SIGNATURE_MISMATCH')).toBe(true)
  })
  it('rejects a bare key waiver without matching kind and evidence', () => {
    const key = 'SIGNATURE:999:cooking:item:10'
    const { exitCode, report } = run(dataset, mismatchManifest, { acceptedDiffs: [{ key }] })
    expect(exitCode).toBe(2)
    expect(report.acceptedDiffKeys).toEqual([])
    expect(report.reviewErrors.length).toBeGreaterThan(0)
    expect(report.unresolved).toEqual(expect.arrayContaining([expect.objectContaining({ key })]))
  })
  it('accepts current directional diffs only with matching kind, rationale, evidence and reviewedAt', () => {
    const signatureKey = 'SIGNATURE:999:cooking:item:10'
    const clientVariantKey = 'CLIENT_VARIANT_ONLY:r:v1:cooking:item:10'
    const evidence = ['https://bdocodex.com/kr/']
    const reviewedAt = '2026-09-23T00:00:00Z'
    const review = { acceptedDiffs: [
      { key: signatureKey, kind: 'SIGNATURE_MISMATCH', rationale: 'Verified Codex-side exception against source evidence.', evidence, reviewedAt },
      { key: clientVariantKey, kind: 'CLIENT_VARIANT_ONLY', rationale: 'Verified client-side exception against source evidence.', evidence, reviewedAt },
    ] }
    const { exitCode, report } = run(dataset, mismatchManifest, review)
    expect(exitCode).toBe(0)
    expect(report.status).toBe('ZERO_UNEXPLAINED_DIFF')
    expect(report.acceptedDiffKeys).toEqual([clientVariantKey, signatureKey].sort())
    expect(report.reviewErrors).toEqual([])
    expect(report.unresolved).toEqual([])
  })
  it('blocks a stale waiver key even when the current graph has no diffs', () => {
    const review = { acceptedDiffs: [{ key: 'SIGNATURE:old:cooking:item:10', kind: 'SIGNATURE_MISMATCH', rationale: 'Historical exception with sufficient rationale.', evidence: ['https://bdocodex.com/kr/'], reviewedAt: '2026-09-23T00:00:00Z' }] }
    const { exitCode, report } = run(dataset, matchingManifest, review)
    expect(exitCode).toBe(2)
    expect(report.status).toBe('INCOMPLETE_REVIEW')
    expect(report.reviewErrors[0]).toMatch(/not present in current reconciliation/)
  })
  it('blocks a client alternative variant that has no Codex counterpart', () => {
    const withExtraVariant = structuredClone(dataset)
    withExtraVariant.recipes.r.variants.push({ id: 'v2', inputs: [{ itemId: 20, count: 3 }] })
    const { exitCode, report } = run(withExtraVariant, matchingManifest)
    expect(exitCode).toBe(2)
    expect(report.unresolved).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'CLIENT_VARIANT_ONLY', variantId: 'v2' })]))
  })
  it('accepts multiple alternatives when both signature sets are fully matched', () => {
    const withAlternative = structuredClone(dataset)
    withAlternative.recipes.r.variants.push({ id: 'v2', inputs: [{ itemId: 20, count: 3 }] })
    const manifest = { recipes: [...matchingManifest.recipes, { recipeId: 1001, skill: 'cooking', outputItemId: 10, titleKo: '결과', ingredients: [{ itemId: 20, count: 3 }] }] }
    const { exitCode, report } = run(withAlternative, manifest)
    expect(exitCode).toBe(0)
    expect(report.status).toBe('ZERO_UNEXPLAINED_DIFF')
    expect(report.codexLiveRecipeIds).toEqual([999, 1001])
  })
  it('binds a variant signature to its explicit sourceRecipeId instead of any same-output Codex route', () => {
    const bound = structuredClone(dataset)
    bound.recipes.r.variants[0].sourceRecipeId = 999
    const manifest = { recipes: [
      { recipeId: 999, skill: 'cooking', outputItemId: 10, titleKo: '결과', ingredients: [{ itemId: 20, count: 3 }] },
      { recipeId: 1001, skill: 'cooking', outputItemId: 10, titleKo: '결과', ingredients: [{ itemId: 20, count: 2 }] },
    ] }
    const { exitCode, report } = run(bound, manifest)
    expect(exitCode).toBe(2)
    expect(report.unresolved).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'CLIENT_VARIANT_ONLY', variantId: 'v1', sourceRecipeId: 999, clientSignature: '#20:2', codexSignatures: ['#20:3'] }),
    ]))
  })
  it('accepts an explicit sourceRecipeId when that exact source route signature matches', () => {
    const bound = structuredClone(dataset)
    bound.recipes.r.variants[0].sourceRecipeId = 999
    const { exitCode, report } = run(bound, matchingManifest)
    expect(exitCode).toBe(0); expect(report.status).toBe('ZERO_UNEXPLAINED_DIFF')
  })
  it('keeps every client recipe sharing an output instead of overwriting the earlier recipe', () => {
    const withTwoRecipes = structuredClone(dataset)
    withTwoRecipes.recipes.r2 = { id: 'r2', skill: 'cooking', outputItemId: 10, variants: [{ id: 'v1', inputs: [{ itemId: 20, count: 3 }] }] }
    const { exitCode, report } = run(withTwoRecipes, matchingManifest)
    expect(exitCode).toBe(2)
    expect(report.clientRecipeGroups).toBe(1)
    expect(report.clientRecipes).toBe(2)
    expect(report.unresolved).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'CLIENT_VARIANT_ONLY', recipeId: 'r2', clientSignature: '#20:3' }),
    ]))
  })
  it('keeps supplemental live routes in reconciliation but out of catalog accounting', () => {
    const manifest = { schemaVersion: 2, complete: true, unresolvedCount: 0, recipes: [
      { ...matchingManifest.recipes[0], catalogListed: true },
      { ...matchingManifest.recipes[0], recipeId: 1001, catalogListed: false, discovery: 'catalog-gap-probe' },
    ] }
    const { exitCode, report } = run(dataset, manifest)
    expect(exitCode).toBe(0)
    expect(report.codexAccountedRecipeIds).toEqual([999])
    expect(report.codexSupplementalRecipeIds).toEqual([1001])
    expect(report.codexLiveRecipeIds).toEqual([999, 1001])
    expect(report.codexSupplementalPages).toBe(1)
  })
  it('keeps unavailable Codex recipes out of live completeness diffs and id evidence', () => {
    const { exitCode, report } = run(dataset, { recipes: [...matchingManifest.recipes, { recipeId: 1000, skill: 'alchemy', outputItemId: 77, titleKo: '퇴역', available: false, ingredients: [] }] })
    expect(exitCode).toBe(0); expect(report.status).toBe('ZERO_UNEXPLAINED_DIFF'); expect(report.codexDisabledPages).toBe(1); expect(report.codexLiveRecipeIds).toEqual([999]); expect(report.codexAccountedRecipeIds).toEqual([999, 1000])
  })
  it('understands schema-v2 unavailable status without legacy available=false', () => {
    const manifest = { schemaVersion: 2, complete: true, unresolvedCount: 0, recipes: [...matchingManifest.recipes, { recipeId: 1000, skill: 'alchemy', status: 'unavailable', ingredients: [], baseOutputs: [], randomOutputs: [] }] }
    const { exitCode, report } = run(dataset, manifest)
    expect(exitCode).toBe(0); expect(report.codexDisabledPages).toBe(1); expect(report.codexLiveRecipeIds).toEqual([999])
  })
  it('fails closed before reconciliation when schema-v2 collection is unresolved', () => {
    const manifest = { schemaVersion: 2, complete: false, unresolvedCount: 1, recipes: [{ recipeId: 999, skill: 'cooking', status: 'unresolved', ingredients: [] }] }
    const dir = mkdtempSync(join(tmpdir(), 'bdo-reconcile-unresolved-'))
    const datasetPath = join(dir, 'dataset.json'), codexPath = join(dir, 'codex.json')
    writeFileSync(datasetPath, JSON.stringify(dataset)); writeFileSync(codexPath, JSON.stringify(manifest))
    const result = spawnSync(process.execPath, ['scripts/reconcile-codex.mjs', '--dataset', datasetPath, '--codex', codexPath], { cwd: process.cwd(), encoding: 'utf8' })
    expect(result.status).toBe(1); expect(result.stderr).toContain('complete with zero unresolved routes')
  })
  it.each([
    [['--bogus', 'x'], 'unknown argument: --bogus'],
    [['--dataset', 'a', '--dataset', 'b'], 'duplicate argument: --dataset'],
    [['--dataset', '--codex'], 'usage:'],
  ])('fails closed on malformed CLI arguments: %j', (argv, expectedError) => {
    const result = spawnSync(process.execPath, ['scripts/reconcile-codex.mjs', ...argv], { cwd: process.cwd(), encoding: 'utf8' })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain(expectedError)
  })
})
