import { calculateBatchCapacity, type BatchCapacity } from '../domain/batch'
import type { RecipeDataset } from '../domain/types'
import { buildActivePlan, type ActivePlanOptions, type BuiltActivePlan } from './activePlan'
import type { ActivePlanTargetInput } from './activePlanTarget'
import type { CharacterProfileState } from './storage'

export interface ActivePlanView extends BuiltActivePlan { batch?: BatchCapacity }

/** UI projection that keeps recursive planner and LT math on one resolved serving count. */
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
  return {
    ...built,
    batch: calculateBatchCapacity(variant, dataset.items, {
      maxWeightLT: profile.maxWeightLT,
      reservedWeightLT: profile.reservedWeightLT,
    }, built.materialServings),
  }
}
