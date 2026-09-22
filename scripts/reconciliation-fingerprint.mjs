import crypto from 'node:crypto'

export function reconciliationDatasetFingerprint(dataset) {
  const payload = {
    items: dataset.items ?? {},
    recipes: dataset.recipes ?? {},
    recipesByOutput: dataset.recipesByOutput ?? {},
    byproducts: dataset.byproducts ?? {},
    substitutionGroups: dataset.substitutionGroups ?? {},
  }
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex')
}
