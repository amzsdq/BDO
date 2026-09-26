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
