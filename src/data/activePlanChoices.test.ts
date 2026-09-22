import { describe, expect, it } from 'vitest'
import type { RecipeDataset } from '../domain/types'
import { buildActivePlan } from './activePlan'

const dataset: RecipeDataset = {
  metadata: { generatedAt: 'test', sources: ['test'], supportedRegion: 'KR' },
  items: {
    '1': { id: 1, nameKo: '완성품' },
    '2': { id: 2, nameKo: '중간재' },
    '3': { id: 3, nameKo: '원재료' },
  },
  recipes: {
    final: { id: 'final', skill: 'cooking', outputItemId: 1, yield: { min: 1, max: 1 }, variants: [{ id: 'default', inputs: [{ itemId: 2, count: 2 }] }] },
    intermediate: { id: 'intermediate', skill: 'cooking', outputItemId: 2, yield: { min: 1, max: 1 }, variants: [{ id: 'default', inputs: [{ itemId: 3, count: 3 }] }] },
  },
  recipesByOutput: { '1': ['final'], '2': ['intermediate'] },
}

describe('buildActivePlan recursive choices', () => {
  it('treats a craft-selected intermediate recursively instead of external acquisition', () => {
    const result = buildActivePlan(dataset, {
      recipeId: 'final', variantId: 'default', mode: 'servings', amount: 4, skill: 'cooking',
    }, {}, {}, { craftIntermediateItemIds: new Set([2]), intermediateRecipeIdByItemId: { '2': 'intermediate' } })

    expect(result.error).toBeUndefined()
    expect(result.plan?.materials.find((line) => line.itemId === 2)?.craftedIntermediate).toBe(true)
    expect(result.plan?.materials.find((line) => line.itemId === 3)?.required).toBe(24)
  })
})
