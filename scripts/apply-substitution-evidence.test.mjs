import { describe, expect, it } from 'vitest'
import { applySubstitutionEvidence } from './apply-substitution-evidence.mjs'

const dataset = {
  items: { '1': { id: 1, nameKo: '기본' }, '2': { id: 2, nameKo: '고급' } },
  recipes: {}, recipesByOutput: {}, metadata: { sources: ['client'] },
}
const evidence = {
  source: 'BDO Codex KR',
  collectedAt: '2026-09-23T00:00:00.000Z',
  groups: [{ id: 'codex:3001', sourceId: '3001', sourceUrl: 'https://bdocodex.com/kr/materialgroup/3001/', members: [{ itemId: 1, value: 1 }, { itemId: 2, value: 6 }] }],
}

describe('applySubstitutionEvidence', () => {
  it('installs source-backed membership and Worth atomically', () => {
    const result = applySubstitutionEvidence(dataset, evidence)
    expect(result.substitutionGroups['codex:3001'].memberItemIds).toEqual([1, 2])
    expect(result.substitutionGroups['codex:3001'].memberValueByItemId).toEqual({ '1': 1, '2': 6 })
    expect(result.substitutionGroups['codex:3001'].source.sourceUrl).toBe(evidence.groups[0].sourceUrl)
    expect(dataset.substitutionGroups).toBeUndefined()
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
})
