import { describe, expect, it } from 'vitest'
import { readCharacterProfile, readChecklist, readInventory, writeCharacterProfile, writeChecklist, writeInventory } from './storage'

function memoryStorage() { let value: string | null = null; return { getItem: () => value, setItem: (_key: string, next: string) => { value = next } } }

describe('checklist persistence', () => {
  it('round-trips valid item completion state', () => { const storage = memoryStorage(); writeChecklist({ '100': true, '200': false }, storage); expect(readChecklist(storage)).toEqual({ '100': true, '200': false }) })
  it('fails closed on corrupt or unexpected data', () => { expect(readChecklist({ getItem: () => '{bad json' })).toEqual({}); expect(readChecklist({ getItem: () => JSON.stringify({ x: true, '1': 'yes', '2': false }) })).toEqual({ '2': false }) })
})

describe('owned inventory persistence', () => {
  it('round-trips non-negative item quantities', () => { const storage = memoryStorage(); writeInventory({ '100': 12, '200': 0 }, storage); expect(readInventory(storage)).toEqual({ '100': 12, '200': 0 }) })
  it('drops invalid ids, negative values and non-numbers', () => { expect(readInventory({ getItem: () => JSON.stringify({ x: 2, '1': -1, '2': '3', '3': 4.5 }) })).toEqual({ '3': 4.5 }) })
})

describe('character profile persistence', () => {
  it('round-trips weight and separate cooking/alchemy mastery', () => { const storage = memoryStorage(); writeCharacterProfile({ maxWeightLT: 2000, reservedWeightLT: 250, cookingMastery: 1500, alchemyMastery: 1200 }, storage); expect(readCharacterProfile(storage)).toEqual({ maxWeightLT: 2000, reservedWeightLT: 250, cookingMastery: 1500, alchemyMastery: 1200 }) })
  it('drops invalid or negative profile values instead of propagating bad math', () => { const raw = JSON.stringify({ maxWeightLT: -1, reservedWeightLT: '10', cookingMastery: 0, alchemyMastery: null }); expect(readCharacterProfile({ getItem: () => raw })).toEqual({ maxWeightLT: undefined, reservedWeightLT: undefined, cookingMastery: 0, alchemyMastery: undefined }) })
})
