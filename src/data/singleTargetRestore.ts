import type { ItemId, RecipeId } from '../domain/types'
import type { CookingPreparationPolicy } from '../domain/durabilityPlan'
import type { PlanInputMode, PlanSessionState } from './planSession'

export interface SingleTargetRestoredState { recipeId: RecipeId; variantId?: string; mode: PlanInputMode; amount: number; cookingPreparationPolicy: CookingPreparationPolicy; craftIntermediateItemIds: Set<ItemId>; intermediateRecipeIdByItemId: Record<string, RecipeId>; selectedSubstitutionItemIdByGroupId: Record<string, ItemId> }
export function singleTargetRestoredState(session: PlanSessionState): SingleTargetRestoredState | undefined { const target = session.targets[0]; if (!target) return undefined; return { recipeId: target.recipeId, variantId: target.variantId ?? session.variantIdByRecipeId[target.recipeId], mode: target.mode, amount: target.amount, cookingPreparationPolicy: target.cookingPreparationPolicy ?? 'safe95', craftIntermediateItemIds: new Set(session.craftIntermediateItemIds), intermediateRecipeIdByItemId: { ...session.intermediateRecipeIdByItemId }, selectedSubstitutionItemIdByGroupId: { ...session.selectedSubstitutionItemIdByGroupId } } }
