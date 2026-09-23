import { describe, expect, it } from 'vitest'
import { assertMasteryReleaseEvidence, validateMasteryReleaseEvidence } from './mastery-release-evidence.mjs'

function validEvidence() {
  return {
    schemaVersion: 1,
    releaseReady: true,
    semanticRateMapping: 'VERIFIED',
    crossCheck: { pass: true, cooking: { pass: true }, alchemy: { pass: true } },
    masterySha256: 'a'.repeat(64),
    sourceRevision: 'v0.1.9@5bf11bd',
    clientFingerprint: 'client-abc',
    extractedAt: '2026-09-23T00:00:00Z',
  }
}

describe('mastery release evidence', () => {
  it('accepts only a provenance-bound two-skill cross-check pass', () => {
    expect(validateMasteryReleaseEvidence(validEvidence())).toEqual({ ok: true, errors: [] })
  })

  it.each([
    ['releaseReady', false, 'not release-ready'],
    ['semanticRateMapping', 'UNVERIFIED', 'semantic mapping'],
    ['sourceRevision', 'unrecorded', 'source revision'],
    ['clientFingerprint', '', 'client fingerprint'],
    ['extractedAt', 'not-a-date', 'timestamp'],
  ])('fails closed when %s is invalid', (field, value, message) => {
    const evidence = validEvidence()
    evidence[field] = value
    expect(() => assertMasteryReleaseEvidence(evidence)).toThrow(message)
  })

  it('requires both skill cross-checks even if the aggregate flag claims pass', () => {
    const evidence = validEvidence()
    evidence.crossCheck.alchemy.pass = false
    expect(() => assertMasteryReleaseEvidence(evidence)).toThrow(/both skills/)
  })
})
