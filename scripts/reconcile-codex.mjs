import fs from 'node:fs'
import { reconciliationDatasetFingerprint } from './reconciliation-fingerprint.mjs'
import { validateAcceptedDiffs } from './reconciliation-review.mjs'

function fail(message) { console.error(message); process.exit(1) }
const RECONCILE_FLAGS = new Set(['dataset', 'codex', 'review', 'out'])
function args(argv) {
  if (argv.length % 2 !== 0) fail('usage: --dataset <dataset.json> --codex <codex-manifest.json> [--review <review.json>] [--out <report.json>]')
  const out = {}
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i], value = argv[i + 1]
    if (!key?.startsWith('--') || value == null || value.startsWith('--')) fail('usage: --dataset <dataset.json> --codex <codex-manifest.json> [--review <review.json>] [--out <report.json>]')
    const name = key.slice(2)
    if (!RECONCILE_FLAGS.has(name)) fail(`unknown argument: --${name}`)
    if (Object.hasOwn(out, name)) fail(`duplicate argument: --${name}`)
    out[name] = value
  }
  return out
}
function normalizedName(value) { return String(value || '').normalize('NFKC').replace(/[\s·・'\"]/g, '').toLocaleLowerCase('ko-KR') }
function normalizedSkill(value) { return String(value || '').toLowerCase() }
function outputItemIdFromCodex(entry) { const value = entry.outputItemId ?? entry.itemId; if (value === undefined || value === null || value === '') return undefined; const id = Number(value); return Number.isSafeInteger(id) && id >= 0 ? id : undefined }
function reconciliationKey(skill, outputItemId, outputName) { return outputItemId !== undefined ? `${skill}:item:${outputItemId}` : `${skill}:name:${normalizedName(outputName)}` }
function itemIdentity(itemId, name) { const id = Number(itemId); return Number.isSafeInteger(id) && id >= 0 ? `#${id}` : normalizedName(name) }
function signatureFromDataset(dataset, recipe, variant) { return variant.inputs.map((input) => { const item = dataset.items[String(input.itemId)]; return `${itemIdentity(input.itemId, item?.nameKo)}:${Number(input.count)}` }).sort().join('|') }
function signatureFromCodex(entry) { return (entry.ingredients || []).map((input) => `${itemIdentity(input.itemId, input.name)}:${Number(input.count)}`).sort().join('|') }
function liveRecipeIds(entries) { return [...new Set(entries.map((entry) => Number(entry.recipeId)).filter((id) => Number.isSafeInteger(id) && id > 0))].sort((a, b) => a - b) }
function routeKeys(entries) { return [...new Set(entries.map((entry) => `${normalizedSkill(entry.skill)}:${Number(entry.recipeId)}`).filter((key) => /^(?:cooking|alchemy):[1-9][0-9]*$/.test(key)))].sort() }

const opt = args(process.argv.slice(2))
if (!opt.dataset || !opt.codex) fail('usage: --dataset <dataset.json> --codex <codex-manifest.json> [--review <review.json>] [--out <report.json>]')
const dataset = JSON.parse(fs.readFileSync(opt.dataset, 'utf8'))
const manifest = JSON.parse(fs.readFileSync(opt.codex, 'utf8'))
if (Number(manifest.schemaVersion) >= 2 && (manifest.complete !== true || Number(manifest.unresolvedCount || 0) > 0 || (manifest.recipes || []).some((entry) => entry.status === 'unresolved'))) {
  fail('schema-v2 Codex manifest must be complete with zero unresolved routes')
}
const review = opt.review && fs.existsSync(opt.review) ? JSON.parse(fs.readFileSync(opt.review, 'utf8')) : { acceptedDiffs: [] }
const clientByKey = new Map()
let clientRecipeCount = 0

for (const recipe of Object.values(dataset.recipes || {})) {
  const output = dataset.items[String(recipe.outputItemId)]
  const skill = normalizedSkill(recipe.skill)
  const key = reconciliationKey(skill, Number(recipe.outputItemId), output?.nameKo)
  const variants = (recipe.variants || []).map((variant) => ({ recipeId: recipe.id, variantId: variant.id, sourceRecipeId: Number.isSafeInteger(Number(variant.sourceRecipeId)) && Number(variant.sourceRecipeId) > 0 ? Number(variant.sourceRecipeId) : undefined, signature: signatureFromDataset(dataset, recipe, variant) }))
  const group = clientByKey.get(key) || { output, recipes: [], variants: [], signatures: new Set() }
  group.recipes.push(recipe)
  group.variants.push(...variants)
  for (const variant of variants) group.signatures.add(variant.signature)
  clientByKey.set(key, group)
  clientRecipeCount += 1
}
const codexAccounted = (manifest.recipes || []).filter((entry) => entry.status !== 'unresolved')
const codexAccountedRecipeIds = liveRecipeIds(codexAccounted)
const codexAccountedRoutes = routeKeys(codexAccounted)
const codexLive = codexAccounted.filter((entry) => entry.available !== false && entry.status !== 'unavailable')
const codexLiveRecipeIds = liveRecipeIds(codexLive)
const codexLiveRoutes = routeKeys(codexLive)
const codexByKey = new Map()
for (const entry of codexLive) {
  const skill = normalizedSkill(entry.skill)
  const outputItemId = outputItemIdFromCodex(entry)
  const key = reconciliationKey(skill, outputItemId, entry.titleKo)
  const group = codexByKey.get(key) || []
  group.push(entry)
  codexByKey.set(key, group)
}
const diffs = []
for (const [key, client] of clientByKey) {
  if (!codexByKey.has(key)) {
    for (const recipe of client.recipes) diffs.push({ key: `CLIENT_ONLY:${recipe.id}:${key}`, kind: 'CLIENT_ONLY', output: client.output?.nameKo, recipeId: recipe.id })
    continue
  }
  const codexEntries = codexByKey.get(key)
  const codexSignatures = new Set()
  for (const entry of codexEntries) {
    const sig = signatureFromCodex(entry)
    if (sig) codexSignatures.add(sig)
    if (sig && !client.signatures.has(sig)) diffs.push({ key: `SIGNATURE:${entry.recipeId}:${key}`, kind: 'SIGNATURE_MISMATCH', codexRecipeId: entry.recipeId, output: entry.titleKo, codexSignature: sig, clientSignatures: [...client.signatures] })
  }
  for (const variant of client.variants) {
    const sourceEntries = variant.sourceRecipeId == null ? codexEntries : codexEntries.filter((entry) => Number(entry.recipeId) === variant.sourceRecipeId)
    const sourceSignatures = new Set(sourceEntries.map(signatureFromCodex).filter(Boolean))
    if (variant.signature && !sourceSignatures.has(variant.signature)) diffs.push({
      key: `CLIENT_VARIANT_ONLY:${variant.recipeId}:${variant.variantId}:${key}`,
      kind: 'CLIENT_VARIANT_ONLY',
      recipeId: variant.recipeId,
      variantId: variant.variantId,
      ...(variant.sourceRecipeId == null ? {} : { sourceRecipeId: variant.sourceRecipeId }),
      output: client.output?.nameKo,
      clientSignature: variant.signature,
      codexSignatures: [...sourceSignatures],
    })
  }
}
for (const [key, entries] of codexByKey) if (!clientByKey.has(key)) for (const entry of entries) diffs.push({ key: `CODEX_ONLY:${entry.recipeId}:${key}`, kind: 'CODEX_ONLY', codexRecipeId: entry.recipeId, output: entry.titleKo })
const { accepted, errors: reviewErrors } = validateAcceptedDiffs(review, diffs)
const unresolved = diffs.filter((entry) => !accepted.has(entry.key))
const report = {
  generatedAt: new Date().toISOString(),
  datasetFingerprint: reconciliationDatasetFingerprint(dataset),
  clientRecipeGroups: clientByKey.size,
  clientRecipes: clientRecipeCount,
  codexAccountedPages: codexAccounted.length,
  codexAccountedRecipeIds,
  codexAccountedRoutes,
  codexLivePages: codexLive.length,
  codexLiveRecipeIds,
  codexLiveRoutes,
  codexDisabledPages: (manifest.recipes || []).length - codexLive.length,
  diffs,
  acceptedDiffKeys: [...accepted].sort(),
  reviewErrors,
  unresolved,
  status: unresolved.length || reviewErrors.length ? 'INCOMPLETE_REVIEW' : 'ZERO_UNEXPLAINED_DIFF',
}
if (opt.out) fs.writeFileSync(opt.out, JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify({ status: report.status, datasetFingerprint: report.datasetFingerprint, clientRecipeGroups: report.clientRecipeGroups, clientRecipes: report.clientRecipes, codexLivePages: report.codexLivePages, diffs: diffs.length, accepted: accepted.size, reviewErrors: reviewErrors.length, unresolved: unresolved.length }))
if (report.status !== 'ZERO_UNEXPLAINED_DIFF') process.exitCode = 2
