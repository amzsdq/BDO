import type { RecipeDataset } from '../domain/types'
import { createDefaultPlanTarget } from './initialPlanSession'
import type { PlanSessionState } from './planSession'
import { appendPlanTarget, removePlanTarget, replacePlanTarget } from './planSessionTargets'

export type ActiveTargetSelection = {
  session: PlanSessionState
  activeIndex: number
}

/** Add one canonical persisted target and select the new sibling. */
export function addDefaultTarget(
  dataset: RecipeDataset,
  session: PlanSessionState,
  preferredSkill: 'cooking' | 'alchemy',
): ActiveTargetSelection {
  const target = createDefaultPlanTarget(dataset, preferredSkill)
  if (!target) return { session, activeIndex: Math.max(0, session.targets.length - 1) }
  const next = appendPlanTarget(session, target)
  return { session: next, activeIndex: next.targets.length - 1 }
}

/** Switch only the active persisted target to the requested life skill. Siblings and amount/mode survive. */
export function switchTargetSkill(
  dataset: RecipeDataset,
  session: PlanSessionState,
  index: number,
  preferredSkill: 'cooking' | 'alchemy',
): ActiveTargetSelection {
  const current = session.targets[index]
  const fallback = createDefaultPlanTarget(dataset, preferredSkill)
  if (!current || !fallback) return { session, activeIndex: Math.max(0, Math.min(index, session.targets.length - 1)) }
  const target = {
    ...fallback,
    mode: current.mode,
    amount: current.amount,
    cookingPreparationPolicy: preferredSkill === 'cooking' ? current.cookingPreparationPolicy : undefined,
  }
  return { session: replacePlanTarget(session, index, target), activeIndex: index }
}

/** Remove one target and clamp selection without ever manufacturing an empty session. */
export function removeTargetAndSelect(
  session: PlanSessionState,
  index: number,
  activeIndex: number,
): ActiveTargetSelection {
  if (session.targets.length <= 1) return { session, activeIndex: 0 }
  const next = removePlanTarget(session, index)
  let nextActive = activeIndex
  if (index < activeIndex) nextActive -= 1
  else if (index === activeIndex) nextActive = Math.min(index, next.targets.length - 1)
  return { session: next, activeIndex: Math.max(0, nextActive) }
}
