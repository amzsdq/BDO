import type { RecipeDataset } from '../domain/types'
import { restorePlanSession } from './restorePlanSession'
import { singleTargetRestoredState, type SingleTargetRestoredState } from './singleTargetRestore'

export type PrimaryPlanHydration =
  | { status: 'restored'; state: SingleTargetRestoredState }
  | { status: 'first-run' }
  | { status: 'recovery-required'; reason: 'invalid-storage' | 'unsupported-version' | 'invalid-reference'; errors: string[] }

/**
 * Resolve persisted primary-planner state only after the runtime dataset is known.
 * Recovery-required states are deliberately distinct from first-run so App must not
 * auto-write sample/default controls over data that may still be recoverable.
 */
export function hydratePrimaryPlan(
  dataset: RecipeDataset,
  storage: Pick<Storage, 'getItem'> = localStorage,
): PrimaryPlanHydration {
  const restored = restorePlanSession(dataset, storage)
  if (!restored.restored) {
    if (restored.reason === 'empty') return { status: 'first-run' }
    return { status: 'recovery-required', reason: restored.reason, errors: restored.errors }
  }

  const state = singleTargetRestoredState(restored.session)
  if (!state) return { status: 'first-run' }
  return { status: 'restored', state }
}
