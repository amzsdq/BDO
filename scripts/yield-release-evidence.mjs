export function assertYieldReleaseEvidence(dataset) {
  const recipes = Object.values(dataset?.recipes ?? {})
  if (!recipes.length) throw new Error('recipe yield release evidence requires non-empty recipes')
  const unresolved = recipes.filter((recipe) => {
    const yieldData = recipe?.yield ?? {}
    const min = Number(yieldData.min), max = Number(yieldData.max)
    const expected = yieldData.expected == null ? undefined : Number(yieldData.expected)
    const provenance = String(yieldData.provenance ?? '').trim()
    return !Number.isFinite(min) || min <= 0 || !Number.isFinite(max) || max < min || (expected != null && (!Number.isFinite(expected) || expected < min || expected > max)) || !/^https:\/\//.test(provenance) || provenance === 'unknown-server-yield'
  })
  if (unresolved.length) throw new Error(`${unresolved.length} recipes lack reviewed yield evidence; first ids: ${unresolved.slice(0, 20).map((recipe) => recipe.id).join(', ')}`)
  if (dataset.metadata?.yieldEvidenceApplied !== true || dataset.metadata?.yieldEvidenceCount !== recipes.length) throw new Error(`yield evidence coverage is incomplete: recorded=${dataset.metadata?.yieldEvidenceCount ?? 0} recipes=${recipes.length}`)
  return true
}
