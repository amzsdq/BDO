import { describe, expect, it } from 'vitest'
import type { RecipeDataset } from '../domain/types'
import { createInitialPlanSession } from './initialPlanSession'

const dataset: RecipeDataset = {
  meta: { source: 'test', extractedAt: '2026-09-23T00:00:00Z' },
  items: {
    '1': { id: 1, nameKo: '연금 결과' },
    '2': { id: 2, nameKo: '요리 결과' },
  },
  recipes: {
    'alchemy-first': { id: 'alchemy-first', skill: 'alchemy', outputItemId: 1, variants: [{ id: 'alchemy-v1', inputs: [] }] },
    'cooking-second': { id: 'cooking-second', skill: 'cooking', outputItemId: 2, variants: [{ id: 'cooking-v1', inputs: [] }] },
  },
}

describe('createInitialPlanSession', () => {
  it('derives the first target from the loaded dataset and prefers Cooking', () => {
    const session = createInitialPlanSession(dataset)
    expect(session.targets).toEqual([{ recipeId: 'cooking-second', variantId: 'cooking-v1', mode: 'servings', amount: 100 }])
    expect(session.variantIdByRecipeId).toEqual({ 'cooking-second': 'cooking-v1' })
  })

  it('returns an empty target list when the loaded dataset has no recipes', () => {
    const session = createInitialPlanSession({ ...dataset, recipes: {} })
    expect(session.targets).toEqual([])
    expect(session.variantIdByRecipeId).toEqual({})
  })
})
