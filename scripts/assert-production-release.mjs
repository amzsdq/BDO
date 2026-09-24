import fs from 'node:fs'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { assertKoreanNameReleaseEvidence } from './korean-name-release-evidence.mjs'
import { assertYieldReleaseEvidence } from './yield-release-evidence.mjs'

function fail(message) { console.error(`release blocked: ${message}`); process.exit(1) }
function sha256(file) { return createHash('sha256').update(fs.readFileSync(file)).digest('hex') }
const args = process.argv.slice(2)
if (args.length !== 6 || args.some((value) => !value || value.startsWith('--'))) fail('usage: node scripts/assert-production-release.mjs <dataset.json> <reconciliation-report.json> <codex-catalog.json> <mastery-evidence.json> <mastery.json> <e2e-release-evidence.json>')
const [datasetFile, reconciliationFile, catalogFile, masteryEvidenceFile, masteryFile, e2eEvidenceFile] = args
for (const file of [datasetFile, reconciliationFile, catalogFile, masteryEvidenceFile, masteryFile, e2eEvidenceFile]) {
  if (!fs.existsSync(file)) fail(`required release artifact not found: ${file}`)
}
let dataset
try {
  dataset = JSON.parse(fs.readFileSync(datasetFile, 'utf8'))
  assertKoreanNameReleaseEvidence(dataset)
  assertYieldReleaseEvidence(dataset)
} catch (error) { fail(error instanceof Error ? error.message : String(error)) }

const readinessArgs = [datasetFile, reconciliationFile, catalogFile, masteryEvidenceFile, masteryFile]
const existingGate = spawnSync(process.execPath, ['scripts/assert-release-readiness.mjs', ...readinessArgs], { cwd: process.cwd(), encoding: 'utf8' })
if (existingGate.status !== 0) { process.stderr.write(existingGate.stderr || existingGate.stdout || 'release blocked: existing readiness gate failed\n'); process.exit(1) }

const e2eGate = spawnSync(process.execPath, ['scripts/assert-e2e-release-evidence.mjs', e2eEvidenceFile], { cwd: process.cwd(), encoding: 'utf8' })
if (e2eGate.status !== 0) { process.stderr.write(e2eGate.stderr || e2eGate.stdout || 'release blocked: E2E evidence gate failed\n'); process.exit(1) }

let evidence, reconciliation
try {
  evidence = JSON.parse(fs.readFileSync(e2eEvidenceFile, 'utf8'))
  reconciliation = JSON.parse(fs.readFileSync(reconciliationFile, 'utf8'))
} catch (error) { fail(`cannot parse release evidence: ${error instanceof Error ? error.message : String(error)}`) }
const git = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: process.cwd(), encoding: 'utf8' })
if (git.status !== 0) fail('cannot resolve exact release git HEAD')
const head = git.stdout.trim()
if (evidence.mainCommit !== head) fail(`E2E evidence mainCommit ${evidence.mainCommit} does not match release HEAD ${head}`)
if (evidence.datasetFingerprint !== dataset.metadata?.fingerprint) fail('E2E evidence datasetFingerprint does not match promoted dataset')
const reconciliationSha256 = sha256(reconciliationFile)
if (evidence.reconciliationFingerprint !== reconciliationSha256) fail('E2E evidence reconciliationFingerprint does not match reconciliation artifact SHA-256')
if (evidence.reconciliationTimestamp !== reconciliation.generatedAt) fail('E2E evidence reconciliationTimestamp does not match reconciliation generatedAt')
const masteryEvidenceSha256 = sha256(masteryEvidenceFile)
if (evidence.masteryEvidenceFingerprint !== masteryEvidenceSha256) fail('E2E evidence masteryEvidenceFingerprint does not match mastery-evidence artifact SHA-256')
const masterySha256 = sha256(masteryFile)
if (evidence.masterySha256 !== masterySha256) fail('E2E evidence masterySha256 does not match production mastery.json bytes')

process.stdout.write(existingGate.stdout)
process.stdout.write(e2eGate.stdout)
