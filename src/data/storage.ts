import { clearPlanSession, readPlanSession, readPlanSessionResult, type PlanSessionState } from './planSession'

const CHECKLIST_KEY = 'bdo-planner:checklist:v1'
const CHARACTER_PROFILE_KEY = 'bdo-planner:character-profile:v1'
const INVENTORY_KEY = 'bdo-planner:inventory:v1'

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
  return {
    status: 'valid',
    value: {
      maxWeightLT: optionalNonNegativeNumber(read.value.maxWeightLT),
      reservedWeightLT: optionalNonNegativeNumber(read.value.reservedWeightLT),
      cookingMastery: optionalNonNegativeNumber(read.value.cookingMastery),
      alchemyMastery: optionalNonNegativeNumber(read.value.alchemyMastery),
    },
  }
}
export function readCharacterProfile(storage: Pick<Storage, 'getItem'> = localStorage): CharacterProfileState { return readCharacterProfileResult(storage).value }
export function writeCharacterProfile(value: CharacterProfileState, storage: Pick<Storage, 'setItem'> = localStorage): void { storage.setItem(CHARACTER_PROFILE_KEY, JSON.stringify(value)) }
export function clearCharacterProfile(storage: Pick<Storage, 'removeItem'> = localStorage): void { storage.removeItem(CHARACTER_PROFILE_KEY) }

export function exportPlannerState(
  storage: Pick<Storage, 'getItem'> = localStorage,
  exportedAt = new Date().toISOString(),
): PlannerStateExport {
  const checklist = readChecklistResult(storage)
  const inventory = readInventoryResult(storage)
  const characterProfile = readCharacterProfileResult(storage)
  const planSession = readPlanSessionResult(storage)
  const corrupt = [checklist.status, inventory.status, characterProfile.status].includes('invalid-storage') || ['invalid-storage', 'unsupported-version'].includes(planSession.status)
  if (corrupt) throw new Error('저장된 플래너 상태 일부를 안전하게 읽을 수 없어 내보내기를 중단했습니다. 먼저 복구 또는 명시적 초기화를 수행하세요.')
  return {
    version: 2,
    exportedAt,
    checklist: checklist.value,
    inventory: inventory.value,
    characterProfile: characterProfile.value,
    planSession: planSession.session,
  }
}

export function resetPlannerState(storage: Pick<Storage, 'removeItem'> = localStorage): void {
  clearChecklist(storage)
  clearInventory(storage)
  clearCharacterProfile(storage)
  clearPlanSession(storage)
}
