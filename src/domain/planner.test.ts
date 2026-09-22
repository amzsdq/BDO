import { describe, expect, it } from 'vitest'
import { attemptsForTarget, buildPlan } from './planner'
import type { RecipeDataset } from './types'

const dataset: RecipeDataset = {
  metadata: {
    generatedAt: '2026-09-22T00:00:00Z',
    sources: ['synthetic'],
    supportedRegion: 'KR',
  },
  items: {
    '1': { id: 1, nameKo: '완성 요리' },
    '2': { id: 2, nameKo: '중간 재료' },
    '3': { id: 3, nameKo: '원재료 A' },
    '4': { id: 4, nameKo: '원재료 B' },
  },
  recipes: {
    meal: {
      id: 'meal',
      skill: 'cooking',
      outputItemId: 1,
      yield: { min: 1, max: 4, expected: 2.5 },
      variants: [{ id: 'default', inputs: [{ itemId: 2, count: 2 }, { itemId: 3, count: 1 }] }],
    },
    intermediate: {
      id: 'intermediate',
      skill: 'cooking',
      outputItemId: 2,
      yield: { min: 1, max: 1 },
      variants: [{ id: 'default', inputs: [{ itemId: 4, count: 3 }] }],
    },
  },
  recipesByOutput: {
    '1': ['meal'],
    '2': ['intermediate'],
  },
}

describe('planner', () => {
  it('defaults desired-output planning to guaranteed minimum yield', () => {
    expect(
      attemptsForTarget(dataset.recipes.meal, {
        recipeId: 'meal',
        mode: 'output',
        amount: 10,
      }),
    ).toBe(10)
  })

  it('supports explicit expected-yield planning', () => {
    expect(
      attemptsForTarget(dataset.recipes.meal, {
        recipeId: 'meal',
        mode: 'output',
        amount: 10,
        yieldPolicy: 'expected',
      }),
    ).toBe(4)
  })

  it('uses utensil attempts directly', () => {
    expect(
      attemptsForTarget(dataset.recipes.meal, {
        recipeId: 'meal',
        mode: 'attempts',
        amount: 150.2,
      }),
    ).toBe(151)
  })

  it('recursively expands selected craftable intermediates', () => {
    const plan = buildPlan(
      dataset,
      [{ recipeId: 'meal', mode: 'attempts', amount: 2 }],
      { craftIntermediateItemIds: new Set([2]) },
    )

    expect(plan.crafts).toEqual([
      expect.objectContaining({ recipeId: 'meal', attempts: 2 }),
      expect.objectContaining({ recipeId: 'intermediate', attempts: 4 }),
    ])
    expect(
      plan.materials.find((entry) => entry.itemId === 4)?.required,
    ).toBe(12)
  })

  it('subtracts owned inventory from shortage without changing required quantity', () => {
    const plan = buildPlan(
      dataset,
      [{ recipeId: 'meal', mode: 'attempts', amount: 2 }],
      {
        craftIntermediateItemIds: new Set(),
        haveByItemId: { '3': 1 },
      },
    )
    const material = plan.materials.find((entry) => entry.itemId === 3)
    expect(material).toMatchObject({ required: 2, have: 1, missing: 1 })
  })
})
