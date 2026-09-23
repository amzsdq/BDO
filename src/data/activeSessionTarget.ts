import type { RecipeDataset, RecipeId } from '../domain/types'
import type { PersistedPlanTarget, PlanSessionState } from './planSession'
import { replacePlanTarget } from './planSessionTargets'

export interface ActiveSessionTarget {
  index: number
  target: PersistedPlanTarget
  recipeId: RecipeId
  variantId?: string
}

/** Resolve one UI-editable target without discarding the rest of the batch. */
export function activeSessionTarget(
  dataset: RecipeDataset,
  session: PlanSessionState,
  index: number,
): ActiveSessionTarget | undefined {
  const target = session.targets[index]
  if (!target) return undefined
  const recipe = dataset.recipes[target.recipeId]
  if (!recipe) return undefined
  const variantId = target.variantId ?? session.variantIdByRecipeId[target.recipeId] ?? recipe.variants[0]?.id
  if (variantId && !recipe.variants.some((variant) => variant.id === variantId)) return undefined
  return { index, target, recipeId: recipe.id, variantId }
}

/** Apply control edits to one target while preserving sibling targets. */
export function updateActiveSessionTarget(
  session: PlanSessionState,
  index: number,
  patch: Partial<Omit<PersistedPlanTarget, 'recipeId'>>,
): PlanSessionState {
  const current = session.targets[index]
  if (!current) throw new RangeError(`Plan target index ${index} is out of range`)
  return replacePlanTarget(session, index, { ...current, ...patch })
}
