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
import { resolveIngredientChoice } from './substitution'

function positive(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} must be a positive finite number`)
  return value
}

function nonNegativeFinite(value: unknown, label: string): number {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric < 0) throw new Error(`${label} must be a non-negative finite number`)
  return numeric
}

function yieldFor(recipe: Recipe, policy: YieldPolicy, variant?: RecipeVariant): number {
  const value = variant?.yield ?? recipe.yield
  if (!value) throw new Error(`recipe ${recipe.id} variant ${variant?.id ?? '<legacy>'} lacks deterministic yield evidence`)
  if (policy === 'minimum') return positive(value.min, 'recipe yield.min')
  if (policy === 'maximum') return positive(value.max, 'recipe yield.max')
  return positive(value.expected ?? value.min, 'recipe yield.expected')
}

function selectVariant(recipe: Recipe, requested?: string): RecipeVariant {
  if (!recipe.variants.length) throw new Error(`recipe ${recipe.id} has no variants`)
  if (!requested) return recipe.variants[0]
  const variant = recipe.variants.find((entry) => entry.id === requested)
  if (!variant) throw new Error(`unknown recipe variant: ${requested}`)
  return variant
}

function recipeForIntermediate(dataset: RecipeDataset, itemId: ItemId, requestedRecipeId?: string): Recipe | undefined {
  const ids = dataset.recipesByOutput[String(itemId)] ?? []
  if (!ids.length) return undefined
  if (!requestedRecipeId) return dataset.recipes[ids[0]]
  if (!ids.includes(requestedRecipeId)) throw new Error(`recipe ${requestedRecipeId} does not produce item ${itemId}`)
  const recipe = dataset.recipes[requestedRecipeId]
  if (!recipe) throw new Error(`unknown intermediate recipe: ${requestedRecipeId}`)
  return recipe
}

export function attemptsForTarget(recipe: Recipe, target: PlanTarget): number {
  positive(target.amount, 'target amount')
  if (target.mode === 'attempts') return Math.ceil(target.amount)
  const variant = selectVariant(recipe, target.variantId)
  if (variant.outputEvidence && variant.outputEvidence.status !== 'single-base') throw new Error(`recipe ${recipe.id} variant ${variant.id} cannot deterministically plan an output target from ${variant.outputEvidence.status} evidence`)
  return Math.ceil(target.amount / yieldFor(recipe, target.yieldPolicy ?? 'minimum', variant))
}

export function buildPlan(dataset: RecipeDataset, targets: readonly PlanTarget[], options: PlanOptions): PlanResult {
  const materialMap = new Map<ItemId, PlannedMaterial>()
  const craftMap = new Map<string, PlannedCraft>()
  const warnings: string[] = []
  const stack = new Set<ItemId>()

  function addMaterial(itemId: ItemId, count: number, depth: number, direct: boolean, craftedIntermediate: boolean): number {
    const rawHave = options.haveByItemId?.[String(itemId)] ?? 0
    const have = nonNegativeFinite(rawHave, `inventory item ${itemId}`)
    const current = materialMap.get(itemId)
    const previousRequired = current?.required ?? 0
    const previousMissing = Math.max(0, previousRequired - have)
    const required = previousRequired + count
    const missing = Math.max(0, required - have)
    materialMap.set(itemId, { itemId, required, have, missing, depth: Math.min(current?.depth ?? depth, depth), direct: (current?.direct ?? false) || direct, craftedIntermediate: (current?.craftedIntermediate ?? false) || craftedIntermediate })
    return missing - previousMissing
  }

  function addCraft(recipe: Recipe, attempts: number, depth: number, requestedOutput?: number) {
    if (attempts <= 0) return
    const current = craftMap.get(recipe.id)
    craftMap.set(recipe.id, { recipeId: recipe.id, outputItemId: recipe.outputItemId, attempts: (current?.attempts ?? 0) + attempts, requestedOutput: (current?.requestedOutput ?? 0) + (requestedOutput ?? 0) || undefined, depth: Math.min(current?.depth ?? depth, depth) })
  }

  function expandRecipe(recipe: Recipe, attempts: number, depth: number, variantId?: string, requestedOutput?: number) {
    if (attempts <= 0) return
    if (stack.has(recipe.outputItemId)) throw new Error(`cyclic craft dependency detected at item ${recipe.outputItemId}`)
    stack.add(recipe.outputItemId)
    try {
      addCraft(recipe, attempts, depth, requestedOutput)
      const explicitVariant = variantId ?? options.variantIdByRecipeId?.[recipe.id]
      const variant = selectVariant(recipe, explicitVariant)
      if (!explicitVariant && recipe.variants.length > 1) warnings.push(`레시피 ${recipe.id}에 대체 조합 ${recipe.variants.length}개가 있습니다. 현재 첫 조합을 사용 중입니다.`)

      for (const input of variant.inputs) {
        const selectedSubstitute = input.substitutionGroupId ? options.selectedSubstitutionItemIdByGroupId?.[input.substitutionGroupId] : undefined
        const resolvedInput = resolveIngredientChoice(input, dataset.substitutionGroups ?? {}, { selectedItemId: selectedSubstitute, ownedByItemId: options.haveByItemId })
        if (resolvedInput.usedSubstitution && input.substitutionGroupId) warnings.push(`대체품목 그룹 ${input.substitutionGroupId}: item ${input.itemId} 대신 item ${resolvedInput.itemId}을 사용합니다.`)
        const inputItemId = resolvedInput.itemId
        const total = positive(resolvedInput.count, 'ingredient count') * attempts
        const recipeIds = dataset.recipesByOutput[String(inputItemId)] ?? []
        const requestedNestedId = options.intermediateRecipeIdByItemId?.[String(inputItemId)]
        const nested = recipeForIntermediate(dataset, inputItemId, requestedNestedId)
        const shouldCraft = nested && options.craftIntermediateItemIds.has(inputItemId)
        if (shouldCraft && nested) {
          if (!requestedNestedId && recipeIds.length > 1) warnings.push(`중간재 item ${inputItemId}에 제작법 ${recipeIds.length}개가 있습니다. 현재 ${nested.id}을 사용 중입니다.`)
          const incrementalMissing = addMaterial(inputItemId, total, depth + 1, depth === 0, true)
          const nestedVariantId = options.variantIdByRecipeId?.[nested.id]
          const nestedVariant = selectVariant(nested, nestedVariantId)
          if (nestedVariant.outputEvidence && nestedVariant.outputEvidence.status !== 'single-base') throw new Error(`recipe ${nested.id} variant ${nestedVariant.id} cannot deterministically plan an intermediate output from ${nestedVariant.outputEvidence.status} evidence`)
          const nestedAttempts = Math.ceil(incrementalMissing / yieldFor(nested, 'minimum', nestedVariant))
          expandRecipe(nested, nestedAttempts, depth + 1, nestedVariantId)
        } else addMaterial(inputItemId, total, depth + 1, depth === 0, false)
      }
    } finally {
      stack.delete(recipe.outputItemId)
    }
  }

  for (const target of targets) {
    const recipe = dataset.recipes[target.recipeId]
    if (!recipe) throw new Error(`unknown recipe: ${target.recipeId}`)
    expandRecipe(recipe, attemptsForTarget(recipe, target), 0, target.variantId, target.mode === 'output' ? target.amount : undefined)
  }

  return { crafts: [...craftMap.values()].sort((a, b) => a.depth - b.depth || a.recipeId.localeCompare(b.recipeId)), materials: [...materialMap.values()].sort((a, b) => a.depth - b.depth || b.missing - a.missing || a.itemId - b.itemId), warnings }
}
