import { describe, expect, it } from 'vitest'
import { assertClientFingerprint, assertReviewedExtractorRevision } from './production-source-contract.mjs'

describe('production source contract', () => {
  it('accepts only the reviewed extractor commit', () => {
    expect(assertReviewedExtractorRevision('iDevelopThings/bdo-data-extractor@5bf11bd7bc60dcbb6126be34bf3d76633abdd8b2')).toContain('5bf11bd7')
    expect(() => assertReviewedExtractorRevision('iDevelopThings/bdo-data-extractor@0000000000000000000000000000000000000000')).toThrow(/unreviewed/)
  })
  it('requires a full sha256 client snapshot fingerprint', () => {
    expect(assertClientFingerprint('sha256:' + 'a'.repeat(64))).toContain('sha256:')
    expect(() => assertClientFingerprint('5a0c1234')).toThrow(/64hex/)
  })
})
