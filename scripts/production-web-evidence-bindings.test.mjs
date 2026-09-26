import { SUBSTITUTION_BINDING_POLICY, SUBSTITUTION_BINDING_POLICY_SHA256 } from './substitution-binding-policy.mjs'
import { describe, expect, it } from 'vitest'
import { assertProductionWebEvidenceBindings } from './production-web-evidence-bindings.mjs'

function exactDataset() {
  const substitutionGroups = {}
  const recipes = {}
  let recipeIndex = 0
  for (const [groupId, reviewed] of Object.entries(SUBSTITUTION_BINDING_POLICY.reviewedGroups)) {
    substitutionGroups[groupId] = {
      id: groupId,
      memberItemIds: Object.keys(reviewed.expectedMemberWorthByItemId).map(Number),
      memberValueByItemId: { ...reviewed.expectedMemberWorthByItemId },
      planningValueByItemId: { ...reviewed.planningValueByItemId },
    }
    for (const [slotKey, requiredBaseWorth] of Object.entries(reviewed.requiredBaseWorthByRouteSlot ?? {})) {
      const [sourceRecipeId, itemId] = slotKey.split('|').map(Number)
      recipes[`r${recipeIndex}`] = {
        id: `r${recipeIndex}`,
        variants: [{ id: `v${recipeIndex}`, sourceRecipeId, inputs: [{ itemId, count: 1, substitutionGroupId: groupId, requiredBaseWorth }] }],
      }
      recipeIndex += 1
    }
  }
  return {
    metadata: {
      koreanNameEvidence: { sha256: 'a'.repeat(64) },
      substitutionEvidenceApplied: true,
      substitutionEvidenceSha256: 'b'.repeat(64),
      substitutionBindingPolicy: SUBSTITUTION_BINDING_POLICY,
      substitutionBindingPolicySha256: SUBSTITUTION_BINDING_POLICY_SHA256,
    },
    substitutionGroups,
    recipes,
  }
}

describe('production web evidence release bindings', () => {
  it('accepts exact byte, policy, applied group semantics, and route-slot bindings', () => {
    expect(assertProductionWebEvidenceBindings(exactDataset())).toEqual({
      koreanNameEvidenceSha256: 'a'.repeat(64),
      substitutionEvidenceSha256: 'b'.repeat(64),
      substitutionBindingPolicySha256: SUBSTITUTION_BINDING_POLICY_SHA256,
    })
  })
  it('fails closed when either exact byte binding is absent', () => {
    const missingName = exactDataset(); delete missingName.metadata.koreanNameEvidence
    expect(() => assertProductionWebEvidenceBindings(missingName)).toThrow(/Korean-name evidence SHA-256/)
    const missingSub = exactDataset(); delete missingSub.metadata.substitutionEvidenceSha256
    expect(() => assertProductionWebEvidenceBindings(missingSub)).toThrow(/substitution evidence SHA-256/)
  })
  it('fails closed when the embedded reviewed policy does not match its fingerprint', () => {
    const dataset = exactDataset()
    dataset.metadata.substitutionBindingPolicy = { ...SUBSTITUTION_BINDING_POLICY, version: 999 }
    expect(() => assertProductionWebEvidenceBindings(dataset)).toThrow(/embedded reviewed substitution binding policy/)
  })
  it('fails closed on missing or stale reviewed substitution policy fingerprint', () => {
    const missing = exactDataset(); delete missing.metadata.substitutionBindingPolicySha256
    expect(() => assertProductionWebEvidenceBindings(missing)).toThrow(/reviewed substitution binding policy SHA-256/)
    const stale = exactDataset(); stale.metadata.substitutionBindingPolicySha256 = 'c'.repeat(64)
    expect(() => assertProductionWebEvidenceBindings(stale)).toThrow(/reviewed substitution binding policy SHA-256/)
  })
  it('fails closed when applied planning semantics drift after evidence application', () => {
    const dataset = exactDataset()
    dataset.substitutionGroups['codex:3008'].planningValueByItemId['5427'] = 6
    expect(() => assertProductionWebEvidenceBindings(dataset)).toThrow(/applied planning Worth map/)
  })
  it('fails closed when a reviewed route-slot is missing, duplicated, or has stale base Worth', () => {
    const missing = exactDataset()
    const recipe = Object.values(missing.recipes).find((entry) => entry.variants[0].sourceRecipeId === 14)
    delete recipe.variants[0].inputs[0].substitutionGroupId
    expect(() => assertProductionWebEvidenceBindings(missing)).toThrow(/incomplete or duplicated/)

    const stale = exactDataset()
    const staleRecipe = Object.values(stale.recipes).find((entry) => entry.variants[0].sourceRecipeId === 54)
    staleRecipe.variants[0].inputs[0].requiredBaseWorth = 1
    expect(() => assertProductionWebEvidenceBindings(stale)).toThrow(/requiredBaseWorth/)

    const extra = exactDataset()
    extra.recipes.extra = { id: 'extra', variants: [{ id: 'vx', sourceRecipeId: 999, inputs: [{ itemId: 5408, count: 1, substitutionGroupId: 'codex:3008', requiredBaseWorth: 1 }] }] }
    expect(() => assertProductionWebEvidenceBindings(extra)).toThrow(/unreviewed Codex substitution binding/)
  })
})
