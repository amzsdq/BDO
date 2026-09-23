import fs from 'node:fs'
import crypto from 'node:crypto'
import { reconciliationDatasetFingerprint } from './reconciliation-fingerprint.mjs'

function fail(message) { console.error(`promotion blocked: ${message}`); process.exit(1) }
function fingerprint(value) { return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex') }
function hasRecordedSourceRevision(value) { const revision = String(value ?? '').trim(); return revision !== '' && revision.toLowerCase() !== 'unrecorded' }
function sortedIds(values) { return [...new Set(values.map(Number).filter((id) => Number.isSafeInteger(id) && id > 0))].sort((a, b) => a - b) }
function verifiedCatalog(catalogFile, reconciliation) {
  if (!catalogFile || !fs.existsSync(catalogFile)) fail('independently complete Codex catalog evidence is required')
  const catalog = JSON.parse(fs.readFileSync(catalogFile, 'utf8'))
  if (catalog.source !== 'BDO Codex KR' || catalog.complete !== true || !Array.isArray(catalog.catalogs)) fail('Codex catalog completeness is not independently proven')
  const bySkill = new Map(catalog.catalogs.map((entry) => [String(entry.skill || '').toLowerCase(), entry]))
  for (const skill of ['cooking', 'alchemy']) {
    const entry = bySkill.get(skill)
    if (!entry || entry.complete !== true || !Number.isSafeInteger(entry.recipeCount) || entry.recipeCount <= 0) fail(`Codex ${skill} catalog completeness is not proven`)
    if (!entry.endpointUsed || !entry.endpointEvidence || (entry.countMatchesExpected !== true && entry.endpointEvidence.recordsReported !== entry.recipeCount)) fail(`Codex ${skill} catalog lacks independent count evidence`)
    if (!Array.isArray(entry.recipeIds) || sortedIds(entry.recipeIds).length !== entry.recipeCount) fail(`Codex ${skill} catalog recipe-id evidence is incomplete`)
  }
  const pages = ['cooking', 'alchemy'].reduce((sum, skill) => sum + bySkill.get(skill).recipeCount, 0)
  if (reconciliation.codexLivePages !== pages) fail(`reconciliation Codex page count ${reconciliation.codexLivePages ?? 'missing'} does not match independently complete catalog count ${pages}`)
  const catalogIds = sortedIds(['cooking', 'alchemy'].flatMap((skill) => bySkill.get(skill).recipeIds))
  const reconciliationIds = sortedIds(Array.isArray(reconciliation.codexLiveRecipeIds) ? reconciliation.codexLiveRecipeIds : [])
  if (JSON.stringify(reconciliationIds) !== JSON.stringify(catalogIds)) fail('reconciliation Codex recipe-id set does not match independently complete catalog')
  return pages
}

const [datasetFile, reconciliationFile, catalogFile, outFile = datasetFile] = process.argv.slice(2)
if (!datasetFile || !reconciliationFile || !catalogFile) fail('usage: node scripts/promote-release-dataset.mjs <dataset.json> <reconciliation-report.json> <codex-catalog.json> [out.json]')
if (!fs.existsSync(datasetFile)) fail(`dataset not found: ${datasetFile}`)
if (!fs.existsSync(reconciliationFile)) fail(`reconciliation report not found: ${reconciliationFile}`)
const dataset = JSON.parse(fs.readFileSync(datasetFile, 'utf8'))
const reconciliation = JSON.parse(fs.readFileSync(reconciliationFile, 'utf8'))
const items = dataset.items || {}, recipes = dataset.recipes || {}
if (dataset.metadata?.supportedRegion !== 'KR') fail('supportedRegion must be KR')
if (!Array.isArray(dataset.metadata?.sources) || dataset.metadata.sources.length < 2) fail('source provenance incomplete')
if (!hasRecordedSourceRevision(dataset.metadata?.sourceRevision)) fail('sourceRevision must identify the canonical client snapshot; unrecorded provenance cannot be promoted')
if (!dataset.metadata?.generatedAt) fail('generatedAt missing')
if (reconciliation.status !== 'ZERO_UNEXPLAINED_DIFF' || (reconciliation.unresolved || []).length) fail('reconciliation is not ZERO_UNEXPLAINED_DIFF')
if (reconciliation.clientRecipeGroups !== Object.keys(recipes).length) fail('reconciliation recipe count does not match dataset')
const expectedReconciliationFingerprint = reconciliationDatasetFingerprint(dataset)
if (reconciliation.datasetFingerprint !== expectedReconciliationFingerprint) fail('reconciliation report belongs to different dataset content')
const codexCatalogPages = verifiedCatalog(catalogFile, reconciliation)
const counts = { cooking: Object.values(recipes).filter((recipe) => recipe.skill === 'cooking').length, alchemy: Object.values(recipes).filter((recipe) => recipe.skill === 'alchemy').length }
if (!counts.cooking || !counts.alchemy) fail('both Cooking and Alchemy coverage are required')
if (dataset.metadata?.counts?.cooking !== counts.cooking || dataset.metadata?.counts?.alchemy !== counts.alchemy) fail('metadata recipe counts do not match dataset')
const unresolvedIcons = Object.values(items).filter((item) => !item.iconPath && !item.iconUrl)
if (unresolvedIcons.length) fail(`${unresolvedIcons.length} items have no icon resolution result`)
const invalidLocalIconPaths = Object.values(items).filter((item) => typeof item.iconPath === 'string' && item.iconPath !== `icons/${item.id}.webp`)
if (invalidLocalIconPaths.length) fail(`${invalidLocalIconPaths.length} items have non-canonical local icon paths; first ids: ${invalidLocalIconPaths.slice(0, 20).map((item) => item.id).join(', ')}`)
const unresolvedNames = Object.values(items).filter((item) => !String(item.nameKo || '').trim() || /^아이템 #\d+$/.test(String(item.nameKo)))
if (unresolvedNames.length) fail(`${unresolvedNames.length} items have unresolved Korean names`)
const promoted = { ...dataset, metadata: { ...dataset.metadata, status: 'COMPLETE_VERIFIED', counts, verifiedAt: new Date().toISOString(), reconciliationStatus: 'ZERO_UNEXPLAINED_DIFF', codexCatalogPages } }
delete promoted.metadata.fingerprint
promoted.metadata.fingerprint = fingerprint(promoted)
fs.writeFileSync(outFile, JSON.stringify(promoted, null, 2) + '\n')
console.log(JSON.stringify({ ok: true, outFile, counts, codexCatalogPages, fingerprint: promoted.metadata.fingerprint }))
