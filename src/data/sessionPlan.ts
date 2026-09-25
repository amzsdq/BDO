import { buildPlan } from '../domain/planner'
import type { PlanResult, RecipeDataset } from '../domain/types'
import type { PlanSessionState } from './planSession'
import { resolvePlanTargets } from './planSessionResolve'
import type { CharacterProfileState, InventoryState } from './storage'
import { appendYieldProvenanceWarnings } from './yieldWarnings'

export type SessionPlanResult = {
  plan?: PlanResult
  errors: string[]
  estimatedPreparation: boolean
}

/** Build one preparation/checklist plan from every persisted target. Fail closed if any target cannot resolve. */
export function buildPlanFromSession(
  dataset: RecipeDataset,
  session: PlanSessionState,
  inventory: InventoryState,
  profile: Pick<CharacterProfileState, 'cookingMastery' | 'alchemyMastery'>,
): SessionPlanResult {
  const resolved = resolvePlanTargets(dataset, session.targets, {
    cookingMastery: profile.cookingMastery,
    alchemyMastery: profile.alchemyMastery,
    variantIdByRecipeId: session.variantIdByRecipeId,
  })
  if (resolved.errors.length) return { errors: resolved.errors, estimatedPreparation: resolved.hasEstimatedPreparation }
  try {
    const rawPlan = buildPlan(dataset, resolved.targets, {
      craftIntermediateItemIds: new Set(session.craftIntermediateItemIds),
      haveByItemId: inventory,
      intermediateRecipeIdByItemId: session.intermediateRecipeIdByItemId,
      variantIdByRecipeId: session.variantIdByRecipeId,
      selectedSubstitutionItemIdByGroupId: session.selectedSubstitutionItemIdByGroupId,
    })
    return { plan: appendYieldProvenanceWarnings(dataset, resolved.targets, rawPlan), errors: [], estimatedPreparation: resolved.hasEstimatedPreparation }
  } catch (error) {
    return { errors: [error instanceof Error ? error.message : 'session planner failed'], estimatedPreparation: resolved.hasEstimatedPreparation }
  }
}
