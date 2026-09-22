import { cookingDurabilityPreparation } from '../domain/durabilityPlan'
import type { PlanTarget, RecipeDataset } from '../domain/types'
import type { PersistedPlanTarget } from './planSession'

export interface ResolvePlanTargetContext {
  cookingMastery?: number
}

export interface ResolvedPlanTarget {
  target?: PlanTarget
  error?: string
  estimatedPreparation?: boolean
}

/** Convert user-facing plan modes into the planner's exact output/recipe-attempt model. */
export function resolvePlanTarget(
  dataset: RecipeDataset,
  persisted: PersistedPlanTarget,
  context: ResolvePlanTargetContext,
): ResolvedPlanTarget {
  const recipe = dataset.recipes[persisted.recipeId]
  if (!recipe) return { error: `unknown target recipe: ${persisted.recipeId}` }

  if (persisted.mode === 'output') return { target: { recipeId: persisted.recipeId, variantId: persisted.variantId, mode: 'output', amount: persisted.amount } }
  if (persisted.mode === 'servings') return { target: { recipeId: persisted.recipeId, variantId: persisted.variantId, mode: 'attempts', amount: persisted.amount } }
  if (!Number.isInteger(persisted.amount)) return { error: 'utensil durability uses must be a positive integer' }

  if (recipe.skill === 'alchemy') {
    if (persisted.cookingPreparationPolicy) return { error: 'Cooking preparation policy cannot be applied to Alchemy' }
    return { target: { recipeId: persisted.recipeId, variantId: persisted.variantId, mode: 'attempts', amount: persisted.amount }, estimatedPreparation: false }
  }

  if (context.cookingMastery == null) return { error: 'Cooking mastery is required for mastery-aware durability preparation' }
  if (!persisted.cookingPreparationPolicy) return { error: 'Cooking durability preparation policy is required' }
  const preparation = cookingDurabilityPreparation(persisted.amount, context.cookingMastery, persisted.cookingPreparationPolicy)
  if (!preparation) return { error: 'Cooking mastery is not a source-verified breakpoint' }
  return {
    target: { recipeId: persisted.recipeId, variantId: persisted.variantId, mode: 'attempts', amount: preparation.materialServings },
    estimatedPreparation: preparation.estimated,
  }
}
