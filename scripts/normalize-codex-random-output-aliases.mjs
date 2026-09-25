#!/usr/bin/env node
import fs from 'node:fs'

function fail(message) { throw new Error(message) }
function signature(rows) {
  return (rows || []).map((row) => {
    const itemId = Number(row.itemId)
    const count = Number(row.count)
    if (!Number.isSafeInteger(itemId) || itemId <= 0 || !Number.isFinite(count) || count <= 0) fail('invalid ingredient row')
    return `${itemId}:${count}`
  }).sort().join('|')
}
function skill(value) { return String(value || '').trim().toLowerCase() }
function routeKey(skillName, outputItemId, sig) { return `${skill(skillName)}:${Number(outputItemId)}|${sig}` }

export function normalizeCodexRandomOutputAliases(dataset, details) {
  if (Number(details?.schemaVersion) < 2 || details?.complete !== true || Number(details?.unresolvedCount || 0) !== 0) {
    fail('complete schema-v2 Codex detail evidence with zero unresolved routes is required')
  }
  if (details?.supplementalDiscovery?.method !== 'catalog-gap-probe' || details?.supplementalDiscovery?.complete !== true) {
    fail('complete catalog-gap supplemental discovery is required before random-output alias normalization')
  }
  const sources = details.recipes || []
  const protectedDirect = new Set()
  for (const source of sources) {
    const sig = signature(source.ingredients)
    if (!sig) continue
    if (source.status === 'single-base' && source.baseOutputs?.length === 1) {
      protectedDirect.add(routeKey(source.skill, source.baseOutputs[0].itemId, sig))
    } else if (source.status === 'random-only') {
      for (const row of source.randomOutputs || []) protectedDirect.add(routeKey(source.skill, row.itemId, sig))
    }
  }

  const aliases = new Map()
  for (const source of sources) {
    if (source.status !== 'single-base' || source.baseOutputs?.length !== 1) continue
    const sig = signature(source.ingredients)
    const baseItemId = Number(source.baseOutputs[0].itemId)
    for (const random of source.randomOutputs || []) {
      const randomItemId = Number(random.itemId)
      const key = routeKey(source.skill, randomItemId, sig)
      if (protectedDirect.has(key)) {
        if (randomItemId !== baseItemId) fail(`ambiguous random-output alias: ${key} is also a source-backed direct route`)
        continue
      }
      const parents = aliases.get(key) || new Set()
      parents.add(baseItemId)
      aliases.set(key, parents)
    }
  }

  const normalized = structuredClone(dataset)
  let removedVariants = 0
  const normalizedAliases = []
  for (const [key, parentIds] of aliases) {
    const [route, sig] = key.split('|')
    const split = route.indexOf(':')
    const skillName = route.slice(0, split)
    const outputItemId = Number(route.slice(split + 1))
    const recipeId = `${skillName}:${outputItemId}`
    const recipe = normalized.recipes?.[recipeId]
    if (!recipe) continue
    const before = recipe.variants || []
    const kept = before.filter((variant) => signature(variant.inputs) !== sig)
    const removed = before.length - kept.length
    if (!removed) continue
    removedVariants += removed
    normalizedAliases.push({ recipeId, signature: sig, parentOutputItemIds: [...parentIds].sort((a,b)=>a-b), removedVariants: removed })
    if (kept.length) recipe.variants = kept
    else {
      delete normalized.recipes[recipeId]
      const list = normalized.recipesByOutput?.[String(outputItemId)]
      if (Array.isArray(list)) {
        const next = list.filter((id) => id !== recipeId)
        if (next.length) normalized.recipesByOutput[String(outputItemId)] = next
        else delete normalized.recipesByOutput[String(outputItemId)]
      }
    }
    const existing = normalized.byproducts?.[String(outputItemId)]?.producedWhileCraftingItemIds || []
    normalized.byproducts ||= {}
    normalized.byproducts[String(outputItemId)] = {
      outputItemId,
      producedWhileCraftingItemIds: [...new Set([...existing, ...parentIds])].sort((a,b)=>a-b),
    }
  }
  normalized.metadata ||= {}
  normalized.metadata.codexRandomAliasNormalization = {
    normalizedAliases: normalizedAliases.sort((a,b)=>a.recipeId.localeCompare(b.recipeId) || a.signature.localeCompare(b.signature)),
    removedVariants,
  }
  normalized.metadata.sources = [...new Set([...(normalized.metadata.sources || []), 'BDO Codex KR random-output role evidence'])]
  normalized.metadata.counts = {
    cooking: Object.values(normalized.recipes || {}).filter((recipe) => recipe.skill === 'cooking').length,
    alchemy: Object.values(normalized.recipes || {}).filter((recipe) => recipe.skill === 'alchemy').length,
  }
  delete normalized.metadata.fingerprint
  return normalized
}

if (process.argv[1]?.endsWith('normalize-codex-random-output-aliases.mjs')) {
  const [datasetPath, detailsPath, outPath] = process.argv.slice(2)
  if (!datasetPath || !detailsPath || !outPath) fail('usage: node scripts/normalize-codex-random-output-aliases.mjs <dataset.json> <codex-details.json> <out.json>')
  const result = normalizeCodexRandomOutputAliases(JSON.parse(fs.readFileSync(datasetPath,'utf8')), JSON.parse(fs.readFileSync(detailsPath,'utf8')))
  fs.writeFileSync(outPath, JSON.stringify(result,null,2)+'\n')
  console.log(JSON.stringify({ok:true, ...result.metadata.codexRandomAliasNormalization}))
}
