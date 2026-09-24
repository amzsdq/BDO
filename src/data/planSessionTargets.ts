import type { RecipeId } from '../domain/types'
import type { PersistedPlanTarget, PlanSessionState } from './planSession'

/**
 * Replace one target without rebuilding the session. This is intentionally
 * index-based: duplicate recipe targets are valid when a user plans separate
 * batches, so recipeId is not a safe identity key.
 *
 * The recipe-level variant preference participates in recursive planning, so a
 * recipe replacement must keep that projection synchronized with the target.
 */
export function replacePlanTarget(
  session: PlanSessionState,
  index: number,
  target: PersistedPlanTarget,
): PlanSessionState {
  if (!Number.isInteger(index) || index < 0 || index >= session.targets.length) {
    throw new RangeError(`Plan target index ${index} is out of range`)
  }

  const previous = session.targets[index]
  const targets = session.targets.slice()
  targets[index] = { ...target }
  const variantIdByRecipeId = { ...session.variantIdByRecipeId }

  if (previous?.recipeId !== target.recipeId && previous?.recipeId) {
    const siblingStillUsesPrevious = targets.some((entry, targetIndex) => targetIndex !== index && entry.recipeId === previous.recipeId)
    if (!siblingStillUsesPrevious) delete variantIdByRecipeId[String(previous.recipeId)]
  }
  if (target.variantId) variantIdByRecipeId[String(target.recipeId)] = target.variantId
  else delete variantIdByRecipeId[String(target.recipeId)]

  return { ...session, targets, variantIdByRecipeId }
}

/** Add a target while preserving every existing target and session choice. */
export function appendPlanTarget(
  session: PlanSessionState,
  target: PersistedPlanTarget,
): PlanSessionState {
  const variantIdByRecipeId = { ...session.variantIdByRecipeId }
  if (target.variantId) variantIdByRecipeId[String(target.recipeId)] = target.variantId
  return { ...session, targets: [...session.targets, { ...target }], variantIdByRecipeId }
}

/** Remove exactly one target; sibling targets and non-target choices survive. */
export function removePlanTarget(session: PlanSessionState, index: number): PlanSessionState {
  if (!Number.isInteger(index) || index < 0 || index >= session.targets.length) {
    throw new RangeError(`Plan target index ${index} is out of range`)
  }
  const removed = session.targets[index]
  const targets = session.targets.filter((_, targetIndex) => targetIndex !== index)
  const variantIdByRecipeId = { ...session.variantIdByRecipeId }
  if (removed && !targets.some((target) => target.recipeId === removed.recipeId)) delete variantIdByRecipeId[String(removed.recipeId)]
  return { ...session, targets, variantIdByRecipeId }
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

  return replacePlanTarget(session, index, { ...current, variantId })
}
