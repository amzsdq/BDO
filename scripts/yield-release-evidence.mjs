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
    const status = variant?.outputEvidence?.status
    const sourceRecipeId = Number(variant?.sourceRecipeId ?? variant?.yield?.sourceRecipeId ?? recipe?.yield?.sourceRecipeId)
    const sourceUrl = variant?.outputEvidence?.sourceUrl ?? variant?.yield?.provenance ?? recipe?.yield?.provenance
    const provenanceRecipeId = codexRecipeIdFromUrl(sourceUrl)
    if (status && status !== 'single-base') {
      if (status === 'unresolved' || status === 'multiple-base' || status === 'unavailable') return true
      if (!Number.isSafeInteger(sourceRecipeId) || sourceRecipeId <= 0 || provenanceRecipeId !== sourceRecipeId) return true
      if (status === 'random-only') return !(variant.outputEvidence?.randomOutputs ?? []).length || (variant.outputEvidence?.baseOutputs ?? []).length > 0
      if (status === 'no-output') return (variant.outputEvidence?.baseOutputs ?? []).length > 0 || (variant.outputEvidence?.randomOutputs ?? []).length > 0
      return false
    }
    const yieldData = variant?.yield ?? recipe?.yield ?? {}
    const min = Number(yieldData.min), max = Number(yieldData.max)
    const expected = yieldData.expected == null ? undefined : Number(yieldData.expected)
    return !Number.isFinite(min) || min <= 0 || !Number.isFinite(max) || max < min
      || (expected != null && (!Number.isFinite(expected) || expected < min || expected > max))
      || !Number.isSafeInteger(sourceRecipeId) || sourceRecipeId <= 0
      || provenanceRecipeId !== sourceRecipeId
  })
  if (unresolved.length) throw new Error(`${unresolved.length} recipes lack canonical Codex KR yield evidence; first ids: ${unresolved.slice(0, 20).map(({ recipe, variant }) => variant ? `${recipe.id}:${variant.id}` : recipe.id).join(', ')}`)
  if (dataset.metadata?.yieldEvidenceApplied !== true || dataset.metadata?.yieldEvidenceCount !== routes.length) throw new Error(`yield evidence coverage is incomplete: recorded=${dataset.metadata?.yieldEvidenceCount ?? 0} routes=${routes.length}`)
  return true
}
