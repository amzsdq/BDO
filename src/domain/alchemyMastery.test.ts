import { describe, expect, it } from 'vitest'
import {
  ALCHEMY_MASTERY_SOURCE,
  VERIFIED_ALCHEMY_MASTERY_ROWS,
  verifiedAlchemyMasteryRow,
} from './alchemyMastery'

describe('Alchemy mastery source data', () => {
  it('carries explicit source/version metadata', () => {
    expect(ALCHEMY_MASTERY_SOURCE.provider).toBe('Pearl Abyss')
    expect(ALCHEMY_MASTERY_SOURCE.region).toBe('KR')
    expect(ALCHEMY_MASTERY_SOURCE.verifiedAt).toBe('2026-09-23')
  })

  it('locks the independently verified 2050..3000 upper range', () => {
    expect(VERIFIED_ALCHEMY_MASTERY_ROWS).toHaveLength(20)
    expect(VERIFIED_ALCHEMY_MASTERY_ROWS.map((row) => row.mastery)).toEqual(
      Array.from({ length: 20 }, (_, index) => 2050 + index * 50),
    )
    expect(verifiedAlchemyMasteryRow(2050)).toEqual({
      mastery: 2050,
      maxOutputProbability: 0.5063,
      normalExtraProbability: 0.0359,
      specialExtraProbability: 0.0197,
      rareExtraProbability: 0.0023,
    })
    expect(verifiedAlchemyMasteryRow(3000)).toEqual({
      mastery: 3000,
      maxOutputProbability: 0.625,
      normalExtraProbability: 0.0383,
      specialExtraProbability: 0.0298,
      rareExtraProbability: 0.0036,
    })
  })

  it('fails closed for unverified or off-grid mastery values', () => {
    expect(verifiedAlchemyMasteryRow(2000)).toBeUndefined()
    expect(verifiedAlchemyMasteryRow(2075)).toBeUndefined()
  })
})
