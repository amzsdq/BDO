import { describe, expect, it } from 'vitest'
import { sampleDataset } from './sample'
import { buildActivePlanView } from './activePlanView'

describe('buildActivePlanView', () => {
  it('uses resolved Cooking durability material servings for carry quantities', () => {
    const dataset = structuredClone(sampleDataset)
    dataset.items['900002']!.weightLT = 0.1
    const result = buildActivePlanView(dataset, {
      recipeId: 'sample-cooking', variantId: 'default', mode: 'durability', amount: 10,
      skill: 'cooking', cookingPreparationPolicy: 'maximum',
    }, {}, { cookingMastery: 2000, maxWeightLT: 1000, reservedWeightLT: 0 })

    expect(result.error).toBeUndefined()
    expect(result.materialServings).toBe(100)
    expect(result.plan?.materials[0]?.required).toBe(500)
    expect(result.batch?.totalStartingIngredientWeightLT).toBe(50)
    expect(result.batch?.lines[0]?.countToCarry).toBe(500)
  })

  it('does not produce a batch when Cooking durability cannot be resolved', () => {
    const result = buildActivePlanView(sampleDataset, {
      recipeId: 'sample-cooking', variantId: 'default', mode: 'durability', amount: 10,
      skill: 'cooking', cookingPreparationPolicy: 'maximum',
    }, {}, { maxWeightLT: 1000 })

    expect(result.plan).toBeUndefined()
    expect(result.batch).toBeUndefined()
    expect(result.error).toMatch(/Cooking mastery is required/)
  })
})
