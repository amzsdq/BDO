import { describe, expect, it } from 'vitest'
import { planOptionsFromSession } from './planSessionOptions'
import type { PlanSessionState } from './planSession'

describe('plan session -> planner options', () => {
  it('carries recursive, variant, inventory, and substitution choices without loss', () => {
    const session: PlanSessionState = {
      version: 1,
      targets: [],
      craftIntermediateItemIds: [20],
      intermediateRecipeIdByItemId: { '20': 'r20' },
      variantIdByRecipeId: { r20: 'v2' },
      selectedSubstitutionItemIdByGroupId: { 'codex:6502': 21 },
    }
    const options = planOptionsFromSession(session, { '21': 7 })
    expect([...options.craftIntermediateItemIds]).toEqual([20])
    expect(options.intermediateRecipeIdByItemId).toEqual({ '20': 'r20' })
    expect(options.variantIdByRecipeId).toEqual({ r20: 'v2' })
    expect(options.selectedSubstitutionItemIdByGroupId).toEqual({ 'codex:6502': 21 })
    expect(options.haveByItemId).toEqual({ '21': 7 })
  })
})
