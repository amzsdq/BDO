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
const seenSignatures = new Set()

for (const [recipeId, recipe] of Object.entries(recipes)) {
  if (!['cooking', 'alchemy'].includes(recipe.skill)) errors.push(`${recipeId}: invalid skill`)
  if (!items[String(recipe.outputItemId)]) errors.push(`${recipeId}: missing output item ${recipe.outputItemId}`)
  if (!Array.isArray(recipe.variants) || !recipe.variants.length) errors.push(`${recipeId}: no variants`)

  for (const variant of recipe.variants || []) {
    if (!Array.isArray(variant.inputs) || !variant.inputs.length) errors.push(`${recipeId}/${variant.id}: no inputs`)
    const signature = `${recipe.skill}:${recipe.outputItemId}:` + (variant.inputs || [])
      .map((input) => `${input.itemId}:${input.count}`).sort().join('|')
    if (seenSignatures.has(signature)) errors.push(`${recipeId}/${variant.id}: duplicate variant signature`)
    seenSignatures.add(signature)

    for (const input of variant.inputs || []) {
      if (!items[String(input.itemId)]) errors.push(`${recipeId}/${variant.id}: missing input item ${input.itemId}`)
      if (!Number.isFinite(input.count) || input.count <= 0) errors.push(`${recipeId}/${variant.id}: invalid count for ${input.itemId}`)
    }
  }
}

const actualCounts = {
  cooking: Object.values(recipes).filter((recipe) => recipe.skill === 'cooking').length,
  alchemy: Object.values(recipes).filter((recipe) => recipe.skill === 'alchemy').length,
}
if (dataset.metadata?.counts?.cooking !== actualCounts.cooking) errors.push('metadata cooking count mismatch')
if (dataset.metadata?.counts?.alchemy !== actualCounts.alchemy) errors.push('metadata alchemy count mismatch')

if (errors.length) fail(errors.join('\n'))

const hash = crypto.createHash('sha256').update(JSON.stringify({ items, recipes })).digest('hex')
console.log(JSON.stringify({ ok: true, counts: actualCounts, items: Object.keys(items).length, structuralHash: hash }))
