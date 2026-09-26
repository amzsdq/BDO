import crypto from 'node:crypto'
import { SUBSTITUTION_BINDING_POLICY, SUBSTITUTION_BINDING_POLICY_SHA256 } from './substitution-binding-policy.mjs'

export function assertProductionWebEvidenceBindings(dataset) {
  const metadata = dataset?.metadata || {}
  const nameSha = String(metadata.koreanNameEvidence?.sha256 || '')
  const substitutionSha = String(metadata.substitutionEvidenceSha256 || '')
  const policySha = String(metadata.substitutionBindingPolicySha256 || '')
  if (!/^[0-9a-f]{64}$/.test(nameSha)) throw new Error('exact Korean-name evidence SHA-256 binding is required')
  if (metadata.substitutionEvidenceApplied !== true) throw new Error('production substitution evidence must be applied')
  if (!/^[0-9a-f]{64}$/.test(substitutionSha)) throw new Error('exact substitution evidence SHA-256 binding is required')
  if (policySha !== SUBSTITUTION_BINDING_POLICY_SHA256) throw new Error('exact reviewed substitution binding policy SHA-256 is required')
  const embeddedPolicySha = crypto.createHash('sha256').update(JSON.stringify(metadata.substitutionBindingPolicy ?? null)).digest('hex')
  if (embeddedPolicySha !== SUBSTITUTION_BINDING_POLICY_SHA256) throw new Error('embedded reviewed substitution binding policy must match its exact SHA-256')

  const expectedSlots = new Map()
  for (const [groupId, reviewed] of Object.entries(SUBSTITUTION_BINDING_POLICY.reviewedGroups)) {
    const actual = dataset?.substitutionGroups?.[groupId]
    if (!actual) throw new Error(`reviewed substitution group ${groupId} is missing from dataset`)
    const sorted = (value) => Object.fromEntries(Object.entries(value ?? {}).sort(([a], [b]) => Number(a) - Number(b)))
    if (JSON.stringify(sorted(actual.memberValueByItemId)) !== JSON.stringify(sorted(reviewed.expectedMemberWorthByItemId))) {
      throw new Error(`${groupId}: applied source Worth map does not match reviewed policy`)
    }
    if (JSON.stringify(sorted(actual.planningValueByItemId)) !== JSON.stringify(sorted(reviewed.planningValueByItemId))) {
      throw new Error(`${groupId}: applied planning Worth map does not match reviewed policy`)
    }
    for (const [slotKey, requiredBaseWorth] of Object.entries(reviewed.requiredBaseWorthByRouteSlot ?? {})) {
      expectedSlots.set(`${groupId}|${slotKey}`, { groupId, slotKey, requiredBaseWorth, seen: 0 })
    }
  }

  for (const recipe of Object.values(dataset?.recipes ?? {})) for (const variant of recipe?.variants ?? []) for (const input of variant?.inputs ?? []) {
    const groupId = String(input?.substitutionGroupId ?? '')
    if (!groupId.startsWith('codex:')) continue
    const slotKey = `${Number(variant?.sourceRecipeId)}|${Number(input?.itemId)}`
    const expected = expectedSlots.get(`${groupId}|${slotKey}`)
    if (!expected) throw new Error(`${recipe?.id ?? '<recipe>'}/${variant?.id ?? '<variant>'}: unreviewed Codex substitution binding ${groupId}|${slotKey}`)
    if (Number(input.requiredBaseWorth) !== Number(expected.requiredBaseWorth)) {
      throw new Error(`${groupId}|${slotKey}: requiredBaseWorth does not match reviewed policy`)
    }
    expected.seen += 1
  }
  const missing = [...expectedSlots.values()].filter((slot) => slot.seen !== 1)
  if (missing.length) throw new Error(`reviewed substitution route-slot bindings are incomplete or duplicated: ${missing.map((slot) => `${slot.groupId}|${slot.slotKey}=${slot.seen}`).join(', ')}`)
  return { koreanNameEvidenceSha256: nameSha, substitutionEvidenceSha256: substitutionSha, substitutionBindingPolicySha256: policySha }
}
