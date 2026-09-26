import crypto from 'node:crypto'

export const SUBSTITUTION_BINDING_POLICY = Object.freeze({
  version: 4,
  policy: 'reviewed-route-semantics-evidence',
  reviewedGroups: Object.freeze({
    'codex:6009': Object.freeze({
      semantics: 'generic-vegetable-worth',
      reviewedAt: '2026-09-26',
      sourceEvidence: Object.freeze([
        Object.freeze({
          role: 'current-substitution-semantics',
          url: 'https://www.blackdesertfoundry.com/cooking-guide/',
          sourceUpdatedAt: '2026-01-30',
          observedAt: '2026-09-26',
        }),
        Object.freeze({
          role: 'current-route-rendering',
          url: 'https://www.blackdesertfoundry.com/all-recipes/',
          observedAt: '2026-09-26',
        }),
        Object.freeze({
          role: 'current-group-membership-worth',
          url: 'https://bdocodex.com/kr/materialgroup/6009/',
          observedAt: '2026-09-26',
        }),
      ]),
      memberWorthPolicy: Object.freeze({
        kind: 'reviewed-source-evidence',
        normal: 1,
        highQuality: 6,
        special: 36,
      }),
      sourceRecipeIds: Object.freeze([112,113,123,125,127,136,144,154,159,168,195,477,478,491,510,513,570,586,606]),
    }),
  }),
})

export const SUBSTITUTION_BINDING_POLICY_SHA256 = crypto.createHash('sha256').update(JSON.stringify(SUBSTITUTION_BINDING_POLICY)).digest('hex')

export const REVIEWED_GENERIC_ROUTE_BINDINGS = new Set(Object.entries(SUBSTITUTION_BINDING_POLICY.reviewedGroups).flatMap(([groupId, group]) => group.sourceRecipeIds.map((sourceRecipeId) => `${sourceRecipeId}|${groupId}`)))
