import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

function run(dataset, manifest) {
  const dir = mkdtempSync(join(tmpdir(), 'bdo-reconcile-'))
  const datasetPath = join(dir, 'dataset.json'), codexPath = join(dir, 'codex.json'), reportPath = join(dir, 'report.json')
  writeFileSync(datasetPath, JSON.stringify(dataset)); writeFileSync(codexPath, JSON.stringify(manifest))
  const result = spawnSync(process.execPath, ['scripts/reconcile-codex.mjs', '--dataset', datasetPath, '--codex', codexPath, '--out', reportPath], { cwd: process.cwd(), encoding: 'utf8' })
  return { exitCode: result.status, report: JSON.parse(readFileSync(reportPath, 'utf8')) }
}

const dataset = { items: { '10': { id: 10, nameKo: '결과' }, '20': { id: 20, nameKo: '재료' } }, recipes: { r: { id: 'r', skill: 'cooking', outputItemId: 10, variants: [{ id: 'v1', inputs: [{ itemId: 20, count: 2 }] }] } } }
const matchingManifest = { recipes: [{ recipeId: 999, skill: 'cooking', outputItemId: 10, titleKo: '결과', ingredients: [{ itemId: 20, name: '다른 표기여도 ID가 우선', count: 2 }] }] }

describe('Codex reconciliation', () => {
  it('earns ZERO_UNEXPLAINED_DIFF when canonical item ids and counts agree', () => {
    const { exitCode, report } = run(dataset, matchingManifest)
    expect(exitCode).toBe(0); expect(report.status).toBe('ZERO_UNEXPLAINED_DIFF'); expect(report.unresolved).toEqual([])
  })
  it('reports a deterministic signature mismatch when canonical ingredient counts differ', () => {
    const { exitCode, report } = run(dataset, { recipes: [{ recipeId: 999, skill: 'cooking', outputItemId: 10, titleKo: '결과', ingredients: [{ itemId: 20, name: '재료', count: 3 }] }] })
    expect(exitCode).toBe(2); expect(report.status).toBe('INCOMPLETE_REVIEW'); expect(report.unresolved.some((entry) => entry.kind === 'SIGNATURE_MISMATCH')).toBe(true)
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
  })
  it('keeps unavailable Codex recipes out of live completeness diffs', () => {
    const { exitCode, report } = run(dataset, { recipes: [...matchingManifest.recipes, { recipeId: 1000, skill: 'alchemy', outputItemId: 77, titleKo: '퇴역', available: false, ingredients: [] }] })
    expect(exitCode).toBe(0); expect(report.status).toBe('ZERO_UNEXPLAINED_DIFF'); expect(report.codexDisabledPages).toBe(1)
  })
})
