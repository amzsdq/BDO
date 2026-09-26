import { describe, expect, it } from 'vitest'
import { resolveIngredientChoice, resolveOwnedMixedIngredientAllocation } from './substitution'
import type { IngredientSubstitutionGroup } from './types'

const groups: Record<string, IngredientSubstitutionGroup> = {
  'codex:6502': {
    id: 'codex:6502',
    memberItemIds: [10, 11, 12],
    source: { provider: 'BDO Codex KR', sourceId: '6502', verifiedAt: '2026-09-23' },
  },
  'codex:3001': {
    id: 'codex:3001',
    memberItemIds: [20, 21, 22],
    memberValueByItemId: { '20': 1, '21': 2, '22': 3 },
    source: { provider: 'BDO Codex KR', sourceId: '3001', sourceUrl: 'https://bdocodex.com/kr/materialgroup/3001/', verifiedAt: '2026-09-23' },
  },
}

describe('ingredient substitutions', () => {
  it('never substitutes an exact ingredient without verified group evidence', () => {
    expect(() => resolveIngredientChoice({ itemId: 10, count: 3 }, groups, { selectedItemId: 11 })).toThrow(/no verified substitution group/)
  })

  it('accepts only explicit group members and preserves quantity when values are unverified', () => {
    expect(resolveIngredientChoice({ itemId: 10, count: 3, substitutionGroupId: 'codex:6502' }, groups, { selectedItemId: 12 })).toEqual({ itemId: 12, count: 3, usedSubstitution: true })
    expect(() => resolveIngredientChoice({ itemId: 10, count: 3, substitutionGroupId: 'codex:6502' }, groups, { selectedItemId: 99 })).toThrow(/not a member/)
  })

  it('uses source-backed member values with ceiling semantics', () => {
    expect(resolveIngredientChoice({ itemId: 20, count: 5, substitutionGroupId: 'codex:3001' }, groups, { selectedItemId: 21 })).toEqual({ itemId: 21, count: 3, usedSubstitution: true })
    expect(resolveIngredientChoice({ itemId: 20, count: 5, substitutionGroupId: 'codex:3001' }, groups, { selectedItemId: 22 })).toEqual({ itemId: 22, count: 2, usedSubstitution: true })
  })

  it('converts through the canonical recipe member worth when it is not the base member', () => {
    expect(resolveIngredientChoice({ itemId: 21, count: 2, substitutionGroupId: 'codex:3001' }, groups, { selectedItemId: 20 })).toEqual({ itemId: 20, count: 4, usedSubstitution: true })
    expect(resolveIngredientChoice({ itemId: 22, count: 2, substitutionGroupId: 'codex:3001' }, groups, { selectedItemId: 21 })).toEqual({ itemId: 21, count: 3, usedSubstitution: true })
  })

  it('ranks owned substitutes against their effective required quantity', () => {
    expect(resolveIngredientChoice(
      { itemId: 20, count: 5, substitutionGroupId: 'codex:3001' },
      groups,
      { ownedByItemId: { '20': 4, '21': 3, '22': 1 } },
    )).toEqual({ itemId: 21, count: 3, usedSubstitution: true })
  })

  it('finds repeatable all-owned mixed Worth and rejects unsupported precision', () => {
    expect(resolveOwnedMixedIngredientAllocation({ itemId: 20, count: 5, substitutionGroupId: 'codex:3001' }, groups, { '20': 1, '21': 2 }, 1))
      .toEqual(expect.arrayContaining([{ itemId: 20, count: 1 }, { itemId: 21, count: 2 }]))
    expect(resolveOwnedMixedIngredientAllocation({ itemId: 21, count: 2, substitutionGroupId: 'codex:3001' }, groups, { '20': 4, '21': 1 }, 1)).toBeUndefined()
    const unsupported = structuredClone(groups)
    unsupported['codex:3001'].memberValueByItemId!['21'] = 1.25
    expect(resolveOwnedMixedIngredientAllocation({ itemId: 20, count: 5, substitutionGroupId: 'codex:3001' }, unsupported, { '20': 1, '21': 4 }, 1)).toBeUndefined()
  })

  it('fails closed for invalid sourced values', () => {
    const invalid = structuredClone(groups)
    invalid['codex:3001'].memberValueByItemId!['21'] = 0
    expect(() => resolveIngredientChoice({ itemId: 20, count: 5, substitutionGroupId: 'codex:3001' }, invalid, { selectedItemId: 21 })).toThrow(/invalid substitution value/)
  })

  it('fails closed when sourced value maps are incomplete', () => {
    const incomplete = structuredClone(groups)
    delete incomplete['codex:3001'].memberValueByItemId!['22']
    expect(() => resolveIngredientChoice({ itemId: 20, count: 5, substitutionGroupId: 'codex:3001' }, incomplete, { selectedItemId: 22 })).toThrow(/missing substitution value/)
  })

  it('fails closed when group evidence is missing or inconsistent', () => {
    expect(() => resolveIngredientChoice({ itemId: 10, count: 1, substitutionGroupId: 'missing' }, groups)).toThrow(/unknown substitution group/)
    expect(() => resolveIngredientChoice({ itemId: 99, count: 1, substitutionGroupId: 'codex:6502' }, groups)).toThrow(/not a member/)
  })
})
