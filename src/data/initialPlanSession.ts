import type { RecipeDataset } from '../domain/types'
import type { PlanSessionState } from './planSession'

/**
 * Build first-run UI state only after the runtime dataset is known. This avoids
 * mounting a synthetic/sample target that can be written to persistence before
 * verified data hydration completes.
 */
export function createInitialPlanSession(dataset: RecipeDataset): PlanSessionState {
  const firstCooking = Object.values(dataset.recipes).find((recipe) => recipe.skill === 'cooking')
    ?? Object.values(dataset.recipes)[0]

  return {
    version: 1,
    targets: firstCooking ? [{
      recipeId: firstCooking.id,
      variantId: firstCooking.variants[0]?.id,
      mode: 'servings',
      amount: 100,
    }] : [],
    craftIntermediateItemIds: [],
    intermediateRecipeIdByItemId: {},
    variantIdByRecipeId: firstCooking?.variants[0]?.id
      ? { [String(firstCooking.id)]: firstCooking.variants[0].id }
      : {},
    selectedSubstitutionItemIdByGroupId: {},
  }
}
