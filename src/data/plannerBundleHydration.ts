import type { RecipeDataset } from '../domain/types'
import { readPlanSessionResult, type PlanSessionState } from './planSession'
import { validatePlanSessionAgainstDataset } from './planSessionValidation'
import { readCharacterProfileResult, readChecklistResult, readInventoryResult, type CharacterProfileState, type ChecklistState, type InventoryState } from './storage'

export type PlannerBundleHydration =
  | { status: 'ready'; source: 'first-run' | 'restored' | 'restored-empty'; session: PlanSessionState; checklist: ChecklistState; inventory: InventoryState; characterProfile: CharacterProfileState }
  | { status: 'recovery-required'; components: string[]; errors: string[] }

export function hydratePlannerBundle(
  dataset: RecipeDataset,
  storage: Pick<Storage, 'getItem'> = localStorage,
): PlannerBundleHydration {
  const checklist = readChecklistResult(storage)
  const inventory = readInventoryResult(storage)
  const characterProfile = readCharacterProfileResult(storage)
  const planSession = readPlanSessionResult(storage)
  const components: string[] = []
  const errors: string[] = []

  if (checklist.status === 'invalid-storage') components.push('checklist')
  if (inventory.status === 'invalid-storage') components.push('inventory')
  if (characterProfile.status === 'invalid-storage') components.push('character-profile')
  if (planSession.status === 'invalid-storage') components.push('plan-session')
  if (planSession.status === 'unsupported-version') {
    components.push('plan-session')
    errors.push(`지원하지 않는 저장 계획 버전입니다: ${planSession.persistedVersion}`)
  }

  if (planSession.status === 'valid') {
    const validation = validatePlanSessionAgainstDataset(dataset, planSession.session)
    if (!validation.valid) {
      components.push('plan-session')
      errors.push(...validation.errors)
    }
  }

  if (components.length) {
    if (components.some((component) => component !== 'plan-session')) errors.unshift('저장된 상태 일부를 안전하게 읽을 수 없습니다. 자동으로 덮어쓰지 않습니다.')
    return { status: 'recovery-required', components: [...new Set(components)], errors }
  }

  const source = planSession.status === 'empty' ? 'first-run' : planSession.session.targets.length ? 'restored' : 'restored-empty'
  return {
    status: 'ready',
    source,
    session: planSession.session,
    checklist: checklist.value,
    inventory: inventory.value,
    characterProfile: characterProfile.value,
  }
}
