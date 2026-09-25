import type { Item, RecipeVariant } from './types'

export interface VerifiedBaseOutputWeightRange {
  attempts: number
  minLT: number
  maxLT: number
  excludedRandomOutputItemIds: number[]
}

/**
 * Exact base-output weight only. Random/higher-grade outputs are deliberately
 * excluded until recipe-specific proc probability evidence exists.
 */
export function verifiedBaseOutputWeightRange(
  variant: RecipeVariant,
  items: Readonly<Record<string, Item>>,
  attempts: number,
): VerifiedBaseOutputWeightRange | undefined {
  if (!Number.isFinite(attempts) || attempts < 0) return undefined
  const evidence = variant.outputEvidence
  if (evidence?.status !== 'single-base' || evidence.baseOutputs?.length !== 1) return undefined
  const output = evidence.baseOutputs[0]
  if (!Number.isFinite(output.min) || !Number.isFinite(output.max) || output.min <= 0 || output.max < output.min) return undefined
  const weightLT = items[String(output.itemId)]?.weightLT
  if (weightLT == null || !Number.isFinite(weightLT) || weightLT < 0) return undefined
  return {
    attempts,
    minLT: attempts * output.min * weightLT,
    maxLT: attempts * output.max * weightLT,
    excludedRandomOutputItemIds: [...new Set((evidence.randomOutputs ?? []).map((row) => row.itemId))],
  }
}
