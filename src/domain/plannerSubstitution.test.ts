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
})
