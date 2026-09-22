const CHECKLIST_KEY = 'bdo-planner:checklist:v1'
const CHARACTER_PROFILE_KEY = 'bdo-planner:character-profile:v1'

export type ChecklistState = Record<string, boolean>

export interface CharacterProfileState {
  maxWeightLT?: number
  reservedWeightLT?: number
  cookingMastery?: number
  alchemyMastery?: number
}

export function readChecklist(storage: Pick<Storage, 'getItem'> = localStorage): ChecklistState {
  try {
    const raw = storage.getItem(CHECKLIST_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}

    const result: ChecklistState = {}
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (/^\d+$/.test(key) && typeof value === 'boolean') result[key] = value
    }
    return result
  } catch {
    return {}
  }
}

export function writeChecklist(value: ChecklistState, storage: Pick<Storage, 'setItem'> = localStorage): void {
  storage.setItem(CHECKLIST_KEY, JSON.stringify(value))
}

export function clearChecklist(storage: Pick<Storage, 'removeItem'> = localStorage): void {
  storage.removeItem(CHECKLIST_KEY)
}

function optionalNonNegativeNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined
}

export function readCharacterProfile(storage: Pick<Storage, 'getItem'> = localStorage): CharacterProfileState {
  try {
    const raw = storage.getItem(CHARACTER_PROFILE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const value = parsed as Record<string, unknown>
    return {
      maxWeightLT: optionalNonNegativeNumber(value.maxWeightLT),
      reservedWeightLT: optionalNonNegativeNumber(value.reservedWeightLT),
      cookingMastery: optionalNonNegativeNumber(value.cookingMastery),
      alchemyMastery: optionalNonNegativeNumber(value.alchemyMastery),
    }
  } catch {
    return {}
  }
}

export function writeCharacterProfile(
  value: CharacterProfileState,
  storage: Pick<Storage, 'setItem'> = localStorage,
): void {
  storage.setItem(CHARACTER_PROFILE_KEY, JSON.stringify(value))
}

export function clearCharacterProfile(storage: Pick<Storage, 'removeItem'> = localStorage): void {
  storage.removeItem(CHARACTER_PROFILE_KEY)
}
