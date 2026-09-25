import { describe, expect, it } from 'vitest'
import { verifiedBaseOutputWeightRange } from './verifiedBaseOutputWeight'
import type { Item, RecipeVariant } from './types'

const items: Record<string, Item> = { '9601': { id: 9601, nameKo: '발레노스 정식', weightLT: 0.1 }, '9602': { id: 9602, nameKo: '특제 발레노스 정식', weightLT: 0.1 } }

describe('verifiedBaseOutputWeightRange', () => {
  it('keeps variant-specific base output ranges distinct', () => {
    const v169: RecipeVariant = { id: '169', inputs: [], outputEvidence: { status: 'single-base', baseOutputs: [{ itemId: 9601, min: 1, max: 4 }], randomOutputs: [{ itemId: 9602, min: 1, max: 2 }] } }
    const v637: RecipeVariant = { id: '637', inputs: [], outputEvidence: { status: 'single-base', baseOutputs: [{ itemId: 9601, min: 1, max: 1 }], randomOutputs: [{ itemId: 9602, min: 1, max: 1 }] } }
    expect(verifiedBaseOutputWeightRange(v169, items, 100)).toEqual({ attempts: 100, minLT: 10, maxLT: 40, excludedRandomOutputItemIds: [9602] })
    expect(verifiedBaseOutputWeightRange(v637, items, 100)).toEqual({ attempts: 100, minLT: 10, maxLT: 10, excludedRandomOutputItemIds: [9602] })
  })

  it('does not invent output weight for random-only or unverified item weight', () => {
    const randomOnly: RecipeVariant = { id: '346', inputs: [], outputEvidence: { status: 'random-only', randomOutputs: [{ itemId: 45340, min: 1, max: 1 }] } }
    expect(verifiedBaseOutputWeightRange(randomOnly, items, 100)).toBeUndefined()
    const single: RecipeVariant = { id: 'x', inputs: [], outputEvidence: { status: 'single-base', baseOutputs: [{ itemId: 9999, min: 1, max: 1 }] } }
    expect(verifiedBaseOutputWeightRange(single, items, 100)).toBeUndefined()
  })
})
