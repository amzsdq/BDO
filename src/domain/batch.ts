import type { Item, RecipeVariant } from './types'

export interface CarryProfile { maxWeightLT: number; reservedWeightLT?: number }
export interface BatchLine { itemId: number; countPerServing: number; countToCarry: number; weightPerItemLT: number; weightToCarryLT: number }
export interface BatchCapacity { availableWeightLT: number; ingredientWeightPerServingLT?: number; maxServings?: number; loadServings?: number; totalStartingIngredientWeightLT?: number; lines: BatchLine[]; unknownWeightItemIds: number[]; warnings: string[] }

function finiteFloorNonNegative(value: number): number { return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0 }

/** Exact starting ingredient math. `totalStartingIngredientWeightLT` covers the requested work; carry lines describe one capacity-safe trip/load. */
export function calculateBatchCapacity(
  variant: RecipeVariant,
  items: Readonly<Record<string, Item>>,
  profile: CarryProfile,
  requestedServings?: number,
): BatchCapacity {
  const profileWarnings: string[] = []
  if (!Number.isFinite(profile.maxWeightLT) || profile.maxWeightLT < 0) profileWarnings.push('최대 무게가 유효한 0 이상의 유한 숫자가 아닙니다.')
  if (profile.reservedWeightLT != null && (!Number.isFinite(profile.reservedWeightLT) || profile.reservedWeightLT < 0)) profileWarnings.push('예약 무게가 유효한 0 이상의 유한 숫자가 아닙니다.')
  if (profileWarnings.length) {
    profileWarnings.push('무게 설정을 확인할 수 없어 한 번에 준비 가능한 회분을 계산하지 않았습니다.')
    return { availableWeightLT: 0, lines: [], unknownWeightItemIds: [], warnings: profileWarnings }
  }

  const maxWeightLT = profile.maxWeightLT
  const reservedWeightLT = profile.reservedWeightLT ?? 0
  const availableWeightLT = Math.max(0, maxWeightLT - reservedWeightLT)
  const unknownWeightItemIds: number[] = []
  const negativeWeightItemIds: number[] = []
  const zeroWeightItemIds: number[] = []
  let ingredientWeightPerServingLT = 0
  for (const input of variant.inputs) {
    const item = items[String(input.itemId)]
    if (!item || item.weightLT == null || !Number.isFinite(item.weightLT)) { unknownWeightItemIds.push(input.itemId); continue }
    if (item.weightLT < 0) { negativeWeightItemIds.push(input.itemId); continue }
    if (item.weightLT === 0) zeroWeightItemIds.push(input.itemId)
    ingredientWeightPerServingLT += item.weightLT * input.count
  }
  const warnings: string[] = []
  if (zeroWeightItemIds.length) warnings.push(`무게가 0 LT로 기록된 재료가 있습니다: ${[...new Set(zeroWeightItemIds)].join(', ')}. 검증된 0 LT 값으로 계산에 포함했습니다.`)
  if (negativeWeightItemIds.length) warnings.push(`음수 무게는 유효한 재료 무게로 사용할 수 없습니다: ${[...new Set(negativeWeightItemIds)].join(', ')}.`)
  if (unknownWeightItemIds.length) warnings.push('일부 재료의 검증된 무게가 없습니다.')
  if (negativeWeightItemIds.length || unknownWeightItemIds.length) {
    warnings.push('재료 무게를 완전히 검증할 수 없어 한 번에 준비 가능한 회분을 계산하지 않았습니다.')
    return { availableWeightLT, lines: [], unknownWeightItemIds: [...new Set(unknownWeightItemIds)], warnings }
  }
  if (ingredientWeightPerServingLT <= 0) {
    warnings.push('1회분 재료 무게가 0 LT이므로 무게 기준 최대 회분을 계산할 수 없습니다.')
    return { availableWeightLT, ingredientWeightPerServingLT, lines: [], unknownWeightItemIds: [], warnings }
  }
  const maxServings = Math.floor(availableWeightLT / ingredientWeightPerServingLT)
  const requested = requestedServings == null ? maxServings : finiteFloorNonNegative(requestedServings)
  const loadServings = Math.min(requested, maxServings)
  if (requestedServings != null && !Number.isFinite(requestedServings)) warnings.push('요청 회분이 유효한 유한 숫자가 아니어서 0회분으로 처리했습니다.')
  if (requested > maxServings) warnings.push(`요청한 ${requested}회분은 현재 가용 무게에서 한 번에 들 수 없습니다. 아래 휴대 수량은 최대 ${maxServings}회분 기준입니다.`)
  const lines = variant.inputs.map((input) => {
    const weightPerItemLT = items[String(input.itemId)]!.weightLT!
    const countToCarry = input.count * loadServings
    return { itemId: input.itemId, countPerServing: input.count, countToCarry, weightPerItemLT, weightToCarryLT: weightPerItemLT * countToCarry }
  })
  return { availableWeightLT, ingredientWeightPerServingLT, maxServings, loadServings, totalStartingIngredientWeightLT: ingredientWeightPerServingLT * requested, lines, unknownWeightItemIds: [], warnings }
}
