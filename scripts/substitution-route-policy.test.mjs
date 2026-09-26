import { describe, expect, it } from 'vitest'
import { applySubstitutionEvidence } from './apply-substitution-evidence.mjs'

const evidence = {
  source: 'BDO Codex KR',
  collectedAt: '2026-09-26T00:00:00.000Z',
  groups: [{
    id: 'codex:6009',
    sourceId: '6009',
    sourceUrl: 'https://bdocodex.com/kr/materialgroup/6009/',
    members: [
      { itemId: 7318, value: 1 },
      { itemId: 7309, value: 1 },
      { itemId: 7311, value: 1 },
      { itemId: 7312, value: 1 },
      { itemId: 7306, value: 1 },
      { itemId: 7331, value: 6 },
      { itemId: 7333, value: 6 },
      { itemId: 7334, value: 6 },
      { itemId: 7328, value: 6 },
      { itemId: 7343, value: 36 },
      { itemId: 7345, value: 36 },
      { itemId: 7346, value: 36 },
      { itemId: 7340, value: 36 },
    ],
  }],
}

function dataset(sourceRecipeId, itemId = 7318) {
  return {
    items: {
      '7318': { id: 7318, nameKo: '양배추' },
      '7309': { id: 7309, nameKo: '올리브' },
      '7311': { id: 7311 }, '7312': { id: 7312, nameKo: '파프리카' }, '7306': { id: 7306 },
      '7328': { id: 7328 }, '7331': { id: 7331, nameKo: '고급 양배추' }, '7333': { id: 7333 }, '7334': { id: 7334 },
      '7340': { id: 7340 }, '7343': { id: 7343, nameKo: '특상품 양배추' }, '7345': { id: 7345 }, '7346': { id: 7346 },
      '900001': { id: 900001, nameKo: '결과물' },
    },
    recipes: {
      r: { id: 'r', skill: 'cooking', outputItemId: 900001, variants: [{ id: 'v', sourceRecipeId, inputs: [{ itemId, count: 8 }] }] },
    },
    recipesByOutput: { '900001': ['r'] },
    metadata: { sources: ['fixture'] },
  }
}

describe('reviewed substitution route policy', () => {
  it('binds current Pickled Vegetables route 112 to reviewed vegetable group 6009', () => {
    const result = applySubstitutionEvidence(dataset(112), evidence)
    expect(result.recipes.r.variants[0].inputs[0].substitutionGroupId).toBe('codex:6009')
  })

  it.each([354, 360, 210])('keeps literal-ingredient route %s exact', (sourceRecipeId) => {
    const result = applySubstitutionEvidence(dataset(sourceRecipeId, sourceRecipeId === 210 ? 7312 : 7318), evidence)
    expect(result.recipes.r.variants[0].inputs[0].substitutionGroupId).toBeUndefined()
  })

  it('does not promote a higher-Worth exact input even on a reviewed route', () => {
    const result = applySubstitutionEvidence(dataset(112, 7331), evidence)
    expect(result.recipes.r.variants[0].inputs[0].substitutionGroupId).toBeUndefined()
  })
})
