import { describe, expect, it } from 'vitest'
import { applyYieldEvidence } from './apply-yield-evidence.mjs'

const base = { metadata: { supportedRegion: 'KR' }, recipes: { r: { id: 'r', skill: 'cooking', outputItemId: 1, yield: { min: 1, max: 1, provenance: 'unknown-server-yield' }, variants: [{ id: 'a', inputs: [] }, { id: 'b', inputs: [] }] } } }

describe('variant yield evidence', () => {
  it('binds two source recipes to two variants', () => {
    const result = applyYieldEvidence(base, { entries: [
      { recipeId: 'r', variantId: 'a', min: 1, max: 4, sourceRecipeId: 169, sourceUrl: 'https://bdocodex.com/kr/recipe/169/' },
      { recipeId: 'r', variantId: 'b', min: 1, max: 1, sourceRecipeId: 637, sourceUrl: 'https://bdocodex.com/kr/recipe/637/' },
    ] })
    expect(result.metadata.yieldEvidenceCount).toBe(2)
    expect(result.recipes.r.variants.map((v) => v.sourceRecipeId)).toEqual([169, 637])
  })
})
