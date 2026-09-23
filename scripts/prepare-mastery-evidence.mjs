import crypto from 'node:crypto'
import fs from 'node:fs'

function fail(message) { throw new Error(message) }
function arg(name) { const index = process.argv.indexOf(`--${name}`); return index >= 0 ? process.argv[index + 1] : undefined }
function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex') }

const masteryPath = arg('mastery')
const outPath = arg('out')
const sourceRevision = String(arg('source-revision') || '').trim()
const clientFingerprint = String(arg('client-fingerprint') || '').trim()
const extractedAt = String(arg('extracted-at') || '').trim()
if (!masteryPath || !outPath || !sourceRevision || !clientFingerprint || !extractedAt) {
  fail('required: --mastery <mastery.json> --out <evidence.json> --source-revision <tag-or-sha> --client-fingerprint <fingerprint> --extracted-at <timestamp>')
}
if (sourceRevision.toLowerCase() === 'unrecorded') fail('source revision must identify the extractor/client snapshot')
if (!Number.isFinite(Date.parse(extractedAt))) fail('extracted-at must be an ISO-compatible timestamp')

const raw = fs.readFileSync(masteryPath)
const mastery = JSON.parse(raw.toString('utf8'))
const expectedBreakpoints = Array.from({ length: 61 }, (_, index) => index * 50)

function validateCurve(name, curve, rateColumns) {
  if (!Array.isArray(curve) || curve.length !== expectedBreakpoints.length) fail(`${name} mastery must contain 61 published 0..3000 breakpoints`)
  const breakpoints = curve.map((row) => Number(row?.mastery))
  if (JSON.stringify(breakpoints) !== JSON.stringify(expectedBreakpoints)) fail(`${name} mastery breakpoints must be exactly 0..3000 in 50-point steps`)
  for (const row of curve) {
    if (!Array.isArray(row.rates) || row.rates.length !== rateColumns || row.rates.some((value) => !Number.isFinite(Number(value)))) {
      fail(`${name} mastery row ${row?.mastery ?? '?'} must contain ${rateColumns} finite raw rate columns`)
    }
  }
  return { rows: curve.length, rawRateColumns: rateColumns, breakpoints }
}

const cooking = validateCurve('cooking', mastery.cooking, 5)
const alchemy = validateCurve('alchemy', mastery.alchemy, 9)
const evidence = {
  schemaVersion: 1,
  source: 'iDevelopThings/bdo-data-extractor mastery.json',
  sourceRevision,
  clientFingerprint,
  extractedAt,
  masterySha256: sha256(raw),
  cooking,
  alchemy,
  semanticRateMapping: 'UNVERIFIED',
  releaseReady: false,
  note: 'Raw client rate columns are preserved and structurally verified, but must not be mapped to named Pearl Abyss effects until source-backed per-skill column semantics are established.',
}
fs.writeFileSync(outPath, `${JSON.stringify(evidence, null, 2)}\n`)
console.log(JSON.stringify({ ok: true, masterySha256: evidence.masterySha256, cookingRows: cooking.rows, alchemyRows: alchemy.rows, releaseReady: false }))
