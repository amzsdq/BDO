import type { CookingPreparationPolicy } from '../domain/durabilityPlan'
import type { RecipeId, YieldPolicy } from '../domain/types'
import type { PersistedPlanTarget, PlanInputMode } from './planSession'

export interface ActivePlanTargetInput {
  recipeId: RecipeId
  variantId?: string
  mode: PlanInputMode
  amount: number
  skill: 'cooking' | 'alchemy'
  yieldPolicy?: YieldPolicy
  cookingPreparationPolicy?: CookingPreparationPolicy
}

/** Convert primary UI controls into the persisted/session target consumed by resolvePlanTarget(s). */
export function activePlanTarget(input: ActivePlanTargetInput): PersistedPlanTarget {
  const amount = Number(input.amount)
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount)) throw new Error('plan amount must be a positive integer')
  if (input.mode === 'durability' && input.skill === 'cooking' && !input.cookingPreparationPolicy) {
    throw new Error('Cooking durability preparation policy is required')
  }

  return {
    recipeId: input.recipeId,
    variantId: input.variantId,
    mode: input.mode,
    amount,
    yieldPolicy: input.mode === 'output' ? input.yieldPolicy ?? 'minimum' : undefined,
    cookingPreparationPolicy: input.mode === 'durability' && input.skill === 'cooking'
      ? input.cookingPreparationPolicy
      : undefined,
  }
}
