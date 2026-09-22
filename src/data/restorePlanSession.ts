import type { RecipeDataset } from '../domain/types'
import { readPlanSession, type PlanSessionState } from './planSession'
import { validatePlanSessionAgainstDataset } from './planSessionValidation'

export type PlanSessionRestore =
  | { restored: true; session: PlanSessionState }
  | { restored: false; reason: 'empty' | 'invalid-reference'; errors: string[] }

/**
 * Restore only after the runtime dataset is known. This prevents sample/default UI
 * state from being treated as authoritative and rejects stale recipe/item references.
 */
export function restorePlanSession(
  dataset: RecipeDataset,
  storage: Pick<Storage, 'getItem'> = localStorage,
): PlanSessionRestore {
  const session = readPlanSession(storage)
  if (!session.targets.length) return { restored: false, reason: 'empty', errors: [] }

  const validation = validatePlanSessionAgainstDataset(dataset, session)
  if (!validation.valid) return { restored: false, reason: 'invalid-reference', errors: validation.errors }

  return { restored: true, session }
}
