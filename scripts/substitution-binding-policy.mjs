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
      requiredBaseWorthByRouteSlot: Object.freeze({ '14|5408': 5 }),
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
      requiredBaseWorthByRouteSlot: Object.freeze({ '54|6214': 2 }),
      sourceRecipeIds: Object.freeze([54]),
    }),
    'codex:6001': Object.freeze({
      semantics: 'generic-grain-worth', reviewedAt: '2026-09-26',
      sourceEvidence: Object.freeze([
        Object.freeze({ role: 'current-substitution-semantics-and-route', url: 'https://www.blackdesertfoundry.com/cooking-guide/', sourceUpdatedAt: '2026-01-30', observedAt: '2026-09-26' }),
        Object.freeze({ role: 'current-group-membership-worth', url: 'https://bdocodex.com/kr/materialgroup/6001/', observedAt: '2026-09-26' }),
      ]),
      expectedMemberWorthByItemId: Object.freeze({ '7001': 1, '7002': 2, '7003': 2, '7004': 2, '7005': 2, '7006': 6, '7007': 6, '7008': 6, '7009': 6, '7010': 6, '7011': 36, '7012': 36, '7013': 36, '7014': 36, '7015': 36 }),
      planningValueByItemId: Object.freeze({ '7001': 1, '7002': 1, '7003': 1, '7004': 1, '7005': 1, '7006': 3, '7007': 3, '7008': 3, '7009': 3, '7010': 3, '7011': 18, '7012': 18, '7013': 18, '7014': 18, '7015': 18 }),
      requiredBaseWorthByRouteSlot: Object.freeze({ '110|7005': 1, '549|7001': 1 }), sourceRecipeIds: Object.freeze([110, 549]),
    }),
    'codex:6002': Object.freeze({
      semantics: 'generic-flour-worth', reviewedAt: '2026-09-26',
      sourceEvidence: Object.freeze([
        Object.freeze({ role: 'current-substitution-semantics-and-route', url: 'https://www.blackdesertfoundry.com/cooking-guide/', sourceUpdatedAt: '2026-01-30', observedAt: '2026-09-26' }),
        Object.freeze({ role: 'current-group-membership-worth', url: 'https://bdocodex.com/kr/materialgroup/6002/', observedAt: '2026-09-26' }),
      ]),
      expectedMemberWorthByItemId: Object.freeze({ '7101': 1, '7102': 2, '7103': 2, '7104': 2, '7105': 2 }),
      planningValueByItemId: Object.freeze({ '7101': 1, '7102': 1, '7103': 1, '7104': 1, '7105': 1 }),
      requiredBaseWorthByRouteSlot: Object.freeze({ '109|7105': 1, '548|7101': 1 }), sourceRecipeIds: Object.freeze([109, 548]),
    }),
    'codex:6003': Object.freeze({
      semantics: 'generic-dough-worth', reviewedAt: '2026-09-26',
      sourceEvidence: Object.freeze([
        Object.freeze({ role: 'current-substitution-semantics-and-route', url: 'https://www.blackdesertfoundry.com/cooking-guide/', sourceUpdatedAt: '2026-01-30', observedAt: '2026-09-26' }),
        Object.freeze({ role: 'current-group-membership-worth', url: 'https://bdocodex.com/kr/materialgroup/6003/', observedAt: '2026-09-26' }),
      ]),
      expectedMemberWorthByItemId: Object.freeze({ '7201': 1, '7202': 4, '7203': 4, '7204': 4, '7205': 4 }),
      planningValueByItemId: Object.freeze({ '7201': 1, '7202': 2, '7203': 2, '7204': 2, '7205': 2 }),
      requiredBaseWorthByRouteSlot: Object.freeze({ '129|7205': 6 }), sourceRecipeIds: Object.freeze([129]),
    }),
    'codex:6004': Object.freeze({
      semantics: 'generic-pepper-worth', reviewedAt: '2026-09-26',
      sourceEvidence: Object.freeze([
        Object.freeze({ role: 'current-substitution-semantics-and-route', url: 'https://www.blackdesertfoundry.com/cooking-guide/', sourceUpdatedAt: '2026-01-30', observedAt: '2026-09-26' }),
        Object.freeze({ role: 'current-group-membership-worth', url: 'https://bdocodex.com/kr/materialgroup/6004/', observedAt: '2026-09-26' }),
      ]),
      expectedMemberWorthByItemId: Object.freeze({ '7301': 1, '7323': 6, '7335': 36 }),
      planningValueByItemId: Object.freeze({ '7301': 1, '7323': 3, '7335': 18 }),
      requiredBaseWorthByRouteSlot: Object.freeze({ '166|7301': 2 }), sourceRecipeIds: Object.freeze([166]),
    }),
    'codex:6005': Object.freeze({
      semantics: 'generic-garlic-worth', reviewedAt: '2026-09-26',
      sourceEvidence: Object.freeze([
        Object.freeze({ role: 'current-substitution-semantics', url: 'https://www.blackdesertfoundry.com/cooking-guide/', sourceUpdatedAt: '2026-01-30', observedAt: '2026-09-26' }),
        Object.freeze({ role: 'current-route', url: 'https://bdocodex.com/us/recipe/140/', observedAt: '2026-09-26' }),
        Object.freeze({ role: 'current-group-membership-worth', url: 'https://bdocodex.com/kr/materialgroup/6005/', observedAt: '2026-09-26' }),
      ]),
      expectedMemberWorthByItemId: Object.freeze({ '7302': 1, '7324': 6, '7336': 36 }),
      planningValueByItemId: Object.freeze({ '7302': 1, '7324': 3, '7336': 18 }),
      requiredBaseWorthByRouteSlot: Object.freeze({ '140|7302': 2 }), sourceRecipeIds: Object.freeze([140]),
    }),
    'codex:6006': Object.freeze({
      semantics: 'generic-onion-worth', reviewedAt: '2026-09-26',
      sourceEvidence: Object.freeze([
        Object.freeze({ role: 'current-substitution-semantics-and-route', url: 'https://www.blackdesertfoundry.com/cooking-guide/', sourceUpdatedAt: '2026-01-30', observedAt: '2026-09-26' }),
        Object.freeze({ role: 'current-group-membership-worth', url: 'https://bdocodex.com/kr/materialgroup/6006/', observedAt: '2026-09-26' }),
      ]),
      expectedMemberWorthByItemId: Object.freeze({ '7303': 1, '7325': 6, '7337': 36 }),
      planningValueByItemId: Object.freeze({ '7303': 1, '7325': 3, '7337': 18 }),
      requiredBaseWorthByRouteSlot: Object.freeze({ '166|7303': 1 }), sourceRecipeIds: Object.freeze([166]),
    }),
    'codex:6007': Object.freeze({
      semantics: 'generic-fruit-worth', reviewedAt: '2026-09-26',
      sourceEvidence: Object.freeze([
        Object.freeze({ role: 'current-substitution-semantics-and-route', url: 'https://www.blackdesertfoundry.com/cooking-guide/', sourceUpdatedAt: '2026-01-30', observedAt: '2026-09-26' }),
        Object.freeze({ role: 'current-group-membership-worth', url: 'https://bdocodex.com/kr/materialgroup/6007/', observedAt: '2026-09-26' }),
      ]),
      expectedMemberWorthByItemId: Object.freeze({ '7304': 2, '7307': 2, '7313': 1, '7314': 2, '7315': 2, '7316': 2, '7317': 2, '7321': 12, '7322': 72, '7329': 12, '7341': 72 }),
      planningValueByItemId: Object.freeze({ '7304': 1, '7307': 1, '7313': 1, '7314': 1, '7315': 1, '7316': 1, '7317': 1, '7321': 6, '7322': 36, '7329': 6, '7341': 36 }),
      requiredBaseWorthByRouteSlot: Object.freeze({ '109|7313': 1, '110|7313': 1, '548|7313': 1, '549|7313': 1 }), sourceRecipeIds: Object.freeze([109, 110, 548, 549]),
    }),
    'codex:6008': Object.freeze({
      semantics: 'generic-hot-pepper-worth', reviewedAt: '2026-09-26',
      sourceEvidence: Object.freeze([
        Object.freeze({ role: 'current-substitution-semantics', url: 'https://www.blackdesertfoundry.com/cooking-guide/', sourceUpdatedAt: '2026-01-30', observedAt: '2026-09-26' }),
        Object.freeze({ role: 'current-route', url: 'https://bdocodex.com/kr/recipe/123/', observedAt: '2026-09-26' }),
        Object.freeze({ role: 'current-calculator-corroboration', url: 'https://bdolytics.com/gl-en/cooking/9241', observedAt: '2026-09-26' }),
        Object.freeze({ role: 'current-group-membership-worth', url: 'https://bdocodex.com/kr/materialgroup/6008/', observedAt: '2026-09-26' }),
      ]),
      expectedMemberWorthByItemId: Object.freeze({ '7305': 1, '7327': 6, '7339': 36 }),
      planningValueByItemId: Object.freeze({ '7305': 1, '7327': 3, '7339': 18 }),
      requiredBaseWorthByRouteSlot: Object.freeze({ '123|7305': 2 }), sourceRecipeIds: Object.freeze([123]),
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
      requiredBaseWorthByRouteSlot: Object.freeze({ '112|7318': 8 }),
      sourceRecipeIds: Object.freeze([112]),
    }),
  }),
})

export const SUBSTITUTION_BINDING_POLICY_SHA256 = crypto.createHash('sha256').update(JSON.stringify(SUBSTITUTION_BINDING_POLICY)).digest('hex')

export const REVIEWED_GENERIC_ROUTE_BINDINGS = new Set(Object.entries(SUBSTITUTION_BINDING_POLICY.reviewedGroups).flatMap(([groupId, group]) => group.sourceRecipeIds.map((sourceRecipeId) => `${sourceRecipeId}|${groupId}`)))
