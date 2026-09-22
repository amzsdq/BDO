import type {
  ItemId,
  PlanOptions,
  PlanResult,
  PlanTarget,
  PlannedCraft,
  PlannedMaterial,
  Recipe,
  RecipeDataset,
  RecipeVariant,
  YieldPolicy,
} from './types'

function positive(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive finite number`)
  }
  return value
}

function yieldFor(recipe: Recipe, policy: YieldPolicy): number {
  if (policy === 'minimum') return positive(recipe.yield.min, 'recipe yield.min')
  if (policy === 'maximum') return positive(recipe.yield.max, 'recipe yield.max')
  return positive(recipe.yield.expected ?? recipe.yield.min, 'recipe yield.expected')
}

function selectVariant(recipe: Recipe, requested?: string): RecipeVariant {
  if (!recipe.variants.length) throw new Error(`recipe ${recipe.id} has no variants`)
  if (!requested) return recipe.variants[0]
  const variant = recipe.variants.find((entry) => entry.id === requested)
  if (!variant) throw new Error(`unknown recipe variant: ${requested}`)
  return variant
}

function recipeForIntermediate(dataset: RecipeDataset, itemId: ItemId): Recipe | undefined {
  const ids = dataset.recipesByOutput[String(itemId)] ?? []
  if (!ids.length) return undefined
  return dataset.recipes[ids[0]]
}

export function attemptsForTarget(recipe: Recipe, target: PlanTarget): number {
  positive(target.amount, 'target amount')
  if (target.mode === 'attempts') return Math.ceil(target.amount)
  const perAttempt = yieldFor(recipe, target.yieldPolicy ?? 'minimum')
  return Math.ceil(target.amount / perAttempt)
}

export function buildPlan(
  dataset: RecipeDataset,
  targets: readonly PlanTarget[],
  options: PlanOptions,
): PlanResult {
  const materialMap = new Map<ItemId, PlannedMaterial>()
  const craftMap = new Map<string, PlannedCraft>()
  const warnings: string[] = []
  const stack = new Set<ItemId>()

  // Returns the incremental shortage introduced by this demand. This matters for
  // craftable intermediates: owned stock must be consumed once across the whole
  // batch plan, not once per parent recipe.
  function addMaterial(
    itemId: ItemId,
    count: number,
    depth: number,
    direct: boolean,
    craftedIntermediate: boolean,
  ): number {
    const have = Math.max(0, Number(options.haveByItemId?.[String(itemId)] ?? 0))
    const current = materialMap.get(itemId)
    const previousRequired = current?.required ?? 0
    const previousMissing = Math.max(0, previousRequired - have)
    const required = previousRequired + count
    const missing = Math.max(0, required - have)

    materialMap.set(itemId, {
      itemId,
      required,
      have,
      missing,
      depth: Math.min(current?.depth ?? depth, depth),
      direct: (current?.direct ?? false) || direct,
      craftedIntermediate: (current?.craftedIntermediate ?? false) || craftedIntermediate,
    })

    return missing - previousMissing
  }

  function addCraft(recipe: Recipe, attempts: number, depth: number, requestedOutput?: number) {
    if (attempts <= 0) return
    const current = craftMap.get(recipe.id)
    craftMap.set(recipe.id, {
      recipeId: recipe.id,
      outputItemId: recipe.outputItemId,
      attempts: (current?.attempts ?? 0) + attempts,
      requestedOutput: (current?.requestedOutput ?? 0) + (requestedOutput ?? 0) || undefined,
      depth: Math.min(current?.depth ?? depth, depth),
    })
  }

  function expandRecipe(
    recipe: Recipe,
    attempts: number,
    depth: number,
    variantId?: string,
    requestedOutput?: number,
  ) {
    if (attempts <= 0) return
    if (stack.has(recipe.outputItemId)) {
      warnings.push(`순환 제작 경로 감지: item ${recipe.outputItemId}`)
      return
    }

    stack.add(recipe.outputItemId)
    addCraft(recipe, attempts, depth, requestedOutput)
    const variant = selectVariant(recipe, variantId)

    for (const input of variant.inputs) {
      const total = positive(input.count, 'ingredient count') * attempts
      const nested = recipeForIntermediate(dataset, input.itemId)
      const shouldCraft = nested && options.craftIntermediateItemIds.has(input.itemId)

      if (shouldCraft && nested) {
        const incrementalMissing = addMaterial(
          input.itemId,
          total,
          depth + 1,
          depth === 0,
          true,
        )
        const nestedAttempts = Math.ceil(
          incrementalMissing / yieldFor(nested, 'minimum'),
        )
        expandRecipe(nested, nestedAttempts, depth + 1)
      } else {
        addMaterial(input.itemId, total, depth + 1, depth === 0, false)
      }
    }

    stack.delete(recipe.outputItemId)
  }

  for (const target of targets) {
    const recipe = dataset.recipes[target.recipeId]
    if (!recipe) throw new Error(`unknown recipe: ${target.recipeId}`)
    const attempts = attemptsForTarget(recipe, target)
    expandRecipe(
      recipe,
      attempts,
      0,
      target.variantId,
      target.mode === 'output' ? target.amount : undefined,
    )
  }

  return {
    crafts: [...craftMap.values()].sort(
      (a, b) => a.depth - b.depth || a.recipeId.localeCompare(b.recipeId),
    ),
    materials: [...materialMap.values()].sort(
      (a, b) => a.depth - b.depth || b.missing - a.missing || a.itemId - b.itemId,
    ),
    warnings,
  }
}
