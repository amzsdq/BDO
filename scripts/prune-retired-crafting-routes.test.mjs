import { describe, expect, it } from 'vitest'
import { applyRetiredRouteStateToDetails, assertNoRetiredCraftingRoutes, validateRetiredCraftingRouteEvidence } from './reviewed-retired-route-state.mjs'
import { pruneRetiredCraftingRoutes } from './prune-retired-crafting-routes.mjs'

const evidence = {
  schemaVersion: 1,
  scope: 'kr-pc-crafting-route-live-state',
  reviewedAt: '2026-09-26',
  source: { url: 'https://www.kr.playblackdesert.com/ko-KR/News/Detail?groupContentNo=16141', effectiveDate: '2026-09-02' },
  routes: [{ recipeId: 342, skill: 'alchemy', status: 'retired' }],
  retiredCraftingOutputItemIds: [5303, 45334],
  retiredCraftingIngredientItemIds: [4924, 5305, 5306],
}

describe('reviewed retired crafting route evidence', () => {
  it('fails closed on catalog conflicts and unofficial evidence', () => {
    expect(() => validateRetiredCraftingRouteEvidence(evidence, [342])).toThrow(/conflicts with current catalog/)
    expect(() => validateRetiredCraftingRouteEvidence({ ...evidence, source: { ...evidence.source, url: 'https://example.com/update' } })).toThrow(/official KR/)
  })

  it('turns observed supplemental historical routes into reviewed unavailable evidence', () => {
    const details = { schemaVersion: 2, exactCoverage: true, unresolvedCount: 1, complete: false, supplementalDiscovery: { method: 'catalog-gap-probe', complete: false, probedMinRecipeId: 1, probedMaxRecipeId: 651, boundedByCatalogHighWater: true }, recipes: [
      { recipeId: 1, skill: 'cooking', catalogListed: true, status: 'single-base' },
      { recipeId: 342, skill: 'alchemy', catalogListed: false, discovery: 'catalog-gap-probe', sourceUrl: 'https://bdocodex.com/kr/recipe/342/', status: 'unresolved' },
    ] }
    const result = applyRetiredRouteStateToDetails(details, evidence)
    expect(result.complete).toBe(true)
    expect(result.unresolvedCount).toBe(0)
    expect(result.supplementalDiscovery.complete).toBe(true)
    expect(result.recipes[1]).toMatchObject({ recipeId: 342, skill: 'alchemy', status: 'unavailable', liveState: 'retired-reviewed' })
    expect(result.retiredCraftingOutputItemIds).toEqual([5303, 45334])
    const unidentified = structuredClone(details)
    unidentified.recipes[1].skill = 'unknown'
    expect(() => applyRetiredRouteStateToDetails(unidentified, evidence)).toThrow(/skill identity was not established/)
  })

  it('prunes direct recipes and byproduct references and final gate rejects unpruned data', () => {
    const dataset = {
      metadata: { fingerprint: 'stale', counts: { cooking: 1, alchemy: 2 } },
      recipes: {
        'alchemy:5303': { id: 'alchemy:5303', skill: 'alchemy', outputItemId: 5303, variants: [] },
        'alchemy:9000': { id: 'alchemy:9000', skill: 'alchemy', outputItemId: 9000, variants: [{ id: 'stale', inputs: [{ itemId: 4924, count: 50 }] }, { id: 'live', inputs: [{ itemId: 9999, count: 1 }] }] },
        'cooking:8000': { id: 'cooking:8000', skill: 'cooking', outputItemId: 8000, variants: [] },
      },
      recipesByOutput: { '5303': ['alchemy:5303'], '9000': ['alchemy:9000'], '8000': ['cooking:8000'] },
      byproducts: {
        '45334': { outputItemId: 45334, producedWhileCraftingItemIds: [5303, 9000] },
        '7777': { outputItemId: 7777, producedWhileCraftingItemIds: [5303, 9000] },
      },
    }
    const details = { routeStateEvidence: evidence, retiredCraftingOutputItemIds: [5303, 45334] }
    expect(() => assertNoRetiredCraftingRoutes(dataset, details)).toThrow(/retired crafting routes/)
    const staleIngredientOnly = structuredClone(dataset)
    delete staleIngredientOnly.recipes['alchemy:5303']
    delete staleIngredientOnly.recipesByOutput['5303']
    expect(() => assertNoRetiredCraftingRoutes(staleIngredientOnly, details)).toThrow(/retired crafting routes/)

    expect(() => assertNoRetiredCraftingRoutes(dataset, { ...details, retiredCraftingOutputItemIds: [5303] })).toThrow(/do not match reviewed route-state evidence/)
    const result = pruneRetiredCraftingRoutes(dataset, evidence)
    expect(result.recipes['alchemy:5303']).toBeUndefined()
    expect(result.recipesByOutput['5303']).toBeUndefined()
    expect(result.recipes['alchemy:9000'].variants.map((variant) => variant.id)).toEqual(['live'])
    expect(result.metadata.retiredCraftingIngredientItemIds).toEqual([4924, 5305, 5306])
    expect(result.byproducts['45334']).toBeUndefined()
    expect(result.byproducts['7777'].producedWhileCraftingItemIds).toEqual([9000])
    expect(result.metadata.fingerprint).toBeUndefined()
    expect(result.metadata.counts).toEqual({ cooking: 1, alchemy: 1 })
    expect(assertNoRetiredCraftingRoutes(result, details)).toBe(true)
  })
})
