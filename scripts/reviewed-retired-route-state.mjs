export function validateRetiredCraftingRouteEvidence(evidence, catalogRecipeIds = []) {
  if (!evidence || evidence.schemaVersion !== 1 || evidence.scope !== 'kr-pc-crafting-route-live-state') throw new Error('retired route evidence schema/scope mismatch')
  if (!/^https:\/\/www\.kr\.playblackdesert\.com\//i.test(evidence?.source?.url || '')) throw new Error('retired route evidence requires official KR Black Desert HTTPS source')
  const catalog = new Set(catalogRecipeIds.map(Number))
  const routes = new Map()
  for (const row of evidence.routes || []) {
    const recipeId = Number(row?.recipeId)
    if (!Number.isSafeInteger(recipeId) || recipeId <= 0 || !['cooking', 'alchemy'].includes(row?.skill) || row?.status !== 'retired') throw new Error('invalid retired route row')
    if (catalog.has(recipeId)) throw new Error(`retired route ${recipeId} conflicts with current catalog`)
    if (routes.has(recipeId)) throw new Error(`duplicate retired route ${recipeId}`)
    routes.set(recipeId, row)
  }
  if (!routes.size) throw new Error('retired route evidence must contain routes')
  const outputs = [...new Set((evidence.retiredCraftingOutputItemIds || []).map(Number))].sort((a, b) => a - b)
  if (!outputs.length || outputs.some((id) => !Number.isSafeInteger(id) || id <= 0)) throw new Error('invalid retired crafting output item ids')
  return { routes, retiredCraftingOutputItemIds: outputs }
}
