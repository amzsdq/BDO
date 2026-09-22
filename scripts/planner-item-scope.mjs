export function referencedPlannerItemIds(recipes, byproducts = {}) {
  const ids = new Set()
  for (const recipe of Object.values(recipes || {})) {
    if (Number.isInteger(recipe.outputItemId) && recipe.outputItemId > 0) ids.add(recipe.outputItemId)
    for (const variant of recipe.variants || []) {
      for (const input of variant.inputs || []) if (Number.isInteger(input.itemId) && input.itemId > 0) ids.add(input.itemId)
    }
  }
  for (const entry of Object.values(byproducts || {})) {
    if (Number.isInteger(entry.outputItemId) && entry.outputItemId > 0) ids.add(entry.outputItemId)
    for (const itemId of entry.producedWhileCraftingItemIds || []) if (Number.isInteger(itemId) && itemId > 0) ids.add(itemId)
  }
  return ids
}

export function pruneItemsToPlannerScope(items, recipes, byproducts = {}) {
  const referenced = referencedPlannerItemIds(recipes, byproducts)
  const scoped = {}
  for (const itemId of [...referenced].sort((a, b) => a - b)) {
    const item = items[String(itemId)]
    if (!item) throw new Error(`planner item scope references missing item ${itemId}`)
    scoped[String(itemId)] = item
  }
  return scoped
}
