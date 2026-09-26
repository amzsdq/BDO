import { describe, expect, it } from 'vitest'
import { assertProductionWebEvidenceBindings } from './production-web-evidence-bindings.mjs'

describe('production web evidence release bindings', () => {
  it('accepts exact item-name and substitution evidence hashes', () => {
    expect(assertProductionWebEvidenceBindings({ metadata: { koreanNameEvidence: { sha256: 'a'.repeat(64) }, substitutionEvidenceApplied: true, substitutionEvidenceSha256: 'b'.repeat(64) } })).toEqual({
      koreanNameEvidenceSha256: 'a'.repeat(64),
      substitutionEvidenceSha256: 'b'.repeat(64),
    })
  })
  it('fails closed when either exact byte binding is absent', () => {
    expect(() => assertProductionWebEvidenceBindings({ metadata: { substitutionEvidenceApplied: true, substitutionEvidenceSha256: 'b'.repeat(64) } })).toThrow(/Korean-name evidence SHA-256/)
    expect(() => assertProductionWebEvidenceBindings({ metadata: { koreanNameEvidence: { sha256: 'a'.repeat(64) }, substitutionEvidenceApplied: true } })).toThrow(/substitution evidence SHA-256/)
  })
})
