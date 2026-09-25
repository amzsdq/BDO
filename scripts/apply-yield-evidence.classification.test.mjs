import { describe, expect, it } from 'vitest'
import { applyYieldEvidence } from './apply-yield-evidence.mjs'

describe('classified output evidence validation', () => {
  it('rejects random-only evidence with a base output', () => {
    const dataset = { metadata: {}, recipes: { r: { id: 'r', variants: [{ id: 'v', inputs: [] }] } } }
    const entry = { recipeId: 'r', variantId: 'v', outputStatus: 'random-only', sourceRecipeId: 346, sourceUrl: 'https://bdocodex.com/kr/recipe/346/', baseOutputs: [{ itemId: 1, min: 1, max: 1 }] }
    expect(() => applyYieldEvidence(dataset, { entries: [entry] })).toThrow(/requires random outputs and no base outputs/)
  })
})
