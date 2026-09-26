import { SUBSTITUTION_BINDING_POLICY, SUBSTITUTION_BINDING_POLICY_SHA256 } from './substitution-binding-policy.mjs'
import { describe, expect, it } from 'vitest'
import { assertProductionWebEvidenceBindings } from './production-web-evidence-bindings.mjs'

describe('production web evidence release bindings', () => {
  it('accepts exact item-name and substitution evidence hashes', () => {
    expect(assertProductionWebEvidenceBindings({ metadata: { koreanNameEvidence: { sha256: 'a'.repeat(64) }, substitutionEvidenceApplied: true, substitutionEvidenceSha256: 'b'.repeat(64), substitutionBindingPolicy: SUBSTITUTION_BINDING_POLICY, substitutionBindingPolicySha256: SUBSTITUTION_BINDING_POLICY_SHA256 } })).toEqual({
      koreanNameEvidenceSha256: 'a'.repeat(64),
      substitutionEvidenceSha256: 'b'.repeat(64),
      substitutionBindingPolicySha256: SUBSTITUTION_BINDING_POLICY_SHA256,
    })
  })
  it('fails closed when either exact byte binding is absent', () => {
    expect(() => assertProductionWebEvidenceBindings({ metadata: { substitutionEvidenceApplied: true, substitutionEvidenceSha256: 'b'.repeat(64) } })).toThrow(/Korean-name evidence SHA-256/)
    expect(() => assertProductionWebEvidenceBindings({ metadata: { koreanNameEvidence: { sha256: 'a'.repeat(64) }, substitutionEvidenceApplied: true } })).toThrow(/substitution evidence SHA-256/)
  })
  it('fails closed when the embedded reviewed policy does not match its fingerprint', () => { const metadata = { koreanNameEvidence: { sha256: 'a'.repeat(64) }, substitutionEvidenceApplied: true, substitutionEvidenceSha256: 'b'.repeat(64), substitutionBindingPolicy: { ...SUBSTITUTION_BINDING_POLICY, version: 999 }, substitutionBindingPolicySha256: SUBSTITUTION_BINDING_POLICY_SHA256 }; expect(() => assertProductionWebEvidenceBindings({ metadata })).toThrow(/embedded reviewed substitution binding policy/) })
  it('fails closed on missing or stale reviewed substitution policy fingerprint', () => {
    const base = { koreanNameEvidence: { sha256: 'a'.repeat(64) }, substitutionEvidenceApplied: true, substitutionEvidenceSha256: 'b'.repeat(64) }
    expect(() => assertProductionWebEvidenceBindings({ metadata: base })).toThrow(/reviewed substitution binding policy SHA-256/)
    expect(() => assertProductionWebEvidenceBindings({ metadata: { ...base, substitutionBindingPolicySha256: 'c'.repeat(64) } })).toThrow(/reviewed substitution binding policy SHA-256/)
  })
})
