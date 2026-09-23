import fs from 'node:fs'
import { spawnSync } from 'node:child_process'
import { assertMasteryReleaseEvidence } from './mastery-release-evidence.mjs'

function fail(message) { console.error(`release blocked: ${message}`); process.exit(1) }

const [datasetFile, reconciliationFile, catalogFile, masteryEvidenceFile, masteryFile] = process.argv.slice(2)
if (!datasetFile || !reconciliationFile || !catalogFile || !masteryEvidenceFile || !masteryFile) {
  fail('usage: node scripts/assert-release-readiness.mjs <dataset.json> <reconciliation-report.json> <codex-catalog.json> <mastery-evidence.json> <mastery.json>')
}

const datasetGate = spawnSync(process.execPath, ['scripts/assert-release-dataset.mjs', datasetFile, reconciliationFile, catalogFile], {
  cwd: process.cwd(), encoding: 'utf8',
})
if (datasetGate.status !== 0) {
  process.stderr.write(datasetGate.stderr || datasetGate.stdout || 'release blocked: dataset gate failed\n')
  process.exit(1)
}
if (!fs.existsSync(masteryEvidenceFile)) fail('production mastery evidence is required')
if (!fs.existsSync(masteryFile)) fail('production mastery.json snapshot is required')
const evidence = JSON.parse(fs.readFileSync(masteryEvidenceFile, 'utf8'))
const masteryBytes = fs.readFileSync(masteryFile)
try { assertMasteryReleaseEvidence(evidence, masteryBytes) } catch (error) { fail(error instanceof Error ? error.message : String(error)) }

console.log(JSON.stringify({ ok: true, dataset: JSON.parse(datasetGate.stdout), masterySha256: evidence.masterySha256, masteryCrossCheck: 'PASS' }))
