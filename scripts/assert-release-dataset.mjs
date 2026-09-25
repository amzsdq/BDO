import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { reconciliationDatasetFingerprint } from './reconciliation-fingerprint.mjs'
import { validateCatalogEntryEvidence } from './catalog-release-evidence.mjs'

function fail(message) { console.error(`release blocked: ${message}`); process.exit(1) }
function fingerprint(value) { return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex') }
function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex') }
function hasRecordedSourceRevision(value) { const revision = String(value ?? '').trim(); return revision !== '' && revision.toLowerCase() !== 'unrecorded' }
function hasValidTimestamp(value) { return typeof value === 'string' && value.trim() !== '' && Number.isFinite(Date.parse(value)) }
function sortedIds(values) { return [...new Set(values.map(Number).filter((id) => Number.isSafeInteger(id) && id > 0))].sort((a, b) => a - b) }
const args = process.argv.slice(2)
if (args.length !== 3 || args.some((value) => !value || value.startsWith('--'))) fail('usage: node scripts/assert-release-dataset.mjs <dataset.json> <reconciliation-report.json> <codex-catalog.json>')
const [file, reconciliationFile, catalogFile] = args
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
if (!String(metadata.clientFingerprint || '').trim()) fail('clientFingerprint must identify the installed client snapshot')
if (!metadata.counts || metadata.counts.cooking <= 0 || metadata.counts.alchemy <= 0) fail('Cooking/Alchemy counts missing or empty')
const payloadWithoutHash = { ...dataset, metadata: { ...metadata } }
delete payloadWithoutHash.metadata.fingerprint
const actualFingerprint = fingerprint(payloadWithoutHash)
if (actualFingerprint !== metadata.fingerprint) fail(`fingerprint mismatch: recorded=${metadata.fingerprint} actual=${actualFingerprint}`)
const actualCounts = { cooking: Object.values(recipes).filter((recipe) => recipe.skill === 'cooking').length, alchemy: Object.values(recipes).filter((recipe) => recipe.skill === 'alchemy').length }
if (actualCounts.cooking !== metadata.counts.cooking || actualCounts.alchemy !== metadata.counts.alchemy) fail(`recipe count mismatch: metadata=${JSON.stringify(metadata.counts)} actual=${JSON.stringify(actualCounts)}`)
const missingCanonicalIconPaths = Object.values(items).filter((item) => item.iconPath !== `icons/${item.id}.webp`)
if (missingCanonicalIconPaths.length) fail(`${missingCanonicalIconPaths.length} items lack canonical local icon paths; first ids: ${missingCanonicalIconPaths.slice(0, 20).map((item) => item.id).join(', ')}`)
const localIconRoot = path.resolve(path.dirname(file), '..')
const missingLocalIcons = Object.values(items).filter((item) => !fs.existsSync(path.resolve(localIconRoot, item.iconPath)))
if (missingLocalIcons.length) fail(`${missingLocalIcons.length} canonical local icon assets are missing; first ids: ${missingLocalIcons.slice(0, 20).map((item) => item.id).join(', ')}`)
const placeholderKoreanNames = Object.values(items).filter((item) => /^아이템 #\d+$/.test(String(item.nameKo || '')))
if (placeholderKoreanNames.length) fail(`${placeholderKoreanNames.length} items still have placeholder Korean names`)
if (!fs.existsSync(reconciliationFile)) fail('ZERO_UNEXPLAINED_DIFF reconciliation report is required')
const reconciliation = JSON.parse(fs.readFileSync(reconciliationFile, 'utf8'))
if (reconciliation.status !== 'ZERO_UNEXPLAINED_DIFF' || (reconciliation.unresolved || []).length !== 0) fail('reconciliation evidence is not ZERO_UNEXPLAINED_DIFF')
const datasetRecipeCount = Object.keys(recipes).length
if (!Number.isSafeInteger(reconciliation.clientRecipes) || reconciliation.clientRecipes !== datasetRecipeCount) fail(`reconciliation client recipe count ${reconciliation.clientRecipes ?? 'missing'} does not match dataset recipe count ${datasetRecipeCount}`)
const expectedReconciliationFingerprint = reconciliationDatasetFingerprint(dataset)
if (reconciliation.datasetFingerprint !== expectedReconciliationFingerprint) fail(`reconciliation report belongs to different dataset content: recorded=${reconciliation.datasetFingerprint || 'missing'} actual=${expectedReconciliationFingerprint}`)
if (!fs.existsSync(catalogFile)) fail('independently complete Codex catalog evidence is required')
const catalogBytes = fs.readFileSync(catalogFile)
const catalog = JSON.parse(catalogBytes.toString('utf8'))
if (catalog.source !== 'BDO Codex KR' || catalog.complete !== true || !Array.isArray(catalog.catalogs)) fail('Codex catalog completeness is not independently proven')
if (!hasValidTimestamp(catalog.collectedAt)) fail('Codex catalog collectedAt timestamp is missing or invalid')
const actualCatalogSha256 = sha256(catalogBytes)
if (metadata.codexCatalogSha256 !== actualCatalogSha256) fail(`Codex catalog artifact does not match promoted evidence: recorded=${metadata.codexCatalogSha256 || 'missing'} actual=${actualCatalogSha256}`)
if (metadata.codexCatalogCollectedAt !== catalog.collectedAt) fail('Codex catalog collectedAt does not match promoted evidence')
const catalogBySkill = new Map(catalog.catalogs.map((entry) => [String(entry.skill || '').toLowerCase(), entry]))
for (const skill of ['cooking', 'alchemy']) {
  const entry = catalogBySkill.get(skill)
  const evidence = validateCatalogEntryEvidence(entry, skill)
  if (!evidence.ok) fail(evidence.reason)
  if (!Array.isArray(entry.recipeIds) || sortedIds(entry.recipeIds).length !== entry.recipeCount) fail(`Codex ${skill} catalog recipe-id evidence is incomplete`)
}
const completeCatalogPages = ['cooking', 'alchemy'].reduce((sum, skill) => sum + catalogBySkill.get(skill).recipeCount, 0)
if (reconciliation.codexLivePages !== completeCatalogPages) fail(`reconciliation Codex page count ${reconciliation.codexLivePages ?? 'missing'} does not match independently complete catalog count ${completeCatalogPages}`)
const completeCatalogIds = sortedIds(['cooking', 'alchemy'].flatMap((skill) => catalogBySkill.get(skill).recipeIds))
const reconciliationIds = sortedIds(Array.isArray(reconciliation.codexLiveRecipeIds) ? reconciliation.codexLiveRecipeIds : [])
if (JSON.stringify(reconciliationIds) !== JSON.stringify(completeCatalogIds)) fail('reconciliation Codex recipe-id set does not match independently complete catalog')
console.log(JSON.stringify({ ok: true, status: metadata.status, counts: actualCounts, items: Object.keys(items).length, fingerprint: metadata.fingerprint, reconciliation: reconciliation.status, codexCatalogPages: completeCatalogPages, codexCatalogSha256: actualCatalogSha256 }))
