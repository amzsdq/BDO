import { describe, expect, it } from 'vitest'
import { sampleDataset } from './sample'
import { buildActivePlan } from './activePlan'

describe('buildActivePlan', () => {
  it('uses mastery-aware Cooking durability servings as planner material math', () => {
    const result = buildActivePlan(sampleDataset, {
      recipeId: 'sample-cooking', variantId: 'default', mode: 'durability', amount: 10,
      skill: 'cooking', cookingPreparationPolicy: 'maximum',
    }, {}, { cookingMastery: 2000 })
    expect(result.error).toBeUndefined()
    expect(result.materialServings).toBe(100)
    expect(result.plan?.materials[0]?.required).toBe(500)
  })

  it('fails closed instead of treating Cooking durability as ordinary servings', () => {
    const result = buildActivePlan(sampleDataset, {
      recipeId: 'sample-cooking', variantId: 'default', mode: 'durability', amount: 10,
      skill: 'cooking', cookingPreparationPolicy: 'maximum',
    }, {}, {})
    expect(result.plan).toBeUndefined()
    expect(result.error).toMatch(/Cooking mastery is required/)
  })

  it('keeps ordinary servings exact', () => {
    const result = buildActivePlan(sampleDataset, {
      recipeId: 'sample-cooking', variantId: 'default', mode: 'servings', amount: 12,
      skill: 'cooking', cookingPreparationPolicy: 'safe95',
    }, {}, {})
    expect(result.error).toBeUndefined()
    expect(result.materialServings).toBe(12)
  })

  it('labels output-target math as conservative when server yield is unknown', () => {
    const dataset = structuredClone(sampleDataset)
    dataset.recipes['sample-cooking'].yield!.provenance = 'unknown-server-yield'
    const result = buildActivePlan(dataset, {
      recipeId: 'sample-cooking', variantId: 'default', mode: 'output', amount: 20, skill: 'cooking',
    }, {}, {})
    expect(result.error).toBeUndefined()
    expect(result.plan?.warnings.join(' ')).toMatch(/보수적 준비량/)
    expect(result.plan?.warnings.join(' ')).toMatch(/예상 산출량을 뜻하지 않습니다/)
  })

  it('does not add the unknown-yield warning to exact servings mode', () => {
    const dataset = structuredClone(sampleDataset)
    dataset.recipes['sample-cooking'].yield!.provenance = 'unknown-server-yield'
    const result = buildActivePlan(dataset, {
      recipeId: 'sample-cooking', variantId: 'default', mode: 'servings', amount: 20, skill: 'cooking',
    }, {}, {})
    expect(result.plan?.warnings.join(' ')).not.toMatch(/보수적 준비량/)
  })
})
