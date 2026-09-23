import { describe, expect, it, vi } from 'vitest'
import { collectReferencedSubstitutionEvidence } from './collect-substitution-evidence-from-recipes.mjs'

const groupHtml = (itemA, itemB) => `<table><tr><td><a href="/kr/item/${itemA}/">A</a></td><td>1</td></tr><tr><td><a href="/kr/item/${itemB}/">B</a></td><td>6</td></tr></table>`

describe('collectReferencedSubstitutionEvidence', () => {
  it('fetches each explicitly referenced material group once', async () => {
    const fetchImpl = vi.fn(async (url) => ({ ok: true, status: 200, statusText: 'OK', url, text: async () => groupHtml(1, 2) }))
    const recipeEvidence = { recipes: [{ materials: [{ material_group: 3001 }, { material_group: 3001 }] }, { materials: [{ material_group: { id: 6002 } }] }] }
    const result = await collectReferencedSubstitutionEvidence(recipeEvidence, fetchImpl, '2026-09-23T00:00:00.000Z')
    expect(result.groups.map((group) => group.sourceId)).toEqual(['3001', '6002'])
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('does not fetch anything when recipe evidence has no explicit material-group identity', async () => {
    const fetchImpl = vi.fn()
    const result = await collectReferencedSubstitutionEvidence({ recipes: [{ id: 3001 }] }, fetchImpl, '2026-09-23T00:00:00.000Z')
    expect(result.groups).toEqual([])
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})
