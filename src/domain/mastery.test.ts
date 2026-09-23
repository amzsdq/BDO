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
    expect(COOKING_MASTERY_ROWS.map((row) => row.mastery)).toEqual(Array.from({ length: 61 }, (_, index) => index * 50))
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
  it('separates minimum, expected, 95% preparation target and maximum material servings', () => {
    const forecast = forecastCookingMaterialServings(100, 1500)!
    expect(forecast.durabilityUses).toBe(100)
    expect(forecast.massCookingProbability).toBe(0.6006)
    expect(forecast.minimumServings).toBe(100)
    expect(forecast.expectedServings).toBe(640.54)
    expect(forecast.safe95Servings).toBe(712)
    expect(forecast.safe95Servings).toBeGreaterThanOrEqual(Math.ceil(forecast.expectedServings))
    expect(forecast.safe95Servings).toBeLessThan(forecast.maximumServings)
    expect(forecast.maximumServings).toBe(1000)
  })

  it('keeps a large 95% preparation target finite and below the absolute maximum', () => {
    const forecast = forecastCookingMaterialServings(10_000, 1350)!
    expect(forecast.safe95Servings).toBe(55_981)
    expect(forecast.safe95Servings).toBeGreaterThanOrEqual(Math.ceil(forecast.expectedServings))
    expect(forecast.safe95Servings).toBeLessThan(forecast.maximumServings)
    expect(forecast.maximumServings).toBe(100_000)
  })

  it('collapses the 95% target to deterministic bounds at 0% and 100%', () => {
    expect(forecastCookingMaterialServings(100, 0)?.safe95Servings).toBe(100)
    expect(forecastCookingMaterialServings(100, 2000)?.safe95Servings).toBe(1000)
  })

  it('supports low mastery expected values', () => {
    expect(forecastCookingMaterialServings(100, 50)?.expectedServings).toBeCloseTo(198.01)
  })

  it('disables the forecast for an unverified mastery value', () => {
    expect(forecastCookingMaterialServings(100, 1975)).toBeUndefined()
  })

  it('rejects invalid durability uses', () => {
    expect(() => forecastCookingMaterialServings(-1, 1500)).toThrow()
    expect(() => forecastCookingMaterialServings(1.5, 1500)).toThrow()
  })
})
