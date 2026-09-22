export type LifeSkill = 'cooking' | 'alchemy'

export type ItemId = number
export type RecipeId = string

export interface Item {
  id: ItemId
  nameKo: string
  nameEn?: string
  /** Canonical in-game item weight in LT. Undefined means not yet verified. */
  weightLT?: number
  iconUrl?: string
  iconPath?: string
  marketable?: boolean
  sourceUrl?: string
}

export interface Ingredient { itemId: ItemId; count: number }
export interface RecipeVariant { id: string; inputs: Ingredient[] }
export interface RecipeYield { min: number; max: number; expected?: number }

export interface Recipe {
  id: RecipeId
  skill: LifeSkill
  outputItemId: ItemId
  skillLevel?: string
  yield: RecipeYield
  variants: RecipeVariant[]
  sourceUrl?: string
}

export interface ByproductSource {
  outputItemId: ItemId
  producedWhileCraftingItemIds: ItemId[]
}

export interface RecipeDataset {
  items: Record<string, Item>
  recipes: Record<string, Recipe>
  recipesByOutput: Record<string, RecipeId[]>
  byproducts?: Record<string, ByproductSource>
  metadata: {
    generatedAt: string
    sources: string[]
    supportedRegion: string
    status?: string
    fingerprint?: string
    counts?: { cooking: number; alchemy: number }
    verifiedAt?: string
    reconciliationStatus?: string
    itemScope?: string
    importedItemCount?: number
    scopedItemCount?: number
  }
}

export type TargetMode = 'output' | 'attempts'
export type YieldPolicy = 'minimum' | 'expected' | 'maximum'

export interface PlanTarget {
  recipeId: RecipeId
  mode: TargetMode
  amount: number
  variantId?: string
  yieldPolicy?: YieldPolicy
}

export interface PlanOptions {
  craftIntermediateItemIds: ReadonlySet<ItemId>
  haveByItemId?: Readonly<Record<string, number>>
  /** Explicit recipe choice for craftable intermediate outputs. */
  intermediateRecipeIdByItemId?: Readonly<Record<string, RecipeId>>
  /** Explicit variant choice for any recipe, including nested intermediate recipes. */
  variantIdByRecipeId?: Readonly<Record<string, string>>
}

export interface PlannedMaterial {
  itemId: ItemId
  required: number
  have: number
  missing: number
  depth: number
  direct: boolean
  craftedIntermediate: boolean
}

export interface PlannedCraft {
  recipeId: RecipeId
  outputItemId: ItemId
  attempts: number
  requestedOutput?: number
  depth: number
}

export interface PlanResult {
  crafts: PlannedCraft[]
  materials: PlannedMaterial[]
  warnings: string[]
}
