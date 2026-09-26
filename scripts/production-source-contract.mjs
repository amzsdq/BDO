export const REVIEWED_EXTRACTOR_REVISIONS = new Set([
  'iDevelopThings/bdo-data-extractor@5bf11bd7bc60dcbb6126be34bf3d76633abdd8b2',
])

export function assertReviewedExtractorRevision(value) {
  const revision = String(value ?? '').trim()
  if (!REVIEWED_EXTRACTOR_REVISIONS.has(revision)) {
    throw new Error(`unreviewed bdo-data-extractor revision: ${revision || '<missing>'}`)
  }
  return revision
}

export function assertClientFingerprint(value) {
  const fingerprint = String(value ?? '').trim()
  if (!/^sha256:[a-f0-9]{64}$/.test(fingerprint)) {
    throw new Error('clientFingerprint must be sha256:<64hex>')
  }
  return fingerprint
}
