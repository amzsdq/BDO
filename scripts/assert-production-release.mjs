import fs from 'node:fs'
import { spawnSync } from 'node:child_process'
import { assertKoreanNameReleaseEvidence } from './korean-name-release-evidence.mjs'
import { assertYieldReleaseEvidence } from './yield-release-evidence.mjs'

function fail(message) { console.error(`release blocked: ${message}`); process.exit(1) }
const args = process.argv.slice(2)
if (args.length !== 5 || args.some((value) => !value || value.startsWith('--'))) fail('usage: node scripts/assert-production-release.mjs <dataset.json> <reconciliation-report.json> <codex-catalog.json> <mastery-evidence.json> <mastery.json>')
const [datasetFile] = args
if (!fs.existsSync(datasetFile)) fail(`dataset not found: ${datasetFile}`)
try {
  const dataset = JSON.parse(fs.readFileSync(datasetFile, 'utf8'))
  assertKoreanNameReleaseEvidence(dataset)
  assertYieldReleaseEvidence(dataset)
} catch (error) { fail(error instanceof Error ? error.message : String(error)) }
const existingGate = spawnSync(process.execPath, ['scripts/assert-release-readiness.mjs', ...args], { cwd: process.cwd(), encoding: 'utf8' })
if (existingGate.status !== 0) { process.stderr.write(existingGate.stderr || existingGate.stdout || 'release blocked: existing readiness gate failed\n'); process.exit(1) }
process.stdout.write(existingGate.stdout)
