#!/usr/bin/env node
import fs from 'node:fs'
import { validateRetiredCraftingRouteEvidence } from './reviewed-retired-route-state.mjs'

export function pruneRetiredCraftingRoutes(dataset, evidence) {
  const result = structuredClone(dataset)
  const reviewed = validateRetiredCraftingRouteEvidence(evidence)
  const retired = new Set(reviewed.retiredCraftingOutputItemIds)
  const retiredIngredients = new Set(reviewed.retiredCraftingIngredientItemIds)
  result.recipes ||= {}
  for (const [id, recipe] of Object.entries(result.recipes)) {
    if (retired.has(Number(recipe.outputItemId))) { delete result.recipes[id]; continue }
    recipe.variants = (recipe.variants || []).filter((variant) => !(variant.inputs || []).some((input) => retiredIngredients.has(Number(input.itemId))))
    if (!recipe.variants.length) delete result.recipes[id]
  }
  result.recipesByOutput ||= {}
  for (const key of Object.keys(result.recipesByOutput)) {
    if (retired.has(Number(key))) delete result.recipesByOutput[key]
    else result.recipesByOutput[key] = result.recipesByOutput[key].filter((id) => Object.hasOwn(result.recipes, id))
  }
  result.byproducts ||= {}
  const activeProducerOutputs = new Set(Object.values(result.recipes).map((recipe) => Number(recipe.outputItemId)))
  for (const key of Object.keys(result.byproducts)) {
    if (retired.has(Number(key))) { delete result.byproducts[key]; continue }
    const row = result.byproducts[key]
    row.producedWhileCraftingItemIds = (row.producedWhileCraftingItemIds || []).filter((id) => !retired.has(Number(id)) && activeProducerOutputs.has(Number(id)))
    if (!row.producedWhileCraftingItemIds.length) delete result.byproducts[key]
  }
  result.metadata ||= {}
  delete result.metadata.fingerprint
  result.metadata.retiredCraftingOutputItemIds = [...retired].sort((a, b) => a - b)
  result.metadata.retiredCraftingIngredientItemIds = [...retiredIngredients].sort((a, b) => a - b)
  result.metadata.counts = {
    cooking: Object.values(result.recipes).filter((r) => r.skill === 'cooking').length,
    alchemy: Object.values(result.recipes).filter((r) => r.skill === 'alchemy').length,
  }
  return result
}

if (process.argv[1]?.endsWith('prune-retired-crafting-routes.mjs')) {
  const [datasetPath, evidencePath, outPath] = process.argv.slice(2)
  if (!datasetPath || !evidencePath || !outPath) throw new Error('usage: node scripts/prune-retired-crafting-routes.mjs <dataset.json> <route-state-evidence.json> <out.json>')
  const result = pruneRetiredCraftingRoutes(JSON.parse(fs.readFileSync(datasetPath, 'utf8')), JSON.parse(fs.readFileSync(evidencePath, 'utf8')))
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n')
}
