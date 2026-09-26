import { cookingDurabilityPreparation } from '../domain/durabilityPlan'
import type { PlanTarget, RecipeDataset } from '../domain/types'
import type { PersistedPlanTarget } from './planSession'

export interface ResolvePlanTargetContext {
  cookingMastery?: number
  alchemyMastery?: number
  variantIdByRecipeId?: Readonly<Record<string, string>>
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
  const variantId = persisted.variantId ?? context.variantIdByRecipeId?.[String(persisted.recipeId)]
  if (variantId && !recipe.variants.some((variant) => variant.id === variantId)) return { error: `unknown target variant: ${persisted.recipeId}/${variantId}` }
  const selectedVariant = recipe.variants.find((variant) => variant.id === variantId) ?? recipe.variants[0]
  const minimumMastery = selectedVariant?.skillRequirement?.minimumMastery
  if (minimumMastery != null) {
    const mastery = recipe.skill === 'cooking' ? context.cookingMastery : context.alchemyMastery
    if (mastery == null) return { error: `${recipe.skill === 'cooking' ? 'Cooking' : 'Alchemy'} mastery ${minimumMastery}+ is required for the selected source route` }
    if (mastery < minimumMastery) return { error: `${recipe.skill === 'cooking' ? 'Cooking' : 'Alchemy'} mastery ${minimumMastery}+ is required for the selected source route (current ${mastery})` }
  }

  if (persisted.mode === 'output') {
    if (!Number.isInteger(persisted.amount)) return { error: 'desired output quantity must be a positive integer' }
    return { target: { recipeId: persisted.recipeId, variantId, mode: 'output', amount: persisted.amount, yieldPolicy: persisted.yieldPolicy ?? 'minimum' } }
  }
  if (persisted.mode === 'servings') {
    if (!Number.isInteger(persisted.amount)) return { error: 'recipe servings must be a positive integer' }
    return { target: { recipeId: persisted.recipeId, variantId, mode: 'attempts', amount: persisted.amount } }
  }
  if (!Number.isInteger(persisted.amount)) return { error: 'utensil durability uses must be a positive integer' }

  if (recipe.skill === 'alchemy') {
    if (persisted.cookingPreparationPolicy) return { error: 'Cooking preparation policy cannot be applied to Alchemy' }
    return { target: { recipeId: persisted.recipeId, variantId, mode: 'attempts', amount: persisted.amount }, estimatedPreparation: false }
  }

  if (context.cookingMastery == null) return { error: 'Cooking mastery is required for mastery-aware durability preparation' }
  if (!persisted.cookingPreparationPolicy) return { error: 'Cooking durability preparation policy is required' }
  const preparation = cookingDurabilityPreparation(persisted.amount, context.cookingMastery, persisted.cookingPreparationPolicy)
  if (!preparation) return { error: 'Cooking mastery is not a source-verified breakpoint' }
  return {
    target: { recipeId: persisted.recipeId, variantId, mode: 'attempts', amount: preparation.materialServings },
    estimatedPreparation: preparation.estimated,
  }
}

export interface ResolvedPlanTargets {
  targets: PlanTarget[]
  errors: string[]
  hasEstimatedPreparation: boolean
}

/** Resolve a multi-target session without silently dropping an invalid target. */
export function resolvePlanTargets(
  dataset: RecipeDataset,
  persistedTargets: readonly PersistedPlanTarget[],
  context: ResolvePlanTargetContext,
): ResolvedPlanTargets {
  const targets: PlanTarget[] = []
  const errors: string[] = []
  let hasEstimatedPreparation = false
  for (const persisted of persistedTargets) {
    const resolved = resolvePlanTarget(dataset, persisted, context)
    if (resolved.error || !resolved.target) errors.push(`${persisted.recipeId}: ${resolved.error ?? 'target resolution failed'}`)
    else {
      targets.push(resolved.target)
      hasEstimatedPreparation ||= resolved.estimatedPreparation === true
    }
  }
  return { targets: errors.length ? [] : targets, errors, hasEstimatedPreparation }
}
