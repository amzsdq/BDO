import type { RecipeDataset } from '../domain/types'
import type { PlanSessionState } from './planSession'
import { restorePlanSession } from './restorePlanSession'
import { singleTargetRestoredState, type SingleTargetRestoredState } from './singleTargetRestore'

export type PrimaryPlanHydration =
  | { status: 'restored'; state: SingleTargetRestoredState }
  | { status: 'restored-empty'; session: PlanSessionState }
  | { status: 'first-run' }
  | { status: 'recovery-required'; reason: 'invalid-storage' | 'unsupported-version' | 'invalid-reference'; errors: string[] }

export function hydratePrimaryPlan(dataset: RecipeDataset, storage: Pick<Storage, 'getItem'> = localStorage): PrimaryPlanHydration {
  const restored = restorePlanSession(dataset, storage)
  if (!restored.restored) {
    if (restored.reason === 'empty') return { status: 'first-run' }
    return { status: 'recovery-required', reason: restored.reason, errors: restored.errors }
  }
  const state = singleTargetRestoredState(restored.session)
  if (!state) return { status: 'restored-empty', session: restored.session }
  return { status: 'restored', state }
}
