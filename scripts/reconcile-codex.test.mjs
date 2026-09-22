import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

function run(dataset, manifest) {
  const dir = mkdtempSync(join(tmpdir(), 'bdo-reconcile-'))
  const datasetPath = join(dir, 'dataset.json'), codexPath = join(dir, 'codex.json'), reportPath = join(dir, 'report.json')
  writeFileSync(datasetPath, JSON.stringify(dataset)); writeFileSync(codexPath, JSON.stringify(manifest))
  execFileSync(process.execPath, ['scripts/reconcile-codex.mjs', '--dataset', datasetPath, '--codex', codexPath, '--out', reportPath], { cwd: process.cwd() })
  return JSON.parse(readFileSync(reportPath, 'utf8'))
}

const dataset = {
  items: { '10': { id: 10, nameKo: '결과' }, '20': { id: 20, nameKo: '재료' } },
  recipes: { r: { id: 'r', skill: 'cooking', outputItemId: 10, variants: [{ id: 'v1', inputs: [{ itemId: 20, count: 2 }] }] } },
}

describe('Codex reconciliation', () => {
  it('earns ZERO_UNEXPLAINED_DIFF when canonical item ids and counts agree', () => {
    const report = run(dataset, { recipes: [{ recipeId: 999, skill: 'cooking', outputItemId: 10, titleKo: '결과', ingredients: [{ itemId: 20, name: '다른 표기여도 ID가 우선', count: 2 }] }] })
    expect(report.status).toBe('ZERO_UNEXPLAINED_DIFF'); expect(report.unresolved).toEqual([])
  })

  it('reports a deterministic signature mismatch when canonical ingredient counts differ', () => {
    const report = run(dataset, { recipes: [{ recipeId: 999, skill: 'cooking', outputItemId: 10, titleKo: '결과', ingredients: [{ itemId: 20, name: '재료', count: 3 }] }] })
    expect(report.status).toBe('INCOMPLETE_REVIEW'); expect(report.unresolved[0].kind).toBe('SIGNATURE_MISMATCH')
  })

  it('keeps unavailable Codex recipes out of live completeness diffs', () => {
    const report = run(dataset, { recipes: [{ recipeId: 999, skill: 'cooking', outputItemId: 10, titleKo: '결과', ingredients: [{ itemId: 20, count: 2 }] }, { recipeId: 1000, skill: 'alchemy', outputItemId: 77, titleKo: '퇴역', available: false, ingredients: [] }] })
    expect(report.status).toBe('ZERO_UNEXPLAINED_DIFF'); expect(report.codexDisabledPages).toBe(1)
  })
})
