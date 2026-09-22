import { describe, expect, it } from 'vitest'
import { exportPlannerState, resetPlannerState, writeCharacterProfile, writeChecklist, writeInventory } from './storage'

function memoryStorage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
    removeItem: (key: string) => { values.delete(key) },
    values,
  }
}

describe('planner state bundle', () => {
  it('exports only validated persisted planner state with a version and timestamp', () => {
    const storage = memoryStorage()
    writeChecklist({ '100': true }, storage)
    writeInventory({ '100': 7 }, storage)
    writeCharacterProfile({ maxWeightLT: 2000, cookingMastery: 1500 }, storage)

    expect(exportPlannerState(storage, '2026-09-23T00:00:00.000Z')).toEqual({
      version: 1,
      exportedAt: '2026-09-23T00:00:00.000Z',
      checklist: { '100': true },
      inventory: { '100': 7 },
      characterProfile: { maxWeightLT: 2000, reservedWeightLT: undefined, cookingMastery: 1500, alchemyMastery: undefined },
    })
  })

  it('resets checklist, inventory, and character profile together', () => {
    const storage = memoryStorage()
    writeChecklist({ '100': true }, storage)
    writeInventory({ '100': 7 }, storage)
    writeCharacterProfile({ maxWeightLT: 2000 }, storage)

    resetPlannerState(storage)

    expect(exportPlannerState(storage, '2026-09-23T00:00:00.000Z')).toMatchObject({ checklist: {}, inventory: {}, characterProfile: {} })
    expect(storage.values.size).toBe(0)
  })
})
