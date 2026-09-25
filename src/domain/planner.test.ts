import { describe, expect, it } from 'vitest'
import { attemptsForTarget, buildPlan } from './planner'
import type { RecipeDataset } from './types'

const dataset: RecipeDataset = {
  metadata: { generatedAt: '2026-09-22T00:00:00Z', sources: ['synthetic'], supportedRegion: 'KR' },
  items: {
    '1': { id: 1, nameKo: '완성 요리' }, '2': { id: 2, nameKo: '중간 재료' },
    '3': { id: 3, nameKo: '원재료 A' }, '4': { id: 4, nameKo: '원재료 B' },
    '5': { id: 5, nameKo: '대체 원재료' },
  },
  recipes: {
    meal: { id: 'meal', skill: 'cooking', outputItemId: 1, yield: { min: 1, max: 4, expected: 2.5 }, variants: [
      { id: 'default', inputs: [{ itemId: 2, count: 2 }, { itemId: 3, count: 1 }] },
      { id: 'alternate', inputs: [{ itemId: 2, count: 1 }, { itemId: 5, count: 2 }] },
    ] },
    intermediate: { id: 'intermediate', skill: 'cooking', outputItemId: 2, yield: { min: 1, max: 1 }, variants: [{ id: 'default', inputs: [{ itemId: 4, count: 3 }] }] },
    'intermediate-alt': { id: 'intermediate-alt', skill: 'cooking', outputItemId: 2, yield: { min: 2, max: 2 }, variants: [{ id: 'default', inputs: [{ itemId: 5, count: 1 }] }] },
    variantYield: { id: 'variantYield', skill: 'cooking', outputItemId: 1, yield: { min: 1, max: 1 }, variants: [
      { id: '169', sourceRecipeId: 169, yield: { min: 1, max: 4 }, inputs: [{ itemId: 3, count: 1 }] },
      { id: '637', sourceRecipeId: 637, yield: { min: 1, max: 1 }, inputs: [{ itemId: 5, count: 1 }] },
    ] },
  },
  recipesByOutput: { '1': ['meal', 'variantYield'], '2': ['intermediate', 'intermediate-alt'] },
}

describe('planner', () => {
  it('defaults desired-output planning to guaranteed minimum yield', () => { expect(attemptsForTarget(dataset.recipes.meal, { recipeId: 'meal', mode: 'output', amount: 10 })).toBe(10) })
  it('supports explicit expected-yield planning', () => { expect(attemptsForTarget(dataset.recipes.meal, { recipeId: 'meal', mode: 'output', amount: 10, yieldPolicy: 'expected' })).toBe(4) })
  it('uses utensil attempts directly', () => { expect(attemptsForTarget(dataset.recipes.meal, { recipeId: 'meal', mode: 'attempts', amount: 150.2 })).toBe(151) })
  it('uses selected variant yield for desired output', () => {
    expect(attemptsForTarget(dataset.recipes.variantYield, { recipeId: 'variantYield', mode: 'output', amount: 100, variantId: '169', yieldPolicy: 'maximum' })).toBe(25)
    expect(attemptsForTarget(dataset.recipes.variantYield, { recipeId: 'variantYield', mode: 'output', amount: 100, variantId: '637', yieldPolicy: 'maximum' })).toBe(100)
  })

  it('recursively expands selected craftable intermediates', () => {
    const plan = buildPlan(dataset, [{ recipeId: 'meal', mode: 'attempts', amount: 2 }], { craftIntermediateItemIds: new Set([2]) })
    expect(plan.crafts).toEqual([expect.objectContaining({ recipeId: 'meal', attempts: 2 }), expect.objectContaining({ recipeId: 'intermediate', attempts: 4 })])
    expect(plan.materials.find((entry) => entry.itemId === 4)?.required).toBe(12)
    expect(plan.warnings.some((entry) => entry.includes('대체 조합'))).toBe(true)
    expect(plan.warnings.some((entry) => entry.includes('제작법 2개'))).toBe(true)
  })

  it('uses an explicitly selected top-level recipe variant', () => {
    const plan = buildPlan(dataset, [{ recipeId: 'meal', mode: 'attempts', amount: 2, variantId: 'alternate' }], { craftIntermediateItemIds: new Set() })
    expect(plan.materials.find((entry) => entry.itemId === 5)?.required).toBe(4)
    expect(plan.materials.find((entry) => entry.itemId === 3)).toBeUndefined()
  })

  it('uses an explicitly selected intermediate recipe', () => {
    const plan = buildPlan(dataset, [{ recipeId: 'meal', mode: 'attempts', amount: 2, variantId: 'default' }], {
      craftIntermediateItemIds: new Set([2]), intermediateRecipeIdByItemId: { '2': 'intermediate-alt' },
    })
    expect(plan.crafts.find((entry) => entry.recipeId === 'intermediate-alt')?.attempts).toBe(2)
    expect(plan.materials.find((entry) => entry.itemId === 5)?.required).toBe(2)
    expect(plan.materials.find((entry) => entry.itemId === 4)).toBeUndefined()
  })

  it('rejects an intermediate recipe that does not produce the requested item', () => {
    expect(() => buildPlan(dataset, [{ recipeId: 'meal', mode: 'attempts', amount: 1, variantId: 'default' }], {
      craftIntermediateItemIds: new Set([2]), intermediateRecipeIdByItemId: { '2': 'meal' },
    })).toThrow('does not produce item 2')
  })

  it('subtracts owned inventory from shortage without changing required quantity', () => {
    const plan = buildPlan(dataset, [{ recipeId: 'meal', mode: 'attempts', amount: 2, variantId: 'default' }], { craftIntermediateItemIds: new Set(), haveByItemId: { '3': 1 } })
    expect(plan.materials.find((entry) => entry.itemId === 3)).toMatchObject({ required: 2, have: 1, missing: 1 })
  })

  it('uses owned intermediate stock before recursively crafting the shortage', () => {
    const plan = buildPlan(dataset, [{ recipeId: 'meal', mode: 'attempts', amount: 3, variantId: 'default' }], { craftIntermediateItemIds: new Set([2]), haveByItemId: { '2': 4 } })
    expect(plan.materials.find((entry) => entry.itemId === 2)).toMatchObject({ required: 6, have: 4, missing: 2 })
    expect(plan.crafts.find((entry) => entry.recipeId === 'intermediate')?.attempts).toBe(2)
    expect(plan.materials.find((entry) => entry.itemId === 4)?.required).toBe(6)
  })

  it('consumes shared intermediate stock only once across multiple targets', () => {
    const plan = buildPlan(dataset, [{ recipeId: 'meal', mode: 'attempts', amount: 2, variantId: 'default' }, { recipeId: 'meal', mode: 'attempts', amount: 2, variantId: 'default' }], { craftIntermediateItemIds: new Set([2]), haveByItemId: { '2': 4 } })
    expect(plan.materials.find((entry) => entry.itemId === 2)).toMatchObject({ required: 8, have: 4, missing: 4 })
    expect(plan.crafts.find((entry) => entry.recipeId === 'intermediate')?.attempts).toBe(4)
    expect(plan.materials.find((entry) => entry.itemId === 4)?.required).toBe(12)
  })
})
