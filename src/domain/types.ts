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

export interface Ingredient { itemId: ItemId; count: number; substitutionGroupId?: string }
export interface IngredientSubstitutionGroup {
  id: string
  memberItemIds: ItemId[]
  /** Source-backed replacement value per member. Omit until independently verified. */
  memberValueByItemId?: Record<string, number>
  source: {
    provider: 'BDO Codex KR' | 'BDO client'
    sourceId: string
    sourceUrl?: string
    verifiedAt: string
  }
}
export type RecipeOutputStatus = 'single-base' | 'random-only' | 'multiple-base' | 'no-output' | 'unavailable' | 'unresolved'
export interface RecipeVariantOutputEvidence {
  status: RecipeOutputStatus
  sourceUrl?: string
  baseOutputs?: Array<{ itemId: ItemId; min: number; max: number }>
  randomOutputs?: Array<{ itemId: ItemId; min: number; max: number }>
}
export interface RecipeVariant { id: string; inputs: Ingredient[]; sourceRecipeId?: number; yield?: RecipeYield; outputEvidence?: RecipeVariantOutputEvidence; skillRequirement?: { skill: LifeSkill; level?: string; minimumMastery?: number } }
export interface RecipeYield {
  min: number
  max: number
  expected?: number
  /** `unknown-server-yield` means min/max=1 is only a conservative client-data baseline, not a verified exact output distribution. */
  provenance?: 'unknown-server-yield' | string
}

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
  substitutionGroups?: Record<string, IngredientSubstitutionGroup>
  metadata: {
    generatedAt: string
    sources: string[]
    supportedRegion: string
    status?: string
    fingerprint?: string
    counts?: { cooking: number; alchemy: number }
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
  /** Explicit item choice for a source-verified substitution group. */
  selectedSubstitutionItemIdByGroupId?: Readonly<Record<string, ItemId>>
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
