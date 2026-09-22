import { describe, expect, it } from 'vitest'
import { pruneItemsToPlannerScope, referencedPlannerItemIds } from './planner-item-scope.mjs'

const recipes = {
  cook: { outputItemId: 100, variants: [{ inputs: [{ itemId: 200, count: 1 }] }] },
  alch: { outputItemId: 101, variants: [{ inputs: [{ itemId: 200, count: 2 }, { itemId: 201, count: 1 }] }] },
}

describe('planner item scope', () => {
  it('keeps only recipe/byproduct-visible items and drops unrelated extractor records', () => {
    const items = {
      '100': { id: 100 }, '101': { id: 101 }, '200': { id: 200 }, '201': { id: 201 },
      '300': { id: 300 }, '999999': { id: 999999, ghost: true },
    }
    const byproducts = { '300': { outputItemId: 300, producedWhileCraftingItemIds: [100] } }
    expect([...referencedPlannerItemIds(recipes, byproducts)].sort((a, b) => a - b)).toEqual([100, 101, 200, 201, 300])
    expect(Object.keys(pruneItemsToPlannerScope(items, recipes, byproducts))).toEqual(['100', '101', '200', '201', '300'])
  })

  it('fails closed when a retained recipe references a missing item', () => {
    expect(() => pruneItemsToPlannerScope({ '100': { id: 100 }, '101': { id: 101 } }, recipes)).toThrow(/missing item 200/)
  })
})
