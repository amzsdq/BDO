import { describe, expect, it } from 'vitest'
import type { PlanSessionState } from './planSession'
import { appendPlanTarget, removePlanTarget, replacePlanTarget, selectTargetVariant } from './planSessionTargets'

const session: PlanSessionState = {
  version: 1,
  targets: [
    { recipeId: 'cooking-a', variantId: 'a-1', mode: 'servings', amount: 10 },
    { recipeId: 'alchemy-b', variantId: 'b-1', mode: 'output', amount: 25 },
  ],
  craftIntermediateItemIds: [101],
  intermediateRecipeIdByItemId: { '101': 'intermediate-r' },
  variantIdByRecipeId: { 'cooking-a': 'a-1', 'alchemy-b': 'b-1' },
  selectedSubstitutionItemIdByGroupId: { grain: 201 },
}

describe('plan session target editing', () => {
  it('edits one target without collapsing its sibling or support choices', () => {
    const next = replacePlanTarget(session, 0, { recipeId: 'cooking-a', variantId: 'a-1', mode: 'servings', amount: 99 })
    expect(next.targets).toEqual([{ recipeId: 'cooking-a', variantId: 'a-1', mode: 'servings', amount: 99 }, session.targets[1]])
    expect(next.craftIntermediateItemIds).toEqual([101])
    expect(next.intermediateRecipeIdByItemId).toEqual({ '101': 'intermediate-r' })
    expect(next.selectedSubstitutionItemIdByGroupId).toEqual({ grain: 201 })
  })

  it('supports duplicate recipe targets because editing is index-based', () => {
    const withDuplicate = appendPlanTarget(session, { recipeId: 'cooking-a', variantId: 'a-1', mode: 'servings', amount: 5 })
    const next = replacePlanTarget(withDuplicate, 2, { recipeId: 'cooking-a', variantId: 'a-1', mode: 'servings', amount: 7 })
    expect(next.targets.map((target) => target.amount)).toEqual([10, 25, 7])
  })

  it('removes only the requested target and drops an orphaned recipe preference', () => {
    const next = removePlanTarget(session, 0)
    expect(next.targets).toEqual([session.targets[1]])
    expect(next.variantIdByRecipeId).toEqual({ 'alchemy-b': 'b-1' })
  })

  it('keeps a recipe preference while a duplicate sibling still uses that recipe', () => {
    const duplicate = appendPlanTarget(session, { recipeId: 'cooking-a', variantId: 'a-1', mode: 'servings', amount: 5 })
    const next = removePlanTarget(duplicate, 0)
    expect(next.variantIdByRecipeId['cooking-a']).toBe('a-1')
  })

  it('keeps target and recipe-level variant preference synchronized', () => {
    const next = selectTargetVariant(session, 0, 'cooking-a', 'a-2')
    expect(next.targets[0]?.variantId).toBe('a-2')
    expect(next.targets[1]).toEqual(session.targets[1])
    expect(next.variantIdByRecipeId['cooking-a']).toBe('a-2')
  })

  it('moves the recipe-level preference when a target changes recipes', () => {
    const next = replacePlanTarget(session, 0, { recipeId: 'cooking-c', variantId: 'c-2', mode: 'servings', amount: 10 })
    expect(next.variantIdByRecipeId['cooking-a']).toBeUndefined()
    expect(next.variantIdByRecipeId['cooking-c']).toBe('c-2')
  })

  it('fails closed instead of silently appending when an edit index is stale', () => {
    expect(() => replacePlanTarget(session, 9, session.targets[0]!)).toThrow(RangeError)
    expect(() => removePlanTarget(session, -1)).toThrow(RangeError)
  })
})
