import { describe, expect, it } from 'vitest'
import { sampleDataset } from './sample'
import { hydratePlannerBundle } from './plannerBundleHydration'
function storage(values: Record<string, string>): Pick<Storage, 'getItem'> { return { getItem: (key) => values[key] ?? null } }
const validPlan = JSON.stringify({ version: 1, targets: [{ recipeId: 'sample-cooking', variantId: 'default', mode: 'servings', amount: 12 }], craftIntermediateItemIds: [], intermediateRecipeIdByItemId: {}, variantIdByRecipeId: {}, selectedSubstitutionItemIdByGroupId: {} })
const validEmptyPlan = JSON.stringify({ version: 1, targets: [], craftIntermediateItemIds: [], intermediateRecipeIdByItemId: {}, variantIdByRecipeId: {}, selectedSubstitutionItemIdByGroupId: {} })
describe('hydratePlannerBundle', () => {
  it('returns ready first-run only for genuinely absent storage', () => { expect(hydratePlannerBundle(sampleDataset, storage({}))).toMatchObject({ status: 'ready', primaryPlan: { status: 'first-run' }, checklist: {}, inventory: {}, characterProfile: {} }) })
  it('preserves an intentionally empty persisted plan through bundle hydration', () => { expect(hydratePlannerBundle(sampleDataset, storage({ 'bdo-planner:plan-session:v1': validEmptyPlan }))).toMatchObject({ status: 'ready', primaryPlan: { status: 'restored-empty' } }) })
  it('restores plan and support state together', () => { expect(hydratePlannerBundle(sampleDataset, storage({ 'bdo-planner:plan-session:v1': validPlan, 'bdo-planner:checklist:v1': JSON.stringify({ '100': true }), 'bdo-planner:inventory:v1': JSON.stringify({ '100': 5 }), 'bdo-planner:character-profile:v1': JSON.stringify({ maxWeightLT: 2000 }) }))).toMatchObject({ status: 'ready', primaryPlan: { status: 'restored' }, checklist: { '100': true }, inventory: { '100': 5 }, characterProfile: { maxWeightLT: 2000 } }) })
  it('requires recovery for corrupt support state', () => { expect(hydratePlannerBundle(sampleDataset, storage({ 'bdo-planner:inventory:v1': JSON.stringify({ '100': -1 }) }))).toMatchObject({ status: 'recovery-required', components: ['inventory'] }) })
  it('requires recovery for newer plan sessions', () => { expect(hydratePlannerBundle(sampleDataset, storage({ 'bdo-planner:plan-session:v1': JSON.stringify({ version: 2, targets: [] }) }))).toMatchObject({ status: 'recovery-required', components: ['plan-session'] }) })
})
