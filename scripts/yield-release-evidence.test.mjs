import { describe, expect, it } from 'vitest'
import { assertYieldReleaseEvidence } from './yield-release-evidence.mjs'

const verified = { metadata: { yieldEvidenceApplied: true, yieldEvidenceCount: 1 }, recipes: { r: { id: 'r', yield: { min: 1, expected: 2, max: 4, provenance: 'https://bdocodex.com/kr/recipe/594/', sourceRecipeId: 594 } } } }

describe('assertYieldReleaseEvidence', () => {
  it('accepts complete canonical Codex yield coverage', () => { expect(assertYieldReleaseEvidence(verified)).toBe(true) })
  it('rejects unknown server yield and incomplete coverage', () => {
    expect(() => assertYieldReleaseEvidence({ ...verified, recipes: { r: { id: 'r', yield: { min: 1, max: 1, provenance: 'unknown-server-yield' } } } })).toThrow(/canonical Codex KR/)
    expect(() => assertYieldReleaseEvidence({ ...verified, metadata: { yieldEvidenceApplied: true, yieldEvidenceCount: 0 } })).toThrow(/coverage is incomplete/)
  })
})
