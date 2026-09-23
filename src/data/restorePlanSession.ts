import type { RecipeDataset } from '../domain/types'
import { readPlanSessionResult, type PlanSessionState } from './planSession'
import { validatePlanSessionAgainstDataset } from './planSessionValidation'

export type PlanSessionRestore =
  | { restored: true; session: PlanSessionState }
  | { restored: false; reason: 'empty' | 'invalid-storage' | 'unsupported-version' | 'invalid-reference'; errors: string[] }

export function restorePlanSession(dataset: RecipeDataset, storage: Pick<Storage, 'getItem'> = localStorage): PlanSessionRestore {
  const read = readPlanSessionResult(storage)
  if (read.status === 'invalid-storage') return { restored: false, reason: 'invalid-storage', errors: ['저장된 계획 데이터를 읽을 수 없습니다. 자동으로 덮어쓰지 않습니다.'] }
  if (read.status === 'unsupported-version') return { restored: false, reason: 'unsupported-version', errors: [`저장된 계획 데이터 버전 v${read.persistedVersion}은(는) 현재 앱보다 새 버전입니다. 자동으로 덮어쓰지 않습니다.`] }
  if (read.status === 'empty' || !read.session.targets.length) return { restored: false, reason: 'empty', errors: [] }
  const validation = validatePlanSessionAgainstDataset(dataset, read.session)
  if (!validation.valid) return { restored: false, reason: 'invalid-reference', errors: validation.errors }
  return { restored: true, session: read.session }
}
