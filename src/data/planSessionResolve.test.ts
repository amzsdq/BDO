import { describe, expect, it } from 'vitest'
import { sampleDataset } from './sample'
import { resolvePlanTarget } from './planSessionResolve'

const cooking = { recipeId: 'sample-cooking', mode: 'durability' as const, amount: 100, cookingPreparationPolicy: 'maximum' as const }

describe('persisted plan target resolution', () => {
  it('turns Cooking durability uses into mastery-aware material servings', () => {
    expect(resolvePlanTarget(sampleDataset, cooking, { cookingMastery: 2000 })).toEqual({
      target: { recipeId: 'sample-cooking', variantId: undefined, mode: 'attempts', amount: 1000 },
      estimatedPreparation: false,
    })
  })

  it('fails closed when Cooking durability lacks verified mastery or policy', () => {
    expect(resolvePlanTarget(sampleDataset, cooking, {}).error).toContain('mastery is required')
    expect(resolvePlanTarget(sampleDataset, { recipeId: 'sample-cooking', mode: 'durability', amount: 100 }, { cookingMastery: 1500 }).error).toContain('policy is required')
  })

  it('keeps recipe servings exact', () => {
    expect(resolvePlanTarget(sampleDataset, { recipeId: 'sample-cooking', mode: 'servings', amount: 25 }, {}).target).toMatchObject({ mode: 'attempts', amount: 25 })
  })

  it('never applies Cooking Mass Cooking policy to Alchemy', () => {
    const dataset = structuredClone(sampleDataset)
    dataset.recipes['sample-cooking'].skill = 'alchemy'
    expect(resolvePlanTarget(dataset, cooking, { cookingMastery: 2000 }).error).toContain('cannot be applied to Alchemy')
    expect(resolvePlanTarget(dataset, { recipeId: 'sample-cooking', mode: 'durability', amount: 100 }, {}).target).toMatchObject({ mode: 'attempts', amount: 100 })
  })
})
