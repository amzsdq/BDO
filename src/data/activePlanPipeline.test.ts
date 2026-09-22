import { describe, expect, it } from 'vitest'
import { buildPlan } from '../domain/planner'
import { calculateBatchCapacity } from '../domain/batch'
import { activePlanTarget } from './activePlanTarget'
import { resolvePlanTarget } from './planSessionResolve'
import { sampleDataset } from './sample'

describe('active plan target end-to-end material semantics', () => {
  it('feeds Cooking durability preparation servings into planner and batch math', () => {
    const persisted = activePlanTarget({
      recipeId: 'sample-cooking',
      variantId: 'default',
      mode: 'durability',
      amount: 100,
      skill: 'cooking',
      cookingPreparationPolicy: 'maximum',
    })

    const resolved = resolvePlanTarget(sampleDataset, persisted, { cookingMastery: 2000 })
    expect(resolved.error).toBeUndefined()
    expect(resolved.target).toEqual({
      recipeId: 'sample-cooking',
      variantId: 'default',
      mode: 'attempts',
      amount: 1000,
    })

    const target = resolved.target!
    const plan = buildPlan(sampleDataset, [target], {
      craftIntermediateItemIds: new Set(),
      haveByItemId: {},
    })
    expect(plan.crafts[0]?.attempts).toBe(1000)

    const recipe = sampleDataset.recipes['sample-cooking']
    const variant = recipe.variants.find((entry) => entry.id === 'default')!
    const weightedItems = {
      ...sampleDataset.items,
      '900002': { ...sampleDataset.items['900002'], weightLT: 0.1 },
    }
    const batch = calculateBatchCapacity(
      variant,
      weightedItems,
      { maxWeightLT: 10_000, reservedWeightLT: 0 },
      plan.crafts[0]?.attempts,
    )
    expect(batch.lines).toHaveLength(1)
    expect(batch.lines[0]?.countToCarry).toBe(5000)
    expect(batch.totalStartingIngredientWeightLT).toBe(500)
  })

  it('keeps Alchemy durability as exact one-serving-per-use input math', () => {
    const alchemyDataset = {
      ...sampleDataset,
      recipes: {
        ...sampleDataset.recipes,
        'sample-alchemy': {
          id: 'sample-alchemy',
          skill: 'alchemy' as const,
          outputItemId: 900001,
          yield: { min: 1, max: 1 },
          variants: [{ id: 'default', inputs: [{ itemId: 900002, count: 2 }] }],
        },
      },
    }
    const persisted = activePlanTarget({
      recipeId: 'sample-alchemy',
      variantId: 'default',
      mode: 'durability',
      amount: 123,
      skill: 'alchemy',
    })
    const resolved = resolvePlanTarget(alchemyDataset, persisted, { cookingMastery: 2000 })
    expect(resolved.target?.mode).toBe('attempts')
    expect(resolved.target?.amount).toBe(123)
    expect(resolved.estimatedPreparation).toBe(false)
  })
})
