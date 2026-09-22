import { clearPlanSession, readPlanSession, type PlanSessionState } from './planSession'

const CHECKLIST_KEY = 'bdo-planner:checklist:v1'
const CHARACTER_PROFILE_KEY = 'bdo-planner:character-profile:v1'
const INVENTORY_KEY = 'bdo-planner:inventory:v1'

export type ChecklistState = Record<string, boolean>
export type InventoryState = Record<string, number>
export interface CharacterProfileState { maxWeightLT?: number; reservedWeightLT?: number; cookingMastery?: number; alchemyMastery?: number }
export interface PlannerStateExport { version: 2; exportedAt: string; checklist: ChecklistState; inventory: InventoryState; characterProfile: CharacterProfileState; planSession: PlanSessionState }

function readObject(storage: Pick<Storage, 'getItem'>, key: string): Record<string, unknown> | undefined {
  try { const raw = storage.getItem(key); if (!raw) return undefined; const parsed: unknown = JSON.parse(raw); return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : undefined } catch { return undefined }
}

export function readChecklist(storage: Pick<Storage, 'getItem'> = localStorage): ChecklistState {
  const parsed = readObject(storage, CHECKLIST_KEY); if (!parsed) return {}; const result: ChecklistState = {}
  for (const [key, value] of Object.entries(parsed)) if (/^\d+$/.test(key) && typeof value === 'boolean') result[key] = value
  return result
}
export function writeChecklist(value: ChecklistState, storage: Pick<Storage, 'setItem'> = localStorage): void { storage.setItem(CHECKLIST_KEY, JSON.stringify(value)) }
export function clearChecklist(storage: Pick<Storage, 'removeItem'> = localStorage): void { storage.removeItem(CHECKLIST_KEY) }

export function readInventory(storage: Pick<Storage, 'getItem'> = localStorage): InventoryState {
  const parsed = readObject(storage, INVENTORY_KEY); if (!parsed) return {}; const result: InventoryState = {}
  for (const [key, value] of Object.entries(parsed)) if (/^\d+$/.test(key) && typeof value === 'number' && Number.isFinite(value) && value >= 0) result[key] = value
  return result
}
export function writeInventory(value: InventoryState, storage: Pick<Storage, 'setItem'> = localStorage): void { storage.setItem(INVENTORY_KEY, JSON.stringify(value)) }
export function clearInventory(storage: Pick<Storage, 'removeItem'> = localStorage): void { storage.removeItem(INVENTORY_KEY) }

function optionalNonNegativeNumber(value: unknown): number | undefined { return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined }
export function readCharacterProfile(storage: Pick<Storage, 'getItem'> = localStorage): CharacterProfileState {
  const value = readObject(storage, CHARACTER_PROFILE_KEY); if (!value) return {}
  return { maxWeightLT: optionalNonNegativeNumber(value.maxWeightLT), reservedWeightLT: optionalNonNegativeNumber(value.reservedWeightLT), cookingMastery: optionalNonNegativeNumber(value.cookingMastery), alchemyMastery: optionalNonNegativeNumber(value.alchemyMastery) }
}
export function writeCharacterProfile(value: CharacterProfileState, storage: Pick<Storage, 'setItem'> = localStorage): void { storage.setItem(CHARACTER_PROFILE_KEY, JSON.stringify(value)) }
export function clearCharacterProfile(storage: Pick<Storage, 'removeItem'> = localStorage): void { storage.removeItem(CHARACTER_PROFILE_KEY) }

export function exportPlannerState(
  storage: Pick<Storage, 'getItem'> = localStorage,
  exportedAt = new Date().toISOString(),
): PlannerStateExport {
  return {
    version: 2,
    exportedAt,
    checklist: readChecklist(storage),
    inventory: readInventory(storage),
    characterProfile: readCharacterProfile(storage),
    planSession: readPlanSession(storage),
  }
}

export function resetPlannerState(storage: Pick<Storage, 'removeItem'> = localStorage): void {
  clearChecklist(storage)
  clearInventory(storage)
  clearCharacterProfile(storage)
  clearPlanSession(storage)
}
