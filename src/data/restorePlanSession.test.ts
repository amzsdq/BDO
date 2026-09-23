import { describe, expect, it } from 'vitest'
import { sampleDataset } from './sample'
import type { PlanSessionState } from './planSession'
import { restorePlanSession } from './restorePlanSession'

function storageFor(value?: PlanSessionState): Pick<Storage, 'getItem'> {
  return { getItem: () => value ? JSON.stringify(value) : null }
}

function session(recipeId = 'sample-cooking'): PlanSessionState {
  return {
    version: 1,
    targets: [{ recipeId, variantId: 'default', mode: 'servings', amount: 25 }],
    craftIntermediateItemIds: [],
    intermediateRecipeIdByItemId: {},
    variantIdByRecipeId: {},
    selectedSubstitutionItemIdByGroupId: {},
  }
}

describe('restorePlanSession', () => {
  it('restores only after references validate against the loaded dataset', () => {
    const result = restorePlanSession(sampleDataset, storageFor(session()))
    expect(result.restored).toBe(true)
    if (result.restored) expect(result.session.targets[0].amount).toBe(25)
  })

  it('fails closed for stale persisted references', () => {
    const result = restorePlanSession(sampleDataset, storageFor(session('removed-recipe')))
    expect(result).toMatchObject({ restored: false, reason: 'invalid-reference' })
  })

  it('treats missing persisted state as empty rather than inventing a target', () => {
    expect(restorePlanSession(sampleDataset, storageFor())).toEqual({ restored: false, reason: 'empty', errors: [] })
  })

  it('distinguishes malformed persisted state from a genuine first run', () => {
    const storage: Pick<Storage, 'getItem'> = { getItem: () => '{not-json' }
    const result = restorePlanSession(sampleDataset, storage)
    expect(result).toMatchObject({ restored: false, reason: 'invalid-storage' })
    if (!result.restored) expect(result.errors[0]).toContain('덮어쓰지 않습니다')
  })

  it('fails closed when the storage backend itself throws', () => {
    const storage: Pick<Storage, 'getItem'> = { getItem: () => { throw new Error('storage unavailable') } }
    expect(restorePlanSession(sampleDataset, storage)).toMatchObject({ restored: false, reason: 'invalid-storage' })
  })
})
