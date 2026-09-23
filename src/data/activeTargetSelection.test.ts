import { describe, expect, it } from 'vitest'
import type { RecipeDataset } from '../domain/types'
import { sampleDataset } from './sample'
import type { PlanSessionState } from './planSession'
import { addDefaultTarget, removeTargetAndSelect, switchTargetSkill } from './activeTargetSelection'

const mixedDataset: RecipeDataset = {
  ...sampleDataset,
  items: {
    ...sampleDataset.items,
    '900003': { id: 900003, nameKo: '샘플 연금' },
  },
  recipes: {
    ...sampleDataset.recipes,
    'sample-alchemy': {
      id: 'sample-alchemy',
      skill: 'alchemy',
      outputItemId: 900003,
      yield: { min: 1, max: 1 },
      variants: [{ id: 'default', inputs: [{ itemId: 900002, count: 2 }] }],
    },
  },
  recipesByOutput: {
    ...sampleDataset.recipesByOutput,
    '900003': ['sample-alchemy'],
  },
}

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
    const result = addDefaultTarget(mixedDataset, { ...base, targets: base.targets.slice(0, 1) }, 'alchemy')
    expect(result.session.targets).toHaveLength(2)
    expect(result.session.targets[0]).toEqual(base.targets[0])
    const added = result.session.targets[result.activeIndex]
    expect(mixedDataset.recipes[added.recipeId]?.skill).toBe('alchemy')
  })

  it('switches only the active target skill while preserving siblings and amount', () => {
    const session = { ...base, targets: base.targets.slice(0, 2) }
    const sibling = session.targets[0]
    const result = switchTargetSkill(mixedDataset, session, 1, 'alchemy')
    expect(result.activeIndex).toBe(1)
    expect(result.session.targets[0]).toEqual(sibling)
    expect(result.session.targets[1].amount).toBe(3)
    expect(mixedDataset.recipes[result.session.targets[1].recipeId]?.skill).toBe('alchemy')
    expect(result.session.targets[1].cookingPreparationPolicy).toBeUndefined()
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
