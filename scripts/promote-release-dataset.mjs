import fs from 'node:fs'
import crypto from 'node:crypto'

function fail(message) { console.error(`promotion blocked: ${message}`); process.exit(1) }
function fingerprint(value) { return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex') }

const [datasetFile, reconciliationFile, outFile = datasetFile] = process.argv.slice(2)
if (!datasetFile || !reconciliationFile) fail('usage: node scripts/promote-release-dataset.mjs <dataset.json> <reconciliation-report.json> [out.json]')
if (!fs.existsSync(datasetFile)) fail(`dataset not found: ${datasetFile}`)
if (!fs.existsSync(reconciliationFile)) fail(`reconciliation report not found: ${reconciliationFile}`)

const dataset = JSON.parse(fs.readFileSync(datasetFile, 'utf8'))
const reconciliation = JSON.parse(fs.readFileSync(reconciliationFile, 'utf8'))
const items = dataset.items || {}, recipes = dataset.recipes || {}

if (dataset.metadata?.supportedRegion !== 'KR') fail('supportedRegion must be KR')
if (!Array.isArray(dataset.metadata?.sources) || dataset.metadata.sources.length < 2) fail('source provenance incomplete')
if (!dataset.metadata?.generatedAt) fail('generatedAt missing')
if (reconciliation.status !== 'ZERO_UNEXPLAINED_DIFF' || (reconciliation.unresolved || []).length) fail('reconciliation is not ZERO_UNEXPLAINED_DIFF')
if (reconciliation.clientRecipeGroups !== Object.keys(recipes).length) fail('reconciliation recipe count does not match dataset')

const counts = {
  cooking: Object.values(recipes).filter((recipe) => recipe.skill === 'cooking').length,
  alchemy: Object.values(recipes).filter((recipe) => recipe.skill === 'alchemy').length,
}
if (!counts.cooking || !counts.alchemy) fail('both Cooking and Alchemy coverage are required')
if (dataset.metadata?.counts?.cooking !== counts.cooking || dataset.metadata?.counts?.alchemy !== counts.alchemy) fail('metadata recipe counts do not match dataset')

const unresolvedIcons = Object.values(items).filter((item) => !item.iconPath && !item.iconUrl)
if (unresolvedIcons.length) fail(`${unresolvedIcons.length} items have no icon resolution result`)
const unresolvedNames = Object.values(items).filter((item) => !String(item.nameKo || '').trim() || /^아이템 #\d+$/.test(String(item.nameKo)))
if (unresolvedNames.length) fail(`${unresolvedNames.length} items have unresolved Korean names`)

const promoted = {
  ...dataset,
  metadata: {
    ...dataset.metadata,
    status: 'COMPLETE_VERIFIED',
    counts,
    verifiedAt: new Date().toISOString(),
    reconciliationStatus: 'ZERO_UNEXPLAINED_DIFF',
  },
}
delete promoted.metadata.fingerprint
promoted.metadata.fingerprint = fingerprint(promoted)

fs.writeFileSync(outFile, JSON.stringify(promoted, null, 2) + '\n')
console.log(JSON.stringify({ ok: true, outFile, counts, fingerprint: promoted.metadata.fingerprint }))
