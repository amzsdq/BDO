import { describe, expect, it } from 'vitest'
import { validateAcceptedDiffs } from './reconciliation-review.mjs'

const diffs = [{ key: 'CODEX_ONLY:1:cooking:item:10', kind: 'CODEX_ONLY' }]

describe('reconciliation review evidence', () => {
  it('rejects a bare key waiver', () => {
    const result = validateAcceptedDiffs({ acceptedDiffs: [{ key: diffs[0].key }] }, diffs)
    expect(result.accepted.size).toBe(0)
    expect(result.errors.join('\n')).toMatch(/kind mismatch/)
    expect(result.errors.join('\n')).toMatch(/rationale is required/)
    expect(result.errors.join('\n')).toMatch(/evidence reference is required/)
    expect(result.errors.join('\n')).toMatch(/reviewedAt is required/)
  })

  it('accepts an evidence-bearing review record for the exact current diff kind', () => {
    const result = validateAcceptedDiffs({ acceptedDiffs: [{
      key: diffs[0].key,
      kind: 'CODEX_ONLY',
      rationale: 'Codex page is independently verified as retired content.',
      evidence: ['https://example.invalid/review/retired-recipe'],
      reviewedAt: '2026-09-23T00:00:00Z',
    }] }, diffs)
    expect(result.errors).toEqual([])
    expect([...result.accepted]).toEqual([diffs[0].key])
  })
})
