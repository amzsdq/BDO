import type { IngredientSubstitutionGroup, ItemId } from './types'

export interface IngredientChoice {
  itemId: ItemId
  count: number
  substitutionGroupId?: string
}

export interface ResolveIngredientChoiceOptions {
  selectedItemId?: ItemId
  ownedByItemId?: Readonly<Record<string, number>>
  requiredMultiplier?: number
}

function sourcedValue(group: IngredientSubstitutionGroup, itemId: ItemId): number | undefined {
  const rawValue = group.memberValueByItemId?.[String(itemId)]
  if (rawValue == null) return undefined
  const value = Number(rawValue)
  if (!Number.isFinite(value) || value <= 0) throw new Error(`invalid substitution value for item ${itemId} in group ${group.id}`)
  return value
}

function requiredCount(group: IngredientSubstitutionGroup, canonicalItemId: ItemId, selectedItemId: ItemId, canonicalCount: number): number {
  if (!group.memberValueByItemId) return canonicalCount
  const canonicalValue = sourcedValue(group, canonicalItemId)
  const selectedValue = sourcedValue(group, selectedItemId)
  if (canonicalValue == null || selectedValue == null) {
    throw new Error(`missing substitution value in sourced group ${group.id}`)
  }
  return Math.ceil((canonicalCount * canonicalValue) / selectedValue)
}

/** Resolve one recipe slot using only source-backed group membership and Worth. */
export function resolveIngredientChoice(
  ingredient: IngredientChoice,
  groups: Readonly<Record<string, IngredientSubstitutionGroup>>,
  options: ResolveIngredientChoiceOptions = {},
): { itemId: ItemId; count: number; usedSubstitution: boolean } {
  if (!ingredient.substitutionGroupId) {
    if (options.selectedItemId != null && options.selectedItemId !== ingredient.itemId) {
      throw new Error(`item ${ingredient.itemId} has no verified substitution group`)
    }
    return { itemId: ingredient.itemId, count: ingredient.count, usedSubstitution: false }
  }

  const group = groups[ingredient.substitutionGroupId]
  if (!group) throw new Error(`unknown substitution group: ${ingredient.substitutionGroupId}`)
  const members = [...new Set(group.memberItemIds)]
  if (!members.includes(ingredient.itemId)) {
    throw new Error(`canonical item ${ingredient.itemId} is not a member of substitution group ${group.id}`)
  }

  if (options.selectedItemId != null) {
    if (!members.includes(options.selectedItemId)) {
      throw new Error(`item ${options.selectedItemId} is not a member of substitution group ${group.id}`)
    }
    return {
      itemId: options.selectedItemId,
      count: requiredCount(group, ingredient.itemId, options.selectedItemId, ingredient.count),
      usedSubstitution: options.selectedItemId !== ingredient.itemId,
    }
  }

  const owned = options.ownedByItemId ?? {}
  const multiplier = options.requiredMultiplier == null ? 1 : options.requiredMultiplier
  if (!Number.isFinite(multiplier) || multiplier <= 0) throw new Error('substitution requiredMultiplier must be a positive finite number')
  const ranked = members
    .map((itemId) => ({ itemId, required: requiredCount(group, ingredient.itemId, itemId, ingredient.count) * multiplier, owned: Math.max(0, Number(owned[String(itemId)]) || 0) }))
    .sort((a, b) => Number(b.owned >= b.required) - Number(a.owned >= a.required) || (b.owned / b.required) - (a.owned / a.required) || a.itemId - b.itemId)
  const chosen = ranked[0]?.owned ? ranked[0] : ranked.find((entry) => entry.itemId === ingredient.itemId)
  const itemId = chosen?.itemId ?? ingredient.itemId
  return { itemId, count: requiredCount(group, ingredient.itemId, itemId, ingredient.count), usedSubstitution: itemId !== ingredient.itemId }
}


export interface MixedIngredientAllocation {
  itemId: ItemId
  count: number
}

/**
 * Find an all-owned, repeatable mixed composition for one recipe slot.
 * The returned counts are per attempt, so repeating them `attempts` times never
 * exceeds the supplied remaining inventory. Explicit selections intentionally
 * bypass this helper and retain single-item semantics.
 */
export function resolveOwnedMixedIngredientAllocation(
  ingredient: IngredientChoice,
  groups: Readonly<Record<string, IngredientSubstitutionGroup>>,
  ownedByItemId: Readonly<Record<string, number>>,
  attempts: number,
): MixedIngredientAllocation[] | undefined {
  if (!ingredient.substitutionGroupId || !Number.isInteger(attempts) || attempts <= 0) return undefined
  const group = groups[ingredient.substitutionGroupId]
  if (!group?.memberValueByItemId) return undefined
  const members = [...new Set(group.memberItemIds)]
  if (!members.includes(ingredient.itemId)) throw new Error(`canonical item ${ingredient.itemId} is not a member of substitution group ${group.id}`)
  const canonicalValue = sourcedValue(group, ingredient.itemId)
  if (canonicalValue == null) throw new Error(`missing substitution value in sourced group ${group.id}`)
  const minimumValue = Math.min(...members.map((itemId) => sourcedValue(group, itemId) ?? Number.POSITIVE_INFINITY))
  if (canonicalValue !== minimumValue) return undefined
  const target = ingredient.count * canonicalValue
  if (!Number.isFinite(target) || target <= 0) return undefined

  const available = members.map((itemId) => {
    const value = sourcedValue(group, itemId)
    if (value == null) throw new Error(`missing substitution value in sourced group ${group.id}`)
    return { itemId, value, maxPerAttempt: Math.floor(Math.max(0, Number(ownedByItemId[String(itemId)]) || 0) / attempts) }
  }).filter((entry) => entry.maxPerAttempt > 0)
  if (!available.length) return undefined

  // Bounded DP over source Worth. Worth values are at most one decimal place in
  // current production evidence; scaling preserves exact source ratios.
  const scale = 10
  const scaledValues = available.map((entry) => entry.value * scale)
  if (![target * scale, ...scaledValues].every((value) => Math.abs(value - Math.round(value)) <= 1e-9)) return undefined
  const targetUnits = Math.round(target * scale)
  const maxValueUnits = Math.max(...scaledValues.map((value) => Math.round(value)))
  const limit = targetUnits + maxValueUnits - 1
  const best: Array<Array<number> | undefined> = Array(limit + 1)
  best[0] = Array(available.length).fill(0)
  for (let i = 0; i < available.length; i += 1) {
    const units = Math.round(available[i].value * scale)
    const cap = available[i].maxPerAttempt
    const snapshot = best.slice()
    for (let worth = 0; worth <= limit; worth += 1) {
      const base = snapshot[worth]
      if (!base) continue
      for (let count = 1; count <= cap && worth + count * units <= limit; count += 1) {
        const nextWorth = worth + count * units
        const candidate = [...base]
        candidate[i] = count
        const incumbent = best[nextWorth]
        const candidateCount = candidate.reduce((sum, n) => sum + n, 0)
        const incumbentCount = incumbent?.reduce((sum, n) => sum + n, 0) ?? Infinity
        if (!incumbent || candidateCount < incumbentCount) best[nextWorth] = candidate
      }
    }
  }
  for (let worth = targetUnits; worth <= limit; worth += 1) {
    const counts = best[worth]
    if (!counts) continue
    return counts.flatMap((count, i) => count > 0 ? [{ itemId: available[i].itemId, count }] : [])
  }
  return undefined
}
