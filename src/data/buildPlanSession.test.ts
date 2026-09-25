import { describe, expect, it } from 'vitest'
import { sampleDataset } from './sample'
import { buildPlanFromSession } from './buildPlanSession'
import type { PlanSessionState } from './planSession'

function baseSession(): PlanSessionState {
  return {
    version: 1,
    targets: [{ recipeId: 'sample-cooking', variantId: 'default', mode: 'durability', amount: 10, cookingPreparationPolicy: 'maximum' }],
    craftIntermediateItemIds: [],
    intermediateRecipeIdByItemId: {},
    variantIdByRecipeId: {},
    selectedSubstitutionItemIdByGroupId: {},
  }
}

describe('buildPlanFromSession', () => {
  it('turns Cooking durability into mastery-aware material servings before planning', () => {
    const result = buildPlanFromSession(sampleDataset, baseSession(), {}, { cookingMastery: 2000 })
    expect(result.errors).toEqual([])
    expect(result.plan?.crafts[0]?.attempts).toBe(100)
    expect(result.plan?.materials[0]?.required).toBe(500)
  })

  it('fails closed when mastery or durable references are invalid', () => {
    expect(buildPlanFromSession(sampleDataset, baseSession(), {}, {}).errors.join('\n')).toMatch(/Cooking mastery is required/)
    const stale = baseSession()
    stale.targets[0].recipeId = 'removed'
    const result = buildPlanFromSession(sampleDataset, stale, {}, { cookingMastery: 2000 })
    expect(result.plan).toBeUndefined()
    expect(result.errors.join('\n')).toMatch(/unknown target recipe/)
  })

  it('keeps unknown server-yield warnings on the multi-target/session path', () => {
    const dataset = structuredClone(sampleDataset)
    dataset.recipes['sample-cooking'].yield!.provenance = 'unknown-server-yield'
    const session = baseSession()
    session.targets = [{ recipeId: 'sample-cooking', variantId: 'default', mode: 'output', amount: 20 }]
    const result = buildPlanFromSession(dataset, session, {}, {})
    expect(result.errors).toEqual([])
    expect(result.plan?.warnings.join(' ')).toMatch(/보수적 준비량/)
    expect(result.plan?.warnings.join(' ')).toMatch(/예상 산출량을 뜻하지 않습니다/)
  })
})
