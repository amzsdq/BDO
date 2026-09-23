import type { RecipeId } from '../domain/types'
import type { PersistedPlanTarget, PlanSessionState } from './planSession'

/**
 * Replace one target without rebuilding the session. This is intentionally
 * index-based: duplicate recipe targets are valid when a user plans separate
 * batches, so recipeId is not a safe identity key.
 */
export function replacePlanTarget(
  session: PlanSessionState,
  index: number,
  target: PersistedPlanTarget,
): PlanSessionState {
  if (!Number.isInteger(index) || index < 0 || index >= session.targets.length) {
    throw new RangeError(`Plan target index ${index} is out of range`)
  }

  const targets = session.targets.slice()
  targets[index] = { ...target }
  return { ...session, targets }
}

/** Add a target while preserving every existing target and session choice. */
export function appendPlanTarget(
  session: PlanSessionState,
  target: PersistedPlanTarget,
): PlanSessionState {
  return { ...session, targets: [...session.targets, { ...target }] }
}

/** Remove exactly one target; sibling targets and non-target choices survive. */
export function removePlanTarget(session: PlanSessionState, index: number): PlanSessionState {
  if (!Number.isInteger(index) || index < 0 || index >= session.targets.length) {
    throw new RangeError(`Plan target index ${index} is out of range`)
  }
  return { ...session, targets: session.targets.filter((_, targetIndex) => targetIndex !== index) }
}

/**
 * Keep the selected variant in both places used by the planner session model:
 * the target projection and the recipe-level preference map.
 */
export function selectTargetVariant(
  session: PlanSessionState,
  index: number,
  recipeId: RecipeId,
  variantId: string | undefined,
): PlanSessionState {
  const current = session.targets[index]
  if (!current || current.recipeId !== recipeId) {
    throw new RangeError(`Plan target index ${index} does not match recipe ${recipeId}`)
  }

  const variantIdByRecipeId = { ...session.variantIdByRecipeId }
  if (variantId) variantIdByRecipeId[String(recipeId)] = variantId
  else delete variantIdByRecipeId[String(recipeId)]

  return {
    ...replacePlanTarget(session, index, { ...current, variantId }),
    variantIdByRecipeId,
  }
}
