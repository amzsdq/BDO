import { describe, expect, it } from 'vitest'
import { forecastCookingMaterialServings } from './mastery'
import { MASS_COOKING_EXTRA_SERVINGS, MASS_COOKING_MECHANICS } from './massCookingMechanics'

describe('Mass Cooking first-party mechanics evidence', () => {
  it('pins the source-backed 10-serving / 1-durability semantics', () => {
    expect(MASS_COOKING_MECHANICS.minimumContinuousCrafts).toBe(10)
    expect(MASS_COOKING_MECHANICS.servingsPerActivation).toBe(10)
    expect(MASS_COOKING_MECHANICS.durabilityPerActivation).toBe(1)
    expect(MASS_COOKING_EXTRA_SERVINGS).toBe(9)
  })

  it('carries auditable Pearl Abyss KR provenance', () => {
    expect(MASS_COOKING_MECHANICS.source.provider).toBe('Pearl Abyss')
    expect(MASS_COOKING_MECHANICS.source.region).toBe('KR')
    expect(MASS_COOKING_MECHANICS.source.sourceUrl).toContain('wikiNo=102')
    expect(MASS_COOKING_MECHANICS.source.verifiedAt).toBe('2026-09-23')
  })

  it('keeps the durability forecast consistent with the sourced multiplier at 100% Mass Cooking', () => {
    const durabilityUses = 37
    const forecast = forecastCookingMaterialServings(durabilityUses, 2000)!
    expect(forecast.massCookingProbability).toBe(1)
    expect(forecast.expectedServings).toBe(durabilityUses * MASS_COOKING_MECHANICS.servingsPerActivation)
    expect(forecast.safe95Servings).toBe(durabilityUses * MASS_COOKING_MECHANICS.servingsPerActivation)
    expect(forecast.maximumServings).toBe(durabilityUses * MASS_COOKING_MECHANICS.servingsPerActivation)
  })
})
