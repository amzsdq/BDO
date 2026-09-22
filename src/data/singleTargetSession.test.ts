import { describe, expect, it } from 'vitest'
import { singleTargetSession } from './singleTargetSession'

describe('singleTargetSession', () => {
  it('preserves durability policy, variant and intermediate craft choices', () => {
    const session = singleTargetSession({
      recipeId: 'meal', variantId: 'alt', mode: 'durability', amount: 120,
      cookingPreparationPolicy: 'safe95', craftIntermediateItemIds: new Set([30, 20]),
      intermediateRecipeIdByItemId: { '20': 'sauce' },
    })
    expect(session.targets[0]).toEqual({ recipeId: 'meal', variantId: 'alt', mode: 'durability', amount: 120, cookingPreparationPolicy: 'safe95' })
    expect(session.craftIntermediateItemIds).toEqual([20, 30])
    expect(session.intermediateRecipeIdByItemId).toEqual({ '20': 'sauce' })
    expect(session.variantIdByRecipeId).toEqual({ meal: 'alt' })
  })
})
