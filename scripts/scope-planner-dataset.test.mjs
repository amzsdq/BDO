import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('final planner item scoping', () => {
  it('keeps sourced substitution members that are not direct recipe/byproduct refs', () => {
    const dir = mkdtempSync(join(tmpdir(), 'bdo-scope-'))
    const datasetPath = join(dir, 'dataset.json')
    writeFileSync(datasetPath, JSON.stringify({
      metadata: { fingerprint: 'stale' },
      items: {
        '1': { id: 1, nameKo: '결과' },
        '2': { id: 2, nameKo: '기본 재료' },
        '3': { id: 3, nameKo: '대체 재료' },
        '999': { id: 999, nameKo: '무관 아이템' },
      },
      recipes: {
        'cooking:1': { id: 'cooking:1', skill: 'cooking', outputItemId: 1, variants: [{ id: 'v1', inputs: [{ itemId: 2, count: 1, substitutionGroupId: 'codex:7' }] }] },
      },
      byproducts: {},
      substitutionGroups: {
        'codex:7': { id: 'codex:7', memberItemIds: [2, 3], memberValueByItemId: { '2': 1, '3': 2 } },
      },
    }))

    execFileSync(process.execPath, [resolve('scripts/scope-planner-dataset.mjs'), datasetPath])
    const scoped = JSON.parse(readFileSync(datasetPath, 'utf8'))
    expect(Object.keys(scoped.items).sort()).toEqual(['1', '2', '3'])
    expect(scoped.metadata.fingerprint).toBeUndefined()
    expect(scoped.metadata.itemScope).toBe('planner-referenced-cooking-alchemy-substitutions-v1')
  })
})
