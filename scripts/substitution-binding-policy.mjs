import crypto from 'node:crypto'

export const SUBSTITUTION_BINDING_POLICY = Object.freeze({
  version: 2,
  policy: 'reviewed-route-base-worth-only',
  reviewedRouteBindings: Object.freeze([
    '112|codex:6009', '113|codex:6009', '123|codex:6009', '125|codex:6009', '127|codex:6009',
    '136|codex:6009', '144|codex:6009', '154|codex:6009', '159|codex:6009', '168|codex:6009',
    '195|codex:6009', '477|codex:6009', '478|codex:6009', '491|codex:6009', '510|codex:6009',
    '513|codex:6009', '570|codex:6009', '586|codex:6009', '606|codex:6009',
  ].sort()),
})

export const SUBSTITUTION_BINDING_POLICY_SHA256 = crypto
  .createHash('sha256')
  .update(JSON.stringify(SUBSTITUTION_BINDING_POLICY))
  .digest('hex')

export const REVIEWED_GENERIC_ROUTE_BINDINGS = new Set(SUBSTITUTION_BINDING_POLICY.reviewedRouteBindings)
