import type { CookingPreparationPolicy } from '../domain/durabilityPlan'
import type { RecipeDataset, RecipeId, YieldPolicy } from '../domain/types'
import type { PersistedPlanTarget, PlanInputMode, PlanSessionState } from './planSession'
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
  const next = { ...current, ...patch }
  if (patch.mode != null && patch.mode !== 'durability') delete next.cookingPreparationPolicy
  if (patch.mode != null && patch.mode !== 'output') delete next.yieldPolicy
  return replacePlanTarget(session, index, next)
}

/** Keep mode-specific policy fields immediately resolvable. */
export function updateActiveSessionTargetMode(
  session: PlanSessionState,
  index: number,
  skill: 'cooking' | 'alchemy',
  mode: PlanInputMode,
  cookingPolicy: CookingPreparationPolicy = 'safe95',
  yieldPolicy: YieldPolicy = 'minimum',
): PlanSessionState {
  return updateActiveSessionTarget(session, index, {
    mode,
    yieldPolicy: mode === 'output' ? yieldPolicy : undefined,
    cookingPreparationPolicy: mode === 'durability' && skill === 'cooking' ? cookingPolicy : undefined,
  })
}
