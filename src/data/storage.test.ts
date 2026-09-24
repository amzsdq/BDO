import { describe, expect, it } from 'vitest'
import { exportPlannerState, importPlannerState, readCharacterProfile, readCharacterProfileResult, readChecklist, readChecklistResult, readInventory, readInventoryResult, writeCharacterProfile, writeChecklist, writeInventory } from './storage'
import { writePlanSession } from './planSession'

function memoryStorage() { let value: string | null = null; return { getItem: () => value, setItem: (_key: string, next: string) => { value = next } } }
function mapStorage(initial: Record<string, string> = {}, failOnceOnSetKey?: string): Storage {
  const values = new Map(Object.entries(initial))
  let failed = false
  return {
    get length() { return values.size },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key) },
    setItem: (key, value) => { if (key === failOnceOnSetKey && !failed) { failed = true; throw new Error('quota') } values.set(key, value) },
  }
}
const emptyPlanSession = { version: 1 as const, targets: [], craftIntermediateItemIds: [], intermediateRecipeIdByItemId: {}, variantIdByRecipeId: {}, selectedSubstitutionItemIdByGroupId: {} }

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

describe('planner state import', () => {
  it('round-trips the complete versioned export bundle', () => {
    const source = mapStorage()
    writeChecklist({ '100': true }, source)
    writeInventory({ '100': 12 }, source)
    writeCharacterProfile({ maxWeightLT: 2000, cookingMastery: 1500 }, source)
    writePlanSession({ ...emptyPlanSession, targets: [{ recipeId: '10', mode: 'servings', amount: 25 }] }, source)
    const bundle = exportPlannerState(source, '2026-09-24T00:00:00.000Z')
    const target = mapStorage()
    expect(importPlannerState(bundle, target)).toEqual(bundle)
    expect(exportPlannerState(target, bundle.exportedAt)).toEqual(bundle)
  })

  it('restores every previous key if a storage write fails mid-import', () => {
    const initial = {
      'bdo-planner:checklist:v1': JSON.stringify({ '1': true }),
      'bdo-planner:inventory:v1': JSON.stringify({ '1': 3 }),
      'bdo-planner:character-profile:v1': JSON.stringify({ maxWeightLT: 1000 }),
      'bdo-planner:plan-session:v1': JSON.stringify(emptyPlanSession),
    }
    const target = mapStorage(initial, 'bdo-planner:character-profile:v1')
    const bundle = {
      version: 2 as const,
      exportedAt: '2026-09-24T00:00:00.000Z',
      checklist: { '2': true },
      inventory: { '2': 9 },
      characterProfile: { maxWeightLT: 2000 },
      planSession: emptyPlanSession,
    }
    expect(() => importPlannerState(bundle, target)).toThrow('quota')
    for (const [key, value] of Object.entries(initial)) expect(target.getItem(key)).toBe(value)
  })

  it('does not mutate any key when acquiring the rollback snapshot fails', () => {
    const writes: string[] = []
    const target = {
      getItem: (_key: string) => { throw new Error('read unavailable') },
      setItem: (key: string, value: string) => { writes.push(`set:${key}:${value}`) },
      removeItem: (key: string) => { writes.push(`remove:${key}`) },
    }
    const bundle = { version: 2 as const, exportedAt: '2026-09-24T00:00:00.000Z', checklist: {}, inventory: {}, characterProfile: {}, planSession: emptyPlanSession }
    expect(() => importPlannerState(bundle, target)).toThrow('read unavailable')
    expect(writes).toEqual([])
  })
})
