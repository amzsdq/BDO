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

  it('locks every official 0..3000 breakpoint at 50-mastery intervals', () => {
    expect(VERIFIED_ALCHEMY_MASTERY_ROWS).toHaveLength(61)
    expect(VERIFIED_ALCHEMY_MASTERY_ROWS.map((row) => row.mastery)).toEqual(
      Array.from({ length: 61 }, (_, index) => index * 50),
    )
    expect(verifiedAlchemyMasteryRow(0)).toEqual({
      mastery: 0,
      maxOutputProbability: 0,
      normalExtraProbability: 0.0025,
      specialExtraProbability: 0.0004,
      rareExtraProbability: 0.0001,
    })
    expect(verifiedAlchemyMasteryRow(1000)).toEqual({
      mastery: 1000,
      maxOutputProbability: 0.219,
      normalExtraProbability: 0.0156,
      specialExtraProbability: 0.0052,
      rareExtraProbability: 0.0006,
    })
    expect(verifiedAlchemyMasteryRow(2000)).toEqual({
      mastery: 2000,
      maxOutputProbability: 0.5,
      normalExtraProbability: 0.0357,
      specialExtraProbability: 0.0192,
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

  it('fails closed for off-grid mastery values', () => {
    expect(verifiedAlchemyMasteryRow(-50)).toBeUndefined()
    expect(verifiedAlchemyMasteryRow(2075)).toBeUndefined()
    expect(verifiedAlchemyMasteryRow(3050)).toBeUndefined()
  })
})
