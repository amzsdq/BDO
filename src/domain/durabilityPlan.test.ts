import { describe, expect, it } from 'vitest'
import { cookingDurabilityPreparation } from './durabilityPlan'

describe('Cooking durability preparation policy', () => {
  it('keeps minimum and maximum as exact material-serving bounds', () => {
    expect(cookingDurabilityPreparation(100, 1500, 'minimum')).toMatchObject({ materialServings: 100, estimated: false })
    expect(cookingDurabilityPreparation(100, 1500, 'maximum')).toMatchObject({ materialServings: 1000, estimated: false })
  })

  it('rounds expected material servings up for an actionable checklist', () => {
    expect(cookingDurabilityPreparation(100, 1500, 'expected')).toMatchObject({ materialServings: 641, estimated: true })
  })

  it('uses the existing exact-binomial 95% preparation target', () => {
    const safe = cookingDurabilityPreparation(100, 1500, 'safe95')!
    const expected = cookingDurabilityPreparation(100, 1500, 'expected')!
    expect(safe.estimated).toBe(true)
    expect(safe.materialServings).toBeGreaterThanOrEqual(expected.materialServings)
    expect(safe.materialServings).toBeLessThan(1000)
  })

  it('fails closed for mastery values outside source-verified breakpoints', () => {
    expect(cookingDurabilityPreparation(100, 1975, 'safe95')).toBeUndefined()
  })
})
