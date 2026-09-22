import type { PlanOptions } from '../domain/types'
import type { PlanSessionState } from './planSession'

/** Convert durable user choices into the planner's immutable option shape. */
export function planOptionsFromSession(
  session: PlanSessionState,
  haveByItemId: Readonly<Record<string, number>> = {},
): PlanOptions {
  return {
    craftIntermediateItemIds: new Set(session.craftIntermediateItemIds),
    haveByItemId,
    intermediateRecipeIdByItemId: session.intermediateRecipeIdByItemId,
    variantIdByRecipeId: session.variantIdByRecipeId,
    selectedSubstitutionItemIdByGroupId: session.selectedSubstitutionItemIdByGroupId,
  }
}
