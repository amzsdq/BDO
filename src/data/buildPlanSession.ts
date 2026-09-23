import { buildPlan } from '../domain/planner'
import type { PlanResult, RecipeDataset } from '../domain/types'
import type { CharacterProfileState } from './storage'
import type { PlanSessionState } from './planSession'
import { planOptionsFromSession } from './planSessionOptions'
import { resolvePlanTargets } from './planSessionResolve'
import { validatePlanSessionAgainstDataset } from './planSessionValidation'
import { appendYieldProvenanceWarnings } from './yieldWarnings'

export interface BuiltPlanSession {
  plan?: PlanResult
  errors: string[]
  hasEstimatedPreparation: boolean
}

/**
 * Single fail-closed bridge for App: durable choices -> validated targets ->
 * mastery-aware material servings -> recursive planner math.
 */
export function buildPlanFromSession(
  dataset: RecipeDataset,
  session: PlanSessionState,
  inventory: Readonly<Record<string, number>>,
  profile: Pick<CharacterProfileState, 'cookingMastery'>,
): BuiltPlanSession {
  const validation = validatePlanSessionAgainstDataset(dataset, session)
  if (!validation.valid) return { errors: validation.errors, hasEstimatedPreparation: false }

  const resolved = resolvePlanTargets(dataset, session.targets, { cookingMastery: profile.cookingMastery })
  if (resolved.errors.length) return { errors: resolved.errors, hasEstimatedPreparation: resolved.hasEstimatedPreparation }

  try {
    const rawPlan = buildPlan(dataset, resolved.targets, planOptionsFromSession(session, inventory))
    return {
      plan: appendYieldProvenanceWarnings(dataset, resolved.targets, rawPlan),
      errors: [],
      hasEstimatedPreparation: resolved.hasEstimatedPreparation,
    }
  } catch (error) {
    return {
      errors: [error instanceof Error ? error.message : 'planner failed'],
      hasEstimatedPreparation: resolved.hasEstimatedPreparation,
    }
  }
}
