import { describe, expect, it } from 'vitest'
import { createInitialPlanSession } from './initialPlanSession'
import { writePlanSession } from './planSession'
import { sampleDataset } from './sample'
import { exportPlannerState, resetPlannerState, writeCharacterProfile, writeChecklist, writeInventory } from './storage'

function memoryStorage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
    removeItem: (key: string) => { values.delete(key) },
  }
}

describe('planner state portability', () => {
  it('exports the complete persisted bundle with an explicit version', () => {
    const storage = memoryStorage()
    const session = createInitialPlanSession(sampleDataset)
    writePlanSession(session, storage)
    writeChecklist({ '100': true }, storage)
    writeInventory({ '100': 7 }, storage)
    writeCharacterProfile({ maxWeightLT: 1200, reservedWeightLT: 100, cookingMastery: 1500, alchemyMastery: 900 }, storage)

    expect(exportPlannerState(storage, '2026-09-23T00:00:00.000Z')).toEqual({
      version: 2,
      exportedAt: '2026-09-23T00:00:00.000Z',
      checklist: { '100': true },
      inventory: { '100': 7 },
      characterProfile: { maxWeightLT: 1200, reservedWeightLT: 100, cookingMastery: 1500, alchemyMastery: 900 },
      planSession: session,
    })
  })

  it('rolls back every persisted key when reset fails partway through', () => {
    const values = new Map<string, string>([
      ['bdo-planner:checklist:v1', '{"100":true}'],
      ['bdo-planner:inventory:v1', '{"100":7}'],
      ['bdo-planner:character-profile:v1', '{"maxWeightLT":1200}'],
      ['bdo-planner:plan-session:v1', '{"version":2}'],
    ])
    let removals = 0
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value) },
      removeItem: (key: string) => { removals += 1; if (removals === 3) throw new Error('quota fault'); values.delete(key) },
    }
    expect(() => resetPlannerState(storage)).toThrow('quota fault')
    expect(Object.fromEntries(values)).toEqual({
      'bdo-planner:checklist:v1': '{"100":true}',
      'bdo-planner:inventory:v1': '{"100":7}',
      'bdo-planner:character-profile:v1': '{"maxWeightLT":1200}',
      'bdo-planner:plan-session:v1': '{"version":2}',
    })
  })

  it('clears checklist, inventory, profile and session together on explicit reset', () => {
    const storage = memoryStorage()
    writePlanSession(createInitialPlanSession(sampleDataset), storage)
    writeChecklist({ '100': true }, storage)
    writeInventory({ '100': 7 }, storage)
    writeCharacterProfile({ maxWeightLT: 1200 }, storage)

    resetPlannerState(storage)

    expect(storage.getItem('bdo-planner:checklist:v1')).toBeNull()
    expect(storage.getItem('bdo-planner:inventory:v1')).toBeNull()
    expect(storage.getItem('bdo-planner:character-profile:v1')).toBeNull()
    expect(storage.getItem('bdo-planner:plan-session:v1')).toBeNull()
  })
})
