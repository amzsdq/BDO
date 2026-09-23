import { describe, expect, it } from 'vitest'
import { normalizeExpectedCountEvidence } from './catalog-count-evidence.mjs'

describe('independent catalog count evidence', () => {
  it('rejects legacy bare numeric counts because independence cannot be audited', () => {
    const result = normalizeExpectedCountEvidence({ cooking: 123 }, 'cooking')
    expect(result?.valid).toBe(false)
    expect(result?.reason).toContain('provenance')
  })

  it('requires positive count, source, and timestamp', () => {
    expect(normalizeExpectedCountEvidence({ cooking: { count: 0, source: 'audit', observedAt: '2026-09-23T00:00:00Z' } }, 'cooking')?.valid).toBe(false)
    expect(normalizeExpectedCountEvidence({ cooking: { count: 123, source: '', observedAt: '2026-09-23T00:00:00Z' } }, 'cooking')?.valid).toBe(false)
    expect(normalizeExpectedCountEvidence({ cooking: { count: 123, source: 'independent catalog audit', observedAt: 'not-a-date' } }, 'cooking')?.valid).toBe(false)
  })

  it('normalizes auditable independent evidence', () => {
    expect(normalizeExpectedCountEvidence({ alchemy: { count: 321, source: 'independent catalog audit v1', observedAt: '2026-09-23T00:00:00Z' } }, 'alchemy')).toEqual({
      valid: true,
      count: 321,
      source: 'independent catalog audit v1',
      observedAt: '2026-09-23T00:00:00Z',
    })
  })
})
