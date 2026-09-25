import type { PlanResult, PlanTarget, RecipeDataset } from '../domain/types'

export function appendYieldProvenanceWarnings(
  dataset: RecipeDataset,
  targets: readonly PlanTarget[],
  plan: PlanResult,
): PlanResult {
  const unknownOutputTargets = targets.filter((target) => {
    if (target.mode !== 'output') return false
    const recipe = dataset.recipes[target.recipeId]
    if (!recipe) return false
    const variant = target.variantId ? recipe.variants.find((entry) => entry.id === target.variantId) : recipe.variants[0]
    return (variant?.yield ?? recipe.yield).provenance === 'unknown-server-yield'
  })
  if (!unknownOutputTargets.length) return plan
  return {
    ...plan,
    warnings: [
      '일부 제작법의 실제 산출 분포는 서버 측 정보라 검증되지 않았습니다. 해당 출력 목표는 최소 1개/회 기준의 보수적 준비량이며, 예상 산출량을 뜻하지 않습니다.',
      ...plan.warnings,
    ],
  }
}
