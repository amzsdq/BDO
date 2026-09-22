import { describe, expect, it } from 'vitest'
import { writePlanSession } from './planSession'
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
  it('exports validated support state plus the reproducible plan session', () => {
    const storage = memoryStorage()
    writeChecklist({ '100': true }, storage)
    writeInventory({ '100': 7 }, storage)
    writeCharacterProfile({ maxWeightLT: 2000, cookingMastery: 1500 }, storage)
    writePlanSession({ version: 1, targets: [{ recipeId: 'cooking:10', mode: 'durability', amount: 100, cookingPreparationPolicy: 'safe95' }], craftIntermediateItemIds: [20], intermediateRecipeIdByItemId: { '20': 'cooking:20' }, variantIdByRecipeId: {}, selectedSubstitutionItemIdByGroupId: { 'codex:6502': 21 } }, storage)

    expect(exportPlannerState(storage, '2026-09-23T00:00:00.000Z')).toEqual({
      version: 2,
      exportedAt: '2026-09-23T00:00:00.000Z',
      checklist: { '100': true },
      inventory: { '100': 7 },
      characterProfile: { maxWeightLT: 2000, reservedWeightLT: undefined, cookingMastery: 1500, alchemyMastery: undefined },
      planSession: { version: 1, targets: [{ recipeId: 'cooking:10', mode: 'durability', amount: 100, cookingPreparationPolicy: 'safe95' }], craftIntermediateItemIds: [20], intermediateRecipeIdByItemId: { '20': 'cooking:20' }, variantIdByRecipeId: {}, selectedSubstitutionItemIdByGroupId: { 'codex:6502': 21 } },
    })
  })

  it('resets checklist, inventory, character profile, and plan session together', () => {
    const storage = memoryStorage()
    writeChecklist({ '100': true }, storage)
    writeInventory({ '100': 7 }, storage)
    writeCharacterProfile({ maxWeightLT: 2000 }, storage)
    writePlanSession({ version: 1, targets: [{ recipeId: 'cooking:10', mode: 'servings', amount: 5 }], craftIntermediateItemIds: [], intermediateRecipeIdByItemId: {}, variantIdByRecipeId: {}, selectedSubstitutionItemIdByGroupId: {} }, storage)

    resetPlannerState(storage)

    expect(exportPlannerState(storage, '2026-09-23T00:00:00.000Z')).toMatchObject({ checklist: {}, inventory: {}, characterProfile: {}, planSession: { targets: [] } })
    expect(storage.values.size).toBe(0)
  })
})
