export function assertProductionWebEvidenceBindings(dataset) {
  const metadata = dataset?.metadata || {}
  const nameSha = String(metadata.koreanNameEvidence?.sha256 || '')
  const substitutionSha = String(metadata.substitutionEvidenceSha256 || '')
  if (!/^[0-9a-f]{64}$/.test(nameSha)) throw new Error('exact Korean-name evidence SHA-256 binding is required')
  if (metadata.substitutionEvidenceApplied !== true) throw new Error('production substitution evidence must be applied')
  if (!/^[0-9a-f]{64}$/.test(substitutionSha)) throw new Error('exact substitution evidence SHA-256 binding is required')
  return { koreanNameEvidenceSha256: nameSha, substitutionEvidenceSha256: substitutionSha }
}
