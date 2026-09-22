import fs from 'node:fs'
import crypto from 'node:crypto'

function fail(message) {
  console.error(message)
  process.exit(1)
}

const file = process.argv[2]
if (!file) fail('usage: node scripts/validate-dataset.mjs <dataset.json>')
const dataset = JSON.parse(fs.readFileSync(file, 'utf8'))
const errors = []

const items = dataset.items || {}
const recipes = dataset.recipes || {}
const recipesByOutput = dataset.recipesByOutput || {}
const seenSignatures = new Set()
const seenVariantIds = new Set()

for (const [itemKey, item] of Object.entries(items)) {
  if (!Number.isInteger(item.id) || item.id <= 0) errors.push(`${itemKey}: invalid item id`)
  if (String(item.id) !== itemKey) errors.push(`${itemKey}: item key/id mismatch (${item.id})`)
  if (typeof item.nameKo !== 'string' || !item.nameKo.trim()) errors.push(`${itemKey}: missing Korean item name`)
  if (item.weightLT != null && (!Number.isFinite(item.weightLT) || item.weightLT < 0)) errors.push(`${itemKey}: invalid weightLT`)
}

for (const [recipeId, recipe] of Object.entries(recipes)) {
  if (recipe.id !== recipeId) errors.push(`${recipeId}: recipe key/id mismatch (${recipe.id})`)
  if (!['cooking', 'alchemy'].includes(recipe.skill)) errors.push(`${recipeId}: invalid skill`)
  if (!items[String(recipe.outputItemId)]) errors.push(`${recipeId}: missing output item ${recipe.outputItemId}`)
  if (!Array.isArray(recipe.variants) || !recipe.variants.length) errors.push(`${recipeId}: no variants`)
  if (!recipe.yield || !Number.isFinite(recipe.yield.min) || !Number.isFinite(recipe.yield.max) || recipe.yield.min <= 0 || recipe.yield.max < recipe.yield.min) errors.push(`${recipeId}: invalid yield range`)
  if (recipe.yield?.expected != null && (!Number.isFinite(recipe.yield.expected) || recipe.yield.expected < recipe.yield.min || recipe.yield.expected > recipe.yield.max)) errors.push(`${recipeId}: expected yield outside min/max`)

  for (const variant of recipe.variants || []) {
    const variantKey = `${recipeId}:${variant.id}`
    if (typeof variant.id !== 'string' || !variant.id.trim()) errors.push(`${recipeId}: variant missing id`)
    if (seenVariantIds.has(variantKey)) errors.push(`${recipeId}: duplicate variant id ${variant.id}`)
    seenVariantIds.add(variantKey)
    if (!Array.isArray(variant.inputs) || !variant.inputs.length) errors.push(`${recipeId}/${variant.id}: no inputs`)
    const signature = `${recipe.skill}:${recipe.outputItemId}:` + (variant.inputs || [])
      .map((input) => `${input.itemId}:${input.count}`).sort().join('|')
    if (seenSignatures.has(signature)) errors.push(`${recipeId}/${variant.id}: duplicate variant signature`)
    seenSignatures.add(signature)

    const inputIds = new Set()
    for (const input of variant.inputs || []) {
      if (!items[String(input.itemId)]) errors.push(`${recipeId}/${variant.id}: missing input item ${input.itemId}`)
      if (!Number.isFinite(input.count) || input.count <= 0) errors.push(`${recipeId}/${variant.id}: invalid count for ${input.itemId}`)
      if (inputIds.has(String(input.itemId))) errors.push(`${recipeId}/${variant.id}: duplicate input item ${input.itemId}; aggregate canonical counts instead`)
      inputIds.add(String(input.itemId))
    }
  }
}

for (const [outputItemId, recipeIds] of Object.entries(recipesByOutput)) {
  if (!items[outputItemId]) errors.push(`recipesByOutput ${outputItemId}: unknown output item`)
  if (!Array.isArray(recipeIds) || !recipeIds.length) errors.push(`recipesByOutput ${outputItemId}: empty recipe list`)
  const seen = new Set()
  for (const recipeId of recipeIds || []) {
    const recipe = recipes[recipeId]
    if (!recipe) errors.push(`recipesByOutput ${outputItemId}: unknown recipe ${recipeId}`)
    else if (String(recipe.outputItemId) !== outputItemId) errors.push(`recipesByOutput ${outputItemId}: recipe ${recipeId} outputs ${recipe.outputItemId}`)
    if (seen.has(recipeId)) errors.push(`recipesByOutput ${outputItemId}: duplicate recipe ${recipeId}`)
    seen.add(recipeId)
  }
}

for (const [recipeId, recipe] of Object.entries(recipes)) {
  if (!(recipesByOutput[String(recipe.outputItemId)] || []).includes(recipeId)) errors.push(`${recipeId}: missing from recipesByOutput ${recipe.outputItemId}`)
}

const actualCounts = {
  cooking: Object.values(recipes).filter((recipe) => recipe.skill === 'cooking').length,
  alchemy: Object.values(recipes).filter((recipe) => recipe.skill === 'alchemy').length,
}
if (dataset.metadata?.counts?.cooking !== actualCounts.cooking) errors.push('metadata cooking count mismatch')
if (dataset.metadata?.counts?.alchemy !== actualCounts.alchemy) errors.push('metadata alchemy count mismatch')
if (dataset.metadata?.supportedRegion !== 'KR') errors.push('metadata supportedRegion must be KR for this release')
if (!Array.isArray(dataset.metadata?.sources) || !dataset.metadata.sources.length) errors.push('metadata sources missing')
if (!dataset.metadata?.generatedAt || Number.isNaN(Date.parse(dataset.metadata.generatedAt))) errors.push('metadata generatedAt invalid')

if (errors.length) fail(errors.join('\n'))

const hash = crypto.createHash('sha256').update(JSON.stringify({ items, recipes })).digest('hex')
console.log(JSON.stringify({ ok: true, counts: actualCounts, items: Object.keys(items).length, structuralHash: hash }))
