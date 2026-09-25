import { describe, expect, it } from 'vitest'
import { bindCodexDetailEvidence } from './bind-codex-detail-evidence.mjs'

const dataset = { recipes: { meal: { id: 'meal', skill: 'cooking', outputItemId: 9601, variants: [
  { id: '169', inputs: [{ itemId: 9203, count: 1 }] },
  { id: '637', inputs: [{ itemId: 9282, count: 1 }] },
] } } }
const details = { schemaVersion: 2, complete: true, unresolvedCount: 0, recipes: [
  { skill: 'cooking', recipeId: 169, sourceUrl: 'https://bdocodex.com/kr/recipe/169/', status: 'single-base', ingredients: [{ itemId: 9203, count: 1 }], baseOutputs: [{ itemId: 9601, min: 1, max: 4 }], randomOutputs: [{ itemId: 9602, min: 1, max: 2 }] },
  { skill: 'cooking', recipeId: 637, sourceUrl: 'https://bdocodex.com/kr/recipe/637/', status: 'single-base', ingredients: [{ itemId: 9282, count: 1 }], baseOutputs: [{ itemId: 9601, min: 1, max: 1 }], randomOutputs: [{ itemId: 9602, min: 1, max: 1 }] },
] }

describe('Codex detail binder', () => {
  it('binds same-output variants by exact pre-substitution ingredient signature', () => {
    const bound = bindCodexDetailEvidence(dataset, details)
    expect(bound.entries.map(({ variantId, sourceRecipeId, min, max }) => ({ variantId, sourceRecipeId, min, max }))).toEqual([
      { variantId: '169', sourceRecipeId: 169, min: 1, max: 4 },
      { variantId: '637', sourceRecipeId: 637, min: 1, max: 1 },
    ])
  })
  it('fails closed on ambiguous source signatures', () => {
    const ambiguous = { ...details, recipes: [...details.recipes, { ...details.recipes[0], recipeId: 999 }] }
    expect(() => bindCodexDetailEvidence(dataset, ambiguous)).toThrow(/expected exactly one/)
  })
})
