import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { reconciliationDatasetFingerprint } from './reconciliation-fingerprint.mjs'

function fail(message) { console.error(`release blocked: ${message}`); process.exit(1) }
function fingerprint(value) { return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex') }
function hasRecordedSourceRevision(value) { const revision = String(value ?? '').trim(); return revision !== '' && revision.toLowerCase() !== 'unrecorded' }
const [file, reconciliationFile] = process.argv.slice(2)
if (!file) fail('usage: node scripts/assert-release-dataset.mjs <dataset.json> [reconciliation-report.json]')
if (!fs.existsSync(file)) fail(`dataset not found: ${file}`)
const structural = spawnSync(process.execPath, ['scripts/validate-dataset.mjs', file], { cwd: process.cwd(), encoding: 'utf8' })
if (structural.status !== 0) fail(`structural validation failed:\n${(structural.stderr || structural.stdout || 'unknown validator failure').trim()}`)
const dataset = JSON.parse(fs.readFileSync(file, 'utf8'))
const metadata = dataset.metadata || {}, items = dataset.items || {}, recipes = dataset.recipes || {}
if (metadata.status !== 'COMPLETE_VERIFIED') fail(`dataset status is ${metadata.status || 'missing'}`)
if (metadata.supportedRegion !== 'KR') fail(`supportedRegion is ${metadata.supportedRegion || 'missing'}`)
if (!metadata.fingerprint) fail('dataset fingerprint missing')
if (!metadata.generatedAt) fail('generatedAt missing')
if (!Array.isArray(metadata.sources) || metadata.sources.length < 2) fail('source provenance incomplete')
if (!hasRecordedSourceRevision(metadata.sourceRevision)) fail('sourceRevision must identify the canonical client snapshot; unrecorded provenance cannot be released')
if (!metadata.counts || metadata.counts.cooking <= 0 || metadata.counts.alchemy <= 0) fail('Cooking/Alchemy counts missing or empty')
const payloadWithoutHash = { ...dataset, metadata: { ...metadata } }
delete payloadWithoutHash.metadata.fingerprint
const actualFingerprint = fingerprint(payloadWithoutHash)
if (actualFingerprint !== metadata.fingerprint) fail(`fingerprint mismatch: recorded=${metadata.fingerprint} actual=${actualFingerprint}`)
const actualCounts = { cooking: Object.values(recipes).filter((recipe) => recipe.skill === 'cooking').length, alchemy: Object.values(recipes).filter((recipe) => recipe.skill === 'alchemy').length }
if (actualCounts.cooking !== metadata.counts.cooking || actualCounts.alchemy !== metadata.counts.alchemy) fail(`recipe count mismatch: metadata=${JSON.stringify(metadata.counts)} actual=${JSON.stringify(actualCounts)}`)
const unresolvedIcons = Object.values(items).filter((item) => !item.iconPath && !item.iconUrl)
if (unresolvedIcons.length) fail(`${unresolvedIcons.length} items have no icon resolution result`)
const invalidLocalIconPaths = Object.values(items).filter((item) => typeof item.iconPath === 'string' && item.iconPath !== `icons/${item.id}.webp`)
if (invalidLocalIconPaths.length) fail(`${invalidLocalIconPaths.length} items have non-canonical local icon paths; first ids: ${invalidLocalIconPaths.slice(0, 20).map((item) => item.id).join(', ')}`)
const localIconRoot = path.resolve(path.dirname(file), '..')
const missingLocalIcons = Object.values(items).filter((item) => typeof item.iconPath === 'string' && !fs.existsSync(path.resolve(localIconRoot, item.iconPath)))
if (missingLocalIcons.length) fail(`${missingLocalIcons.length} canonical local icon assets are missing; first ids: ${missingLocalIcons.slice(0, 20).map((item) => item.id).join(', ')}`)
const placeholderKoreanNames = Object.values(items).filter((item) => /^아이템 #\d+$/.test(String(item.nameKo || '')))
if (placeholderKoreanNames.length) fail(`${placeholderKoreanNames.length} items still have placeholder Korean names`)
if (!reconciliationFile || !fs.existsSync(reconciliationFile)) fail('ZERO_UNEXPLAINED_DIFF reconciliation report is required')
const reconciliation = JSON.parse(fs.readFileSync(reconciliationFile, 'utf8'))
if (reconciliation.status !== 'ZERO_UNEXPLAINED_DIFF' || (reconciliation.unresolved || []).length !== 0) fail('reconciliation evidence is not ZERO_UNEXPLAINED_DIFF')
if (reconciliation.clientRecipeGroups !== Object.keys(recipes).length) fail(`reconciliation client group count ${reconciliation.clientRecipeGroups} does not match dataset recipe count ${Object.keys(recipes).length}`)
const expectedReconciliationFingerprint = reconciliationDatasetFingerprint(dataset)
if (reconciliation.datasetFingerprint !== expectedReconciliationFingerprint) fail(`reconciliation report belongs to different dataset content: recorded=${reconciliation.datasetFingerprint || 'missing'} actual=${expectedReconciliationFingerprint}`)
console.log(JSON.stringify({ ok: true, status: metadata.status, counts: actualCounts, items: Object.keys(items).length, fingerprint: metadata.fingerprint, reconciliation: reconciliation.status }))
