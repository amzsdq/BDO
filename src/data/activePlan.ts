import { buildPlan } from '../domain/planner'
import type { PlanOptions, PlanResult, RecipeDataset } from '../domain/types'
import type { CharacterProfileState } from './storage'
import { activePlanTarget, type ActivePlanTargetInput } from './activePlanTarget'
import { resolvePlanTarget } from './planSessionResolve'
import { appendYieldProvenanceWarnings } from './yieldWarnings'

export interface BuiltActivePlan {
  plan?: PlanResult
  materialServings?: number
  error?: string
  estimatedPreparation: boolean
}

export type ActivePlanOptions = Omit<PlanOptions, 'haveByItemId'>

/** Single-target UI bridge with the same recursive choices used by durable sessions. */
export function buildActivePlan(
  dataset: RecipeDataset,
  input: ActivePlanTargetInput,
  inventory: Readonly<Record<string, number>>,
  profile: Pick<CharacterProfileState, 'cookingMastery' | 'alchemyMastery'>,
  options: Partial<ActivePlanOptions> = {},
): BuiltActivePlan {
  try {
    const persisted = activePlanTarget(input)
    const resolved = resolvePlanTarget(dataset, persisted, { cookingMastery: profile.cookingMastery, alchemyMastery: profile.alchemyMastery })
    if (resolved.error || !resolved.target) return { error: resolved.error ?? 'target resolution failed', estimatedPreparation: resolved.estimatedPreparation === true }
    const rawPlan = buildPlan(dataset, [resolved.target], {
      craftIntermediateItemIds: options.craftIntermediateItemIds ?? new Set(),
      haveByItemId: inventory,
      intermediateRecipeIdByItemId: options.intermediateRecipeIdByItemId,
      variantIdByRecipeId: options.variantIdByRecipeId,
      selectedSubstitutionItemIdByGroupId: options.selectedSubstitutionItemIdByGroupId,
    })
    const plan = appendYieldProvenanceWarnings(dataset, [resolved.target], rawPlan)
    return { plan, materialServings: plan.crafts[0]?.attempts, estimatedPreparation: resolved.estimatedPreparation === true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'planner failed', estimatedPreparation: false }
  }
}
