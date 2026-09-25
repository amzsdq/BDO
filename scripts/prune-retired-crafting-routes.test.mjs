import { describe, expect, it } from 'vitest'
import { validateRetiredCraftingRouteEvidence } from './reviewed-retired-route-state.mjs'
import { pruneRetiredCraftingRoutes } from './prune-retired-crafting-routes.mjs'

const evidence = {
  schemaVersion: 1,
  scope: 'kr-pc-crafting-route-live-state',
  source: { url: 'https://www.kr.playblackdesert.com/ko-KR/News/Detail?groupContentNo=14655' },
  routes: [{ recipeId: 342, skill: 'alchemy', status: 'retired' }],
  retiredCraftingOutputItemIds: [5303, 45334],
}

describe('reviewed retired crafting route evidence', () => {
  it('fails closed when a reviewed retired route is still catalog-listed', () => {
    expect(() => validateRetiredCraftingRouteEvidence(evidence, [342])).toThrow(/conflicts with current catalog/)
  })

  it('prunes direct recipes and byproduct references for reviewed retired crafting outputs', () => {
    const dataset = {
      metadata: { fingerprint: 'stale', counts: { cooking: 1, alchemy: 2 } },
      recipes: {
        'alchemy:5303': { id: 'alchemy:5303', skill: 'alchemy', outputItemId: 5303, variants: [] },
        'alchemy:9000': { id: 'alchemy:9000', skill: 'alchemy', outputItemId: 9000, variants: [] },
        'cooking:8000': { id: 'cooking:8000', skill: 'cooking', outputItemId: 8000, variants: [] },
      },
      recipesByOutput: { '5303': ['alchemy:5303'], '9000': ['alchemy:9000'], '8000': ['cooking:8000'] },
      byproducts: {
        '45334': { outputItemId: 45334, producedWhileCraftingItemIds: [5303, 9000] },
        '7777': { outputItemId: 7777, producedWhileCraftingItemIds: [5303, 9000] },
      },
    }
    const result = pruneRetiredCraftingRoutes(dataset, evidence)
    expect(result.recipes['alchemy:5303']).toBeUndefined()
    expect(result.recipesByOutput['5303']).toBeUndefined()
    expect(result.byproducts['45334']).toBeUndefined()
    expect(result.byproducts['7777'].producedWhileCraftingItemIds).toEqual([9000])
    expect(result.metadata.fingerprint).toBeUndefined()
    expect(result.metadata.counts).toEqual({ cooking: 1, alchemy: 1 })
  })
})
