const CODEX_RECIPE_URL = /^https:\/\/(?:www\.)?bdocodex\.com\/kr\/recipe\/(\d+)\/?(?:[?#].*)?$/i

export function codexRecipeIdFromUrl(value) {
  const match = String(value ?? '').trim().match(CODEX_RECIPE_URL)
  if (!match) return null
  const id = Number(match[1])
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

export function assertYieldReleaseEvidence(dataset) {
  const recipes = Object.values(dataset?.recipes ?? {})
  if (!recipes.length) throw new Error('recipe yield release evidence requires non-empty recipes')
  const routes = recipes.flatMap((recipe) => (recipe.variants?.length ? recipe.variants.map((variant) => ({ recipe, variant })) : [{ recipe, variant: undefined }]))
  const unresolved = routes.filter(({ recipe, variant }) => {
    const yieldData = variant?.yield ?? recipe?.yield ?? {}
    const min = Number(yieldData.min), max = Number(yieldData.max)
    const expected = yieldData.expected == null ? undefined : Number(yieldData.expected)
    const sourceRecipeId = Number(variant?.sourceRecipeId ?? yieldData.sourceRecipeId)
    const provenanceRecipeId = codexRecipeIdFromUrl(yieldData.provenance)
    return !Number.isFinite(min) || min <= 0 || !Number.isFinite(max) || max < min
      || (expected != null && (!Number.isFinite(expected) || expected < min || expected > max))
      || !Number.isSafeInteger(sourceRecipeId) || sourceRecipeId <= 0
      || provenanceRecipeId !== sourceRecipeId
  })
  if (unresolved.length) throw new Error(`${unresolved.length} recipes lack canonical Codex KR yield evidence; first ids: ${unresolved.slice(0, 20).map(({ recipe, variant }) => variant ? `${recipe.id}:${variant.id}` : recipe.id).join(', ')}`)
  if (dataset.metadata?.yieldEvidenceApplied !== true || dataset.metadata?.yieldEvidenceCount !== routes.length) throw new Error(`yield evidence coverage is incomplete: recorded=${dataset.metadata?.yieldEvidenceCount ?? 0} routes=${routes.length}`)
  return true
}
