export function validateMasteryReleaseEvidence(evidence) {
  const errors = []
  if (evidence?.schemaVersion !== 1) errors.push('unsupported mastery evidence schema')
  if (evidence?.releaseReady !== true) errors.push('mastery evidence is not release-ready')
  if (evidence?.semanticRateMapping !== 'VERIFIED') errors.push('mastery semantic mapping is not verified')
  if (evidence?.crossCheck?.pass !== true || evidence?.crossCheck?.cooking?.pass !== true || evidence?.crossCheck?.alchemy?.pass !== true) errors.push('client/runtime mastery cross-check did not pass for both skills')
  if (!/^[a-f0-9]{64}$/.test(String(evidence?.masterySha256 || ''))) errors.push('mastery client snapshot fingerprint is missing')
  if (!String(evidence?.sourceRevision || '').trim() || String(evidence.sourceRevision).toLowerCase() === 'unrecorded') errors.push('mastery source revision is not recorded')
  if (!String(evidence?.clientFingerprint || '').trim()) errors.push('mastery client fingerprint is not recorded')
  if (!Number.isFinite(Date.parse(String(evidence?.extractedAt || '')))) errors.push('mastery extraction timestamp is invalid')
  return { ok: errors.length === 0, errors }
}

export function assertMasteryReleaseEvidence(evidence) {
  const result = validateMasteryReleaseEvidence(evidence)
  if (!result.ok) throw new Error(result.errors.join('; '))
  return evidence
}
