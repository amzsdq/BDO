import type { PlanResult, PlanTarget, RecipeDataset } from '../domain/types'

export function appendYieldProvenanceWarnings(
  dataset: RecipeDataset,
  targets: readonly PlanTarget[],
  plan: PlanResult,
): PlanResult {
  const unknownOutputTargets = targets.filter((target) => target.mode === 'output' && dataset.recipes[target.recipeId]?.yield.provenance === 'unknown-server-yield')
  if (!unknownOutputTargets.length) return plan
  return {
    ...plan,
    warnings: [
      '일부 제작법의 실제 산출 분포는 서버 측 정보라 검증되지 않았습니다. 해당 출력 목표는 최소 1개/회 기준의 보수적 준비량이며, 예상 산출량을 뜻하지 않습니다.',
      ...plan.warnings,
    ],
  }
}
