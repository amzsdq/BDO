import { describe, expect, it } from 'vitest'
import { readCharacterProfile, readCharacterProfileResult, readChecklist, readChecklistResult, readInventory, readInventoryResult, writeCharacterProfile, writeChecklist, writeInventory } from './storage'

function memoryStorage() { let value: string | null = null; return { getItem: () => value, setItem: (_key: string, next: string) => { value = next } } }

describe('checklist persistence', () => {
  it('round-trips valid item completion state', () => { const storage = memoryStorage(); writeChecklist({ '100': true, '200': false }, storage); expect(readChecklist(storage)).toEqual({ '100': true, '200': false }) })
  it('keeps tolerant legacy reads while strict hydration rejects partial corruption', () => { const raw = JSON.stringify({ x: true, '1': 'yes', '2': false }); expect(readChecklist({ getItem: () => raw })).toEqual({}); expect(readChecklistResult({ getItem: () => raw }).status).toBe('invalid-storage'); expect(readChecklistResult({ getItem: () => '{bad json' }).status).toBe('invalid-storage') })
})

describe('owned inventory persistence', () => {
  it('round-trips non-negative item quantities', () => { const storage = memoryStorage(); writeInventory({ '100': 12, '200': 0 }, storage); expect(readInventory(storage)).toEqual({ '100': 12, '200': 0 }) })
  it('marks any invalid member as recovery-required for atomic hydration', () => { const raw = JSON.stringify({ x: 2, '1': -1, '2': '3', '3': 4.5 }); expect(readInventory({ getItem: () => raw })).toEqual({}); expect(readInventoryResult({ getItem: () => raw }).status).toBe('invalid-storage') })
})

describe('character profile persistence', () => {
  it('round-trips weight and separate cooking/alchemy mastery', () => { const storage = memoryStorage(); writeCharacterProfile({ maxWeightLT: 2000, reservedWeightLT: 250, cookingMastery: 1500, alchemyMastery: 1200 }, storage); expect(readCharacterProfile(storage)).toEqual({ maxWeightLT: 2000, reservedWeightLT: 250, cookingMastery: 1500, alchemyMastery: 1200 }) })
  it('marks invalid profile values as recovery-required instead of silently normalizing them during bundle hydration', () => { const raw = JSON.stringify({ maxWeightLT: -1, reservedWeightLT: '10', cookingMastery: 0, alchemyMastery: null }); expect(readCharacterProfile({ getItem: () => raw })).toEqual({}); expect(readCharacterProfileResult({ getItem: () => raw }).status).toBe('invalid-storage') })
})
