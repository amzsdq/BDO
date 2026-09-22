import { describe, expect, it } from 'vitest'
import { resolveIngredientChoice, type IngredientSubstitutionGroup } from './substitution'

const groups: Record<string, IngredientSubstitutionGroup> = {
  'codex:6502': {
    id: 'codex:6502',
    memberItemIds: [10, 11, 12],
    source: { provider: 'BDO Codex KR', sourceId: '6502', verifiedAt: '2026-09-23' },
  },
}

describe('ingredient substitutions', () => {
  it('never substitutes an exact ingredient without verified group evidence', () => {
    expect(() => resolveIngredientChoice({ itemId: 10, count: 3 }, groups, { selectedItemId: 11 })).toThrow(/no verified substitution group/)
  })

  it('accepts only explicit group members and preserves recipe quantity', () => {
    expect(resolveIngredientChoice({ itemId: 10, count: 3, substitutionGroupId: 'codex:6502' }, groups, { selectedItemId: 12 })).toEqual({ itemId: 12, count: 3, usedSubstitution: true })
    expect(() => resolveIngredientChoice({ itemId: 10, count: 3, substitutionGroupId: 'codex:6502' }, groups, { selectedItemId: 99 })).toThrow(/not a member/)
  })

  it('prefers owned verified substitutes without changing the count', () => {
    expect(resolveIngredientChoice(
      { itemId: 10, count: 5, substitutionGroupId: 'codex:6502' },
      groups,
      { ownedByItemId: { '10': 1, '11': 7, '12': 20 } },
    )).toEqual({ itemId: 12, count: 5, usedSubstitution: true })
  })

  it('fails closed when group evidence is missing or inconsistent', () => {
    expect(() => resolveIngredientChoice({ itemId: 10, count: 1, substitutionGroupId: 'missing' }, groups)).toThrow(/unknown substitution group/)
    expect(() => resolveIngredientChoice({ itemId: 99, count: 1, substitutionGroupId: 'codex:6502' }, groups)).toThrow(/not a member/)
  })
})
