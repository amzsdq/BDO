import type { RecipeDataset } from '../domain/types'

export const sampleDataset: RecipeDataset = {
  metadata: {
    generatedAt: '2026-09-22T00:00:00Z',
    sources: ['SAMPLE_ONLY — replace with completeness-verified dataset'],
    supportedRegion: 'KR',
  },
  items: {
    '900001': {
      id: 900001,
      nameKo: '샘플 요리',
    },
    '900002': {
      id: 900002,
      nameKo: '샘플 재료',
    },
    '900003': {
      id: 900003,
      nameKo: '샘플 연금',
    },
  },
  recipes: {
    'sample-cooking': {
      id: 'sample-cooking',
      skill: 'cooking',
      outputItemId: 900001,
      yield: { min: 1, max: 1 },
      variants: [
        {
          id: 'default',
          inputs: [{ itemId: 900002, count: 5 }],
        },
      ],
    },
    'sample-alchemy': {
      id: 'sample-alchemy',
      skill: 'alchemy',
      outputItemId: 900003,
      yield: { min: 1, max: 1 },
      variants: [
        {
          id: 'default',
          inputs: [{ itemId: 900002, count: 2 }],
        },
      ],
    },
  },
  recipesByOutput: {
    '900001': ['sample-cooking'],
    '900003': ['sample-alchemy'],
  },
}
