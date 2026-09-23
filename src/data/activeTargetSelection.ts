import type { RecipeDataset } from '../domain/types'
import { createDefaultPlanTarget } from './initialPlanSession'
import type { PlanSessionState } from './planSession'
import { appendPlanTarget, removePlanTarget } from './planSessionTargets'

export type ActiveTargetSelection = {
  session: PlanSessionState
  activeIndex: number
}

/** Add one canonical persisted target and select it. */
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
