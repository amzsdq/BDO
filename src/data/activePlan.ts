import { buildPlan } from '../domain/planner'
import type { PlanResult, RecipeDataset } from '../domain/types'
import type { CharacterProfileState } from './storage'
import { activePlanTarget, type ActivePlanTargetInput } from './activePlanTarget'
import { resolvePlanTarget } from './planSessionResolve'

export interface BuiltActivePlan {
  plan?: PlanResult
  materialServings?: number
  error?: string
  estimatedPreparation: boolean
}

/**
 * Single-target UI bridge: user-facing mode -> mastery-aware exact material
 * servings -> planner. App and batch loading can therefore share one resolved
 * serving count instead of interpreting durability independently.
 */
export function buildActivePlan(
  dataset: RecipeDataset,
  input: ActivePlanTargetInput,
  inventory: Readonly<Record<string, number>>,
  profile: Pick<CharacterProfileState, 'cookingMastery'>,
): BuiltActivePlan {
  try {
    const persisted = activePlanTarget(input)
    const resolved = resolvePlanTarget(dataset, persisted, { cookingMastery: profile.cookingMastery })
    if (resolved.error || !resolved.target) {
      return { error: resolved.error ?? 'target resolution failed', estimatedPreparation: resolved.estimatedPreparation === true }
    }
    const plan = buildPlan(dataset, [resolved.target], {
      craftIntermediateItemIds: new Set(),
      haveByItemId: inventory,
    })
    return {
      plan,
      materialServings: plan.crafts[0]?.attempts,
      estimatedPreparation: resolved.estimatedPreparation === true,
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'planner failed',
      estimatedPreparation: false,
    }
  }
}
