import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { reconciliationDatasetFingerprint } from './reconciliation-fingerprint.mjs'
import { validateResolvedCatalogEndpoint } from './codex-catalog-endpoint.mjs'

function fail(message) { console.error(`promotion blocked: ${message}`); process.exit(1) }
function fingerprint(value) { return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex') }
function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex') }
function hasRecordedSourceRevision(value) { const revision = String(value ?? '').trim(); return revision !== '' && revision.toLowerCase() !== 'unrecorded' }
function hasValidTimestamp(value) { return typeof value === 'string' && value.trim() !== '' && Number.isFinite(Date.parse(value)) }
function sortedIds(values) { return [...new Set(values.map(Number).filter((id) => Number.isSafeInteger(id) && id > 0))].sort((a, b) => a - b) }
function verifiedCatalog(catalogFile, reconciliation) {
  if (!catalogFile || !fs.existsSync(catalogFile)) fail('independently complete Codex catalog evidence is required')
  const catalogBytes = fs.readFileSync(catalogFile)
  const catalog = JSON.parse(catalogBytes.toString('utf8'))
  if (catalog.source !== 'BDO Codex KR' || catalog.complete !== true || !Array.isArray(catalog.catalogs)) fail('Codex catalog completeness is not independently proven')
  if (!hasValidTimestamp(catalog.collectedAt)) fail('Codex catalog collectedAt timestamp is missing or invalid')
  const bySkill = new Map(catalog.catalogs.map((entry) => [String(entry.skill || '').toLowerCase(), entry]))
  for (const skill of ['cooking', 'alchemy']) {
    const entry = bySkill.get(skill)
    if (!entry || entry.complete !== true || !Number.isSafeInteger(entry.recipeCount) || entry.recipeCount <= 0) fail(`Codex ${skill} catalog completeness is not proven`)
    if (!entry.endpointUsed || !entry.endpointEvidence || (entry.countMatchesExpected !== true && entry.endpointEvidence.recordsReported !== entry.recipeCount)) fail(`Codex ${skill} catalog lacks independent count evidence`)
    const configuredScope = validateResolvedCatalogEndpoint(entry.endpointUsed, skill)
    const finalScope = validateResolvedCatalogEndpoint(entry.endpointFinalUrl || entry.endpointUsed, skill)
    if (!configuredScope.ok || !finalScope.ok) fail(`Codex ${skill} catalog endpoint scope is invalid`)
    if (!Array.isArray(entry.recipeIds) || sortedIds(entry.recipeIds).length !== entry.recipeCount) fail(`Codex ${skill} catalog recipe-id evidence is incomplete`)
  }
  const pages = ['cooking', 'alchemy'].reduce((sum, skill) => sum + bySkill.get(skill).recipeCount, 0)
  if (reconciliation.codexLivePages !== pages) fail(`reconciliation Codex page count ${reconciliation.codexLivePages ?? 'missing'} does not match independently complete catalog count ${pages}`)
  const catalogIds = sortedIds(['cooking', 'alchemy'].flatMap((skill) => bySkill.get(skill).recipeIds))
  const reconciliationIds = sortedIds(Array.isArray(reconciliation.codexLiveRecipeIds) ? reconciliation.codexLiveRecipeIds : [])
  if (JSON.stringify(reconciliationIds) !== JSON.stringify(catalogIds)) fail('reconciliation Codex recipe-id set does not match independently complete catalog')
  return { pages, collectedAt: catalog.collectedAt, sha256: sha256(catalogBytes) }
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
if (!/^sha256:[a-f0-9]{64}$/.test(String(dataset.metadata?.clientFingerprint || ''))) fail('clientFingerprint must identify the installed client snapshot as sha256:<64hex>')
if (!dataset.metadata?.generatedAt) fail('generatedAt missing')
if (reconciliation.status !== 'ZERO_UNEXPLAINED_DIFF' || (reconciliation.unresolved || []).length) fail('reconciliation is not ZERO_UNEXPLAINED_DIFF')
const datasetRecipeCount = Object.keys(recipes).length
if (!Number.isSafeInteger(reconciliation.clientRecipes) || reconciliation.clientRecipes !== datasetRecipeCount) fail('reconciliation client recipe count does not match dataset')
const expectedReconciliationFingerprint = reconciliationDatasetFingerprint(dataset)
if (reconciliation.datasetFingerprint !== expectedReconciliationFingerprint) fail('reconciliation report belongs to different dataset content')
const codexCatalog = verifiedCatalog(catalogFile, reconciliation)
const counts = { cooking: Object.values(recipes).filter((recipe) => recipe.skill === 'cooking').length, alchemy: Object.values(recipes).filter((recipe) => recipe.skill === 'alchemy').length }
if (!counts.cooking || !counts.alchemy) fail('both Cooking and Alchemy coverage are required')
if (dataset.metadata?.counts?.cooking !== counts.cooking || dataset.metadata?.counts?.alchemy !== counts.alchemy) fail('metadata recipe counts do not match dataset')
const missingCanonicalIconPaths = Object.values(items).filter((item) => item.iconPath !== `icons/${item.id}.webp`)
if (missingCanonicalIconPaths.length) fail(`${missingCanonicalIconPaths.length} items lack canonical local icon paths; first ids: ${missingCanonicalIconPaths.slice(0, 20).map((item) => item.id).join(', ')}`)
const localIconRoot = path.resolve(path.dirname(datasetFile), '..')
const missingLocalIcons = Object.values(items).filter((item) => !fs.existsSync(path.resolve(localIconRoot, item.iconPath)))
if (missingLocalIcons.length) fail(`${missingLocalIcons.length} canonical local icon assets are missing; first ids: ${missingLocalIcons.slice(0, 20).map((item) => item.id).join(', ')}`)
const unresolvedNames = Object.values(items).filter((item) => !String(item.nameKo || '').trim() || /^아이템 #\d+$/.test(String(item.nameKo)))
if (unresolvedNames.length) fail(`${unresolvedNames.length} items have unresolved Korean names`)
const promoted = { ...dataset, metadata: { ...dataset.metadata, status: 'COMPLETE_VERIFIED', counts, verifiedAt: new Date().toISOString(), reconciliationStatus: 'ZERO_UNEXPLAINED_DIFF', codexCatalogPages: codexCatalog.pages, codexCatalogCollectedAt: codexCatalog.collectedAt, codexCatalogSha256: codexCatalog.sha256 } }
delete promoted.metadata.fingerprint
promoted.metadata.fingerprint = fingerprint(promoted)
fs.writeFileSync(outFile, JSON.stringify(promoted, null, 2) + '\n')
console.log(JSON.stringify({ ok: true, outFile, counts, codexCatalogPages: codexCatalog.pages, codexCatalogSha256: codexCatalog.sha256, fingerprint: promoted.metadata.fingerprint }))
