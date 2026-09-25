import { describe, expect, it } from 'vitest'
import { appendYieldProvenanceWarnings } from './yieldWarnings'
import type { RecipeDataset } from '../domain/types'

const dataset: RecipeDataset = {
  metadata: { generatedAt: '2026-09-25T00:00:00Z', sources: ['synthetic'], supportedRegion: 'KR' },
  items: { '1': { id: 1, nameKo: '완성품' }, '2': { id: 2, nameKo: '재료' } },
  recipes: {
    root: { id: 'root', skill: 'cooking', outputItemId: 1, yield: { min: 1, max: 1, provenance: 'unknown-server-yield' }, variants: [
      { id: 'verified', inputs: [{ itemId: 2, count: 1 }], yield: { min: 1, max: 4, provenance: 'https://bdocodex.com/kr/recipe/169/' } },
      { id: 'unknown', inputs: [{ itemId: 2, count: 1 }], yield: { min: 1, max: 1, provenance: 'unknown-server-yield' } },
    ] },
  },
  recipesByOutput: { '1': ['root'] },
}

const emptyPlan = { crafts: [], materials: [], warnings: [] }

describe('yield provenance warnings', () => {
  it('uses selected variant provenance instead of stale recipe-level provenance', () => {
    const verified = appendYieldProvenanceWarnings(dataset, [{ recipeId: 'root', mode: 'output', amount: 10, variantId: 'verified' }], emptyPlan)
    expect(verified.warnings).toEqual([])
    const unknown = appendYieldProvenanceWarnings(dataset, [{ recipeId: 'root', mode: 'output', amount: 10, variantId: 'unknown' }], emptyPlan)
    expect(unknown.warnings).toHaveLength(1)
  })
})
