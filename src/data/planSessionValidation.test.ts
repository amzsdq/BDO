import { describe, expect, it } from 'vitest'
import { sampleDataset } from './sample'
import type { PlanSessionState } from './planSession'
import { validatePlanSessionAgainstDataset } from './planSessionValidation'

function session(targetRecipeId = 'sample-cooking'): PlanSessionState {
  return { version: 1, targets: [{ recipeId: targetRecipeId, variantId: 'default', mode: 'servings', amount: 10 }], craftIntermediateItemIds: [], intermediateRecipeIdByItemId: {}, variantIdByRecipeId: {}, selectedSubstitutionItemIdByGroupId: {} }
}

describe('plan session dataset validation', () => {
  it('accepts a session whose recipe and variant still exist', () => {
    expect(validatePlanSessionAgainstDataset(sampleDataset, session())).toEqual({ valid: true, errors: [] })
  })

  it('reports stale target recipes instead of silently changing the plan', () => {
    const result = validatePlanSessionAgainstDataset(sampleDataset, session('removed-recipe'))
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('unknown target recipe')
  })

  it('rejects Cooking-only preparation policy on an Alchemy recipe', () => {
    const dataset = structuredClone(sampleDataset)
    dataset.recipes['sample-cooking'].skill = 'alchemy'
    const value = session()
    value.targets[0].mode = 'durability'
    value.targets[0].cookingPreparationPolicy = 'safe95'
    const result = validatePlanSessionAgainstDataset(dataset, value)
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('non-Cooking')
  })

  it('validates persisted substitution choices against source-backed group membership', () => {
    const dataset = structuredClone(sampleDataset)
    dataset.items['900003'] = { id: 900003, nameKo: '샘플 대체재' }
    dataset.substitutionGroups = {
      'codex:6502': { id: 'codex:6502', memberItemIds: [900002, 900003], source: { provider: 'BDO Codex KR', sourceId: '6502', verifiedAt: '2026-09-23' } },
    }
    const value = session()
    value.selectedSubstitutionItemIdByGroupId['codex:6502'] = 900003
    expect(validatePlanSessionAgainstDataset(dataset, value).valid).toBe(true)
    value.selectedSubstitutionItemIdByGroupId['codex:6502'] = 999999
    expect(validatePlanSessionAgainstDataset(dataset, value).errors[0]).toContain('not a member')
  })
})
