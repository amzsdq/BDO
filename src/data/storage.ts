const CHECKLIST_KEY = 'bdo-planner:checklist:v1'

export type ChecklistState = Record<string, boolean>

export function readChecklist(storage: Pick<Storage, 'getItem'> = localStorage): ChecklistState {
  try {
    const raw = storage.getItem(CHECKLIST_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>)
        .filter(([key, value]) => /^\d+$/.test(key) && typeof value === 'boolean'),
    )
  } catch {
    return {}
  }
}

export function writeChecklist(
  value: ChecklistState,
  storage: Pick<Storage, 'setItem'> = localStorage,
): void {
  storage.setItem(CHECKLIST_KEY, JSON.stringify(value))
}

export function clearChecklist(storage: Pick<Storage, 'removeItem'> = localStorage): void {
  storage.removeItem(CHECKLIST_KEY)
}
