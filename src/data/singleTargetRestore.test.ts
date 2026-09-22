import { describe, expect, it } from 'vitest'
import type { PlanSessionState } from './planSession'
import { singleTargetRestoredState } from './singleTargetRestore'

const session: PlanSessionState = {
  version: 1,
  targets: [{ recipeId: 'meal', mode: 'durability', amount: 120, cookingPreparationPolicy: 'maximum' }],
  craftIntermediateItemIds: [20, 30],
  intermediateRecipeIdByItemId: { '20': 'sauce' },
  variantIdByRecipeId: { meal: 'alt' },
  selectedSubstitutionItemIdByGroupId: { grain: 101 },
}

describe('singleTargetRestoredState', () => {
  it('restores primary controls and durable planning choices', () => {
    const restored = singleTargetRestoredState(session)
    expect(restored).toMatchObject({ recipeId: 'meal', variantId: 'alt', mode: 'durability', amount: 120, cookingPreparationPolicy: 'maximum' })
    expect([...restored!.craftIntermediateItemIds]).toEqual([20, 30])
    expect(restored!.intermediateRecipeIdByItemId).toEqual({ '20': 'sauce' })
    expect(restored!.selectedSubstitutionItemIdByGroupId).toEqual({ grain: 101 })
  })

  it('does not invent a target for an empty session', () => {
    expect(singleTargetRestoredState({ ...session, targets: [] })).toBeUndefined()
  })
})
