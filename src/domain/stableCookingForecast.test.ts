import { describe, expect, it } from 'vitest'
import { stableForecastCookingMaterialServings } from './stableCookingForecast'

describe('stableForecastCookingMaterialServings', () => {
  it('keeps p=0 and p=1 mastery boundaries exact', () => {
    expect(stableForecastCookingMaterialServings(250, 0)).toMatchObject({ safe95Servings: 250, minimumServings: 250, maximumServings: 2500 })
    expect(stableForecastCookingMaterialServings(250, 2000)).toMatchObject({ safe95Servings: 2500, minimumServings: 250, maximumServings: 2500 })
  })

  it('returns the same actionable 95% result for an ordinary workload', () => {
    const forecast = stableForecastCookingMaterialServings(100, 1500)!
    expect(forecast.expectedServings).toBeCloseTo(640.54)
    expect(forecast.safe95Servings).toBe(712)
  })

  it('rejects invalid durability counts before numerical work', () => {
    expect(() => stableForecastCookingMaterialServings(-1, 1500)).toThrow('non-negative integer')
    expect(() => stableForecastCookingMaterialServings(1.5, 1500)).toThrow('non-negative integer')
  })
})
