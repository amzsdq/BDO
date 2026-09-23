import { describe, expect, it } from 'vitest'
import { calculateBatchCapacity } from './batch'
import type { Item, RecipeVariant } from './types'

const items: Record<string, Item> = { '1': { id: 1, nameKo: '재료 A', weightLT: 0.1 }, '2': { id: 2, nameKo: '재료 B', weightLT: 0.25 } }
const variant: RecipeVariant = { id: 'v1', inputs: [{ itemId: 1, count: 5 }, { itemId: 2, count: 2 }] }

describe('calculateBatchCapacity', () => {
  it('returns exact max servings and per-item carry quantities from available LT', () => {
    const result = calculateBatchCapacity(variant, items, { maxWeightLT: 2000, reservedWeightLT: 250 })
    expect(result.availableWeightLT).toBe(1750)
    expect(result.ingredientWeightPerServingLT).toBe(1)
    expect(result.maxServings).toBe(1750)
    expect(result.loadServings).toBe(1750)
    expect(result.totalStartingIngredientWeightLT).toBe(1750)
    expect(result.lines.map((line) => line.countToCarry)).toEqual([8750, 3500])
  })

  it('calculates an exact requested material batch rather than always filling capacity', () => {
    const result = calculateBatchCapacity(variant, items, { maxWeightLT: 2000 }, 1408)
    expect(result.maxServings).toBe(2000)
    expect(result.loadServings).toBe(1408)
    expect(result.totalStartingIngredientWeightLT).toBe(1408)
    expect(result.lines.map((line) => line.countToCarry)).toEqual([7040, 2816])
  })

  it('keeps full requested prep weight but caps one-trip carry quantities at available LT', () => {
    const result = calculateBatchCapacity(variant, items, { maxWeightLT: 10 }, 11)
    expect(result.maxServings).toBe(10)
    expect(result.loadServings).toBe(10)
    expect(result.totalStartingIngredientWeightLT).toBe(11)
    expect(result.lines.map((line) => line.countToCarry)).toEqual([50, 20])
    expect(result.lines.reduce((sum, line) => sum + line.weightToCarryLT, 0)).toBe(10)
    expect(result.warnings[0]).toContain('최대 10회분 기준')
  })

  it('floors at the capacity boundary rather than exceeding max LT', () => { expect(calculateBatchCapacity(variant, items, { maxWeightLT: 10.99 }).maxServings).toBe(10) })
  it('refuses to invent capacity when an ingredient weight is unknown', () => {
    const result = calculateBatchCapacity(variant, { ...items, '2': { id: 2, nameKo: '재료 B' } }, { maxWeightLT: 2000 })
    expect(result.maxServings).toBeUndefined(); expect(result.unknownWeightItemIds).toEqual([2]); expect(result.warnings).toHaveLength(1)
  })
  it('never produces negative available weight', () => { const result = calculateBatchCapacity(variant, items, { maxWeightLT: 100, reservedWeightLT: 150 }); expect(result.availableWeightLT).toBe(0); expect(result.maxServings).toBe(0); expect(result.loadServings).toBe(0) })
})
