import { describe, expect, it } from 'vitest'
import { validateAcceptedDiffs } from './reconciliation-review.mjs'

const codexOnly = [{ key: 'CODEX_ONLY:1:cooking:item:10', kind: 'CODEX_ONLY' }]

describe('reconciliation review evidence', () => {
  it('rejects a bare key waiver', () => {
    const result = validateAcceptedDiffs({ acceptedDiffs: [{ key: codexOnly[0].key }] }, codexOnly)
    expect(result.accepted.size).toBe(0)
    expect(result.errors.join('\n')).toMatch(/kind mismatch/)
    expect(result.errors.join('\n')).toMatch(/non-waivable/)
    expect(result.errors.join('\n')).toMatch(/rationale is required/)
    expect(result.errors.join('\n')).toMatch(/evidence reference is required/)
    expect(result.errors.join('\n')).toMatch(/reviewedAt is required/)
  })

  it('does not allow an evidence-bearing live CODEX_ONLY diff to be reviewed away', () => {
    const result = validateAcceptedDiffs({ acceptedDiffs: [{
      key: codexOnly[0].key,
      kind: 'CODEX_ONLY',
      rationale: 'Review metadata alone must not erase a live missing recipe.',
      evidence: ['https://example.invalid/review/recipe'],
      reviewedAt: '2026-09-23T00:00:00Z',
    }] }, codexOnly)
    expect(result.accepted.size).toBe(0)
    expect(result.errors).toContain(`${codexOnly[0].key}: CODEX_ONLY is non-waivable for release; resolve canonical/live-state evidence instead`)
  })

  it('continues to accept an evidence-bearing waivable diff kind', () => {
    const diffs = [{ key: 'CLIENT_ONLY:cooking:item:10', kind: 'CLIENT_ONLY' }]
    const result = validateAcceptedDiffs({ acceptedDiffs: [{
      key: diffs[0].key,
      kind: 'CLIENT_ONLY',
      rationale: 'Independent evidence establishes why the Codex side omits it.',
      evidence: ['https://example.invalid/review/client-only'],
      reviewedAt: '2026-09-23T00:00:00Z',
    }] }, diffs)
    expect(result.errors).toEqual([])
    expect([...result.accepted]).toEqual([diffs[0].key])
  })
})
