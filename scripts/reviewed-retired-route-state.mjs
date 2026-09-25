export function validateRetiredCraftingRouteEvidence(evidence, catalogRecipeIds = []) {
  if (!evidence || evidence.schemaVersion !== 1 || evidence.scope !== 'kr-pc-crafting-route-live-state') throw new Error('retired route evidence schema/scope mismatch')
  if (!/^https:\/\/www\.kr\.playblackdesert\.com\//i.test(evidence?.source?.url || '')) throw new Error('retired route evidence requires official KR Black Desert HTTPS source')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(evidence?.source?.effectiveDate || '') || !/^\d{4}-\d{2}-\d{2}$/.test(evidence?.reviewedAt || '')) throw new Error('retired route evidence dates must be YYYY-MM-DD')
  const catalog = new Set(catalogRecipeIds.map(Number))
  const routes = new Map()
  for (const row of evidence.routes || []) {
    const recipeId = Number(row?.recipeId)
    if (!Number.isSafeInteger(recipeId) || recipeId <= 0 || !['cooking', 'alchemy'].includes(row?.skill) || row?.status !== 'retired') throw new Error('invalid retired route row')
    if (catalog.has(recipeId)) throw new Error(`retired route ${recipeId} conflicts with current catalog`)
    if (routes.has(recipeId)) throw new Error(`duplicate retired route ${recipeId}`)
    routes.set(recipeId, { recipeId, skill: row.skill, status: 'retired' })
  }
  if (!routes.size) throw new Error('retired route evidence must contain routes')
  const outputs = [...new Set((evidence.retiredCraftingOutputItemIds || []).map(Number))].sort((a, b) => a - b)
  if (!outputs.length || outputs.some((id) => !Number.isSafeInteger(id) || id <= 0)) throw new Error('invalid retired crafting output item ids')
  return { routes, retiredCraftingOutputItemIds: outputs }
}

export function craftingSignature(skill, ingredients) {
  if (!['cooking', 'alchemy'].includes(skill) || !Array.isArray(ingredients) || !ingredients.length) return null
  const parts = ingredients.map((row) => {
    const itemId = Number(row?.itemId), count = Number(row?.count)
    if (!Number.isSafeInteger(itemId) || itemId <= 0 || !Number.isFinite(count) || count <= 0) throw new Error('invalid crafting signature ingredient')
    return `${itemId}:${count}`
  }).sort()
  return `${skill}|${parts.join('|')}`
}

export function applyRetiredRouteStateToDetails(details, evidence) {
  if (!details || details.schemaVersion !== 2 || !Array.isArray(details.recipes)) throw new Error('schema-v2 Codex details required')
  const catalogIds = details.recipes.filter((row) => row.catalogListed !== false).map((row) => row.recipeId)
  const reviewed = validateRetiredCraftingRouteEvidence(evidence, catalogIds)
  const observed = new Set(details.recipes.map((row) => Number(row.recipeId)))
  for (const recipeId of reviewed.routes.keys()) if (!observed.has(recipeId)) throw new Error(`reviewed retired route ${recipeId} was not observed by bounded supplemental discovery`)
  const retiredCraftingSignatures = []
  for (const row of details.recipes) {
    const state = reviewed.routes.get(Number(row.recipeId))
    if (!state || row.skill !== state.skill || !row.ingredients?.length) continue
    const signature = craftingSignature(state.skill, row.ingredients)
    retiredCraftingSignatures.push({ recipeId: Number(row.recipeId), skill: state.skill, signature })
  }
  const retiredSignatureSet = new Set(retiredCraftingSignatures.map((row) => row.signature))
  for (const row of details.recipes.filter((candidate) => candidate.catalogListed !== false && candidate.ingredients?.length)) {
    const signature = craftingSignature(row.skill, row.ingredients)
    if (retiredSignatureSet.has(signature)) throw new Error(`retired crafting signature conflicts with current catalog route ${row.recipeId}`)
  }
  const recipes = details.recipes.map((row) => {
    const state = reviewed.routes.get(Number(row.recipeId))
    if (!state) return row
    if (row.catalogListed !== false) throw new Error(`retired route ${row.recipeId} is not supplemental`)
    if (row.skill !== state.skill) {
      const identityReachedPartialGuard = row.skill === 'unknown' && /skill calculator exposes .* exact ingredient identities were parsed/i.test(String(row.error || ''))
      if (!identityReachedPartialGuard) throw new Error(`retired route ${row.recipeId} skill identity was not established`)
    }
    return { recipeId: Number(row.recipeId), skill: state.skill, catalogListed: false, discovery: row.discovery, sourceUrl: row.sourceUrl, status: 'unavailable', liveState: 'retired-reviewed', ingredients: [], baseOutputs: [], randomOutputs: [] }
  })
  const unresolvedCount = recipes.filter((row) => row.status === 'unresolved').length
  return {
    ...details,
    complete: details.exactCoverage === true && unresolvedCount === 0,
    unresolvedCount,
    ...(details.supplementalDiscovery ? { supplementalDiscovery: { ...details.supplementalDiscovery, complete: unresolvedCount === 0 } } : {}),
    recipes,
    routeStateEvidence: evidence,
    retiredCraftingOutputItemIds: reviewed.retiredCraftingOutputItemIds,
    retiredCraftingSignatures,
  }
}

export function assertNoRetiredCraftingRoutes(dataset, details) {
  if (!details?.routeStateEvidence) throw new Error('reviewed retired crafting route evidence missing from Codex details')
  const reviewed = validateRetiredCraftingRouteEvidence(details.routeStateEvidence)
  const recorded = [...new Set((details.retiredCraftingOutputItemIds || []).map(Number))].sort((a, b) => a - b)
  if (JSON.stringify(recorded) !== JSON.stringify(reviewed.retiredCraftingOutputItemIds)) throw new Error('retired crafting output ids do not match reviewed route-state evidence')
  const retired = new Set(recorded)
  const signatureRows = details.retiredCraftingSignatures || []
  const signatureSet = new Set(signatureRows.map((row) => row?.signature).filter(Boolean))
  for (const row of signatureRows) {
    if (row.signature !== craftingSignature(row.skill, String(row.signature).split('|').slice(1).map((part) => {
      const [itemId, count] = part.split(':').map(Number); return { itemId, count }
    }))) throw new Error('retired crafting signature evidence is malformed')
  }
  const conflicts = []
  for (const recipe of Object.values(dataset?.recipes || {})) {
    if (retired.has(Number(recipe.outputItemId))) { conflicts.push(recipe.id || recipe.outputItemId); continue }
    if ((recipe.variants || []).some((variant) => signatureSet.has(craftingSignature(recipe.skill, variant.inputs)))) conflicts.push(recipe.id || recipe.outputItemId)
  }
  if (conflicts.length) throw new Error(`dataset contains retired crafting routes: ${conflicts.join(', ')}`)
  return true
}
