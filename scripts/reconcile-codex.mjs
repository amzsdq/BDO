import fs from 'node:fs'
import { reconciliationDatasetFingerprint } from './reconciliation-fingerprint.mjs'
import { validateAcceptedDiffs } from './reconciliation-review.mjs'

function fail(message) { console.error(message); process.exit(1) }
function args(argv) { const out = {}; for (let i = 0; i < argv.length; i += 2) out[String(argv[i] || '').replace(/^--/, '')] = argv[i + 1]; return out }
function normalizedName(value) { return String(value || '').normalize('NFKC').replace(/[\s·・'\"]/g, '').toLocaleLowerCase('ko-KR') }
function normalizedSkill(value) { return String(value || '').toLowerCase() }
function outputItemIdFromCodex(entry) { const value = entry.outputItemId ?? entry.itemId; if (value === undefined || value === null || value === '') return undefined; const id = Number(value); return Number.isSafeInteger(id) && id >= 0 ? id : undefined }
function reconciliationKey(skill, outputItemId, outputName) { return outputItemId !== undefined ? `${skill}:item:${outputItemId}` : `${skill}:name:${normalizedName(outputName)}` }
function itemIdentity(itemId, name) { const id = Number(itemId); return Number.isSafeInteger(id) && id >= 0 ? `#${id}` : normalizedName(name) }
function signatureFromDataset(dataset, recipe, variant) { return variant.inputs.map((input) => { const item = dataset.items[String(input.itemId)]; return `${itemIdentity(input.itemId, item?.nameKo)}:${Number(input.count)}` }).sort().join('|') }
function signatureFromCodex(entry) { return (entry.ingredients || []).map((input) => `${itemIdentity(input.itemId, input.name)}:${Number(input.count)}`).sort().join('|') }
function liveRecipeIds(entries) { return [...new Set(entries.map((entry) => Number(entry.recipeId)).filter((id) => Number.isSafeInteger(id) && id > 0))].sort((a, b) => a - b) }

const opt = args(process.argv.slice(2))
if (!opt.dataset || !opt.codex) fail('usage: --dataset <dataset.json> --codex <codex-manifest.json> [--review <review.json>] [--out <report.json>]')
const dataset = JSON.parse(fs.readFileSync(opt.dataset, 'utf8'))
const manifest = JSON.parse(fs.readFileSync(opt.codex, 'utf8'))
const review = opt.review && fs.existsSync(opt.review) ? JSON.parse(fs.readFileSync(opt.review, 'utf8')) : { acceptedDiffs: [] }
const clientByKey = new Map()
let clientRecipeCount = 0

for (const recipe of Object.values(dataset.recipes || {})) {
  const output = dataset.items[String(recipe.outputItemId)]
  const skill = normalizedSkill(recipe.skill)
  const key = reconciliationKey(skill, Number(recipe.outputItemId), output?.nameKo)
  const variants = (recipe.variants || []).map((variant) => ({ recipeId: recipe.id, variantId: variant.id, signature: signatureFromDataset(dataset, recipe, variant) }))
  const group = clientByKey.get(key) || { output, recipes: [], variants: [], signatures: new Set() }
  group.recipes.push(recipe)
  group.variants.push(...variants)
  for (const variant of variants) group.signatures.add(variant.signature)
  clientByKey.set(key, group)
  clientRecipeCount += 1
}
const codexLive = (manifest.recipes || []).filter((entry) => entry.available !== false)
const codexLiveRecipeIds = liveRecipeIds(codexLive)
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
    if (variant.signature && !codexSignatures.has(variant.signature)) diffs.push({ key: `CLIENT_VARIANT_ONLY:${variant.recipeId}:${variant.variantId}:${key}`, kind: 'CLIENT_VARIANT_ONLY', recipeId: variant.recipeId, variantId: variant.variantId, output: client.output?.nameKo, clientSignature: variant.signature, codexSignatures: [...codexSignatures] })
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
  codexLivePages: codexLive.length,
  codexLiveRecipeIds,
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
