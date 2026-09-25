import fs from 'node:fs'
import { spawnSync } from 'node:child_process'
import { assertKoreanNameReleaseEvidence } from './korean-name-release-evidence.mjs'
import { assertYieldReleaseEvidence } from './yield-release-evidence.mjs'
import { assertReleaseE2eBindings } from './release-e2e-bindings.mjs'
import { assertClientFingerprint, assertReviewedExtractorRevision } from './production-source-contract.mjs'

function fail(message) { console.error(`release blocked: ${message}`); process.exit(1) }
const args = process.argv.slice(2)
if (args.length !== 7 || args.some((value) => !value || value.startsWith('--'))) fail('usage: node scripts/assert-production-release.mjs <dataset.json> <reconciliation-report.json> <codex-catalog.json> <codex-details.json> <mastery-evidence.json> <mastery.json> <e2e-release-evidence.json>')
const [datasetFile, reconciliationFile, catalogFile, codexManifestFile, masteryEvidenceFile, masteryFile, e2eEvidenceFile] = args
if (!fs.existsSync(datasetFile)) fail(`required release artifact not found: ${datasetFile}`)
let dataset
try {
  dataset = JSON.parse(fs.readFileSync(datasetFile, 'utf8'))
  assertReviewedExtractorRevision(dataset.metadata?.sourceRevision)
  assertClientFingerprint(dataset.metadata?.clientFingerprint)
  assertKoreanNameReleaseEvidence(dataset)
  assertYieldReleaseEvidence(dataset)
} catch (error) { fail(error instanceof Error ? error.message : String(error)) }
for (const file of [reconciliationFile, catalogFile, codexManifestFile, masteryEvidenceFile, masteryFile, e2eEvidenceFile]) {
  if (!fs.existsSync(file)) fail(`required release artifact not found: ${file}`)
}

const readinessArgs = [datasetFile, reconciliationFile, catalogFile, codexManifestFile, masteryEvidenceFile, masteryFile]
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
try {
  assertReleaseE2eBindings({
    evidence,
    dataset,
    reconciliation,
    reconciliationBytes: fs.readFileSync(reconciliationFile),
    masteryEvidenceBytes: fs.readFileSync(masteryEvidenceFile),
    masteryBytes: fs.readFileSync(masteryFile),
    head: git.stdout.trim(),
  })
} catch (error) { fail(error instanceof Error ? error.message : String(error)) }

process.stdout.write(existingGate.stdout)
process.stdout.write(e2eGate.stdout)
