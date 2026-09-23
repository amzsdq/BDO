import { describe, expect, it } from 'vitest'
import { sampleDataset } from './sample'
import type { PlanSessionState } from './planSession'
import { addDefaultTarget, removeTargetAndSelect } from './activeTargetSelection'

const base: PlanSessionState = {
  version: 1,
  targets: [
    { recipeId: 'sample-cooking', variantId: 'default', mode: 'servings', amount: 2 },
    { recipeId: 'sample-cooking', variantId: 'default', mode: 'servings', amount: 3 },
    { recipeId: 'sample-cooking', variantId: 'default', mode: 'servings', amount: 4 },
  ],
  craftIntermediateItemIds: [],
  intermediateRecipeIdByItemId: {},
  variantIdByRecipeId: {},
  selectedSubstitutionItemIdByGroupId: {},
}

describe('active target selection', () => {
  it('adds a persisted target and selects the new sibling', () => {
    const result = addDefaultTarget(sampleDataset, { ...base, targets: base.targets.slice(0, 1) }, 'cooking')
    expect(result.session.targets).toHaveLength(2)
    expect(result.session.targets[0]).toEqual(base.targets[0])
    expect(result.activeIndex).toBe(1)
  })

  it('can add the opposite life skill without replacing the existing target', () => {
    const result = addDefaultTarget(sampleDataset, { ...base, targets: base.targets.slice(0, 1) }, 'alchemy')
    expect(result.session.targets).toHaveLength(2)
    expect(result.session.targets[0]).toEqual(base.targets[0])
    const added = result.session.targets[result.activeIndex]
    expect(sampleDataset.recipes[added.recipeId]?.skill).toBe('alchemy')
  })

  it('keeps the same logical active sibling when removing an earlier target', () => {
    const result = removeTargetAndSelect(base, 0, 2)
    expect(result.session.targets.map((target) => target.amount)).toEqual([3, 4])
    expect(result.activeIndex).toBe(1)
    expect(result.session.targets[result.activeIndex]?.amount).toBe(4)
  })

  it('selects the nearest remaining sibling when the active target is removed', () => {
    const result = removeTargetAndSelect(base, 1, 1)
    expect(result.session.targets.map((target) => target.amount)).toEqual([2, 4])
    expect(result.activeIndex).toBe(1)
  })

  it('refuses to manufacture an empty planner session from the UI remove action', () => {
    const single = { ...base, targets: base.targets.slice(0, 1) }
    const result = removeTargetAndSelect(single, 0, 0)
    expect(result.session).toBe(single)
    expect(result.activeIndex).toBe(0)
  })
})
