import fs from 'node:fs'
import { spawnSync } from 'node:child_process'
import { assertMasteryReleaseEvidence } from './mastery-release-evidence.mjs'

function fail(message) { console.error(`release blocked: ${message}`); process.exit(1) }

const args = process.argv.slice(2)
if (args.length !== 6 || args.some((value) => !value || value.startsWith('--'))) {
  fail('usage: node scripts/assert-release-readiness.mjs <dataset.json> <reconciliation-report.json> <codex-catalog.json> <codex-details.json> <mastery-evidence.json> <mastery.json>')
}
const [datasetFile, reconciliationFile, catalogFile, codexManifestFile, masteryEvidenceFile, masteryFile] = args

const datasetGate = spawnSync(process.execPath, ['scripts/assert-release-dataset.mjs', datasetFile, reconciliationFile, catalogFile, codexManifestFile], {
  cwd: process.cwd(), encoding: 'utf8',
})
if (datasetGate.status !== 0) {
  process.stderr.write(datasetGate.stderr || datasetGate.stdout || 'release blocked: dataset gate failed\n')
  process.exit(1)
}
if (!fs.existsSync(masteryEvidenceFile)) fail('production mastery evidence is required')
if (!fs.existsSync(masteryFile)) fail('production mastery.json snapshot is required')
const dataset = JSON.parse(fs.readFileSync(datasetFile, 'utf8'))
const evidence = JSON.parse(fs.readFileSync(masteryEvidenceFile, 'utf8'))
const masteryBytes = fs.readFileSync(masteryFile)
try { assertMasteryReleaseEvidence(evidence, masteryBytes) } catch (error) { fail(error instanceof Error ? error.message : String(error)) }
if (evidence.sourceRevision !== dataset.metadata?.sourceRevision) {
  fail(`mastery source revision does not match dataset snapshot: dataset=${dataset.metadata?.sourceRevision || 'missing'} mastery=${evidence.sourceRevision || 'missing'}`)
}
if (!String(dataset.metadata?.clientFingerprint || '').trim()) fail('dataset client fingerprint is missing')
if (evidence.clientFingerprint !== dataset.metadata.clientFingerprint) fail('mastery client fingerprint does not match dataset snapshot')

console.log(JSON.stringify({ ok: true, dataset: JSON.parse(datasetGate.stdout), masterySha256: evidence.masterySha256, masteryCrossCheck: 'PASS' }))
