import type { ItemId, RecipeDataset, RecipeId, RecipeVariant } from './types'

export interface IntermediateCraftChoice {
  itemId: ItemId
  recipeIds: RecipeId[]
}

/**
 * Return craftable ingredients in stable recipe-input order.
 * The UI uses this to expose craft-vs-acquire explicitly instead of silently
 * choosing recursive expansion. Multiple producer recipes are preserved.
 */
export function listIntermediateCraftChoices(
  dataset: RecipeDataset,
  variant: RecipeVariant | undefined,
): IntermediateCraftChoice[] {
  if (!variant) return []
  const seen = new Set<ItemId>()
  const choices: IntermediateCraftChoice[] = []

  for (const input of variant.inputs) {
    if (seen.has(input.itemId)) continue
    seen.add(input.itemId)
    const recipeIds = (dataset.recipesByOutput[String(input.itemId)] ?? [])
      .filter((recipeId) => Boolean(dataset.recipes[recipeId]))
    if (recipeIds.length) choices.push({ itemId: input.itemId, recipeIds })
  }

  return choices
}
