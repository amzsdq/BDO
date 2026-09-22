import { describe, expect, it } from 'vitest'
import { readPlanSession, writePlanSession, type PlanSessionState } from './planSession'

function memoryStorage() {
  const data = new Map<string, string>()
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value) },
  }
}

describe('versioned plan session state', () => {
  it('round-trips multiple targets and recursive craft choices', () => {
    const storage = memoryStorage()
    const state: PlanSessionState = {
      version: 1,
      targets: [
        { recipeId: 'cooking:10', variantId: 'v2', mode: 'durability', amount: 100, cookingPreparationPolicy: 'safe95' },
        { recipeId: 'alchemy:11', mode: 'servings', amount: 50 },
      ],
      craftIntermediateItemIds: [20, 30],
      intermediateRecipeIdByItemId: { '20': 'cooking:20' },
      variantIdByRecipeId: { 'cooking:20': 'v3' },
    }
    writePlanSession(state, storage)
    expect(readPlanSession(storage)).toEqual(state)
  })

  it('fails closed on unknown versions or invalid target quantities', () => {
    const storage = memoryStorage()
    storage.setItem('bdo-planner:plan-session:v1', JSON.stringify({ version: 2, targets: [] }))
    expect(readPlanSession(storage).targets).toEqual([])
    storage.setItem('bdo-planner:plan-session:v1', JSON.stringify({ version: 1, targets: [{ recipeId: 'x', mode: 'output', amount: -1 }], craftIntermediateItemIds: [], intermediateRecipeIdByItemId: {}, variantIdByRecipeId: {} }))
    expect(readPlanSession(storage).targets).toEqual([])
  })

  it('deduplicates persisted intermediate craft ids', () => {
    const storage = memoryStorage()
    storage.setItem('bdo-planner:plan-session:v1', JSON.stringify({ version: 1, targets: [], craftIntermediateItemIds: [20, 20], intermediateRecipeIdByItemId: {}, variantIdByRecipeId: {} }))
    expect(readPlanSession(storage).craftIntermediateItemIds).toEqual([20])
  })
})
