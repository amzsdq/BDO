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
  it('merges mastery only from exact output item identity', () => {
    const randomDataset = { recipes: { stone: { id: 'stone', skill: 'alchemy', outputItemId: 45340, variants: [{ id: '346', inputs: [{ itemId: 4481, count: 50 }] }] } } }
    const randomDetails = { schemaVersion: 2, complete: true, unresolvedCount: 0, recipes: [
      { skill: 'alchemy', recipeId: 346, sourceUrl: 'https://bdocodex.com/kr/recipe/346/', status: 'random-only', ingredients: [{ itemId: 4481, count: 50 }], baseOutputs: [], randomOutputs: [{ itemId: 45340, min: 1, max: 1 }] },
    ] }
    const wrongId = { items: [{ itemId: 45341, masteryRequirement: { skill: 'alchemy', minimumMastery: 500 } }] }
    expect(bindCodexDetailEvidence(randomDataset, randomDetails, wrongId).entries[0].skillRequirement).toBeUndefined()
    const exactId = { items: [{ itemId: 45340, masteryRequirement: { skill: 'alchemy', minimumMastery: 500 } }] }
    expect(bindCodexDetailEvidence(randomDataset, randomDetails, exactId).entries[0].skillRequirement).toMatchObject({ skill: 'alchemy', minimumMastery: 500 })
  })

  it('binds a globally unique no-output route by exact skill and ingredient signature', () => {
    const noOutputDataset = { recipes: { hidden: { id: 'hidden', skill: 'alchemy', outputItemId: 70000, variants: [{ id: 'v', inputs: [{ itemId: 4481, count: 10 }, { itemId: 4917, count: 3 }] }] } } }
    const noOutput = { schemaVersion: 2, complete: true, unresolvedCount: 0, recipes: [
      { skill: 'alchemy', recipeId: 343, sourceUrl: 'https://bdocodex.com/kr/recipe/343/', status: 'no-output', ingredients: [{ itemId: 4917, count: 3 }, { itemId: 4481, count: 10 }], baseOutputs: [], randomOutputs: [] },
    ] }
    expect(bindCodexDetailEvidence(noOutputDataset, noOutput).entries[0]).toMatchObject({ sourceRecipeId: 343, outputStatus: 'no-output' })
    const ambiguousNoOutput = { ...noOutput, recipes: [...noOutput.recipes, { ...noOutput.recipes[0], recipeId: 342, sourceUrl: 'https://bdocodex.com/kr/recipe/342/' }] }
    expect(() => bindCodexDetailEvidence(noOutputDataset, ambiguousNoOutput)).toThrow(/expected exactly one/)

    const ambiguousClient = { recipes: {
      hiddenA: { id: 'hiddenA', skill: 'alchemy', outputItemId: 70000, variants: [{ id: 'a', inputs: [{ itemId: 4481, count: 10 }, { itemId: 4917, count: 3 }] }] },
      hiddenB: { id: 'hiddenB', skill: 'alchemy', outputItemId: 70001, variants: [{ id: 'b', inputs: [{ itemId: 4917, count: 3 }, { itemId: 4481, count: 10 }] }] },
    } }
    expect(() => bindCodexDetailEvidence(ambiguousClient, noOutput)).toThrow(/expected exactly one/)
  })

  it('fails closed on ambiguous source signatures', () => {
    const ambiguous = { ...details, recipes: [...details.recipes, { ...details.recipes[0], recipeId: 999 }] }
    expect(() => bindCodexDetailEvidence(dataset, ambiguous)).toThrow(/expected exactly one/)
  })
})
