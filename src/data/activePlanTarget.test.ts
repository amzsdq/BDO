import { describe, expect, it } from 'vitest'
import { activePlanTarget } from './activePlanTarget'

describe('activePlanTarget', () => {
  it('preserves ordinary output and servings targets without a Cooking policy', () => {
    expect(activePlanTarget({ recipeId: 'cook', variantId: 'v2', mode: 'output', amount: 50, skill: 'cooking' })).toEqual({
      recipeId: 'cook', variantId: 'v2', mode: 'output', amount: 50, cookingPreparationPolicy: undefined,
    })
    expect(activePlanTarget({ recipeId: 'alchemy', mode: 'servings', amount: 12, skill: 'alchemy' })).toEqual({
      recipeId: 'alchemy', variantId: undefined, mode: 'servings', amount: 12, cookingPreparationPolicy: undefined,
    })
  })

  it('requires a preparation policy for Cooking durability and preserves it', () => {
    expect(() => activePlanTarget({ recipeId: 'cook', mode: 'durability', amount: 100, skill: 'cooking' })).toThrow(/policy is required/)
    expect(activePlanTarget({ recipeId: 'cook', mode: 'durability', amount: 100, skill: 'cooking', cookingPreparationPolicy: 'safe95' })).toMatchObject({
      mode: 'durability', amount: 100, cookingPreparationPolicy: 'safe95',
    })
  })

  it('never applies Cooking preparation policy to Alchemy durability', () => {
    expect(activePlanTarget({ recipeId: 'alchemy', mode: 'durability', amount: 100, skill: 'alchemy', cookingPreparationPolicy: 'maximum' })).toEqual({
      recipeId: 'alchemy', variantId: undefined, mode: 'durability', amount: 100, cookingPreparationPolicy: undefined,
    })
  })

  it.each([
    ['output', 'cooking'],
    ['servings', 'alchemy'],
    ['durability', 'cooking'],
  ] as const)('rejects fractional %s amounts before session resolution', (mode, skill) => {
    expect(() => activePlanTarget({
      recipeId: skill === 'cooking' ? 'cook' : 'alchemy',
      mode,
      amount: 1.5,
      skill,
      cookingPreparationPolicy: mode === 'durability' && skill === 'cooking' ? 'minimum' : undefined,
    })).toThrow(/positive integer/)
  })
})
