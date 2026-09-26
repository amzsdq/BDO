import { describe, expect, it } from 'vitest'
import { assertYieldReleaseEvidence } from './yield-release-evidence.mjs'

const verified = { metadata: { yieldEvidenceApplied: true, yieldEvidenceCount: 1 }, recipes: { r: { id: 'r', yield: { min: 1, expected: 2, max: 4, provenance: 'https://bdocodex.com/kr/recipe/594/', sourceRecipeId: 594 } } } }

describe('assertYieldReleaseEvidence', () => {
  it('accepts complete canonical Codex yield coverage', () => { expect(assertYieldReleaseEvidence(verified)).toBe(true) })
  it('requires complete evidence for every selectable variant route', () => {
    const variantVerified = { metadata: { yieldEvidenceApplied: true, yieldEvidenceCount: 2 }, recipes: { r: { id: 'r', yield: { min: 1, max: 1, provenance: 'unknown-server-yield' }, variants: [
      { id: 'a', sourceRecipeId: 169, yield: { min: 1, max: 4, provenance: 'https://bdocodex.com/kr/recipe/169/' } },
      { id: 'b', sourceRecipeId: 637, yield: { min: 1, max: 1, provenance: 'https://bdocodex.com/kr/recipe/637/' } },
    ] } } }
    expect(assertYieldReleaseEvidence(variantVerified)).toBe(true)
    expect(() => assertYieldReleaseEvidence({ ...variantVerified, metadata: { yieldEvidenceApplied: true, yieldEvidenceCount: 1 } })).toThrow(/routes=2/)
    const broken = structuredClone(variantVerified); delete broken.recipes.r.variants[1].sourceRecipeId
    expect(() => assertYieldReleaseEvidence(broken)).toThrow(/r:b/)
  })

  it('accepts explicit random-only evidence without inventing deterministic yield', () => {
    const randomOnly = { metadata: { yieldEvidenceApplied: true, yieldEvidenceCount: 1 }, recipes: { r: { id: 'r', variants: [{ id: 'v', sourceRecipeId: 346, outputEvidence: { status: 'random-only', sourceUrl: 'https://bdocodex.com/kr/recipe/346/', randomOutputs: [{ itemId: 45340, min: 1, max: 1 }] } }] } } }
    expect(assertYieldReleaseEvidence(randomOnly)).toBe(true)
    const unresolved = structuredClone(randomOnly); unresolved.recipes.r.variants[0].outputEvidence.status = 'unresolved'
    expect(() => assertYieldReleaseEvidence(unresolved)).toThrow(/r:v/)
  })

  it('blocks selectable routes whose output semantics are unavailable or multiple-base', () => {
    for (const status of ['unavailable', 'multiple-base']) {
      const route = { metadata: { yieldEvidenceApplied: true, yieldEvidenceCount: 1 }, recipes: { r: { id: 'r', variants: [{ id: 'v', sourceRecipeId: 700, outputEvidence: { status, sourceUrl: 'https://bdocodex.com/kr/recipe/700/', baseOutputs: status === 'multiple-base' ? [{ itemId: 1, min: 1, max: 1 }, { itemId: 2, min: 1, max: 1 }] : [] } }] } } }
      expect(() => assertYieldReleaseEvidence(route)).toThrow(/r:v/)
    }
  })

  it('accepts explicit no-output source accounting without inventing output', () => {
    const noOutput = { metadata: { yieldEvidenceApplied: true, yieldEvidenceCount: 1 }, recipes: { r: { id: 'r', variants: [{ id: 'v', sourceRecipeId: 343, outputEvidence: { status: 'no-output', sourceUrl: 'https://bdocodex.com/kr/recipe/343/' } }] } } }
    expect(assertYieldReleaseEvidence(noOutput)).toBe(true)
  })

  it('rejects unknown server yield and incomplete coverage', () => {
    expect(() => assertYieldReleaseEvidence({ ...verified, recipes: { r: { id: 'r', yield: { min: 1, max: 1, provenance: 'unknown-server-yield' } } } })).toThrow(/canonical Codex KR/)
    expect(() => assertYieldReleaseEvidence({ ...verified, recipes: { r: { id: 'r', yield: { min: 1, max: 4, provenance: 'https://bdocodex.com/kr/recipe/595/', sourceRecipeId: 594 } } } })).toThrow(/canonical Codex KR/)
    expect(() => assertYieldReleaseEvidence({ ...verified, metadata: { yieldEvidenceApplied: true, yieldEvidenceCount: 0 } })).toThrow(/coverage is incomplete/)
  })
})
