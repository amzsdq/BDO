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

  it('rejects inconsistent single-base evidence before writing it', () => {
    const evidence = { recipeId: 'r', variantId: 'a', outputStatus: 'single-base', min: 1, max: 4, sourceRecipeId: 169, sourceUrl: 'https://bdocodex.com/kr/recipe/169/' }
    expect(() => applyYieldEvidence(base, { entries: [{ ...evidence, baseOutputs: [{ itemId: 2, min: 1, max: 4 }] }] })).toThrow(/recipe output item/)
    expect(() => applyYieldEvidence(base, { entries: [{ ...evidence, baseOutputs: [{ itemId: 1, min: 1, max: 3 }] }] })).toThrow(/range must match/)
    expect(applyYieldEvidence(base, { entries: [{ ...evidence, baseOutputs: [{ itemId: 1, min: 1, max: 4 }] }] }).recipes.r.variants[0].yield?.max).toBe(4)
  })

  it('rejects mastery evidence for the wrong life skill', () => {
    expect(() => applyYieldEvidence(base, { entries: [
      { recipeId: 'r', variantId: 'a', min: 1, max: 1, sourceRecipeId: 169, sourceUrl: 'https://bdocodex.com/kr/recipe/169/', skillRequirement: { skill: 'alchemy', minimumMastery: 500 } },
    ] })).toThrow(/must match recipe skill/)
  })

  it('applies random-only classification without inventing a yield', () => {
    const result = applyYieldEvidence(base, { entries: [
      { recipeId: 'r', variantId: 'a', outputStatus: 'random-only', sourceRecipeId: 346, sourceUrl: 'https://bdocodex.com/kr/recipe/346/', randomOutputs: [{ itemId: 1, min: 1, max: 1 }] },
    ] })
    expect(result.recipes.r.variants[0].yield).toBeUndefined()
    expect(result.recipes.r.variants[0].outputEvidence).toEqual({ status: 'random-only', sourceUrl: 'https://bdocodex.com/kr/recipe/346/', randomOutputs: [{ itemId: 1, min: 1, max: 1 }] })
  })
})
