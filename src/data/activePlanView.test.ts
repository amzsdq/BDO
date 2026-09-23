import { describe, expect, it } from 'vitest'
import { sampleDataset } from './sample'
import { buildActivePlanView } from './activePlanView'

describe('buildActivePlanView', () => {
  it('uses resolved Cooking durability material servings for carry quantities', () => {
    const dataset = structuredClone(sampleDataset)
    dataset.items['900002']!.weightLT = 0.1
    const result = buildActivePlanView(dataset, {
      recipeId: 'sample-cooking', variantId: 'default', mode: 'durability', amount: 10,
      skill: 'cooking', cookingPreparationPolicy: 'maximum',
    }, {}, { cookingMastery: 2000, maxWeightLT: 1000, reservedWeightLT: 0 })

    expect(result.error).toBeUndefined()
    expect(result.materialServings).toBe(100)
    expect(result.plan?.materials[0]?.required).toBe(500)
    expect(result.batch?.totalStartingIngredientWeightLT).toBe(50)
    expect(result.batch?.lines[0]?.countToCarry).toBe(500)
  })

  it('uses the same effective substitution for checklist and direct utensil-load LT', () => {
    const dataset = structuredClone(sampleDataset)
    dataset.items['900002']!.weightLT = 0.1
    dataset.items['900003'] = { id: 900003, nameKo: '고급 샘플 재료', weightLT: 0.05 }
    dataset.substitutionGroups = {
      'codex:test': {
        id: 'codex:test', memberItemIds: [900002, 900003],
        memberValueByItemId: { '900002': 1, '900003': 2 },
        source: { provider: 'BDO Codex KR', sourceId: 'test', verifiedAt: '2026-09-23' },
      },
    }
    dataset.recipes['sample-cooking'].variants[0].inputs[0].substitutionGroupId = 'codex:test'

    const result = buildActivePlanView(dataset, {
      recipeId: 'sample-cooking', variantId: 'default', mode: 'servings', amount: 10, skill: 'cooking',
    }, {}, { maxWeightLT: 1000 }, { selectedSubstitutionItemIdByGroupId: { 'codex:test': 900003 } })

    expect(result.error).toBeUndefined()
    expect(result.plan?.materials).toEqual(expect.arrayContaining([expect.objectContaining({ itemId: 900003, required: 30 })]))
    expect(result.batch?.lines).toEqual([expect.objectContaining({ itemId: 900003, countToCarry: 30 })])
    expect(result.batch?.totalStartingIngredientWeightLT).toBe(1.5)
  })

  it('does not produce a batch when Cooking durability cannot be resolved', () => {
    const result = buildActivePlanView(sampleDataset, {
      recipeId: 'sample-cooking', variantId: 'default', mode: 'durability', amount: 10,
      skill: 'cooking', cookingPreparationPolicy: 'maximum',
    }, {}, { maxWeightLT: 1000 })

    expect(result.plan).toBeUndefined()
    expect(result.batch).toBeUndefined()
    expect(result.error).toMatch(/Cooking mastery is required/)
  })
})
