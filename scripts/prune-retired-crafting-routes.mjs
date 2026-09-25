#!/usr/bin/env node
import fs from 'node:fs'
import { craftingSignature, validateRetiredCraftingRouteEvidence } from './reviewed-retired-route-state.mjs'

export function pruneRetiredCraftingRoutes(dataset, details) {
  const result = structuredClone(dataset)
  const reviewed = validateRetiredCraftingRouteEvidence(details?.routeStateEvidence)
  const retired = new Set(reviewed.retiredCraftingOutputItemIds)
  const recorded = [...new Set((details?.retiredCraftingOutputItemIds || []).map(Number))].sort((a, b) => a - b)
  if (JSON.stringify(recorded) !== JSON.stringify([...retired].sort((a, b) => a - b))) throw new Error('retired crafting output ids do not match reviewed route-state evidence')
  const retiredSignatures = new Set((details?.retiredCraftingSignatures || []).map((row) => row?.signature).filter(Boolean))
  result.recipes ||= {}
  for (const [id, recipe] of Object.entries(result.recipes)) {
    if (retired.has(Number(recipe.outputItemId))) { delete result.recipes[id]; continue }
    recipe.variants = (recipe.variants || []).filter((variant) => !retiredSignatures.has(craftingSignature(recipe.skill, variant.inputs)))
    if (!recipe.variants.length) delete result.recipes[id]
  }
  result.recipesByOutput ||= {}
  for (const key of Object.keys(result.recipesByOutput)) {
    if (retired.has(Number(key))) delete result.recipesByOutput[key]
    else result.recipesByOutput[key] = result.recipesByOutput[key].filter((id) => Object.hasOwn(result.recipes, id))
  }
  result.byproducts ||= {}
  for (const key of Object.keys(result.byproducts)) {
    if (retired.has(Number(key))) { delete result.byproducts[key]; continue }
    const row = result.byproducts[key]
    row.producedWhileCraftingItemIds = (row.producedWhileCraftingItemIds || []).filter((id) => !retired.has(Number(id)))
    if (!row.producedWhileCraftingItemIds.length) delete result.byproducts[key]
  }
  result.metadata ||= {}
  delete result.metadata.fingerprint
  result.metadata.retiredCraftingOutputItemIds = [...retired].sort((a, b) => a - b)
  result.metadata.counts = {
    cooking: Object.values(result.recipes).filter((r) => r.skill === 'cooking').length,
    alchemy: Object.values(result.recipes).filter((r) => r.skill === 'alchemy').length,
  }
  return result
}

if (process.argv[1]?.endsWith('prune-retired-crafting-routes.mjs')) {
  const [datasetPath, detailsPath, outPath] = process.argv.slice(2)
  if (!datasetPath || !detailsPath || !outPath) throw new Error('usage: node scripts/prune-retired-crafting-routes.mjs <dataset.json> <reviewed-codex-details.json> <out.json>')
  const result = pruneRetiredCraftingRoutes(JSON.parse(fs.readFileSync(datasetPath, 'utf8')), JSON.parse(fs.readFileSync(detailsPath, 'utf8')))
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n')
}
