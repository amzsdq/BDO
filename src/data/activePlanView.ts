import { calculateBatchCapacity, type BatchCapacity } from '../domain/batch'
import { resolveIngredientChoice } from '../domain/substitution'
import type { RecipeDataset, RecipeVariant } from '../domain/types'
import { buildActivePlan, type ActivePlanOptions, type BuiltActivePlan } from './activePlan'
import type { ActivePlanTargetInput } from './activePlanTarget'
import type { CharacterProfileState } from './storage'

export interface ActivePlanView extends BuiltActivePlan { batch?: BatchCapacity }

function effectiveDirectLoadVariant(
  variant: RecipeVariant,
  dataset: RecipeDataset,
  inventory: Readonly<Record<string, number>>,
  options: Partial<ActivePlanOptions>,
): RecipeVariant {
  return {
    ...variant,
    inputs: variant.inputs.map((ingredient) => {
      const selectedItemId = ingredient.substitutionGroupId
        ? options.selectedSubstitutionItemIdByGroupId?.[ingredient.substitutionGroupId]
        : undefined
      const resolved = resolveIngredientChoice(ingredient, dataset.substitutionGroups ?? {}, {
        selectedItemId,
        ownedByItemId: inventory,
      })
      return { itemId: resolved.itemId, count: resolved.count, substitutionGroupId: ingredient.substitutionGroupId }
    }),
  }
}

/** UI projection that keeps recursive planner and direct utensil-load LT math on one resolved serving count. */
export function buildActivePlanView(
  dataset: RecipeDataset,
  input: ActivePlanTargetInput,
  inventory: Readonly<Record<string, number>>,
  profile: Pick<CharacterProfileState, 'cookingMastery' | 'maxWeightLT' | 'reservedWeightLT'>,
  options: Partial<ActivePlanOptions> = {},
): ActivePlanView {
  const built = buildActivePlan(dataset, input, inventory, profile, options)
  if (!built.plan || built.error || built.materialServings == null || profile.maxWeightLT == null) return built
  const recipe = dataset.recipes[input.recipeId]
  const variant = recipe?.variants.find((candidate) => candidate.id === input.variantId) ?? recipe?.variants[0]
  if (!variant) return { ...built, error: `unknown recipe variant for ${input.recipeId}` }
  try {
    const effectiveVariant = effectiveDirectLoadVariant(variant, dataset, inventory, options)
    return {
      ...built,
      batch: calculateBatchCapacity(effectiveVariant, dataset.items, {
        maxWeightLT: profile.maxWeightLT,
        reservedWeightLT: profile.reservedWeightLT,
      }, built.materialServings),
    }
  } catch (error) {
    return { ...built, batch: undefined, error: error instanceof Error ? error.message : 'batch input resolution failed' }
  }
}
