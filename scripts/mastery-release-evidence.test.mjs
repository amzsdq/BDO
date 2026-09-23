import { describe, expect, it } from 'vitest'
import { assertMasteryReleaseEvidence, masterySnapshotSha256, validateMasteryReleaseEvidence } from './mastery-release-evidence.mjs'

const masteryBytes = Buffer.from('{"cooking":[],"alchemy":[]}')
function validEvidence() {
  return {
    schemaVersion: 1,
    releaseReady: true,
    semanticRateMapping: 'VERIFIED',
    crossCheck: { pass: true, cooking: { pass: true }, alchemy: { pass: true } },
    masterySha256: masterySnapshotSha256(masteryBytes),
    sourceRevision: 'v0.1.9@5bf11bd',
    clientFingerprint: 'client-abc',
    extractedAt: '2026-09-23T00:00:00Z',
  }
}

describe('mastery release evidence', () => {
  it('accepts only a provenance-bound two-skill cross-check pass for the exact client snapshot', () => {
    expect(validateMasteryReleaseEvidence(validEvidence(), masteryBytes)).toEqual({ ok: true, errors: [] })
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
    expect(() => assertMasteryReleaseEvidence(evidence, masteryBytes)).toThrow(message)
  })

  it('requires both skill cross-checks even if the aggregate flag claims pass', () => {
    const evidence = validEvidence()
    evidence.crossCheck.alchemy.pass = false
    expect(() => assertMasteryReleaseEvidence(evidence, masteryBytes)).toThrow(/both skills/)
  })

  it('rejects a valid-looking evidence envelope copied onto different mastery.json bytes', () => {
    expect(() => assertMasteryReleaseEvidence(validEvidence(), Buffer.from('{"tampered":true}'))).toThrow(/different client snapshot bytes/)
  })
})
