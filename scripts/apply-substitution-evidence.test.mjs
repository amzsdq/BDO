import { describe, expect, it } from 'vitest'
import { applySubstitutionEvidence } from './apply-substitution-evidence.mjs'

const dataset = {
  items: { '1': { id: 1, nameKo: '기본' }, '2': { id: 2, nameKo: '고급' }, '3': { id: 3, nameKo: '결과' } },
  recipes: { 'cooking:3': { id: 'cooking:3', skill: 'cooking', outputItemId: 3, yield: { min: 1, max: 1 }, variants: [{ id: 'v1', inputs: [{ itemId: 1, count: 5 }] }] } },
  recipesByOutput: { '3': ['cooking:3'] }, metadata: { sources: ['client'] },
}
const evidence = {
  source: 'BDO Codex KR',
  collectedAt: '2026-09-23T00:00:00.000Z',
  groups: [{ id: 'codex:3001', sourceId: '3001', sourceUrl: 'https://bdocodex.com/kr/materialgroup/3001/', members: [{ itemId: 1, value: 1 }, { itemId: 2, value: 6 }] }],
}

describe('applySubstitutionEvidence', () => {
  it('installs source-backed membership/Worth and binds matching canonical recipe inputs', () => {
    const result = applySubstitutionEvidence(dataset, evidence)
    expect(result.substitutionGroups['codex:3001'].memberItemIds).toEqual([1, 2])
    expect(result.substitutionGroups['codex:3001'].memberValueByItemId).toEqual({ '1': 1, '2': 6 })
    expect(result.substitutionGroups['codex:3001'].source.sourceUrl).toBe(evidence.groups[0].sourceUrl)
    expect(result.recipes['cooking:3'].variants[0].inputs[0].substitutionGroupId).toBe('codex:3001')
    expect(dataset.recipes['cooking:3'].variants[0].inputs[0].substitutionGroupId).toBeUndefined()
  })

  it('rejects partial or non-positive Worth evidence instead of silently degrading', () => {
    expect(() => applySubstitutionEvidence(dataset, { ...evidence, groups: [{ ...evidence.groups[0], members: [{ itemId: 1, value: 0 }, { itemId: 2, value: 6 }] }] })).toThrow(/invalid Worth/)
  })

  it('rejects evidence members absent from the canonical item dataset', () => {
    expect(() => applySubstitutionEvidence(dataset, { ...evidence, groups: [{ ...evidence.groups[0], members: [{ itemId: 1, value: 1 }, { itemId: 99, value: 6 }] }] })).toThrow(/unknown\/invalid member/)
  })

  it('rejects non-Codex material-group URLs', () => {
    expect(() => applySubstitutionEvidence(dataset, { ...evidence, groups: [{ ...evidence.groups[0], sourceUrl: 'https://example.com/group/3001' }] })).toThrow(/unsupported evidence URL/)
  })

  it('rejects duplicate group records instead of letting the last one silently win', () => {
    expect(() => applySubstitutionEvidence(dataset, { ...evidence, groups: [evidence.groups[0], { ...evidence.groups[0] }] })).toThrow(/duplicate group evidence/)
  })

  it('fails closed when one canonical ingredient is ambiguously present in multiple sourced groups', () => {
    const second = { id: 'codex:9999', sourceId: '9999', sourceUrl: 'https://bdocodex.com/kr/materialgroup/9999/', members: [{ itemId: 1, value: 1 }, { itemId: 2, value: 2 }] }
    expect(() => applySubstitutionEvidence(dataset, { ...evidence, groups: [evidence.groups[0], second] })).toThrow(/multiple sourced substitution groups/)
  })
})
