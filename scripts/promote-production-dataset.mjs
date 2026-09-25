import fs from 'node:fs'
import { spawnSync } from 'node:child_process'
import { assertKoreanNameReleaseEvidence } from './korean-name-release-evidence.mjs'
import { assertYieldReleaseEvidence } from './yield-release-evidence.mjs'
import { assertClientFingerprint, assertReviewedExtractorRevision } from './production-source-contract.mjs'

function fail(message) { console.error(`promotion blocked: ${message}`); process.exit(1) }
const args = process.argv.slice(2)
if (args.length < 3 || args.length > 4 || args.some((value) => !value || value.startsWith('--'))) fail('usage: node scripts/promote-production-dataset.mjs <dataset.json> <reconciliation-report.json> <codex-catalog.json> [out.json]')
const [datasetFile] = args
if (!fs.existsSync(datasetFile)) fail(`dataset not found: ${datasetFile}`)
try {
  const dataset = JSON.parse(fs.readFileSync(datasetFile, 'utf8'))
  assertReviewedExtractorRevision(dataset.metadata?.sourceRevision)
  assertClientFingerprint(dataset.metadata?.clientFingerprint)
  assertKoreanNameReleaseEvidence(dataset)
  assertYieldReleaseEvidence(dataset)
} catch (error) { fail(error instanceof Error ? error.message : String(error)) }
const promotion = spawnSync(process.execPath, ['scripts/promote-release-dataset.mjs', ...args], { cwd: process.cwd(), encoding: 'utf8' })
if (promotion.status !== 0) { process.stderr.write(promotion.stderr || promotion.stdout || 'promotion blocked: existing promotion gate failed\n'); process.exit(1) }
process.stdout.write(promotion.stdout)
