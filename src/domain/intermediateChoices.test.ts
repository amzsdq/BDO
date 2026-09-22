import { describe, expect, it } from 'vitest'
import { listIntermediateCraftChoices } from './intermediateChoices'
import type { RecipeDataset } from './types'

const dataset: RecipeDataset = {
  items: {
    '1': { id: 1, nameKo: '완성품' },
    '2': { id: 2, nameKo: '중간재' },
    '3': { id: 3, nameKo: '원재료' },
  },
  recipes: {
    target: { id: 'target', skill: 'cooking', outputItemId: 1, yield: { min: 1, max: 1 }, variants: [{ id: 'v1', inputs: [{ itemId: 2, count: 2 }, { itemId: 3, count: 1 }, { itemId: 2, count: 1 }] }] },
    'make-2-a': { id: 'make-2-a', skill: 'cooking', outputItemId: 2, yield: { min: 1, max: 1 }, variants: [{ id: 'v1', inputs: [{ itemId: 3, count: 2 }] }] },
    'make-2-b': { id: 'make-2-b', skill: 'alchemy', outputItemId: 2, yield: { min: 1, max: 1 }, variants: [{ id: 'v1', inputs: [{ itemId: 3, count: 3 }] }] },
  },
  recipesByOutput: { '1': ['target'], '2': ['make-2-a', 'make-2-b'] },
  metadata: { generatedAt: '2026-09-23T00:00:00Z', sources: ['fixture'], supportedRegion: 'KR' },
}

describe('listIntermediateCraftChoices', () => {
  it('keeps one choice per craftable ingredient and preserves all producer recipes', () => {
    const variant = dataset.recipes.target.variants[0]
    expect(listIntermediateCraftChoices(dataset, variant)).toEqual([
      { itemId: 2, recipeIds: ['make-2-a', 'make-2-b'] },
    ])
  })

  it('returns no choices when no variant is selected', () => {
    expect(listIntermediateCraftChoices(dataset, undefined)).toEqual([])
  })
})
