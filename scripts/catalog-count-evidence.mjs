export function normalizeExpectedCountEvidence(value, skill) {
  const entry = value?.[skill]
  if (entry == null) return null
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    return { valid: false, reason: `${skill} expected count must include count, source, and observedAt provenance` }
  }
  const count = Number(entry.count)
  if (!Number.isSafeInteger(count) || count <= 0) return { valid: false, reason: `${skill} expected count must be a positive integer` }
  const source = String(entry.source || '').trim()
  if (!source) return { valid: false, reason: `${skill} expected count source is required` }
  const observedAt = String(entry.observedAt || '').trim()
  if (!observedAt || !Number.isFinite(Date.parse(observedAt))) return { valid: false, reason: `${skill} expected count observedAt must be an ISO-compatible timestamp` }
  return { valid: true, count, source, observedAt }
}
