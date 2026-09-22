import { forecastCookingMaterialServings } from './mastery'

export type CookingPreparationPolicy = 'minimum' | 'expected' | 'safe95' | 'maximum'

export interface CookingDurabilityPreparation {
  durabilityUses: number
  mastery: number
  policy: CookingPreparationPolicy
  materialServings: number
  estimated: boolean
}

/**
 * Converts Cooking utensil durability uses into recipe-material servings.
 * Expected and 95% policies are estimates; minimum and maximum are hard bounds.
 * Returns undefined when mastery is not an exact source-verified breakpoint.
 */
export function cookingDurabilityPreparation(
  durabilityUses: number,
  mastery: number,
  policy: CookingPreparationPolicy,
): CookingDurabilityPreparation | undefined {
  const forecast = forecastCookingMaterialServings(durabilityUses, mastery)
  if (!forecast) return undefined

  const materialServings = policy === 'minimum'
    ? forecast.minimumServings
    : policy === 'expected'
      ? Math.ceil(forecast.expectedServings)
      : policy === 'safe95'
        ? forecast.safe95Servings
        : forecast.maximumServings

  return {
    durabilityUses,
    mastery,
    policy,
    materialServings,
    estimated: policy === 'expected' || policy === 'safe95',
  }
}
