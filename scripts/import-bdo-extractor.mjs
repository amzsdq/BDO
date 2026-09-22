import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

function fail(message) {
  throw new Error(message)
}

function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]
    const value = argv[i + 1]
    if (!key?.startsWith('--') || value == null) fail('usage: --items <items.json> --recipes <recipes.json> --out <dataset.json>')
    out[key.slice(2)] = value
  }
  return out
}

function itemIdFromRef(ref) {
  if (typeof ref === 'number' && Number.isInteger(ref) && ref > 0) return ref
  if (typeof ref === 'string') {
    const match = ref.match(/(\d+)$/)
    if (match) return Number(match[1])
  }
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
  // Extractor versions may expose weight under slightly different field names.
  // Keep unknown distinct from zero: planners must never silently treat missing
  // weight evidence as weightless material.
  const raw = item.weight ?? item.weightLT ?? item.weightLt
  if (raw == null || raw === '') return undefined
  const value = Number(raw)
  return Number.isFinite(value) && value >= 0 ? value : undefined
}

function fingerprint(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

const args = parseArgs(process.argv.slice(2))
if (!args.items || !args.recipes || !args.out) fail('required: --items --recipes --out')

const itemsRaw = JSON.parse(fs.readFileSync(args.items, 'utf8'))
const recipesRaw = JSON.parse(fs.readFileSync(args.recipes, 'utf8'))
if (!Array.isArray(itemsRaw) || !Array.isArray(recipesRaw)) fail('extractor inputs must be JSON arrays')

const items = {}
for (const item of itemsRaw) {
  const id = Number(item.id)
  if (!Number.isInteger(id) || id <= 0) continue
  items[String(id)] = {
    id,
    nameKo: String(item.name || '').trim() || `아이템 #${id}`,
    weightLT: normalizeWeight(item),
    iconPath: item.icon ? String(item.icon) : undefined,
    marketable: item.marketable === true,
  }
}

const grouped = new Map()
for (const source of recipesRaw) {
  const skill = normalizeType(source.type)
  if (!skill) continue

  const outputItemId = itemIdFromRef(source.output)
  const inputs = (source.inputs || []).map((input) => ({
    itemId: itemIdFromRef(input.item),
    count: Number(input.count),
  }))
  if (!inputs.length) continue

  const byproductOf = source.byproductOf ? itemIdFromRef(source.byproductOf) : null
  const signature = inputs
    .map((input) => `${input.itemId}:${input.count}`)
    .sort()
    .join('|')
  const groupKey = `${skill}:${outputItemId}`
  const variants = grouped.get(groupKey) || []
  variants.push({ signature, inputs, byproductOf })
  grouped.set(groupKey, variants)
}

const recipes = {}
const recipesByOutput = {}
const byproducts = {}
for (const [groupKey, rawVariants] of grouped) {
  const [skill, outputText] = groupKey.split(':')
  const outputItemId = Number(outputText)
  const seen = new Set()
  const variants = []

  for (const candidate of rawVariants) {
    if (seen.has(candidate.signature)) continue
    seen.add(candidate.signature)
    variants.push({ id: `v${variants.length + 1}`, inputs: candidate.inputs, byproductOf: candidate.byproductOf || undefined })
  }

  const normalVariants = variants.filter((variant) => !variant.byproductOf)
  const byproductVariants = variants.filter((variant) => variant.byproductOf)
  if (byproductVariants.length) {
    byproducts[String(outputItemId)] = {
      outputItemId,
      producedWhileCraftingItemIds: [...new Set(byproductVariants.map((variant) => variant.byproductOf))],
    }
  }
  if (!normalVariants.length) continue

  const id = `${skill}:${outputItemId}`
  recipes[id] = {
    id,
    skill,
    outputItemId,
    yield: { min: 1, max: 1, provenance: 'unknown-server-yield' },
    variants: normalVariants.map(({ byproductOf: _byproductOf, ...variant }) => variant),
  }
  recipesByOutput[String(outputItemId)] = [...(recipesByOutput[String(outputItemId)] || []), id]
}

const missingItemRefs = []
for (const recipe of Object.values(recipes)) {
  if (!items[String(recipe.outputItemId)]) missingItemRefs.push({ recipe: recipe.id, role: 'output', itemId: recipe.outputItemId })
  for (const variant of recipe.variants) {
    for (const input of variant.inputs) {
      if (!items[String(input.itemId)]) missingItemRefs.push({ recipe: recipe.id, role: 'input', itemId: input.itemId })
    }
  }
}
if (missingItemRefs.length) fail(`dataset contains ${missingItemRefs.length} unresolved item references`)

const counts = {
  cooking: Object.values(recipes).filter((recipe) => recipe.skill === 'cooking').length,
  alchemy: Object.values(recipes).filter((recipe) => recipe.skill === 'alchemy').length,
}

const payloadWithoutHash = {
  metadata: {
    generatedAt: new Date().toISOString(),
    supportedRegion: 'KR',
    status: 'CLIENT_IMPORTED_UNRECONCILED',
    sources: ['bdo-data-extractor:items.json', 'bdo-data-extractor:recipes.json'],
    counts,
  },
  items,
  recipes,
  recipesByOutput,
  byproducts,
}
const payload = {
  ...payloadWithoutHash,
  metadata: { ...payloadWithoutHash.metadata, fingerprint: fingerprint(payloadWithoutHash) },
}

fs.mkdirSync(path.dirname(args.out), { recursive: true })
fs.writeFileSync(args.out, JSON.stringify(payload, null, 2) + '\n')
console.log(JSON.stringify({ ok: true, ...counts, items: Object.keys(items).length, byproducts: Object.keys(byproducts).length, fingerprint: payload.metadata.fingerprint }))
