import crypto from 'node:crypto'

export const SUBSTITUTION_BINDING_POLICY = Object.freeze({
  version: 5,
  policy: 'reviewed-route-semantics-evidence',
  reviewedGroups: Object.freeze({
    'codex:3008': Object.freeze({
      semantics: 'generic-arrow-mushroom-worth',
      reviewedAt: '2026-09-26',
      sourceEvidence: Object.freeze([
        Object.freeze({ role: 'current-substitution-semantics-and-route', url: 'https://www.blackdesertfoundry.com/alchemy-guide/', sourceUpdatedAt: '2026-01-30', observedAt: '2026-09-26' }),
        Object.freeze({ role: 'current-group-membership-worth', url: 'https://bdocodex.com/kr/materialgroup/3008/', observedAt: '2026-09-26' }),
      ]),
      expectedMemberWorthByItemId: Object.freeze({ '5408': 1, '5427': 6, '5451': 36, '5471': 216 }),
      planningValueByItemId: Object.freeze({ '5408': 1, '5427': 3, '5451': 18, '5471': 108 }),
      requiredBaseWorthBySourceRecipeId: Object.freeze({ '14': 5 }),
      sourceRecipeIds: Object.freeze([14]),
    }),
    'codex:805': Object.freeze({
      semantics: 'generic-blood-type-1-worth',
      reviewedAt: '2026-09-26',
      sourceEvidence: Object.freeze([
        Object.freeze({ role: 'current-substitution-semantics-and-route', url: 'https://www.blackdesertfoundry.com/alchemy-guide/', sourceUpdatedAt: '2026-01-30', observedAt: '2026-09-26' }),
        Object.freeze({ role: 'current-group-membership-worth', url: 'https://bdocodex.com/kr/materialgroup/805/', observedAt: '2026-09-26' }),
      ]),
      expectedMemberWorthByItemId: Object.freeze({ '6204': 1, '6214': 1, '6216': 2, '6218': 2 }),
      planningValueByItemId: Object.freeze({ '6204': 1, '6214': 1, '6216': 1, '6218': 1 }),
      requiredBaseWorthBySourceRecipeId: Object.freeze({ '54': 2 }),
      sourceRecipeIds: Object.freeze([54]),
    }),
    'codex:6009': Object.freeze({
      semantics: 'generic-vegetable-worth',
      reviewedAt: '2026-09-26',
      sourceEvidence: Object.freeze([
        Object.freeze({ role: 'current-substitution-semantics', url: 'https://www.blackdesertfoundry.com/cooking-guide/', sourceUpdatedAt: '2026-01-30', observedAt: '2026-09-26' }),
        Object.freeze({ role: 'independent-route-rendering-reference', url: 'https://www.blackdesertfoundry.com/all-recipes/', sourceUpdatedAt: '2021-02-28', observedAt: '2026-09-26' }),
        Object.freeze({ role: 'current-group-membership-worth', url: 'https://bdocodex.com/kr/materialgroup/6009/', observedAt: '2026-09-26' }),
      ]),
      expectedMemberWorthByItemId: Object.freeze({
        '7306': 1, '7309': 1, '7311': 1, '7312': 1, '7318': 1,
        '7328': 6, '7331': 6, '7333': 6, '7334': 6,
        '7340': 36, '7343': 36, '7345': 36, '7346': 36,
      }),
      planningValueByItemId: Object.freeze({
        '7306': 1, '7309': 1, '7311': 1, '7312': 1, '7318': 1,
        '7328': 6, '7331': 6, '7333': 6, '7334': 6,
        '7340': 36, '7343': 36, '7345': 36, '7346': 36,
      }),
      requiredBaseWorthBySourceRecipeId: Object.freeze({ '112': 8 }),
      sourceRecipeIds: Object.freeze([112]),
    }),
  }),
})

export const SUBSTITUTION_BINDING_POLICY_SHA256 = crypto.createHash('sha256').update(JSON.stringify(SUBSTITUTION_BINDING_POLICY)).digest('hex')

export const REVIEWED_GENERIC_ROUTE_BINDINGS = new Set(Object.entries(SUBSTITUTION_BINDING_POLICY.reviewedGroups).flatMap(([groupId, group]) => group.sourceRecipeIds.map((sourceRecipeId) => `${sourceRecipeId}|${groupId}`)))
