import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

function fail(message) { throw new Error(message) }
const IMPORTER_FLAGS = new Set(['items', 'recipes', 'out', 'source-revision'])
function parseArgs(argv) {
  if (argv.length % 2 !== 0) fail('usage: --items <items.json> --recipes <recipes.json> --out <dataset.json> --source-revision <exact-extractor-commit>')
  const out = {}
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i], value = argv[i + 1]
    if (!key?.startsWith('--') || value == null || value.startsWith('--')) fail('usage: --items <items.json> --recipes <recipes.json> --out <dataset.json> --source-revision <exact-extractor-commit>')
    const name = key.slice(2)
    if (!IMPORTER_FLAGS.has(name)) fail(`unknown argument: --${name}`)
    if (Object.hasOwn(out, name)) fail(`duplicate argument: --${name}`)
    out[name] = value
  }
  return out
}
function itemIdFromRef(ref) {
  if (typeof ref === 'number' && Number.isInteger(ref) && ref > 0) return ref
  if (typeof ref === 'string') { const match = ref.match(/(\d+)$/); if (match) return Number(match[1]) }
  if (ref && typeof ref === 'object') {
    if (Number.isInteger(ref.id) && ref.id > 0) return ref.id
    if (typeof ref.urn === 'string') return itemIdFromRef(ref.urn)
  }
  fail('unresolvable item ref: ' + JSON.stringify(ref))
}
function normalizeType(value) {
  const raw = String(value || '').trim().toUpperCase()
  if (raw === 'COOK' || raw === 'COOKING') return 'cooking'
  if (raw === 'ALCHEMY') return 'alchemy'
  return null
}
function normalizeWeight(item) {
  const raw = item.weight ?? item.weightLT ?? item.weightLt
  if (raw == null || raw === '') return undefined
  const value = Number(raw)
  return Number.isFinite(value) && value >= 0 ? value : undefined
}
function fingerprint(value) { return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex') }
function variantSignature(inputs) {
  return inputs.map((input) => `${input.itemId}:${input.count}`).sort().join('|')
}
function variantId(identity) {
  return `v-${crypto.createHash('sha256').update(identity).digest('hex').slice(0, 12)}`
}
function normalizeSourceRevision(value) {
  const raw = String(value || '').trim()
  const match = raw.match(/^(?:iDevelopThings\/bdo-data-extractor@)?([0-9a-f]{40})$/i)
  if (!match) fail('source-revision must be the exact 40-character bdo-data-extractor commit SHA (optionally prefixed with iDevelopThings/bdo-data-extractor@)')
  return `iDevelopThings/bdo-data-extractor@${match[1].toLowerCase()}`
}

const args = parseArgs(process.argv.slice(2))
if (!args.items || !args.recipes || !args.out || !args['source-revision']) fail('required: --items --recipes --out --source-revision <exact-extractor-commit>')
const sourceRevision = normalizeSourceRevision(args['source-revision'])
const itemsRaw = JSON.parse(fs.readFileSync(args.items, 'utf8'))
const recipesRaw = JSON.parse(fs.readFileSync(args.recipes, 'utf8'))
if (!Array.isArray(itemsRaw) || !Array.isArray(recipesRaw)) fail('extractor inputs must be JSON arrays')

// bdo-data-extractor currently exposes --lang en|de|fr|sp, not Korean. Never
// mislabel extractor item.name as Korean. Korean display names are a separate
// reconciliation/enrichment step (Codex KR or another reviewed KR source).
const items = {}
for (const item of itemsRaw) {
  const id = Number(item.id)
  if (!Number.isInteger(id) || id <= 0) continue
  const sourceName = String(item.name || '').trim()
  items[String(id)] = {
    id,
    nameKo: `아이템 #${id}`,
    nameEn: sourceName || undefined,
    weightLT: normalizeWeight(item),
    // The extractor's item.icon is the source DDS asset path, not the decoded
    // web asset. `bdo-data-extractor icons` publishes canonical icons by item id.
    iconPath: item.icon ? `icons/${id}.webp` : undefined,
    marketable: item.marketable === true,
  }
}

const grouped = new Map()
for (const source of recipesRaw) {
  const skill = normalizeType(source.type)
  if (!skill) continue
  const outputItemId = itemIdFromRef(source.output)
  const inputs = (source.inputs || []).map((input) => ({ itemId: itemIdFromRef(input.item), count: Number(input.count) }))
  if (!inputs.length) continue
  if (inputs.some((input) => !Number.isFinite(input.count) || input.count <= 0)) fail(`invalid ingredient count for ${skill}:${outputItemId}`)
  const byproductOf = source.byproductOf ? itemIdFromRef(source.byproductOf) : null
  const signature = variantSignature(inputs)
  const roleKey = byproductOf ? `byproduct:${byproductOf}` : 'direct'
  const dedupeKey = `${roleKey}|${signature}`
  const groupKey = `${skill}:${outputItemId}`
  const variants = grouped.get(groupKey) || []
  variants.push({ dedupeKey, signature, inputs, byproductOf })
  grouped.set(groupKey, variants)
}

const recipes = {}, recipesByOutput = {}, byproducts = {}
for (const [groupKey, rawVariants] of grouped) {
  const [skill, outputText] = groupKey.split(':'); const outputItemId = Number(outputText)
  const seen = new Set(), variants = []
  for (const candidate of rawVariants.sort((a, b) => a.dedupeKey.localeCompare(b.dedupeKey))) {
    if (seen.has(candidate.dedupeKey)) continue
    seen.add(candidate.dedupeKey)
    variants.push({ identity: candidate.dedupeKey, signature: candidate.signature, inputs: candidate.inputs, byproductOf: candidate.byproductOf })
  }
  const normalVariants = variants.filter((variant) => !variant.byproductOf)
  const byproductVariants = variants.filter((variant) => variant.byproductOf)
  if (byproductVariants.length) byproducts[String(outputItemId)] = { outputItemId, producedWhileCraftingItemIds: [...new Set(byproductVariants.map((variant) => variant.byproductOf))].sort((a, b) => a - b) }
  if (!normalVariants.length) continue
  const id = `${skill}:${outputItemId}`
  recipes[id] = {
    id,
    skill,
    outputItemId,
    yield: { min: 1, max: 1, provenance: 'unknown-server-yield' },
    variants: normalVariants.map(({ byproductOf: _x, signature: _signature, identity, ...variant }) => ({ id: variantId(identity), ...variant })),
  }
  recipesByOutput[String(outputItemId)] = [...(recipesByOutput[String(outputItemId)] || []), id]
}

const missingItemRefs = []
for (const recipe of Object.values(recipes)) {
  if (!items[String(recipe.outputItemId)]) missingItemRefs.push({ recipe: recipe.id, role: 'output', itemId: recipe.outputItemId })
  for (const variant of recipe.variants) for (const input of variant.inputs) if (!items[String(input.itemId)]) missingItemRefs.push({ recipe: recipe.id, role: 'input', itemId: input.itemId })
}
if (missingItemRefs.length) fail(`dataset contains ${missingItemRefs.length} unresolved item references`)
const counts = { cooking: Object.values(recipes).filter((r) => r.skill === 'cooking').length, alchemy: Object.values(recipes).filter((r) => r.skill === 'alchemy').length }
if (counts.cooking === 0 || counts.alchemy === 0) fail(`canonical snapshot must contain both Cooking and Alchemy recipes; got ${JSON.stringify(counts)}`)

const payloadWithoutHash = {
  metadata: {
    generatedAt: new Date().toISOString(), supportedRegion: 'KR', status: 'CLIENT_IMPORTED_UNRECONCILED',
    sources: ['bdo-data-extractor:items.json', 'bdo-data-extractor:recipes.json'],
    sourceRevision,
    extractorContract: 'items.json + recipes.json; repeated producing blocks are alternative recipes; no separate source recipe id; EntityRef serialized as URN text; decoded icons resolved as icons/<itemId>.webp; Korean names not supplied by extractor',
    koreanNamesVerified: false,
    counts,
  }, items, recipes, recipesByOutput, byproducts,
}
const payload = { ...payloadWithoutHash, metadata: { ...payloadWithoutHash.metadata, fingerprint: fingerprint(payloadWithoutHash) } }
fs.mkdirSync(path.dirname(args.out), { recursive: true })
fs.writeFileSync(args.out, JSON.stringify(payload, null, 2) + '\n')
console.log(JSON.stringify({ ok: true, ...counts, items: Object.keys(items).length, byproducts: Object.keys(byproducts).length, fingerprint: payload.metadata.fingerprint }))
