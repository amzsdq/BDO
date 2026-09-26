import { describe, expect, it } from 'vitest'
import { applySubstitutionEvidence } from './apply-substitution-evidence.mjs'

const evidence = {
  source: 'BDO Codex KR',
  collectedAt: '2026-09-26T00:00:00.000Z',
  groups: [{
    id: 'codex:6001', sourceId: '6001', sourceUrl: 'https://bdocodex.com/kr/materialgroup/6001/',
    members: [[7001,1],[7003,2],[7004,2],[7002,2],[7005,2],[7008,6],[7009,6],[7006,6],[7007,6],[7010,6],[7013,36],[7014,36],[7011,36],[7012,36],[7015,36]].map(([itemId,value]) => ({ itemId, value })),
  }, {
    id: 'codex:6002', sourceId: '6002', sourceUrl: 'https://bdocodex.com/kr/materialgroup/6002/',
    members: [[7101,1],[7103,2],[7104,2],[7102,2],[7105,2]].map(([itemId,value]) => ({ itemId, value })),
  }, {
    id: 'codex:6003', sourceId: '6003', sourceUrl: 'https://bdocodex.com/kr/materialgroup/6003/',
    members: [[7201,1],[7203,4],[7204,4],[7202,4],[7205,4]].map(([itemId,value]) => ({ itemId, value })),
  }, {
    id: 'codex:6007', sourceId: '6007', sourceUrl: 'https://bdocodex.com/kr/materialgroup/6007/',
    members: [[7313,1],[7304,2],[7316,2],[7315,2],[7314,2],[7317,2],[7307,2],[7321,12],[7329,12],[7322,72],[7341,72]].map(([itemId,value]) => ({ itemId, value })),
  }, {
    id: 'codex:3008', sourceId: '3008', sourceUrl: 'https://bdocodex.com/kr/materialgroup/3008/',
    members: [{ itemId: 5408, value: 1 }, { itemId: 5427, value: 6 }, { itemId: 5451, value: 36 }, { itemId: 5471, value: 216 }],
  }, {
    id: 'codex:805', sourceId: '805', sourceUrl: 'https://bdocodex.com/kr/materialgroup/805/',
    members: [{ itemId: 6204, value: 1 }, { itemId: 6214, value: 1 }, { itemId: 6216, value: 2 }, { itemId: 6218, value: 2 }],
  }, {
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
      ...Object.fromEntries([7001,7002,7003,7004,7005,7006,7007,7008,7009,7010,7011,7012,7013,7014,7015,7101,7102,7103,7104,7105,7201,7202,7203,7204,7205,7304,7307,7313,7314,7315,7316,7317,7321,7322,7329,7341].map((id) => [String(id), { id }])),
      '5408': { id: 5408 }, '5427': { id: 5427 }, '5451': { id: 5451 }, '5471': { id: 5471 },
      '6204': { id: 6204 }, '6214': { id: 6214 }, '6216': { id: 6216 }, '6218': { id: 6218 },
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
    expect(result.recipes.r.variants[0].inputs[0].requiredBaseWorth).toBe(8)
    expect(result.substitutionGroups['codex:6009'].planningValueByItemId).toEqual({
      '7306': 1, '7309': 1, '7311': 1, '7312': 1, '7318': 1,
      '7328': 6, '7331': 6, '7333': 6, '7334': 6,
      '7340': 36, '7343': 36, '7345': 36, '7346': 36,
    })
  })

  it('binds current Alchemy Guide route 14 with reviewed mushroom semantics', () => {
    const result = applySubstitutionEvidence(dataset(14, 5408), evidence)
    const input = result.recipes.r.variants[0].inputs[0]
    expect(input.substitutionGroupId).toBe('codex:3008')
    expect(input.requiredBaseWorth).toBe(5)
    expect(result.substitutionGroups['codex:3008'].memberValueByItemId['5427']).toBe(6)
    expect(result.substitutionGroups['codex:3008'].planningValueByItemId['5427']).toBe(3)
  })

  it('binds current Alchemy Guide route 54 with reviewed Blood Type 1 semantics', () => {
    const result = applySubstitutionEvidence(dataset(54, 6214), evidence)
    const input = result.recipes.r.variants[0].inputs[0]
    expect(input.substitutionGroupId).toBe('codex:805')
    expect(input.requiredBaseWorth).toBe(2)
    expect(result.substitutionGroups['codex:805'].memberValueByItemId['6216']).toBe(2)
    expect(result.substitutionGroups['codex:805'].planningValueByItemId['6216']).toBe(1)
  })

  it.each([
    [129, 7205, 'codex:6003', 6, 7203, 2],
    [109, 7105, 'codex:6002', 1, 7103, 1],
    [109, 7313, 'codex:6007', 1, 7304, 1],
    [110, 7005, 'codex:6001', 1, 7003, 1],
    [110, 7313, 'codex:6007', 1, 7304, 1],
    [548, 7101, 'codex:6002', 1, 7103, 1],
    [548, 7313, 'codex:6007', 1, 7304, 1],
    [549, 7001, 'codex:6001', 1, 7003, 1],
    [549, 7313, 'codex:6007', 1, 7304, 1],
  ])('binds current Cooking Guide route %s with reviewed planning semantics', (sourceRecipeId, itemId, groupId, requiredBaseWorth, semanticItemId, semanticValue) => {
    const result = applySubstitutionEvidence(dataset(sourceRecipeId, itemId), evidence)
    const input = result.recipes.r.variants[0].inputs[0]
    expect(input.substitutionGroupId).toBe(groupId)
    expect(input.requiredBaseWorth).toBe(requiredBaseWorth)
    expect(result.substitutionGroups[groupId].planningValueByItemId[String(semanticItemId)]).toBe(semanticValue)
  })

  it('does not bind an unreviewed slot merely because its route and group are reviewed', () => {
    const result = applySubstitutionEvidence(dataset(129, 7201), evidence)
    expect(result.recipes.r.variants[0].inputs[0].substitutionGroupId).toBeUndefined()
    expect(result.recipes.r.variants[0].inputs[0].requiredBaseWorth).toBeUndefined()
  })

  it('keeps historical-only generic vegetable route 113 exact until fresh route evidence is reviewed', () => {
    const result = applySubstitutionEvidence(dataset(113), evidence)
    expect(result.recipes.r.variants[0].inputs[0].substitutionGroupId).toBeUndefined()
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
