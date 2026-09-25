import { describe, expect, it } from 'vitest'
import { choseong, searchRecipes } from './search'
import type { RecipeDataset } from './types'

const dataset: RecipeDataset = {
  metadata: { generatedAt: '', sources: [], supportedRegion: 'KR' },
  items: {
    '1': { id: 1, nameKo: '발레노스 정식', nameEn: 'Balenos Meal' },
    '2': { id: 2, nameKo: '맑은 액체 시약', nameEn: 'Clear Liquid Reagent' },
    '3': { id: 3, nameKo: '발레노스 특제 정식' },
  },
  recipes: {
    c1: { id: 'c1', skill: 'cooking', outputItemId: 1, yield: { min: 1, max: 1 }, variants: [{ id: 'v1', inputs: [{ itemId: 2, count: 1 }] }] },
    a1: { id: 'a1', skill: 'alchemy', outputItemId: 2, yield: { min: 1, max: 1 }, variants: [{ id: 'v1', inputs: [{ itemId: 1, count: 1 }] }] },
    c2: { id: 'c2', skill: 'cooking', outputItemId: 3, yield: { min: 1, max: 1 }, variants: [{ id: 'v1', inputs: [{ itemId: 2, count: 1 }] }] },
  },
  recipesByOutput: { '1': ['c1'], '2': ['a1'], '3': ['c2'] },
}

describe('Korean recipe search', () => {
  it('extracts Korean choseong', () => {
    expect(choseong('발레노스 정식')).toBe('ㅂㄹㄴㅅㅈㅅ')
  })

  it('supports Korean partial search', () => {
    expect(searchRecipes(dataset, '발레')[0].item.nameKo).toBe('발레노스 정식')
  })

  it('tolerates a one-syllable Korean typo without outranking exact matches', () => {
    expect(searchRecipes(dataset, '발래노스정식')[0].item.id).toBe(1)
    expect(searchRecipes(dataset, '발레노스 정식')[0].score).toBeGreaterThan(searchRecipes(dataset, '발래노스정식')[0].score)
  })

  it('does not fuzzy-match very short unrelated queries', () => {
    expect(searchRecipes(dataset, '액정')).toHaveLength(0)
  })

  it('supports choseong search', () => {
    expect(searchRecipes(dataset, 'ㅁㅇㅇㅊㅅㅇ')[0].item.nameKo).toBe('맑은 액체 시약')
  })

  it('filters Cooking and Alchemy without color-only semantics', () => {
    expect(searchRecipes(dataset, '발레', { skill: 'cooking' })).toHaveLength(2)
    expect(searchRecipes(dataset, '발레', { skill: 'alchemy' })).toHaveLength(0)
  })

  it('supports English aliases at slightly lower priority', () => {
    expect(searchRecipes(dataset, 'Balenos')[0].item.id).toBe(1)
  })
})
