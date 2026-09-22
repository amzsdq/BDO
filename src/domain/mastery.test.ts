import { describe, expect, it } from 'vitest'
import {
  COOKING_MASTERY_ROWS,
  COOKING_MASTERY_SOURCE,
  cookingMasteryRow,
  forecastCookingMaterialServings,
} from './mastery'

describe('Cooking mastery source data', () => {
  it('carries source/version metadata', () => {
    expect(COOKING_MASTERY_SOURCE.provider).toBe('Pearl Abyss')
    expect(COOKING_MASTERY_SOURCE.region).toBe('KR')
    expect(COOKING_MASTERY_SOURCE.verifiedAt).toBe('2026-09-23')
  })

  it('contains every official 50-point breakpoint from 0 through 3000', () => {
    expect(COOKING_MASTERY_ROWS).toHaveLength(61)
    expect(COOKING_MASTERY_ROWS.map((row) => row.mastery)).toEqual(
      Array.from({ length: 61 }, (_, index) => index * 50),
    )
    expect(cookingMasteryRow(0)?.massCookingProbability).toBe(0)
    expect(cookingMasteryRow(50)?.massCookingProbability).toBe(0.1089)
    expect(cookingMasteryRow(1000)?.massCookingProbability).toBe(0.3399)
    expect(cookingMasteryRow(1500)?.massCookingProbability).toBe(0.6006)
    expect(cookingMasteryRow(1950)?.massCookingProbability).toBe(0.995)
    expect(cookingMasteryRow(2000)?.massCookingProbability).toBe(1)
    expect(cookingMasteryRow(3000)?.massCookingProbability).toBe(1)
  })

  it('never interpolates off-grid mastery values', () => {
    expect(cookingMasteryRow(1975)).toBeUndefined()
    expect(cookingMasteryRow(25)).toBeUndefined()
  })
})

describe('Cooking durability material forecast', () => {
  it('separates minimum, expected and maximum material servings', () => {
    expect(forecastCookingMaterialServings(100, 1500)).toEqual({
      durabilityUses: 100,
      massCookingProbability: 0.6006,
      minimumServings: 100,
      expectedServings: 640.54,
      maximumServings: 1000,
    })
  })

  it('supports low mastery and becomes deterministic at 100% Mass Cooking', () => {
    expect(forecastCookingMaterialServings(100, 0)?.expectedServings).toBe(100)
    expect(forecastCookingMaterialServings(100, 50)?.expectedServings).toBeCloseTo(198.01)
    expect(forecastCookingMaterialServings(100, 2000)?.expectedServings).toBe(1000)
  })

  it('disables the forecast for an unverified mastery value', () => {
    expect(forecastCookingMaterialServings(100, 1975)).toBeUndefined()
  })

  it('rejects invalid durability uses', () => {
    expect(() => forecastCookingMaterialServings(-1, 1500)).toThrow()
    expect(() => forecastCookingMaterialServings(1.5, 1500)).toThrow()
  })
})
