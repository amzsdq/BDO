import { SUBSTITUTION_BINDING_POLICY_SHA256 } from './substitution-binding-policy.mjs'

export function assertProductionWebEvidenceBindings(dataset) {
  const metadata = dataset?.metadata || {}
  const nameSha = String(metadata.koreanNameEvidence?.sha256 || '')
  const substitutionSha = String(metadata.substitutionEvidenceSha256 || '')
  const policySha = String(metadata.substitutionBindingPolicySha256 || '')
  if (!/^[0-9a-f]{64}$/.test(nameSha)) throw new Error('exact Korean-name evidence SHA-256 binding is required')
  if (metadata.substitutionEvidenceApplied !== true) throw new Error('production substitution evidence must be applied')
  if (!/^[0-9a-f]{64}$/.test(substitutionSha)) throw new Error('exact substitution evidence SHA-256 binding is required')
  if (policySha !== SUBSTITUTION_BINDING_POLICY_SHA256) throw new Error('exact reviewed substitution binding policy SHA-256 is required')
  return { koreanNameEvidenceSha256: nameSha, substitutionEvidenceSha256: substitutionSha, substitutionBindingPolicySha256: policySha }
}
