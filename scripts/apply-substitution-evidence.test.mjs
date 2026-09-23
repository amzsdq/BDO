import test from 'node:test'
import assert from 'node:assert/strict'
import { applySubstitutionEvidence } from './apply-substitution-evidence.mjs'

const dataset = {
  items: { '1': { id: 1, nameKo: '기본' }, '2': { id: 2, nameKo: '고급' } },
  recipes: {}, recipesByOutput: {}, metadata: { sources: ['client'] },
}
const evidence = {
  source: 'BDO Codex KR',
  collectedAt: '2026-09-23T00:00:00.000Z',
  groups: [{ id: 'codex:3001', sourceId: '3001', sourceUrl: 'https://bdocodex.com/kr/materialgroup/3001/', members: [{ itemId: 1, value: 1 }, { itemId: 2, value: 6 }] }],
}

test('installs source-backed membership and Worth atomically', () => {
  const result = applySubstitutionEvidence(dataset, evidence)
  assert.deepEqual(result.substitutionGroups['codex:3001'].memberItemIds, [1, 2])
  assert.deepEqual(result.substitutionGroups['codex:3001'].memberValueByItemId, { '1': 1, '2': 6 })
  assert.equal(result.substitutionGroups['codex:3001'].source.sourceUrl, evidence.groups[0].sourceUrl)
  assert.equal(dataset.substitutionGroups, undefined)
})

test('rejects partial or non-positive Worth evidence instead of silently degrading', () => {
  assert.throws(() => applySubstitutionEvidence(dataset, { ...evidence, groups: [{ ...evidence.groups[0], members: [{ itemId: 1, value: 0 }, { itemId: 2, value: 6 }] }] }), /invalid Worth/)
})

test('rejects evidence members absent from the canonical item dataset', () => {
  assert.throws(() => applySubstitutionEvidence(dataset, { ...evidence, groups: [{ ...evidence.groups[0], members: [{ itemId: 1, value: 1 }, { itemId: 99, value: 6 }] }] }), /unknown\/invalid member/)
})

test('rejects non-Codex material-group URLs', () => {
  assert.throws(() => applySubstitutionEvidence(dataset, { ...evidence, groups: [{ ...evidence.groups[0], sourceUrl: 'https://example.com/group/3001' }] }), /unsupported evidence URL/)
})
