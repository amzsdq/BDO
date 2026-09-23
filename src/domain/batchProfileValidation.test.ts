import { describe, expect, it } from 'vitest'
import { calculateBatchCapacity } from './batch'
import type { Item, RecipeVariant } from './types'

const items: Record<string, Item> = {
  '1': { id: 1, nameKo: '재료', weightLT: 1 },
}
const variant: RecipeVariant = { id: 'v1', inputs: [{ itemId: 1, count: 1 }] }

describe('carry profile validation', () => {
  it.each([
    { maxWeightLT: Number.NaN },
    { maxWeightLT: Number.POSITIVE_INFINITY },
    { maxWeightLT: -1 },
    { maxWeightLT: 100, reservedWeightLT: Number.NaN },
    { maxWeightLT: 100, reservedWeightLT: Number.POSITIVE_INFINITY },
    { maxWeightLT: 100, reservedWeightLT: -1 },
  ])('fails closed for invalid LT profile %#', (profile) => {
    const result = calculateBatchCapacity(variant, items, profile)
    expect(result.maxServings).toBeUndefined()
    expect(result.loadServings).toBeUndefined()
    expect(result.lines).toEqual([])
    expect(result.availableWeightLT).toBe(0)
    expect(result.warnings.some((warning) => warning.includes('계산하지 않았습니다'))).toBe(true)
  })

  it('still allows reserved LT above max LT and safely yields zero capacity', () => {
    const result = calculateBatchCapacity(variant, items, { maxWeightLT: 100, reservedWeightLT: 150 })
    expect(result.availableWeightLT).toBe(0)
    expect(result.maxServings).toBe(0)
    expect(result.loadServings).toBe(0)
  })
})
