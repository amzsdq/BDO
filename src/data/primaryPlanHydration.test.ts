import { describe, expect, it } from 'vitest'
import { sampleDataset } from './sample'
import type { PlanSessionState } from './planSession'
import { hydratePrimaryPlan } from './primaryPlanHydration'
const KEY = 'bdo-planner:plan-session:v1'
function storage(raw: string | null): Pick<Storage, 'getItem'> { return { getItem: (key) => key === KEY ? raw : null } }
function persisted(recipeId = 'sample-cooking'): PlanSessionState { return { version: 1, targets: [{ recipeId, variantId: 'default', mode: 'servings', amount: 42 }], craftIntermediateItemIds: [], intermediateRecipeIdByItemId: {}, variantIdByRecipeId: {}, selectedSubstitutionItemIdByGroupId: {} } }
describe('hydratePrimaryPlan', () => {
  it('marks genuinely absent storage as first-run', () => { expect(hydratePrimaryPlan(sampleDataset, storage(null))).toEqual({ status: 'first-run' }) })
  it('restores validated controls after runtime dataset availability', () => { const result = hydratePrimaryPlan(sampleDataset, storage(JSON.stringify(persisted()))); expect(result.status).toBe('restored'); if (result.status === 'restored') expect(result.state.amount).toBe(42) })
  it('requires recovery for malformed storage', () => { expect(hydratePrimaryPlan(sampleDataset, storage('{broken'))).toMatchObject({ status: 'recovery-required', reason: 'invalid-storage' }) })
  it('requires recovery for newer persisted sessions', () => { expect(hydratePrimaryPlan(sampleDataset, storage(JSON.stringify({ version: 2, targets: [] })))).toMatchObject({ status: 'recovery-required', reason: 'unsupported-version' }) })
  it('requires recovery for stale dataset references', () => { expect(hydratePrimaryPlan(sampleDataset, storage(JSON.stringify(persisted('removed-recipe'))))).toMatchObject({ status: 'recovery-required', reason: 'invalid-reference' }) })
})
