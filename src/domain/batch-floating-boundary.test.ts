import { describe, expect, it } from 'vitest'
import { calculateBatchCapacity } from './batch'
import type { Item, RecipeVariant } from './types'

describe('batch decimal LT boundaries', () => {
  it('keeps an exact decimal capacity despite binary floating-point noise', () => {
    const items: Record<string, Item> = { '1': { id: 1, nameKo: '재료', weightLT: 0.1 } }
    const variant: RecipeVariant = { id: 'decimal', inputs: [{ itemId: 1, count: 3 }] }
    expect(calculateBatchCapacity(variant, items, { maxWeightLT: 0.3 }).maxServings).toBe(1)
  })
})
