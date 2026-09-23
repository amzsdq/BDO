import { describe, expect, it } from 'vitest'
import { assertMasteryCurvesMatch, compareMasteryCurves } from './mastery-crosscheck.mjs'

const cookingClientRows = [
  { mastery: 0, rates: [0, 0, 0, 0, 0] },
  { mastery: 50, rates: [0, 0, 0, 0.1089, 0] },
]
const cookingRuntimeRows = [
  { mastery: 0, massCookingProbability: 0 },
  { mastery: 50, massCookingProbability: 0.1089 },
]
const alchemyClientRows = [
  { mastery: 0, rates: [0, 0, 0.01569, 1, 0.015691, 0.16, 0.015692, 0.04, 0.002976190476190476] },
]
const alchemyRuntimeRows = [
  { mastery: 0, maxOutputProbability: 0, normalExtraProbability: 0.0024, specialExtraProbability: 0.0004571428571428571, rareExtraProbability: 0.00011904761904761905 },
]

const valid = { cookingClientRows, cookingRuntimeRows, alchemyClientRows, alchemyRuntimeRows }

describe('mastery client/runtime cross-check', () => {
  it('passes only when both skill curves have the same mastery set and named effects', () => {
    const result = assertMasteryCurvesMatch(valid)
    expect(result.pass).toBe(true)
    expect(result.cooking.masterySetMatches).toBe(true)
    expect(result.alchemy.masterySetMatches).toBe(true)
  })

  it('fails closed when a client mastery breakpoint is missing from runtime', () => {
    const result = compareMasteryCurves({ ...valid, cookingRuntimeRows: cookingRuntimeRows.slice(0, 1) })
    expect(result.pass).toBe(false)
    expect(result.cooking.masterySetMatches).toBe(false)
    expect(() => assertMasteryCurvesMatch({ ...valid, cookingRuntimeRows: cookingRuntimeRows.slice(0, 1) })).toThrow(/cross-check failed/)
  })

  it('reports a named semantic mismatch instead of accepting raw column equality', () => {
    const result = compareMasteryCurves({ ...valid, cookingRuntimeRows: [{ mastery: 0, massCookingProbability: 0 }, { mastery: 50, massCookingProbability: 0.2 }] })
    expect(result.pass).toBe(false)
    expect(result.cooking.mismatches).toEqual([{ mastery: 50, field: 'massCookingProbability', client: 0.1089, runtime: 0.2 }])
  })

  it('fails closed when Alchemy channel semantics are not the reviewed client layout', () => {
    expect(() => compareMasteryCurves({ ...valid, alchemyClientRows: [{ mastery: 0, rates: [0, 0, 0.01234, 1, 0.015691, 0.16, 0.015692, 0.04, 0.1] }] })).toThrow(/channel keys/)
  })
})
