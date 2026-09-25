import { describe, expect, it } from 'vitest'
import { sampleDataset } from './sample'
import { buildPlanFromSession } from './sessionPlan'
import type { PlanSessionState } from './planSession'

const base: PlanSessionState = {
  version: 1,
  targets: [],
  craftIntermediateItemIds: [],
  intermediateRecipeIdByItemId: {},
  variantIdByRecipeId: {},
  selectedSubstitutionItemIdByGroupId: {},
}

describe('buildPlanFromSession', () => {
  it('aggregates sibling targets instead of silently projecting only the active target', () => {
    const single = buildPlanFromSession(sampleDataset, { ...base, targets: [{ recipeId: 'sample-cooking', variantId: 'default', mode: 'servings', amount: 2 }] }, {}, {})
    const multi = buildPlanFromSession(sampleDataset, { ...base, targets: [
      { recipeId: 'sample-cooking', variantId: 'default', mode: 'servings', amount: 2 },
      { recipeId: 'sample-cooking', variantId: 'default', mode: 'servings', amount: 3 },
    ] }, {}, {})
    expect(single.errors).toEqual([])
    expect(multi.errors).toEqual([])
    expect(multi.plan?.materials[0]?.required).toBe((single.plan?.materials[0]?.required ?? 0) * 2.5)
  })

  it('fails closed when any persisted target cannot resolve', () => {
    const result = buildPlanFromSession(sampleDataset, { ...base, targets: [
      { recipeId: 'sample-cooking', variantId: 'default', mode: 'servings', amount: 2 },
      { recipeId: 'missing-recipe', mode: 'servings', amount: 3 },
    ] }, {}, {})
    expect(result.plan).toBeUndefined()
    expect(result.errors.join(' ')).toMatch(/missing-recipe/)
  })
  it('forwards Alchemy mastery from the saved profile', () => {
    const d = structuredClone(sampleDataset)
    d.recipes['sample-cooking'].skill = 'alchemy'
    d.recipes['sample-cooking'].variants[0].skillRequirement = { skill: 'alchemy', minimumMastery: 500 }
    const q = { ...base, targets: [{ recipeId: 'sample-cooking', variantId: 'default', mode: 'servings' as const, amount: 2 }] }
    expect(buildPlanFromSession(d, q, {}, { alchemyMastery: 499 }).errors.join(' ')).toContain('Alchemy mastery 500+')
    expect(buildPlanFromSession(d, q, {}, { alchemyMastery: 500 }).errors).toEqual([])
  })

})
