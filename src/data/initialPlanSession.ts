import type { RecipeDataset } from '../domain/types'
import type { PersistedPlanTarget, PlanSessionState } from './planSession'

export function createDefaultPlanTarget(
  dataset: RecipeDataset,
  preferredSkill: 'cooking' | 'alchemy' = 'cooking',
): PersistedPlanTarget | undefined {
  const recipe = Object.values(dataset.recipes).find((candidate) => candidate.skill === preferredSkill)
    ?? Object.values(dataset.recipes)[0]
  if (!recipe) return undefined
  return {
    recipeId: recipe.id,
    variantId: recipe.variants[0]?.id,
    mode: 'servings',
    amount: 100,
  }
}

/**
 * Build first-run UI state only after the runtime dataset is known. This avoids
 * mounting a synthetic/sample target that can be written to persistence before
 * verified data hydration completes.
 */
export function createInitialPlanSession(dataset: RecipeDataset): PlanSessionState {
  const target = createDefaultPlanTarget(dataset, 'cooking')

  return {
    version: 1,
    targets: target ? [target] : [],
    craftIntermediateItemIds: [],
    intermediateRecipeIdByItemId: {},
    variantIdByRecipeId: target?.variantId
      ? { [String(target.recipeId)]: target.variantId }
      : {},
    selectedSubstitutionItemIdByGroupId: {},
  }
}
