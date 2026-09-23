import { describe, expect, it } from 'vitest'
import { sampleDataset } from './sample'
import { hydratePlannerBundle } from './plannerBundleHydration'

function storage(values: Record<string, string>): Pick<Storage, 'getItem'> {
  return { getItem: (key) => values[key] ?? null }
}

const validPlan = JSON.stringify({
  version: 1,
  targets: [{ recipeId: 'sample-cooking', variantId: 'default', mode: 'servings', amount: 12 }],
  craftIntermediateItemIds: [],
  intermediateRecipeIdByItemId: {},
  variantIdByRecipeId: {},
  selectedSubstitutionItemIdByGroupId: {},
})

describe('hydratePlannerBundle', () => {
  it('returns a ready first-run bundle only when persisted storage is genuinely absent', () => {
    const result = hydratePlannerBundle(sampleDataset, storage({}))
    expect(result).toMatchObject({ status: 'ready', primaryPlan: { status: 'first-run' }, checklist: {}, inventory: {}, characterProfile: {} })
  })

  it('restores plan and support state together after dataset validation', () => {
    const result = hydratePlannerBundle(sampleDataset, storage({
      'bdo-planner:plan-session:v1': validPlan,
      'bdo-planner:checklist:v1': JSON.stringify({ '100': true }),
      'bdo-planner:inventory:v1': JSON.stringify({ '100': 5 }),
      'bdo-planner:character-profile:v1': JSON.stringify({ maxWeightLT: 2000, cookingMastery: 1500 }),
    }))
    expect(result).toMatchObject({ status: 'ready', primaryPlan: { status: 'restored' }, checklist: { '100': true }, inventory: { '100': 5 }, characterProfile: { maxWeightLT: 2000, cookingMastery: 1500 } })
  })

  it.each([
    ['checklist', 'bdo-planner:checklist:v1', '{broken'],
    ['inventory', 'bdo-planner:inventory:v1', JSON.stringify({ '100': -1 })],
    ['character-profile', 'bdo-planner:character-profile:v1', JSON.stringify({ maxWeightLT: 'bad' })],
  ])('requires recovery when %s is corrupt', (component, key, raw) => {
    const result = hydratePlannerBundle(sampleDataset, storage({ [key]: raw }))
    expect(result).toMatchObject({ status: 'recovery-required' })
    if (result.status === 'recovery-required') expect(result.components).toContain(component)
  })

  it('requires recovery for a newer plan session instead of treating the bundle as first run', () => {
    const result = hydratePlannerBundle(sampleDataset, storage({ 'bdo-planner:plan-session:v1': JSON.stringify({ version: 2, targets: [] }) }))
    expect(result).toMatchObject({ status: 'recovery-required', components: ['plan-session'] })
  })
})
