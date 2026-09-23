const NON_WAIVABLE_RELEASE_DIFF_KINDS = new Set([
  // A live Codex recipe absent from the canonical client dataset is a missing
  // recipe until the catalog itself is independently reclassified non-live.
  // Review metadata must never turn that release blocker into a pass.
  'CODEX_ONLY',
])

export function validateAcceptedDiffs(review, diffs) {
  const byKey = new Map(diffs.map((diff) => [diff.key, diff]))
  const accepted = new Set()
  const errors = []
  for (const entry of review?.acceptedDiffs || []) {
    const diff = byKey.get(entry?.key)
    if (!diff) { errors.push(`accepted diff key not present in current reconciliation: ${entry?.key || 'missing'}`); continue }
    if (entry.kind !== diff.kind) errors.push(`${entry.key}: accepted diff kind mismatch (${entry.kind || 'missing'} != ${diff.kind})`)
    if (NON_WAIVABLE_RELEASE_DIFF_KINDS.has(diff.kind)) errors.push(`${entry.key}: ${diff.kind} is non-waivable for release; resolve canonical/live-state evidence instead`)
    if (typeof entry.rationale !== 'string' || entry.rationale.trim().length < 10) errors.push(`${entry.key}: evidence rationale is required`)
    if (!Array.isArray(entry.evidence) || !entry.evidence.length || entry.evidence.some((value) => typeof value !== 'string' || !/^https?:\/\//.test(value))) errors.push(`${entry.key}: at least one HTTP(S) evidence reference is required`)
    if (!entry.reviewedAt || Number.isNaN(Date.parse(entry.reviewedAt))) errors.push(`${entry.key}: reviewedAt is required`)
    if (!errors.some((error) => error.startsWith(`${entry.key}:`))) accepted.add(entry.key)
  }
  return { accepted, errors }
}
