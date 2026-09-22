import fs from 'node:fs'

function fail(message) {
  console.error(`release blocked: ${message}`)
  process.exit(1)
}

const file = process.argv[2]
if (!file) fail('usage: node scripts/assert-release-dataset.mjs <dataset.json>')
if (!fs.existsSync(file)) fail(`dataset not found: ${file}`)

const dataset = JSON.parse(fs.readFileSync(file, 'utf8'))
const metadata = dataset.metadata || {}
const items = dataset.items || {}
const recipes = dataset.recipes || {}

if (metadata.status !== 'COMPLETE_VERIFIED') fail(`dataset status is ${metadata.status || 'missing'}`)
if (metadata.supportedRegion !== 'KR') fail(`supportedRegion is ${metadata.supportedRegion || 'missing'}`)
if (!metadata.fingerprint) fail('dataset fingerprint missing')
if (!metadata.generatedAt) fail('generatedAt missing')
if (!Array.isArray(metadata.sources) || metadata.sources.length < 2) fail('source provenance incomplete')
if (!metadata.counts || metadata.counts.cooking <= 0 || metadata.counts.alchemy <= 0) fail('Cooking/Alchemy counts missing or empty')

const actualCounts = {
  cooking: Object.values(recipes).filter((recipe) => recipe.skill === 'cooking').length,
  alchemy: Object.values(recipes).filter((recipe) => recipe.skill === 'alchemy').length,
}
if (actualCounts.cooking !== metadata.counts.cooking || actualCounts.alchemy !== metadata.counts.alchemy) {
  fail(`recipe count mismatch: metadata=${JSON.stringify(metadata.counts)} actual=${JSON.stringify(actualCounts)}`)
}

const unresolvedIcons = Object.values(items).filter((item) => !item.iconPath && !item.iconUrl)
if (unresolvedIcons.length) fail(`${unresolvedIcons.length} items have no icon resolution result`)

const placeholderKoreanNames = Object.values(items).filter((item) => /^아이템 #\d+$/.test(String(item.nameKo || '')))
if (placeholderKoreanNames.length) fail(`${placeholderKoreanNames.length} items still have placeholder Korean names`)

console.log(JSON.stringify({ ok: true, status: metadata.status, counts: actualCounts, items: Object.keys(items).length, fingerprint: metadata.fingerprint }))
