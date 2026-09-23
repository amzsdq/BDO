import { describe, expect, it } from 'vitest'
import type { RecipeDataset } from '../domain/types'
import { bootstrapPlanner } from './plannerBootstrap'

const dataset: RecipeDataset = {
  items: { '2': { id: 2, nameKo: '요리 결과' } },
  recipes: {
    cooking: { id: 'cooking', skill: 'cooking', outputItemId: 2, yield: { min: 1, max: 1 }, variants: [{ id: 'v1', inputs: [] }] },
  },
  recipesByOutput: { '2': ['cooking'] },
  metadata: { generatedAt: '2026-09-23T00:00:00Z', sources: ['test'], supportedRegion: 'KR' },
}

const emptyStorage = { getItem: () => null }

describe('bootstrapPlanner', () => {
  it('loads the runtime dataset before deriving first-run session state', async () => {
    let loaderCalled = false
    const result = await bootstrapPlanner(emptyStorage, async () => {
      loaderCalled = true
      return { dataset, mode: 'verified', message: 'verified test data' }
    })

    expect(loaderCalled).toBe(true)
    expect(result.dataset).toBe(dataset)
    expect(result.hydration.status).toBe('ready')
    if (result.hydration.status !== 'ready') throw new Error('expected ready hydration')
    expect(result.hydration.source).toBe('first-run')
    expect(result.hydration.session.targets).toEqual([
      { recipeId: 'cooking', variantId: 'v1', mode: 'servings', amount: 100 },
    ])
  })

  it('does not manufacture a first-run target when persisted plan storage is corrupt', async () => {
    const storage = {
      getItem(key: string) {
        return key === 'bdo-planner:plan-session:v1' ? '{broken-json' : null
      },
    }
    const result = await bootstrapPlanner(storage, async () => ({ dataset, mode: 'verified', message: 'verified test data' }))

    expect(result.hydration.status).toBe('recovery-required')
    if (result.hydration.status !== 'recovery-required') throw new Error('expected recovery-required')
    expect(result.hydration.components).toContain('plan-session')
  })
})
