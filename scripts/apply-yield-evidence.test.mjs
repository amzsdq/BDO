import { describe, expect, it } from 'vitest'
import { applyYieldEvidence } from './apply-yield-evidence.mjs'

const dataset = { metadata: { supportedRegion: 'KR', fingerprint: 'stale' }, recipes: { 'cooking:1': { id: 'cooking:1', skill: 'cooking', outputItemId: 1, yield: { min: 1, max: 1, provenance: 'unknown-server-yield' }, variants: [{ id: 'v1', inputs: [{ itemId: 2, count: 1 }] }] } } }
const evidence = { source: 'reviewed KR recipe yield evidence', entries: [{ recipeId: 'cooking:1', min: 1, expected: 2.5, max: 4, sourceUrl: 'https://bdocodex.com/kr/recipe/594/', sourceRecipeId: 594 }] }

describe('applyYieldEvidence', () => {
  it('replaces unknown yield with bounded reviewed evidence and invalidates stale fingerprint', () => {
    const result = applyYieldEvidence(dataset, evidence)
    expect(result.recipes['cooking:1'].yield).toEqual({ min: 1, expected: 2.5, max: 4, provenance: 'https://bdocodex.com/kr/recipe/594/', sourceRecipeId: 594 })
    expect(result.metadata.fingerprint).toBeUndefined()
    expect(result.metadata.yieldEvidenceApplied).toBe(true)
    expect(result.metadata.yieldEvidenceCount).toBe(1)
  })

  it('fails closed on unknown/duplicate recipes, invalid bounds, or non-https provenance', () => {
    expect(() => applyYieldEvidence(dataset, { entries: [{ ...evidence.entries[0], recipeId: 'missing' }] })).toThrow(/unknown recipe/)
    expect(() => applyYieldEvidence(dataset, { entries: [evidence.entries[0], evidence.entries[0]] })).toThrow(/duplicate/)
    expect(() => applyYieldEvidence(dataset, { entries: [{ ...evidence.entries[0], min: 5, max: 4 }] })).toThrow(/min exceeds max/)
    expect(() => applyYieldEvidence(dataset, { entries: [{ ...evidence.entries[0], expected: 9 }] })).toThrow(/between min and max/)
    expect(() => applyYieldEvidence(dataset, { entries: [{ ...evidence.entries[0], sourceUrl: 'https://example.com', sourceRecipeId: 594 }] })).toThrow(/https URL/)
  })
})
