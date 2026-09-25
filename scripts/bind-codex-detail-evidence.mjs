#!/usr/bin/env node
import fs from 'node:fs'

function fail(message) { throw new Error(message) }
function ingredientSignature(rows) {
  return (rows || []).map((row) => {
    const itemId = Number(row.itemId)
    const count = Number(row.count)
    if (!Number.isSafeInteger(itemId) || itemId <= 0 || !Number.isFinite(count) || count <= 0) fail('invalid ingredient signature row')
    return `${itemId}:${count}`
  }).sort().join('|')
}
function normalizedSkill(value) { return String(value || '').trim().toLowerCase() }
function outputRows(rows) { return (rows || []).map(({ itemId, min, max }) => ({ itemId: Number(itemId), min: Number(min), max: Number(max) })) }

function sourceMatches(recipe, variant, source) {
  if (normalizedSkill(recipe.skill) !== normalizedSkill(source.skill)) return false
  if (ingredientSignature(variant.inputs) !== ingredientSignature(source.ingredients)) return false
  if (variant.skillRequirement?.level && source.skillText && variant.skillRequirement.level !== source.skillText) return false
  if (source.status === 'single-base') return source.baseOutputs?.length === 1 && Number(source.baseOutputs[0].itemId) === Number(recipe.outputItemId)
  if (source.status === 'random-only') return source.randomOutputs?.some((row) => Number(row.itemId) === Number(recipe.outputItemId)) === true
  if (source.status === 'no-output') return Number(variant.sourceRecipeId) === Number(source.recipeId)
  return false
}

export function bindCodexDetailEvidence(dataset, details) {
  if (Number(details?.schemaVersion) < 2 || details?.complete !== true || Number(details?.unresolvedCount || 0) !== 0) fail('complete schema-v2 detail evidence with zero unresolved routes is required')
  const sources = (details.recipes || []).filter((row) => ['single-base', 'random-only', 'no-output'].includes(row.status))
  const entries = []
  for (const recipe of Object.values(dataset?.recipes || {})) {
    for (const variant of recipe.variants || []) {
      const prebound = Number(variant.sourceRecipeId)
      const pool = Number.isSafeInteger(prebound) && prebound > 0 ? sources.filter((row) => Number(row.recipeId) === prebound) : sources
      const matches = pool.filter((source) => sourceMatches(recipe, variant, source))
      if (matches.length !== 1) fail(`${recipe.id}:${variant.id}: expected exactly one Codex source route, found ${matches.length}`)
      const source = matches[0]
      const entry = {
        recipeId: recipe.id,
        variantId: variant.id,
        sourceRecipeId: Number(source.recipeId),
        sourceUrl: String(source.sourceUrl || ''),
        outputStatus: source.status,
        baseOutputs: outputRows(source.baseOutputs),
        randomOutputs: outputRows(source.randomOutputs),
      }
      if (!entry.sourceUrl) fail(`${recipe.id}:${variant.id}: source URL missing`)
      if (source.skillText) entry.skillRequirement = { skill: recipe.skill, level: source.skillText }
      if (source.status === 'single-base') {
        entry.min = Number(source.baseOutputs[0].min)
        entry.max = Number(source.baseOutputs[0].max)
      }
      entries.push(entry)
    }
  }
  return { schemaVersion: 1, source: 'BDO Codex KR schema-v2 recipe details', entries }
}

if (process.argv[1]?.endsWith('bind-codex-detail-evidence.mjs')) {
  const [datasetPath, detailPath, outPath] = process.argv.slice(2)
  if (!datasetPath || !detailPath || !outPath) fail('usage: node scripts/bind-codex-detail-evidence.mjs <dataset.json> <codex-details.json> <out.json>')
  const result = bindCodexDetailEvidence(JSON.parse(fs.readFileSync(datasetPath, 'utf8')), JSON.parse(fs.readFileSync(detailPath, 'utf8')))
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n')
  console.log(JSON.stringify({ ok: true, entries: result.entries.length }))
}
