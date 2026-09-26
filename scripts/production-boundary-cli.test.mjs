import { describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { SUBSTITUTION_BINDING_POLICY, SUBSTITUTION_BINDING_POLICY_SHA256 } from './substitution-binding-policy.mjs'

function unverifiedDatasetFile() {
  const dir = mkdtempSync(join(tmpdir(), 'bdo-production-boundary-'))
  const file = join(dir, 'dataset.json')
  writeFileSync(file, JSON.stringify({
    metadata: { sourceRevision: 'iDevelopThings/bdo-data-extractor@5bf11bd7bc60dcbb6126be34bf3d76633abdd8b2', clientFingerprint: 'sha256:' + 'a'.repeat(64) },
    items: {
      '10': { id: 10, nameKo: '임의 이름' },
    },
  }))
  return file
}

function releasePrecheckedDatasetFileWithoutIcons() {
  const root = mkdtempSync(join(tmpdir(), 'bdo-production-icon-boundary-'))
  const dir = join(root, 'data'); mkdirSync(dir)
  const items = {}, recipes = {}, substitutionGroups = {}
  const routeInputs = new Map()
  for (const [groupId, group] of Object.entries(SUBSTITUTION_BINDING_POLICY.reviewedGroups)) {
    substitutionGroups[groupId] = { memberValueByItemId: group.expectedMemberWorthByItemId, planningValueByItemId: group.planningValueByItemId }
    for (const itemId of Object.keys(group.expectedMemberWorthByItemId)) items[itemId] = { id: Number(itemId), nameKo: `재료 ${itemId}` }
    for (const [slot, requiredBaseWorth] of Object.entries(group.requiredBaseWorthByRouteSlot || {})) {
      const [sourceRecipeId, itemId] = slot.split('|').map(Number)
      if (!routeInputs.has(sourceRecipeId)) routeInputs.set(sourceRecipeId, [])
      routeInputs.get(sourceRecipeId).push({ itemId, count: 1, substitutionGroupId: groupId, requiredBaseWorth })
    }
  }
  for (const [sourceRecipeId, inputs] of routeInputs) {
    const outputItemId = 900000 + sourceRecipeId
    items[outputItemId] = { id: outputItemId, nameKo: `결과 ${sourceRecipeId}` }
    recipes[`route-${sourceRecipeId}`] = { id: `route-${sourceRecipeId}`, skill: 'cooking', outputItemId, variants: [{ id: 'v1', sourceRecipeId, inputs, yield: { min: 1, max: 1, sourceRecipeId }, outputEvidence: { status: 'single-base', sourceUrl: `https://bdocodex.com/kr/recipe/${sourceRecipeId}/` } }] }
  }
  const file = join(dir, 'dataset.json')
  writeFileSync(file, JSON.stringify({
    metadata: {
      sourceRevision: 'iDevelopThings/bdo-data-extractor@5bf11bd7bc60dcbb6126be34bf3d76633abdd8b2',
      clientFingerprint: 'sha256:' + 'a'.repeat(64),
      koreanNamesVerified: true,
      koreanNameEvidence: { provider: 'BDO Codex KR', collectedAt: '2026-09-26T00:00:00Z', count: Object.keys(items).length, sha256: 'b'.repeat(64) },
      yieldEvidenceApplied: true, yieldEvidenceCount: recipes ? Object.keys(recipes).length : 0,
      substitutionEvidenceApplied: true, substitutionEvidenceSha256: 'c'.repeat(64),
      substitutionBindingPolicySha256: SUBSTITUTION_BINDING_POLICY_SHA256,
      substitutionBindingPolicy: SUBSTITUTION_BINDING_POLICY,
    },
    items, recipes, substitutionGroups,
  }))
  return file
}

function run(script, args) {
  return spawnSync(process.execPath, [script, ...args], { cwd: process.cwd(), encoding: 'utf8' })
}

describe('strict production boundary CLIs', () => {
  it('final release rejects unverified Korean names before delegating to legacy gates', () => {
    const dataset = unverifiedDatasetFile()
    const result = run('scripts/assert-production-release.mjs', [dataset, 'missing-reconciliation.json', 'missing-catalog.json', 'missing-details.json', 'missing-mastery-evidence.json', 'missing-mastery.json', 'missing-e2e-release-evidence.json'])
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Korean names are not verified')
  })

  it('standard promotion rejects unverified Korean names before delegating to legacy promotion', () => {
    const dataset = unverifiedDatasetFile()
    const result = run('scripts/promote-production-dataset.mjs', [dataset, 'missing-reconciliation.json', 'missing-catalog.json', 'missing-details.json'])
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Korean names are not verified')
  })


  it('standard promotion rejects missing same-snapshot icon evidence before legacy promotion', () => {
    const dataset = releasePrecheckedDatasetFileWithoutIcons()
    const result = run('scripts/promote-production-dataset.mjs', [dataset, 'missing-reconciliation.json', 'missing-catalog.json', 'missing-details.json'])
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('production icon manifest is required')
  })

  it('rejects extra release arguments instead of silently ignoring them', () => {
    const dataset = unverifiedDatasetFile()
    const result = run('scripts/assert-production-release.mjs', [dataset, 'a', 'b', 'c', 'd', 'e', 'f', 'extra'])
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('usage:')
  })

  it('rejects option-like promotion arguments instead of treating them as paths', () => {
    const dataset = unverifiedDatasetFile()
    const result = run('scripts/promote-production-dataset.mjs', [dataset, 'a', '--catalog', 'details.json'])
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('usage:')
  })
})
