import { describe, expect, it } from 'vitest'
import { applyYieldEvidence } from './apply-yield-evidence.mjs'

describe('no-output source evidence', () => {
  it('records an explicit source route without fabricating yield or outputs', () => {
    const dataset = { metadata: {}, recipes: { r: { id: 'r', variants: [{ id: 'v', inputs: [], yield: { min: 1, max: 9, provenance: 'stale' } }] } } }
    const result = applyYieldEvidence(dataset, { entries: [{ recipeId: 'r', variantId: 'v', outputStatus: 'no-output', sourceRecipeId: 343, sourceUrl: 'https://bdocodex.com/kr/recipe/343/' }] })
    expect(result.recipes.r.variants[0]).toMatchObject({ sourceRecipeId: 343, outputEvidence: { status: 'no-output', sourceUrl: 'https://bdocodex.com/kr/recipe/343/' } })
    expect(result.recipes.r.variants[0].yield).toBeUndefined()
  })
})
