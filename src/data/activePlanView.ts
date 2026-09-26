import { calculateBatchCapacity, type BatchCapacity } from '../domain/batch'
import { verifiedBaseOutputWeightRange, type VerifiedBaseOutputWeightRange } from '../domain/verifiedBaseOutputWeight'
import type { RecipeDataset, RecipeVariant } from '../domain/types'
import { resolveIngredientChoice, resolveOwnedMixedIngredientAllocation } from '../domain/substitution'
import { buildActivePlan, type ActivePlanOptions, type BuiltActivePlan } from './activePlan'
import type { ActivePlanTargetInput } from './activePlanTarget'
import type { CharacterProfileState } from './storage'

export interface ActivePlanView extends BuiltActivePlan { batch?: BatchCapacity; outputWeight?: VerifiedBaseOutputWeightRange }

function resolveBatchVariant(dataset: RecipeDataset, variant: RecipeVariant, inventory: Readonly<Record<string, number>>, attempts: number, options: Partial<ActivePlanOptions>): RecipeVariant {
  const countByItemId = new Map<number, number>()
  const consumedByItemId = new Map<number, number>()
  for (const input of variant.inputs) {
    const selectedItemId = input.substitutionGroupId ? options.selectedSubstitutionItemIdByGroupId?.[input.substitutionGroupId] : undefined
    const substitutionMembers = input.substitutionGroupId ? dataset.substitutionGroups?.[input.substitutionGroupId]?.memberItemIds ?? [] : []
    const remainingInventory = Object.fromEntries(substitutionMembers.map((itemId) => [String(itemId), Math.max(0, (Number(inventory[String(itemId)]) || 0) - (consumedByItemId.get(itemId) ?? 0))]))
    const mixed = !selectedItemId && input.substitutionGroupId
      ? resolveOwnedMixedIngredientAllocation(input, dataset.substitutionGroups ?? {}, remainingInventory, attempts)
      : undefined
    if (mixed?.length) {
      for (const allocation of mixed) {
        countByItemId.set(allocation.itemId, (countByItemId.get(allocation.itemId) ?? 0) + allocation.count)
        consumedByItemId.set(allocation.itemId, (consumedByItemId.get(allocation.itemId) ?? 0) + allocation.count * attempts)
      }
      continue
    }
    const resolved = resolveIngredientChoice(input, dataset.substitutionGroups ?? {}, { selectedItemId, ownedByItemId: remainingInventory, requiredMultiplier: attempts })
    countByItemId.set(resolved.itemId, (countByItemId.get(resolved.itemId) ?? 0) + resolved.count)
    consumedByItemId.set(resolved.itemId, (consumedByItemId.get(resolved.itemId) ?? 0) + resolved.count * attempts)
  }
  return {
    ...variant,
    inputs: [...countByItemId.entries()].map(([itemId, count]) => ({ itemId, count })),
  }
}

/** UI projection that keeps recursive planner and LT math on one resolved serving count. */
export function buildActivePlanView(
  dataset: RecipeDataset,
  input: ActivePlanTargetInput,
  inventory: Readonly<Record<string, number>>,
  profile: Pick<CharacterProfileState, 'cookingMastery' | 'alchemyMastery' | 'maxWeightLT' | 'reservedWeightLT'>,
  options: Partial<ActivePlanOptions> = {},
): ActivePlanView {
  const built = buildActivePlan(dataset, input, inventory, profile, options)
  if (!built.plan || built.error || built.materialServings == null) return built
  const recipe = dataset.recipes[input.recipeId]
  const variant = recipe?.variants.find((candidate) => candidate.id === input.variantId) ?? recipe?.variants[0]
  if (!variant) return { ...built, error: `unknown recipe variant for ${input.recipeId}` }
  const outputWeight = verifiedBaseOutputWeightRange(variant, dataset.items, built.materialServings, recipe.outputItemId)
  if (profile.maxWeightLT == null) return { ...built, ...(outputWeight ? { outputWeight } : {}) }
  return {
    ...built,
    ...(outputWeight ? { outputWeight } : {}),
    batch: calculateBatchCapacity(resolveBatchVariant(dataset, variant, inventory, built.materialServings, options), dataset.items, {
      maxWeightLT: profile.maxWeightLT,
      reservedWeightLT: profile.reservedWeightLT,
    }, built.materialServings),
  }
}
