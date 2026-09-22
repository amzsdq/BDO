import type { CookingPreparationPolicy } from '../domain/durabilityPlan'

const PLAN_SESSION_KEY = 'bdo-planner:plan-session:v1'

export type PlanInputMode = 'output' | 'servings' | 'durability'

export interface PersistedPlanTarget {
  recipeId: string
  variantId?: string
  mode: PlanInputMode
  amount: number
  cookingPreparationPolicy?: CookingPreparationPolicy
}

export interface PlanSessionState {
  version: 1
  targets: PersistedPlanTarget[]
  craftIntermediateItemIds: number[]
  intermediateRecipeIdByItemId: Record<string, string>
  variantIdByRecipeId: Record<string, string>
}

export const EMPTY_PLAN_SESSION: PlanSessionState = {
  version: 1,
  targets: [],
  craftIntermediateItemIds: [],
  intermediateRecipeIdByItemId: {},
  variantIdByRecipeId: {},
}

function emptyPlanSession(): PlanSessionState {
  return { version: 1, targets: [], craftIntermediateItemIds: [], intermediateRecipeIdByItemId: {}, variantIdByRecipeId: {} }
}

function validTarget(value: unknown): value is PersistedPlanTarget {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const target = value as Record<string, unknown>
  const mode = String(target.mode)
  const policyValid = target.cookingPreparationPolicy == null || ['minimum', 'expected', 'safe95', 'maximum'].includes(String(target.cookingPreparationPolicy))
  const policyPlacementValid = target.cookingPreparationPolicy == null || mode === 'durability'
  return typeof target.recipeId === 'string' && target.recipeId.length > 0 &&
    ['output', 'servings', 'durability'].includes(mode) &&
    typeof target.amount === 'number' && Number.isFinite(target.amount) && target.amount > 0 &&
    (target.variantId == null || (typeof target.variantId === 'string' && target.variantId.length > 0)) &&
    policyValid && policyPlacementValid
}

function itemRecipeRecord(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const entries = Object.entries(value as Record<string, unknown>)
  if (entries.some(([key, entry]) => !/^\d+$/.test(key) || typeof entry !== 'string' || !entry)) return undefined
  return Object.fromEntries(entries) as Record<string, string>
}

function recipeVariantRecord(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const entries = Object.entries(value as Record<string, unknown>)
  if (entries.some(([key, entry]) => !key || typeof entry !== 'string' || !entry)) return undefined
  return Object.fromEntries(entries) as Record<string, string>
}

export function readPlanSession(storage: Pick<Storage, 'getItem'> = localStorage): PlanSessionState {
  try {
    const raw = storage.getItem(PLAN_SESSION_KEY)
    if (!raw) return emptyPlanSession()
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return emptyPlanSession()
    const value = parsed as Record<string, unknown>
    if (value.version !== 1 || !Array.isArray(value.targets) || !value.targets.every(validTarget)) return emptyPlanSession()
    if (!Array.isArray(value.craftIntermediateItemIds) || value.craftIntermediateItemIds.some((id) => !Number.isInteger(id) || Number(id) <= 0)) return emptyPlanSession()
    const intermediateRecipeIdByItemId = itemRecipeRecord(value.intermediateRecipeIdByItemId)
    const variantIdByRecipeId = recipeVariantRecord(value.variantIdByRecipeId)
    if (!intermediateRecipeIdByItemId || !variantIdByRecipeId) return emptyPlanSession()
    return {
      version: 1,
      targets: value.targets as PersistedPlanTarget[],
      craftIntermediateItemIds: [...new Set(value.craftIntermediateItemIds as number[])],
      intermediateRecipeIdByItemId,
      variantIdByRecipeId,
    }
  } catch {
    return emptyPlanSession()
  }
}

export function writePlanSession(value: PlanSessionState, storage: Pick<Storage, 'setItem'> = localStorage): void {
  storage.setItem(PLAN_SESSION_KEY, JSON.stringify(value))
}

export function clearPlanSession(storage: Pick<Storage, 'removeItem'> = localStorage): void {
  storage.removeItem(PLAN_SESSION_KEY)
}
