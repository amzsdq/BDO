import { calculateBatchCapacity, type BatchCapacity } from '../domain/batch'
import { verifiedBaseOutputWeightRange, type VerifiedBaseOutputWeightRange } from '../domain/verifiedBaseOutputWeight'
import type { RecipeDataset, RecipeVariant } from '../domain/types'
import { resolveIngredientChoice } from '../domain/substitution'
import { buildActivePlan, type ActivePlanOptions, type BuiltActivePlan } from './activePlan'
import type { ActivePlanTargetInput } from './activePlanTarget'
import type { CharacterProfileState } from './storage'

export interface ActivePlanView extends BuiltActivePlan { batch?: BatchCapacity; outputWeight?: VerifiedBaseOutputWeightRange }

function resolveBatchVariant(dataset: RecipeDataset, variant: RecipeVariant, inventory: Readonly<Record<string, number>>, options: Partial<ActivePlanOptions>): RecipeVariant {
  const countByItemId = new Map<number, number>()
  for (const input of variant.inputs) {
    const selectedItemId = input.substitutionGroupId ? options.selectedSubstitutionItemIdByGroupId?.[input.substitutionGroupId] : undefined
    const resolved = resolveIngredientChoice(input, dataset.substitutionGroups ?? {}, { selectedItemId, ownedByItemId: inventory })
    countByItemId.set(resolved.itemId, (countByItemId.get(resolved.itemId) ?? 0) + resolved.count)
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
  const outputWeight = verifiedBaseOutputWeightRange(variant, dataset.items, built.materialServings)
  if (profile.maxWeightLT == null) return { ...built, ...(outputWeight ? { outputWeight } : {}) }
  return {
    ...built,
    ...(outputWeight ? { outputWeight } : {}),
    batch: calculateBatchCapacity(resolveBatchVariant(dataset, variant, inventory, options), dataset.items, {
      maxWeightLT: profile.maxWeightLT,
      reservedWeightLT: profile.reservedWeightLT,
    }, built.materialServings),
  }
}
