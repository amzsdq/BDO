import { describe, expect, it } from 'vitest'
import { buildPlan } from './planner'
import type { RecipeDataset } from './types'

function baseDataset(): RecipeDataset {
  return {
    metadata: { generatedAt: '2026-09-23T00:00:00Z', sources: ['synthetic'], supportedRegion: 'KR' },
    items: { '1': { id: 1, nameKo: '완성품' }, '2': { id: 2, nameKo: '재료' } },
    recipes: {
      root: { id: 'root', skill: 'cooking', outputItemId: 1, yield: { min: 1, max: 1 }, variants: [{ id: 'v1', inputs: [{ itemId: 2, count: 1 }] }] },
    },
    recipesByOutput: { '1': ['root'] },
  }
}

describe('planner fail-closed boundaries', () => {
  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -1])('rejects invalid inventory value %s', (invalid) => {
    const dataset = baseDataset()
    expect(() => buildPlan(dataset, [{ recipeId: 'root', mode: 'attempts', amount: 1 }], { craftIntermediateItemIds: new Set(), haveByItemId: { '2': invalid } })).toThrow('inventory item 2 must be a non-negative finite number')
  })

  it('rejects a self-referential craft cycle instead of returning a partial plan', () => {
    const dataset = baseDataset()
    dataset.recipes.root.variants[0].inputs = [{ itemId: 1, count: 1 }]
    expect(() => buildPlan(dataset, [{ recipeId: 'root', mode: 'attempts', amount: 1 }], { craftIntermediateItemIds: new Set([1]) })).toThrow('cyclic craft dependency detected at item 1')
  })

  it('rejects a two-recipe craft cycle instead of returning incomplete shortages', () => {
    const dataset = baseDataset()
    dataset.recipes.root.variants[0].inputs = [{ itemId: 2, count: 1 }]
    dataset.recipes.child = { id: 'child', skill: 'cooking', outputItemId: 2, yield: { min: 1, max: 1 }, variants: [{ id: 'v1', inputs: [{ itemId: 1, count: 1 }] }] }
    dataset.recipesByOutput['2'] = ['child']
    expect(() => buildPlan(dataset, [{ recipeId: 'root', mode: 'attempts', amount: 1 }], { craftIntermediateItemIds: new Set([1, 2]) })).toThrow('cyclic craft dependency detected at item 1')
  })
})
