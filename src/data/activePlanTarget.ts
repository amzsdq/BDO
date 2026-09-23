import type { CookingPreparationPolicy } from '../domain/durabilityPlan'
import type { RecipeId } from '../domain/types'
import type { PersistedPlanTarget, PlanInputMode } from './planSession'

export interface ActivePlanTargetInput {
  recipeId: RecipeId
  variantId?: string
  mode: PlanInputMode
  amount: number
  skill: 'cooking' | 'alchemy'
  cookingPreparationPolicy?: CookingPreparationPolicy
}

/**
 * Convert the primary single-target UI controls into the persisted/session target
 * consumed by resolvePlanTarget(s). This keeps durability semantics out of App.tsx:
 * Cooking durability may carry a preparation policy; Alchemy never does.
 */
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
    cookingPreparationPolicy: input.mode === 'durability' && input.skill === 'cooking'
      ? input.cookingPreparationPolicy
      : undefined,
  }
}
