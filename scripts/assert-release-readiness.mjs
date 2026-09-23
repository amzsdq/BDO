import fs from 'node:fs'
import { spawnSync } from 'node:child_process'

function fail(message) { console.error(`release blocked: ${message}`); process.exit(1) }

const [datasetFile, reconciliationFile, catalogFile, masteryEvidenceFile] = process.argv.slice(2)
if (!datasetFile || !reconciliationFile || !catalogFile || !masteryEvidenceFile) {
  fail('usage: node scripts/assert-release-readiness.mjs <dataset.json> <reconciliation-report.json> <codex-catalog.json> <mastery-evidence.json>')
}

const datasetGate = spawnSync(process.execPath, ['scripts/assert-release-dataset.mjs', datasetFile, reconciliationFile, catalogFile], {
  cwd: process.cwd(), encoding: 'utf8',
})
if (datasetGate.status !== 0) {
  process.stderr.write(datasetGate.stderr || datasetGate.stdout || 'release blocked: dataset gate failed\n')
  process.exit(1)
}
if (!fs.existsSync(masteryEvidenceFile)) fail('production mastery evidence is required')
const evidence = JSON.parse(fs.readFileSync(masteryEvidenceFile, 'utf8'))
if (evidence.schemaVersion !== 1) fail('unsupported mastery evidence schema')
if (evidence.releaseReady !== true) fail('mastery evidence is not release-ready')
if (evidence.semanticRateMapping !== 'VERIFIED') fail('mastery semantic mapping is not verified')
if (evidence.crossCheck?.pass !== true || evidence.crossCheck?.cooking?.pass !== true || evidence.crossCheck?.alchemy?.pass !== true) {
  fail('client/runtime mastery cross-check did not pass for both skills')
}
if (!/^[a-f0-9]{64}$/.test(String(evidence.masterySha256 || ''))) fail('mastery client snapshot fingerprint is missing')
if (!String(evidence.sourceRevision || '').trim() || String(evidence.sourceRevision).toLowerCase() === 'unrecorded') fail('mastery source revision is not recorded')
if (!String(evidence.clientFingerprint || '').trim()) fail('mastery client fingerprint is not recorded')
if (!Number.isFinite(Date.parse(String(evidence.extractedAt || '')))) fail('mastery extraction timestamp is invalid')

console.log(JSON.stringify({ ok: true, dataset: JSON.parse(datasetGate.stdout), masterySha256: evidence.masterySha256, masteryCrossCheck: 'PASS' }))
