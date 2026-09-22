import { describe, expect, it } from 'vitest'
import { sampleDataset } from './sample'
import { activePlanTarget } from './activePlanTarget'
import { resolvePlanTarget } from './planSessionResolve'

describe('active UI target -> planner target', () => {
  it('maps recipe servings to exact planner attempts', () => {
    const persisted = activePlanTarget({
      recipeId: 'sample-cooking',
      variantId: 'default',
      mode: 'servings',
      amount: 37,
      skill: 'cooking',
    })
    expect(resolvePlanTarget(sampleDataset, persisted, {})).toEqual({
      target: { recipeId: 'sample-cooking', variantId: 'default', mode: 'attempts', amount: 37 },
    })
  })

  it('does not let Cooking durability bypass mastery-aware resolution', () => {
    const persisted = activePlanTarget({
      recipeId: 'sample-cooking',
      variantId: 'default',
      mode: 'durability',
      amount: 100,
      skill: 'cooking',
      cookingPreparationPolicy: 'safe95',
    })
    const unresolved = resolvePlanTarget(sampleDataset, persisted, {})
    expect(unresolved.target).toBeUndefined()
    expect(unresolved.error).toMatch(/Cooking mastery is required/)
  })
})
