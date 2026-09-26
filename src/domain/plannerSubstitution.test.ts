import { describe, expect, it } from 'vitest'
import { buildPlan } from './planner'
import type { RecipeDataset } from './types'

const dataset: RecipeDataset = {
  metadata: { generatedAt: '2026-09-23', sources: ['fixture'], supportedRegion: 'KR' },
  items: {
    '1': { id: 1, nameKo: '결과물' },
    '10': { id: 10, nameKo: '기본 재료' },
    '11': { id: 11, nameKo: '대체 재료' },
  },
  recipes: {
    r1: {
      id: 'r1', skill: 'cooking', outputItemId: 1, yield: { min: 1, max: 1 },
      variants: [{ id: 'v1', inputs: [{ itemId: 10, count: 3, substitutionGroupId: 'codex:6502' }] }],
    },
  },
  recipesByOutput: { '1': ['r1'] },
  substitutionGroups: {
    'codex:6502': {
      id: 'codex:6502', memberItemIds: [10, 11],
      source: { provider: 'BDO Codex KR', sourceId: '6502', verifiedAt: '2026-09-23' },
    },
  },
}

describe('planner substitution resolution', () => {
  it('uses an explicit verified substitute in exact recipe quantity', () => {
    const plan = buildPlan(dataset, [{ recipeId: 'r1', mode: 'attempts', amount: 4 }], {
      craftIntermediateItemIds: new Set(),
      selectedSubstitutionItemIdByGroupId: { 'codex:6502': 11 },
    })
    expect(plan.materials).toEqual([expect.objectContaining({ itemId: 11, required: 12, missing: 12 })])
    expect(plan.warnings.join('\n')).toMatch(/6502/)
  })

  it('uses an all-owned mixed Worth composition when no single member can cover the recipe slot', async () => {
    const mixedDataset: RecipeDataset = {
      ...dataset,
      items: {
        ...dataset.items,
        '12': { id: 12, nameKo: '고급 대체 재료' },
      },
      recipes: {
        ...dataset.recipes,
        r1: {
          ...dataset.recipes.r1,
          variants: [{ id: 'v1', inputs: [{ itemId: 10, count: 8, substitutionGroupId: 'codex:6009' }] }],
        },
      },
      substitutionGroups: {
        'codex:6009': {
          id: 'codex:6009',
          memberItemIds: [10, 11, 12],
          memberValueByItemId: { '10': 1, '11': 1, '12': 6 },
          source: { provider: 'BDO Codex KR', sourceId: '6009', verifiedAt: '2026-09-26' },
        },
      },
    }
    const { resolveOwnedMixedIngredientAllocation } = await import('./substitution')
    expect(resolveOwnedMixedIngredientAllocation(
      mixedDataset.recipes.r1.variants[0].inputs[0],
      mixedDataset.substitutionGroups ?? {},
      { '11': 2, '12': 1 },
      1,
    )).toEqual(expect.arrayContaining([{ itemId: 11, count: 2 }, { itemId: 12, count: 1 }]))
  })

  it('uses owned verified group members but rejects out-of-group choices', () => {
    const plan = buildPlan(dataset, [{ recipeId: 'r1', mode: 'attempts', amount: 2 }], {
      craftIntermediateItemIds: new Set(),
      haveByItemId: { '11': 20 },
    })
    expect(plan.materials[0]?.itemId).toBe(11)
    expect(plan.materials[0]?.required).toBe(6)
    const fullBatch = buildPlan(dataset, [{ recipeId: 'r1', mode: 'attempts', amount: 10 }], {
      craftIntermediateItemIds: new Set(),
      haveByItemId: { '10': 100, '11': 4 },
    })
    expect(fullBatch.materials[0]?.itemId).toBe(10)
    expect(fullBatch.materials[0]?.missing).toBe(0)
    const sharedInventory = buildPlan(dataset, [
      { recipeId: 'r1', mode: 'attempts', amount: 2 },
      { recipeId: 'r1', mode: 'attempts', amount: 2 },
    ], {
      craftIntermediateItemIds: new Set(),
      haveByItemId: { '10': 6, '11': 7 },
    })
    expect(sharedInventory.materials).toEqual(expect.arrayContaining([
      expect.objectContaining({ itemId: 11, required: 6, missing: 0 }),
      expect.objectContaining({ itemId: 10, required: 6, missing: 0 }),
    ]))
    expect(() => buildPlan(dataset, [{ recipeId: 'r1', mode: 'attempts', amount: 1 }], {
      craftIntermediateItemIds: new Set(),
      selectedSubstitutionItemIdByGroupId: { 'codex:6502': 99 },
    })).toThrow(/not a member/)
  })
  it('plans mixed Worth inventory across repeated targets', () => {
    const mixedDataset: RecipeDataset = {
      ...dataset,
      items: { ...dataset.items, '12': { id: 12, nameKo: '고급 대체 재료' } },
      recipes: { ...dataset.recipes, r1: { ...dataset.recipes.r1, variants: [{ id: 'v1', inputs: [{ itemId: 10, count: 8, substitutionGroupId: 'codex:6009' }] }] } },
      substitutionGroups: { 'codex:6009': { id: 'codex:6009', memberItemIds: [10, 11, 12], memberValueByItemId: { '10': 1, '11': 1, '12': 6 }, source: { provider: 'BDO Codex KR', sourceId: '6009', verifiedAt: '2026-09-26' } } },
    }
    const one = buildPlan(mixedDataset, [{ recipeId: 'r1', mode: 'attempts', amount: 1 }], { craftIntermediateItemIds: new Set(), haveByItemId: { '11': 2, '12': 1 } })
    expect(one.materials).toEqual(expect.arrayContaining([
      expect.objectContaining({ itemId: 11, required: 2, missing: 0 }),
      expect.objectContaining({ itemId: 12, required: 1, missing: 0 }),
    ]))
    const repeated = buildPlan(mixedDataset, [{ recipeId: 'r1', mode: 'attempts', amount: 1 }, { recipeId: 'r1', mode: 'attempts', amount: 1 }], { craftIntermediateItemIds: new Set(), haveByItemId: { '10': 8, '11': 2, '12': 1 } })
    expect(repeated.materials).toEqual(expect.arrayContaining([
      expect.objectContaining({ itemId: 11, required: 2, missing: 0 }),
      expect.objectContaining({ itemId: 12, required: 1, missing: 0 }),
      expect.objectContaining({ itemId: 10, required: 8, missing: 0 }),
    ]))
  })

  it('uses reviewed planning values and explicit slot Worth instead of source-reported Worth', () => {
    const semanticDataset: RecipeDataset = {
      ...dataset,
      recipes: {
        ...dataset.recipes,
        r1: {
          ...dataset.recipes.r1,
          variants: [{ id: 'v1', inputs: [{ itemId: 10, count: 6, substitutionGroupId: 'codex:6003', requiredBaseWorth: 6 }] }],
        },
      },
      substitutionGroups: {
        'codex:6003': {
          id: 'codex:6003',
          memberItemIds: [10, 11],
          memberValueByItemId: { '10': 1, '11': 4 },
          planningValueByItemId: { '10': 1, '11': 2 },
          source: { provider: 'BDO Codex KR', sourceId: '6003', verifiedAt: '2026-09-26' },
        },
      },
    }
    const plan = buildPlan(semanticDataset, [{ recipeId: 'r1', mode: 'attempts', amount: 1 }], {
      craftIntermediateItemIds: new Set(),
      selectedSubstitutionItemIdByGroupId: { 'codex:6003': 11 },
    })
    expect(plan.materials).toEqual([expect.objectContaining({ itemId: 11, required: 3 })])
  })
})
