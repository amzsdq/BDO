import { describe, expect, it } from 'vitest'
import { alchemyClientNamedEffects, cookingClientNamedEffects } from './mastery-client-mapping.mjs'

describe('client mastery semantic mapping', () => {
  it('maps Cooking raw column 3 to Mass Cooking probability', () => {
    expect(cookingClientNamedEffects({ mastery: 1500, rates: [0.1, 0.2, 0.3, 0.6006, 0.5] })).toEqual({ mastery: 1500, massCookingProbability: 0.6006 })
  })

  it('derives Alchemy common/special/rare extra probabilities from client event channels', () => {
    const result = alchemyClientNamedEffects({ mastery: 1000, rates: [0.2, 0.3, 15690, 1, 15691, 0.25, 15692, 0.1, 0.4] })
    expect(result.maxOutputProbability).toBe(0.2)
    expect(result.normalExtraProbability).toBeCloseTo(0.27)
    expect(result.specialExtraProbability).toBeCloseTo(0.09)
    expect(result.rareExtraProbability).toBeCloseTo(0.04)
    expect(result.channelKeys).toEqual([15690, 15691, 15692])
  })

  it('fails closed on an unexpected Alchemy common-channel selector', () => {
    expect(() => alchemyClientNamedEffects({ mastery: 0, rates: [0, 0, 15690, 0.9, 15691, 0, 15692, 0, 0] })).toThrow(/common channel/)
  })
})
