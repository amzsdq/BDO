import { describe, expect, it } from 'vitest'
import { sampleDataset } from '../data/sample'
import { buildPlan } from './planner'
import { cookingDurabilityPreparation } from './durabilityPlan'

describe('Cooking durability preparation policy', () => {
  it('keeps minimum and maximum as exact material-serving bounds', () => {
    expect(cookingDurabilityPreparation(100, 1500, 'minimum')).toMatchObject({ materialServings: 100, estimated: false })
    expect(cookingDurabilityPreparation(100, 1500, 'maximum')).toMatchObject({ materialServings: 1000, estimated: false })
  })

  it('rounds expected material servings up for an actionable checklist', () => {
    expect(cookingDurabilityPreparation(100, 1500, 'expected')).toMatchObject({ materialServings: 641, estimated: true })
  })

  it('uses the exact-binomial 95% preparation target', () => {
    const safe = cookingDurabilityPreparation(100, 1500, 'safe95')!
    const expected = cookingDurabilityPreparation(100, 1500, 'expected')!
    expect(safe.estimated).toBe(true)
    expect(safe.materialServings).toBeGreaterThanOrEqual(expected.materialServings)
    expect(safe.materialServings).toBeLessThan(1000)
  })

  it('keeps large durability safe95 useful instead of collapsing to the absolute maximum', () => {
    const safe = cookingDurabilityPreparation(10_000, 1350, 'safe95')!
    const expected = cookingDurabilityPreparation(10_000, 1350, 'expected')!
    const maximum = cookingDurabilityPreparation(10_000, 1350, 'maximum')!
    expect(safe.materialServings).toBeGreaterThanOrEqual(expected.materialServings)
    expect(safe.materialServings).toBeLessThan(maximum.materialServings)
    expect(safe.materialServings).toBe(55_981)
  })

  it('feeds selected material servings into the actionable planner instead of raw durability uses', () => {
    const preparation = cookingDurabilityPreparation(100, 2000, 'maximum')!
    const plan = buildPlan(sampleDataset, [{ recipeId: 'sample-cooking', mode: 'attempts', amount: preparation.materialServings }], { craftIntermediateItemIds: new Set() })
    expect(preparation.materialServings).toBe(1000)
    expect(plan.crafts[0]?.attempts).toBe(1000)
    expect(plan.materials[0]?.required).toBe(5000)
  })

  it('fails closed for mastery values outside source-verified breakpoints', () => {
    expect(cookingDurabilityPreparation(100, 1975, 'safe95')).toBeUndefined()
  })
})
