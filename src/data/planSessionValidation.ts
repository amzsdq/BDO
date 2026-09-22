import type { RecipeDataset } from '../domain/types'
import type { PlanSessionState } from './planSession'

export interface PlanSessionValidation {
  valid: boolean
  errors: string[]
}

/** Fail-closed referential validation after a persisted session meets shape checks. */
export function validatePlanSessionAgainstDataset(dataset: RecipeDataset, session: PlanSessionState): PlanSessionValidation {
  const errors: string[] = []

  for (const target of session.targets) {
    const recipe = dataset.recipes[target.recipeId]
    if (!recipe) { errors.push(`unknown target recipe: ${target.recipeId}`); continue }
    if (target.variantId && !recipe.variants.some((variant) => variant.id === target.variantId)) errors.push(`unknown target variant: ${target.recipeId}/${target.variantId}`)
    if (target.cookingPreparationPolicy && recipe.skill !== 'cooking') errors.push(`Cooking preparation policy used by non-Cooking recipe: ${target.recipeId}`)
  }

  for (const itemId of session.craftIntermediateItemIds) {
    if (!(dataset.recipesByOutput[String(itemId)] ?? []).length) errors.push(`non-craftable intermediate selected: ${itemId}`)
  }

  for (const [itemId, recipeId] of Object.entries(session.intermediateRecipeIdByItemId)) {
    if (!(dataset.recipesByOutput[itemId] ?? []).includes(recipeId)) errors.push(`intermediate recipe ${recipeId} does not produce item ${itemId}`)
  }

  for (const [recipeId, variantId] of Object.entries(session.variantIdByRecipeId)) {
    const recipe = dataset.recipes[recipeId]
    if (!recipe) errors.push(`unknown recipe variant owner: ${recipeId}`)
    else if (!recipe.variants.some((variant) => variant.id === variantId)) errors.push(`unknown persisted variant: ${recipeId}/${variantId}`)
  }

  return { valid: errors.length === 0, errors }
}
