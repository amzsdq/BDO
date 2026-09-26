import crypto from 'node:crypto'
import fs from 'node:fs'
import { assertMasteryCurvesMatch } from './mastery-crosscheck.mjs'
import { loadRuntimeMasteryRows } from './load-runtime-mastery.mjs'
import { assertReviewedExtractorRevision } from './production-source-contract.mjs'

function fail(message) { throw new Error(message) }
function parseArgs(args) {
  const allowed = new Set(['--mastery', '--out', '--source-revision', '--client-fingerprint', '--extracted-at'])
  const parsed = new Map()
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index]
    const value = args[index + 1]
    if (!allowed.has(flag)) fail(`unknown argument: ${flag || 'missing'}`)
    if (parsed.has(flag)) fail(`duplicate argument: ${flag}`)
    if (value == null || value.startsWith('--')) fail(`missing value for ${flag}`)
    parsed.set(flag, value)
  }
  return parsed
}
function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex') }

const args = parseArgs(process.argv.slice(2))
const masteryPath = args.get('--mastery')
const outPath = args.get('--out')
const sourceRevision = String(args.get('--source-revision') || '').trim()
const clientFingerprint = String(args.get('--client-fingerprint') || '').trim()
const extractedAt = String(args.get('--extracted-at') || '').trim()
if (!masteryPath || !outPath || !sourceRevision || !clientFingerprint || !extractedAt) {
  fail('required: --mastery <mastery.json> --out <evidence.json> --source-revision <tag-or-sha> --client-fingerprint <fingerprint> --extracted-at <timestamp>')
}
if (sourceRevision.toLowerCase() === 'unrecorded') fail('source revision must identify the extractor/client snapshot')
assertReviewedExtractorRevision(sourceRevision)
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
const runtime = await loadRuntimeMasteryRows()
const crossCheck = assertMasteryCurvesMatch({
  cookingClientRows: mastery.cooking,
  alchemyClientRows: mastery.alchemy,
  ...runtime,
})
const evidence = {
  schemaVersion: 1,
  source: 'iDevelopThings/bdo-data-extractor mastery.json',
  sourceRevision,
  clientFingerprint,
  extractedAt,
  masterySha256: sha256(raw),
  cooking,
  alchemy,
  semanticRateMapping: 'VERIFIED',
  semanticMappingProvenance: 'scripts/mastery-client-mapping.mjs',
  runtimeSource: ['src/domain/mastery.ts', 'src/domain/alchemyMastery.ts'],
  crossCheck,
  releaseReady: true,
  note: 'Client mastery raw columns were mapped with reviewed per-skill semantics and matched the exact checked-in runtime curves at every mastery breakpoint.',
}
fs.writeFileSync(outPath, `${JSON.stringify(evidence, null, 2)}\n`)
console.log(JSON.stringify({ ok: true, masterySha256: evidence.masterySha256, cookingRows: cooking.rows, alchemyRows: alchemy.rows, releaseReady: true }))
