import { describe, expect, it } from 'vitest'
import type { RecipeDataset } from '../domain/types'
import { readPlanSession, writePlanSession, type PlanSessionState } from './planSession'
import { activeSessionTarget, updateActiveSessionTarget, updateActiveSessionTargetMode } from './activeSessionTarget'

const dataset: RecipeDataset = {
  items: { '1': { id: 1, nameKo: 'A' }, '2': { id: 2, nameKo: 'B' } },
  recipes: {
    a: { id: 'a', skill: 'cooking', outputItemId: 1, yield: { min: 1, max: 1 }, variants: [{ id: 'a1', inputs: [] }, { id: 'a2', inputs: [] }] },
    b: { id: 'b', skill: 'alchemy', outputItemId: 2, yield: { min: 1, max: 1 }, variants: [{ id: 'b1', inputs: [] }] },
  },
  recipesByOutput: { '1': ['a'], '2': ['b'] },
  metadata: { generatedAt: '2026-09-23T00:00:00Z', sources: ['test'], supportedRegion: 'KR' },
}

const session: PlanSessionState = {
  version: 1,
  targets: [
    { recipeId: 'a', mode: 'servings', amount: 10 },
    { recipeId: 'b', variantId: 'b1', mode: 'output', amount: 20 },
  ],
  craftIntermediateItemIds: [],
  intermediateRecipeIdByItemId: {},
  variantIdByRecipeId: { a: 'a2', b: 'b1' },
  selectedSubstitutionItemIdByGroupId: {},
}

describe('active session target bridge', () => {
  it('resolves persisted recipe-level variant preference for the selected target', () => {
    expect(activeSessionTarget(dataset, session, 0)?.variantId).toBe('a2')
  })

  it('edits selected controls without collapsing sibling targets', () => {
    const next = updateActiveSessionTarget(session, 0, { mode: 'servings', amount: 77 })
    expect(next.targets[0]?.amount).toBe(77)
    expect(next.targets[1]).toEqual(session.targets[1])
  })

  it('preserves sibling targets across edit, persistence, and reload', () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value) },
    }
    const edited = updateActiveSessionTarget(session, 0, { amount: 77 })
    writePlanSession(edited, storage)
    const restored = readPlanSession(storage)

    expect(restored.targets[0]).toEqual({ recipeId: 'a', mode: 'servings', amount: 77 })
    expect(restored.targets[1]).toEqual(session.targets[1])
    expect(restored.variantIdByRecipeId).toEqual(session.variantIdByRecipeId)
  })

  it('clears durability-only policy when the active target changes to another mode', () => {
    const durability: PlanSessionState = {
      ...session,
      targets: [{ recipeId: 'a', mode: 'durability', amount: 100, cookingPreparationPolicy: 'safe95' }, session.targets[1]!],
    }
    const next = updateActiveSessionTarget(durability, 0, { mode: 'servings' })
    expect(next.targets[0]).toEqual({ recipeId: 'a', mode: 'servings', amount: 100 })
    expect(next.targets[1]).toEqual(session.targets[1])
  })

  it('adds a default Cooking policy when entering durability and never adds it to Alchemy', () => {
    const cooking = updateActiveSessionTargetMode(session, 0, 'cooking', 'durability')
    expect(cooking.targets[0]?.cookingPreparationPolicy).toBe('safe95')
    const alchemy = updateActiveSessionTargetMode(session, 1, 'alchemy', 'durability')
    expect(alchemy.targets[1]?.cookingPreparationPolicy).toBeUndefined()
    expect(alchemy.targets[0]).toEqual(session.targets[0])
  })

  it('fails closed on stale recipe or variant references', () => {
    expect(activeSessionTarget(dataset, { ...session, targets: [{ ...session.targets[0]!, recipeId: 'missing' }] }, 0)).toBeUndefined()
    expect(activeSessionTarget(dataset, { ...session, targets: [{ ...session.targets[0]!, variantId: 'missing' }] }, 0)).toBeUndefined()
  })
})
