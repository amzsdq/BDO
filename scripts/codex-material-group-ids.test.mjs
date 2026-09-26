import { describe, expect, it } from 'vitest'
import { materialGroupIdsFromCodexRecipeEvidence } from './codex-material-group-ids.mjs'

describe('Codex recipe material-group id evidence', () => {
  it('extracts only explicitly material-group-labelled identities', () => {
    const evidence = {
      id: 999999,
      materials: [
        { id: 123, material_group: { id: 3001 } },
        { id: 124, material_group: '/kr/materialgroup/6002/' },
        { id: 125, nested: { material_group_id: '6407' } },
      ],
    }
    expect(materialGroupIdsFromCodexRecipeEvidence(evidence)).toEqual(['3001', '6002', '6407'])
  })

  it('accepts materialGroupIds emitted by unified item evidence', () => {
    expect(materialGroupIdsFromCodexRecipeEvidence({ items: [{ itemId: 9203, materialGroupIds: ['6503'] }, { itemId: 9282, materialGroupIds: ['6503', '805'] }] })).toEqual(['805', '6503'])
  })

  it('does not reinterpret generic recipe/item ids as material groups', () => {
    expect(materialGroupIdsFromCodexRecipeEvidence({ id: 3001, materials: [{ id: 6002 }] })).toEqual([])
  })

  it('deduplicates repeated group references across alternative recipe evidence', () => {
    expect(materialGroupIdsFromCodexRecipeEvidence([{ material_group: 3001 }, { materialGroup: { group_id: 3001 } }])).toEqual(['3001'])
  })
})
