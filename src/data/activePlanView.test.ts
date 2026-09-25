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

  it('uses the selected substitution for LT and carry quantities', () => {
    const dataset = structuredClone(sampleDataset)
    const variant = dataset.recipes['sample-cooking']!.variants[0]!
    const canonicalId = variant.inputs[0]!.itemId
    const substituteId = 990001
    variant.inputs[0]!.substitutionGroupId = 'weight-substitution'
    dataset.items[String(canonicalId)]!.weightLT = 1
    dataset.items[String(substituteId)] = { id: substituteId, nameKo: '대체 재료', weightLT: 0.25 }
    dataset.substitutionGroups = {
      'weight-substitution': {
        id: 'weight-substitution', memberItemIds: [canonicalId, substituteId],
        memberValueByItemId: { [String(canonicalId)]: 1, [String(substituteId)]: 2 },
        source: { provider: 'BDO client', sourceId: 'fixture', verifiedAt: '2026-09-25T00:00:00Z' },
      },
    }
    const result = buildActivePlanView(dataset, {
      recipeId: 'sample-cooking', variantId: 'default', mode: 'servings', amount: 10, skill: 'cooking',
    }, {}, { maxWeightLT: 1000, reservedWeightLT: 0 }, {
      selectedSubstitutionItemIdByGroupId: { 'weight-substitution': substituteId },
    })
    expect(result.error).toBeUndefined()
    expect(result.plan?.materials.find((line) => line.itemId === substituteId)?.required).toBe(30)
    expect(result.batch?.lines[0]?.itemId).toBe(substituteId)
    expect(result.batch?.lines[0]?.countToCarry).toBe(30)
    expect(result.batch?.totalStartingIngredientWeightLT).toBe(7.5)
  })

  it('aggregates multiple substituted slots that resolve to the same carry item', () => {
    const dataset = structuredClone(sampleDataset)
    const variant = dataset.recipes['sample-cooking']!.variants[0]!
    const firstCanonicalId = variant.inputs[0]!.itemId
    const secondCanonicalId = 990002
    const substituteId = 990001
    variant.inputs[0]!.substitutionGroupId = 'slot-a'
    variant.inputs.push({ itemId: secondCanonicalId, count: 4, substitutionGroupId: 'slot-b' })
    dataset.items[String(firstCanonicalId)]!.weightLT = 1
    dataset.items[String(secondCanonicalId)] = { id: secondCanonicalId, nameKo: '두 번째 재료', weightLT: 2 }
    dataset.items[String(substituteId)] = { id: substituteId, nameKo: '공통 대체 재료', weightLT: 0.25 }
    const source = { provider: 'BDO client', sourceId: 'fixture', verifiedAt: '2026-09-25T00:00:00Z' } as const
    dataset.substitutionGroups = {
      'slot-a': { id: 'slot-a', memberItemIds: [firstCanonicalId, substituteId], memberValueByItemId: { [String(firstCanonicalId)]: 1, [String(substituteId)]: 1 }, source },
      'slot-b': { id: 'slot-b', memberItemIds: [secondCanonicalId, substituteId], memberValueByItemId: { [String(secondCanonicalId)]: 1, [String(substituteId)]: 1 }, source },
    }
    const result = buildActivePlanView(dataset, {
      recipeId: 'sample-cooking', variantId: 'default', mode: 'servings', amount: 2, skill: 'cooking',
    }, {}, { maxWeightLT: 1000, reservedWeightLT: 0 }, {
      selectedSubstitutionItemIdByGroupId: { 'slot-a': substituteId, 'slot-b': substituteId },
    })
    expect(result.error).toBeUndefined()
    expect(result.plan?.materials.find((line) => line.itemId === substituteId)?.required).toBe(18)
    expect(result.batch?.lines).toEqual([expect.objectContaining({ itemId: substituteId, countPerServing: 9, countToCarry: 18 })])
    expect(result.batch?.totalStartingIngredientWeightLT).toBe(4.5)
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
