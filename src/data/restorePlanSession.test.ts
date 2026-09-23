import { describe, expect, it } from 'vitest'
import { sampleDataset } from './sample'
import type { PlanSessionState } from './planSession'
import { restorePlanSession } from './restorePlanSession'
function storageFor(value?: PlanSessionState): Pick<Storage, 'getItem'> { return { getItem: () => value ? JSON.stringify(value) : null } }
function session(recipeId = 'sample-cooking'): PlanSessionState { return { version: 1, targets: [{ recipeId, variantId: 'default', mode: 'servings', amount: 25 }], craftIntermediateItemIds: [], intermediateRecipeIdByItemId: {}, variantIdByRecipeId: {}, selectedSubstitutionItemIdByGroupId: {} } }
function emptySession(): PlanSessionState { return { version: 1, targets: [], craftIntermediateItemIds: [], intermediateRecipeIdByItemId: {}, variantIdByRecipeId: {}, selectedSubstitutionItemIdByGroupId: {} } }
describe('restorePlanSession', () => {
  it('restores only after references validate against the loaded dataset', () => { const result = restorePlanSession(sampleDataset, storageFor(session())); expect(result.restored).toBe(true); if (result.restored) expect(result.session.targets[0].amount).toBe(25) })
  it('preserves an intentionally persisted empty plan instead of treating it as first run', () => { const result = restorePlanSession(sampleDataset, storageFor(emptySession())); expect(result).toEqual({ restored: true, session: emptySession() }) })
  it('fails closed for stale persisted references', () => { expect(restorePlanSession(sampleDataset, storageFor(session('removed-recipe')))).toMatchObject({ restored: false, reason: 'invalid-reference' }) })
  it('treats missing persisted state as empty', () => { expect(restorePlanSession(sampleDataset, storageFor())).toEqual({ restored: false, reason: 'empty', errors: [] }) })
  it('distinguishes malformed persisted state from first run', () => { expect(restorePlanSession(sampleDataset, { getItem: () => '{not-json' })).toMatchObject({ restored: false, reason: 'invalid-storage' }) })
  it('keeps newer persisted versions in recovery', () => { expect(restorePlanSession(sampleDataset, { getItem: () => JSON.stringify({ version: 2, targets: [] }) })).toMatchObject({ restored: false, reason: 'unsupported-version' }) })
})
