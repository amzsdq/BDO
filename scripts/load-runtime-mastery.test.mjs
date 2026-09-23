import { describe, expect, it } from 'vitest'
import { loadRuntimeMasteryRows } from './load-runtime-mastery.mjs'

describe('runtime mastery source loader', () => {
  it('loads the exact checked-in Cooking and Alchemy breakpoint tables without a duplicate data copy', async () => {
    const rows = await loadRuntimeMasteryRows()
    expect(rows.cookingRuntimeRows).toHaveLength(61)
    expect(rows.alchemyRuntimeRows).toHaveLength(61)
    expect(rows.cookingRuntimeRows[0]).toEqual({ mastery: 0, massCookingProbability: 0 })
    expect(rows.cookingRuntimeRows.at(-1)).toEqual({ mastery: 3000, massCookingProbability: 1 })
    expect(rows.alchemyRuntimeRows[0].mastery).toBe(0)
    expect(rows.alchemyRuntimeRows.at(-1).mastery).toBe(3000)
  })
})
