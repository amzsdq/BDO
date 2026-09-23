import { clearPlanSession, readPlanSession, readPlanSessionResult, writePlanSession, type PlanSessionState } from './planSession'

const CHECKLIST_KEY = 'bdo-planner:checklist:v1'
const CHARACTER_PROFILE_KEY = 'bdo-planner:character-profile:v1'
const INVENTORY_KEY = 'bdo-planner:inventory:v1'
const PLAN_SESSION_KEY = 'bdo-planner:plan-session:v1'

export type ChecklistState = Record<string, boolean>
export type InventoryState = Record<string, number>
export interface CharacterProfileState { maxWeightLT?: number; reservedWeightLT?: number; cookingMastery?: number; alchemyMastery?: number }
export interface PlannerStateExport { version: 2; exportedAt: string; checklist: ChecklistState; inventory: InventoryState; characterProfile: CharacterProfileState; planSession: PlanSessionState }
export type PersistedReadResult<T> = { status: 'empty'; value: T } | { status: 'valid'; value: T } | { status: 'invalid-storage'; value: T }

function readObjectResult(storage: Pick<Storage, 'getItem'>, key: string): PersistedReadResult<Record<string, unknown>> {
  let raw: string | null
  try { raw = storage.getItem(key) } catch { return { status: 'invalid-storage', value: {} } }
  if (!raw) return { status: 'empty', value: {} }
  try {
    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? { status: 'valid', value: parsed as Record<string, unknown> }
      : { status: 'invalid-storage', value: {} }
  } catch { return { status: 'invalid-storage', value: {} } }
}

export function readChecklistResult(storage: Pick<Storage, 'getItem'> = localStorage): PersistedReadResult<ChecklistState> {
  const read = readObjectResult(storage, CHECKLIST_KEY)
  if (read.status !== 'valid') return { status: read.status, value: {} }
  const entries = Object.entries(read.value)
  if (entries.some(([key, value]) => !/^\d+$/.test(key) || typeof value !== 'boolean')) return { status: 'invalid-storage', value: {} }
  return { status: 'valid', value: Object.fromEntries(entries) as ChecklistState }
}
export function readChecklist(storage: Pick<Storage, 'getItem'> = localStorage): ChecklistState { return readChecklistResult(storage).value }
export function writeChecklist(value: ChecklistState, storage: Pick<Storage, 'setItem'> = localStorage): void { storage.setItem(CHECKLIST_KEY, JSON.stringify(value)) }
export function clearChecklist(storage: Pick<Storage, 'removeItem'> = localStorage): void { storage.removeItem(CHECKLIST_KEY) }

export function readInventoryResult(storage: Pick<Storage, 'getItem'> = localStorage): PersistedReadResult<InventoryState> {
  const read = readObjectResult(storage, INVENTORY_KEY)
  if (read.status !== 'valid') return { status: read.status, value: {} }
  const entries = Object.entries(read.value)
  if (entries.some(([key, value]) => !/^\d+$/.test(key) || typeof value !== 'number' || !Number.isFinite(value) || value < 0)) return { status: 'invalid-storage', value: {} }
  return { status: 'valid', value: Object.fromEntries(entries) as InventoryState }
}
export function readInventory(storage: Pick<Storage, 'getItem'> = localStorage): InventoryState { return readInventoryResult(storage).value }
export function writeInventory(value: InventoryState, storage: Pick<Storage, 'setItem'> = localStorage): void { storage.setItem(INVENTORY_KEY, JSON.stringify(value)) }
export function clearInventory(storage: Pick<Storage, 'removeItem'> = localStorage): void { storage.removeItem(INVENTORY_KEY) }

function optionalNonNegativeNumber(value: unknown): number | undefined { return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined }
export function readCharacterProfileResult(storage: Pick<Storage, 'getItem'> = localStorage): PersistedReadResult<CharacterProfileState> {
  const read = readObjectResult(storage, CHARACTER_PROFILE_KEY)
  if (read.status !== 'valid') return { status: read.status, value: {} }
  const allowed = new Set(['maxWeightLT', 'reservedWeightLT', 'cookingMastery', 'alchemyMastery'])
  if (Object.keys(read.value).some((key) => !allowed.has(key))) return { status: 'invalid-storage', value: {} }
  const entries = Object.entries(read.value)
  if (entries.some(([, value]) => value != null && optionalNonNegativeNumber(value) == null)) return { status: 'invalid-storage', value: {} }
  return { status: 'valid', value: { maxWeightLT: optionalNonNegativeNumber(read.value.maxWeightLT), reservedWeightLT: optionalNonNegativeNumber(read.value.reservedWeightLT), cookingMastery: optionalNonNegativeNumber(read.value.cookingMastery), alchemyMastery: optionalNonNegativeNumber(read.value.alchemyMastery) } }
}
export function readCharacterProfile(storage: Pick<Storage, 'getItem'> = localStorage): CharacterProfileState { return readCharacterProfileResult(storage).value }
export function writeCharacterProfile(value: CharacterProfileState, storage: Pick<Storage, 'setItem'> = localStorage): void { storage.setItem(CHARACTER_PROFILE_KEY, JSON.stringify(value)) }
export function clearCharacterProfile(storage: Pick<Storage, 'removeItem'> = localStorage): void { storage.removeItem(CHARACTER_PROFILE_KEY) }

export function exportPlannerState(storage: Pick<Storage, 'getItem'> = localStorage, exportedAt = new Date().toISOString()): PlannerStateExport {
  const checklist = readChecklistResult(storage)
  const inventory = readInventoryResult(storage)
  const characterProfile = readCharacterProfileResult(storage)
  const planSession = readPlanSessionResult(storage)
  const corrupt = [checklist.status, inventory.status, characterProfile.status].includes('invalid-storage') || ['invalid-storage', 'unsupported-version'].includes(planSession.status)
  if (corrupt) throw new Error('저장된 플래너 상태 일부를 안전하게 읽을 수 없어 내보내기를 중단했습니다. 먼저 복구 또는 명시적 초기화를 수행하세요.')
  return { version: 2, exportedAt, checklist: checklist.value, inventory: inventory.value, characterProfile: characterProfile.value, planSession: planSession.session }
}

function importValidationStorage(value: unknown): Storage {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('플래너 내보내기 파일 형식이 올바르지 않습니다.')
  const bundle = value as Record<string, unknown>
  const allowed = new Set(['version', 'exportedAt', 'checklist', 'inventory', 'characterProfile', 'planSession'])
  if (Object.keys(bundle).some((key) => !allowed.has(key)) || bundle.version !== 2 || typeof bundle.exportedAt !== 'string' || !bundle.exportedAt) throw new Error('지원하지 않는 플래너 내보내기 파일입니다.')
  const values = new Map<string, string>([
    [CHECKLIST_KEY, JSON.stringify(bundle.checklist)],
    [INVENTORY_KEY, JSON.stringify(bundle.inventory)],
    [CHARACTER_PROFILE_KEY, JSON.stringify(bundle.characterProfile)],
    [PLAN_SESSION_KEY, JSON.stringify(bundle.planSession)],
  ])
  return { length: values.size, clear: () => values.clear(), getItem: (key) => values.get(key) ?? null, key: (index) => [...values.keys()][index] ?? null, removeItem: (key) => { values.delete(key) }, setItem: (key, next) => { values.set(key, next) } }
}

function restoreRawStorage(storage: Pick<Storage, 'setItem' | 'removeItem'>, key: string, value: string | null): void {
  if (value == null) storage.removeItem(key)
  else storage.setItem(key, value)
}

export function importPlannerState(value: unknown, storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = localStorage): PlannerStateExport {
  const validationStorage = importValidationStorage(value)
  const checklist = readChecklistResult(validationStorage)
  const inventory = readInventoryResult(validationStorage)
  const characterProfile = readCharacterProfileResult(validationStorage)
  const planSession = readPlanSessionResult(validationStorage)
  if (checklist.status !== 'valid' || inventory.status !== 'valid' || characterProfile.status !== 'valid' || planSession.status !== 'valid') throw new Error('플래너 내보내기 파일의 저장 상태가 손상되었거나 지원되지 않습니다.')

  const keys = [CHECKLIST_KEY, INVENTORY_KEY, CHARACTER_PROFILE_KEY, PLAN_SESSION_KEY]
  const previous = new Map(keys.map((key) => [key, storage.getItem(key)]))
  try {
    writeChecklist(checklist.value, storage)
    writeInventory(inventory.value, storage)
    writeCharacterProfile(characterProfile.value, storage)
    writePlanSession(planSession.session, storage)
  } catch (error) {
    try {
      for (const key of keys) restoreRawStorage(storage, key, previous.get(key) ?? null)
    } catch {
      throw new Error('계획 가져오기 중 저장소 오류가 발생했고 이전 상태 복구에도 실패했습니다. 페이지를 새로고침하기 전에 현재 저장 상태를 확인하세요.')
    }
    throw error
  }

  const bundle = value as PlannerStateExport
  return { version: 2, exportedAt: bundle.exportedAt, checklist: checklist.value, inventory: inventory.value, characterProfile: characterProfile.value, planSession: planSession.session }
}

export function resetPlannerState(storage: Pick<Storage, 'removeItem'> = localStorage): void {
  clearChecklist(storage)
  clearInventory(storage)
  clearCharacterProfile(storage)
  clearPlanSession(storage)
}
