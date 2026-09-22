import type { IngredientSubstitutionGroup, ItemId } from './types'

export interface IngredientChoice {
  itemId: ItemId
  count: number
  substitutionGroupId?: string
}

export interface ResolveIngredientChoiceOptions {
  selectedItemId?: ItemId
  ownedByItemId?: Readonly<Record<string, number>>
}

/**
 * Resolve one recipe slot without inventing equivalence.
 * - exact slots always stay exact;
 * - grouped slots accept only explicitly sourced group members;
 * - explicit user choice wins;
 * - otherwise prefer a member with enough owned stock, then highest owned stock;
 * - quantity is never reduced merely because a substitute is higher grade.
 */
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
    return { itemId: options.selectedItemId, count: ingredient.count, usedSubstitution: options.selectedItemId !== ingredient.itemId }
  }

  const owned = options.ownedByItemId ?? {}
  const ranked = members
    .map((itemId) => ({ itemId, owned: Math.max(0, Number(owned[String(itemId)]) || 0) }))
    .sort((a, b) => Number(b.owned >= ingredient.count) - Number(a.owned >= ingredient.count) || b.owned - a.owned || a.itemId - b.itemId)
  const chosen = ranked[0]?.owned ? ranked[0].itemId : ingredient.itemId
  return { itemId: chosen, count: ingredient.count, usedSubstitution: chosen !== ingredient.itemId }
}
