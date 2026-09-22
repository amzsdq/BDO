import type { Item, RecipeVariant } from './types'

export interface CarryProfile { maxWeightLT: number; reservedWeightLT?: number }
export interface BatchLine { itemId: number; countPerServing: number; countToCarry: number; weightPerItemLT: number; weightToCarryLT: number }
export interface BatchCapacity { availableWeightLT: number; ingredientWeightPerServingLT?: number; maxServings?: number; totalStartingIngredientWeightLT?: number; lines: BatchLine[]; unknownWeightItemIds: number[]; warnings: string[] }

function finiteNonNegative(value: number | undefined): number { return Number.isFinite(value) && (value ?? 0) >= 0 ? value! : 0 }

/** Exact starting ingredient load only; output/byproduct peak weight is separate. */
export function calculateBatchCapacity(
  variant: RecipeVariant,
  items: Readonly<Record<string, Item>>,
  profile: CarryProfile,
  requestedServings?: number,
): BatchCapacity {
  const maxWeightLT = finiteNonNegative(profile.maxWeightLT)
  const reservedWeightLT = finiteNonNegative(profile.reservedWeightLT)
  const availableWeightLT = Math.max(0, maxWeightLT - reservedWeightLT)
  const unknownWeightItemIds: number[] = []
  let ingredientWeightPerServingLT = 0
  for (const input of variant.inputs) {
    const item = items[String(input.itemId)]
    if (!item || item.weightLT == null || !Number.isFinite(item.weightLT) || item.weightLT < 0) { unknownWeightItemIds.push(input.itemId); continue }
    ingredientWeightPerServingLT += item.weightLT * input.count
  }
  const warnings: string[] = []
  if (unknownWeightItemIds.length) {
    warnings.push('일부 재료의 검증된 무게가 없어 한 번에 준비 가능한 회분을 계산하지 않았습니다.')
    return { availableWeightLT, lines: [], unknownWeightItemIds: [...new Set(unknownWeightItemIds)], warnings }
  }
  if (ingredientWeightPerServingLT <= 0) {
    warnings.push('1회분 재료 무게가 0 LT이므로 무게 기준 최대 회분을 계산할 수 없습니다.')
    return { availableWeightLT, ingredientWeightPerServingLT, lines: [], unknownWeightItemIds: [], warnings }
  }
  const maxServings = Math.floor(availableWeightLT / ingredientWeightPerServingLT)
  const servingsToLoad = requestedServings == null ? maxServings : Math.max(0, Math.floor(requestedServings))
  if (servingsToLoad > maxServings) warnings.push(`요청한 ${servingsToLoad}회분은 현재 가용 무게에서 한 번에 들 수 없습니다. 최대 ${maxServings}회분입니다.`)
  const lines = variant.inputs.map((input) => {
    const weightPerItemLT = items[String(input.itemId)]!.weightLT!
    const countToCarry = input.count * servingsToLoad
    return { itemId: input.itemId, countPerServing: input.count, countToCarry, weightPerItemLT, weightToCarryLT: weightPerItemLT * countToCarry }
  })
  return { availableWeightLT, ingredientWeightPerServingLT, maxServings, totalStartingIngredientWeightLT: ingredientWeightPerServingLT * servingsToLoad, lines, unknownWeightItemIds: [], warnings }
}
